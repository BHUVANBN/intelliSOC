
let socket = null;
let listeners = [];

// Handle cases where REACT_APP_WS_URL might already include a path (e.g. /ws/alerts)
const rawWsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8001';
const WS_BASE = rawWsUrl.replace(/\/ws\/alerts\/?$/, '').replace(/\/$/, '');
const WS_URL = `${WS_BASE}/ws/simulation`;

export const connectSimulation = () => {
    if (socket) return;
    
    socket = new WebSocket(WS_URL);
    
    socket.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        listeners.forEach(cb => cb(msg));
    };
    
    socket.onclose = () => {
        socket = null;
        setTimeout(connectSimulation, 3000);
    };
};

export const subscribeSimulation = (cb) => {
    listeners.push(cb);
    return () => {
        listeners = listeners.filter(l => l !== cb);
    };
};

export const simulationSocket = {
    send: (msg) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(msg));
        }
    }
};
