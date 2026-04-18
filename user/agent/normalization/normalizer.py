"""
Normalizer — Thread-safe event buffer merging network + endpoint events.
Provides batched event retrieval for the inference loop.
"""
from __future__ import annotations
import threading
import time
import logging
from collections import deque
from typing import List, Optional, Dict
from datetime import datetime

from agent.normalization.schema import UnifiedEvent, EventLayer

log = logging.getLogger("normalizer")


class Normalizer:
    """
    Thread-safe event queue. Capture threads push events; inference loop drains batches.
    """
    def __init__(self, max_queue_size: int = 10_000):
        self._queue: deque[UnifiedEvent] = deque(maxlen=max_queue_size)
        self._lock = threading.Lock()
        self._event_count = 0
        self._start_time = time.time()

    def push(self, event: UnifiedEvent):
        """Add a normalized event to the queue."""
        with self._lock:
            self._queue.append(event)
            self._event_count += 1

    def drain_batch(self, max_events: int = 500) -> List[UnifiedEvent]:
        """Drain up to `max_events` events from the queue."""
        with self._lock:
            batch = []
            for _ in range(min(max_events, len(self._queue))):
                batch.append(self._queue.popleft())
            return batch

    @property
    def queue_depth(self) -> int:
        with self._lock:
            return len(self._queue)

    @property
    def total_events(self) -> int:
        return self._event_count

    @property
    def events_per_second(self) -> float:
        elapsed = time.time() - self._start_time
        return self._event_count / elapsed if elapsed > 0 else 0.0

    def merge_network_endpoint(
        self,
        net_event: UnifiedEvent,
        ep_event: Optional[UnifiedEvent]
    ) -> UnifiedEvent:
        """
        Merge endpoint context into a network event when same-host correlation applies.
        """
        if ep_event is None:
            return net_event
        merged = net_event.model_copy()
        merged.process_name = ep_event.process_name
        merged.parent_pid   = ep_event.parent_pid
        merged.pid          = ep_event.pid
        merged.user         = ep_event.user
        merged.file_access  = ep_event.file_access
        merged.audit_key    = ep_event.audit_key
        return merged
