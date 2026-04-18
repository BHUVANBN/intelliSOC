/**
 * API Service - HTTP client for backend communication
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async get(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async post(endpoint, data) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  // Simulation endpoints
  async getSimulationProfiles() {
    return this.get('/api/simulate/profiles');
  }

  async startSimulation(attackType, speed = 1.0) {
    return this.post('/api/simulate/start', { attack_type: attackType, speed });
  }

  async startCombo(attackTypes, speed = 1.0) {
    return this.post('/api/simulate/start-combo', { attack_types: attackTypes, speed });
  }

  async stopSimulation() {
    return this.post('/api/simulate/stop', {});
  }

  async pauseSimulation() {
    return this.post('/api/simulate/pause', {});
  }

  async resumeSimulation() {
    return this.post('/api/simulate/resume', {});
  }

  async updateSpeed(speed) {
    return this.post('/api/simulate/speed', { speed });
  }

  async getSimulationStatus() {
    return this.get('/api/simulate/status');
  }

  // Alerts
  async getAlerts(limit = 50) {
    return this.get(`/alerts/?limit=${limit}`);
  }

  async clearAlerts() {
    return this.post('/alerts/clear', {});
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }
}

export const api = new ApiService();