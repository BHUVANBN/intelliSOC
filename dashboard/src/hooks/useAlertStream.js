/**
 * useAlertStream — WebSocket hook for real-time incident feed.
 * Connects to ws://host:8000/ws/alerts, reconnects on disconnect.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8001/ws/alerts';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const MAX_INCIDENTS = 500;
const RECONNECT_DELAY_MS = 3000;

export function useAlertStream() {
  const [incidents, setIncidents]     = useState([]);
  const [connected, setConnected]     = useState(false);
  const [stats, setStats]             = useState(null);
  const [eventsPerSec, setEventsPerSec] = useState(0);
  const [toast, setToast]            = useState(null);
  const wsRef  = useRef(null);
  const timerRef = useRef(null);
  const eventCounter = useRef(0);

  // ── Sync history on load ──────────────────────────────────────────
  const syncHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/incidents?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (e) { console.warn('[intelli-SOC] History sync failed', e); }
  }, []);

  // ── Fetch initial stats ─────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats`);
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  }, []);

  // ── EPS meter ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setEventsPerSec(eventCounter.current);
      eventCounter.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Lifecycle initialization ────────────────────────────────────────
  useEffect(() => {
    syncHistory();
    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => clearInterval(id);
  }, [syncHistory, fetchStats]);

  // ── WebSocket connection ─────────────────────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('[intelli-SOC] WebSocket connected');
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'heartbeat' || data.type === 'pong') return;

        eventCounter.current += 1;

        setIncidents(prev => {
          // Avoid duplicates
          if (prev.some(i => i.incident_id === data.incident_id)) return prev;
          
          if (data.severity === 'CRITICAL' || data.severity === 'HIGH') {
            setToast({ title: `${data.severity}: ${data.threat_class.replace(/_/g,' ')}`, msg: data.src_ip });
            setTimeout(() => setToast(null), 5000);
          }

          const next = [data, ...prev];
          return next.slice(0, MAX_INCIDENTS);
        });
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('[intelli-SOC] WebSocket disconnected — reconnecting...');
      timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = (err) => {
      console.warn('[intelli-SOC] WebSocket error', err);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // ── Heartbeat ping ───────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 25000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch playbook ───────────────────────────────────────────────────
  const fetchPlaybook = useCallback(async (incident_id) => {
    try {
      const res = await fetch(`${API_URL}/api/playbook/${incident_id}`);
      if (res.ok) return await res.json();
    } catch { /* ignore */ }
    return null;
  }, []);

  const clearIncidents = useCallback(() => setIncidents([]), []);
  const removeIncident = useCallback((id) => {
    setIncidents(prev => prev.filter(i => i.incident_id !== id));
  }, []);

  return { incidents, connected, stats, eventsPerSec, fetchPlaybook, clearIncidents, removeIncident, toast };
}
