"""
Network Capture — Real-time packet sniffing with CICIDS-2017 feature extraction.
Fix 8: flush_expired() now returns ALL expired flows, not just one.
"""
import logging
import time
import threading
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from scapy.all import sniff, IP, TCP, UDP, ICMP
from agent.normalization.schema import UnifiedEvent, FlagCounts, EventLayer
from agent.normalization.normalizer import Normalizer

log = logging.getLogger("network_capture")

FlowKey = Tuple[str, str, int, int, str]


class NetworkCapture:
    def __init__(self, normalizer: Normalizer, iface: str = "eth0"):
        self.normalizer = normalizer
        self.iface = iface
        self.flows: Dict[FlowKey, dict] = {}
        self._lock = threading.Lock()
        self._running = False
        self._last_flush = 0.0
        log.info(f"NetworkCapture initialized on interface: {iface}")

    def start(self):
        self._running = True
        log.info(f"Starting packet capture on {self.iface}...")
        try:
            sniff(
                iface=self.iface,
                prn=self._packet_callback,
                store=False,
                filter="ip",
                stop_filter=lambda _: not self._running,
            )
        except Exception as e:
            log.error(f"Sniffer error: {e}")
        finally:
            log.info("Packet capture stopped.")

    def stop(self):
        self._running = False

    def _packet_callback(self, pkt):
        try:
            event = self.add_packet(pkt)
            if event:
                self.normalizer.push(event)
        except Exception as e:
            log.error(f"Packet callback error: {e}")

    def add_packet(self, pkt) -> Optional[UnifiedEvent]:
        """Add packet to flow tracker. Returns UnifiedEvent when a flow is ready."""
        now = time.time()
        # ─── Fix 8: Flush ALL expired flows, but throttled to 1s to save CPU ───
        if now - self._last_flush > 1.0:
            for ev in self.flush_expired(timeout=60.0):
                self.normalizer.push(ev)
            self._last_flush = now

        if not pkt.haslayer(IP):
            return None

        ip = pkt[IP]
        proto = "TCP"
        src_port = dst_port = 0
        flags = 0
        win_size = 0

        if pkt.haslayer(TCP):
            tcp = pkt[TCP]
            src_port = tcp.sport
            dst_port = tcp.dport
            flags = int(tcp.flags)
            win_size = tcp.window
        elif pkt.haslayer(UDP):
            udp = pkt[UDP]
            src_port = udp.sport
            dst_port = udp.dport
            proto = "UDP"
        elif pkt.haslayer(ICMP):
            proto = "ICMP"

        key: FlowKey = (ip.src, ip.dst, src_port, dst_port, proto)
        rev_key: FlowKey = (ip.dst, ip.src, dst_port, src_port, proto)

        with self._lock:
            if key not in self.flows and rev_key not in self.flows:
                self.flows[key] = self._init_flow()

            is_forward = key in self.flows
            flow_key = key if is_forward else rev_key
            flow = self.flows[flow_key]

            pkt_size = len(pkt)
            flag_dict = self._flag_counts(flags)

            if is_forward:
                flow["fwd_packets"].append((now, pkt_size))
                if flag_dict["syn"] and flow["init_win_fwd"] == 0:
                    flow["init_win_fwd"] = win_size
            else:
                flow["bwd_packets"].append((now, pkt_size))
                if flag_dict["syn"] and flow["init_win_bwd"] == 0:
                    flow["init_win_bwd"] = win_size

            for f in ("syn", "ack", "fin", "rst", "psh", "urg"):
                flow[f] += flag_dict[f]
            flow["last_time"] = now

            total_pkts = len(flow["fwd_packets"]) + len(flow["bwd_packets"])
            if total_pkts >= 50 or flag_dict["fin"] or flag_dict["rst"]:
                event = self._build_event(flow_key, flow)
                del self.flows[flow_key]
                return event
        return None

    def flush_expired(self, timeout=15.0) -> List[UnifiedEvent]:
        """Fix 8: Flush ALL expired flows. Returns a list of UnifiedEvent objects."""
        now = time.time()
        expired = []
        with self._lock:
            expired_keys = [
                key
                for key, flow in self.flows.items()
                if now - flow["last_time"] > timeout
            ]
            for key in expired_keys:
                event = self._build_event(key, self.flows[key])
                del self.flows[key]
                if event:
                    expired.append(event)
        return expired

    def _init_flow(self) -> dict:
        return {
            "start_time": time.time(),
            "last_time": time.time(),
            "fwd_packets": [],
            "bwd_packets": [],
            "syn": 0, "ack": 0, "fin": 0, "rst": 0, "psh": 0, "urg": 0,
            "init_win_fwd": 0, "init_win_bwd": 0,
        }

    def _flag_counts(self, pkt_flags: int) -> dict:
        return {
            "syn": int(bool(pkt_flags & 0x02)),
            "ack": int(bool(pkt_flags & 0x10)),
            "fin": int(bool(pkt_flags & 0x01)),
            "rst": int(bool(pkt_flags & 0x04)),
            "psh": int(bool(pkt_flags & 0x08)),
            "urg": int(bool(pkt_flags & 0x20)),
        }

    def _build_event(self, key: FlowKey, flow: dict) -> UnifiedEvent:
        """Convert raw flow data into a UnifiedEvent with CICIDS features."""
        src_ip, dst_ip, src_port, dst_port, proto = key
        
        # Calculate real duration and IAT
        fwd_times = [t for t, _ in flow["fwd_packets"]]
        bwd_times = [t for t, _ in flow["bwd_packets"]]
        all_times = sorted(fwd_times + bwd_times)
        
        start_t = all_times[0] if all_times else flow["start_time"]
        last_t  = all_times[-1] if all_times else flow["last_time"]
        duration_s = max(last_t - start_t, 1e-6)
        duration_us = duration_s * 1_000_000

        # Real Active/Idle Heuristic:
        # If any IAT > 5s, consider it idle time.
        idle_us = 0
        active_us = duration_us
        gaps = [(all_times[i] - all_times[i-1]) for i in range(1, len(all_times))]
        for g in gaps:
            if g > 5.0: # threshold for idle
                idle_us += (g * 1_000_000)
        active_us = max(0, duration_us - idle_us)

        fwd_sizes = [s for _, s in flow["fwd_packets"]]
        bwd_sizes = [s for _, s in flow["bwd_packets"]]

        total_bytes = sum(fwd_sizes) + sum(bwd_sizes)
        total_pkts = len(fwd_sizes) + len(bwd_sizes)

        all_iat_us = [g * 1_000_000 for g in gaps]
        mean_iat = sum(all_iat_us) / len(all_iat_us) if all_iat_us else 0
        std_iat = (sum((x - mean_iat)**2 for x in all_iat_us) / len(all_iat_us))**0.5 if all_iat_us else 0

        return UnifiedEvent(
            layer=EventLayer.NETWORK,
            src_ip=src_ip,
            dst_ip=dst_ip,
            src_port=src_port,
            dst_port=dst_port,
            protocol=proto,
            flow_duration=float(duration_us),
            flow_bytes_per_sec=float(total_bytes / duration_s),
            flow_packets_per_sec=float(total_pkts / duration_s),
            flow_iat_mean=float(mean_iat),
            flow_iat_std=float(std_iat),
            total_fwd_packets=len(fwd_sizes),
            total_bwd_packets=len(bwd_sizes),
            fwd_packet_len_mean=float(sum(fwd_sizes) / len(fwd_sizes) if fwd_sizes else 0),
            bwd_packet_len_mean=float(sum(bwd_sizes) / len(bwd_sizes) if bwd_sizes else 0),
            subflow_fwd_bytes=int(sum(fwd_sizes)),
            subflow_bwd_bytes=int(sum(bwd_sizes)),
            active_mean=float(active_us),
            idle_mean=float(idle_us),
            init_win_bytes_fwd=int(flow["init_win_fwd"]),
            init_win_bytes_bwd=int(flow["init_win_bwd"]),
            flag_counts=FlagCounts(
                syn=flow["syn"], ack=flow["ack"], fin=flow["fin"],
                rst=flow["rst"], psh=flow["psh"], urg=flow["urg"],
            ),
        )
