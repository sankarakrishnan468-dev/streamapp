import axios from 'axios';

export const backendOrigin = import.meta.env.DEV
  ? `http://${window.location.hostname || 'localhost'}:5001`
  : (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');
export const socketUrl = import.meta.env.DEV ? backendOrigin : (import.meta.env.VITE_SOCKET_URL || backendOrigin);

function readIceServers() {
  const configured = import.meta.env.VITE_WEBRTC_ICE_SERVERS;
  if (configured) {
    try {
      const parsed = JSON.parse(configured);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      // Fall back to the individual environment variables below.
    }
  }
  const servers = [{ urls: import.meta.env.VITE_STUN_URL || 'stun:stun.l.google.com:19302' }];
  if (import.meta.env.VITE_TURN_URL) {
    servers.push({
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_PASSWORD,
    });
  }
  return servers;
}

export const rtcConfiguration = { iceServers: readIceServers(), iceCandidatePoolSize: 10 };

export const api = axios.create({
  baseURL: `${backendOrigin}/api`,
  withCredentials: true,
  timeout: 10000,
});

export function getApiError(error, fallback = 'Request failed') {
  if (!error?.response && (error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED')) {
    return import.meta.env.DEV
      ? 'StreamConnect API is offline. Start the backend with: npm --prefix backend run dev'
      : 'StreamConnect API is unavailable. Configure the Netlify VITE_API_URL variable with your public backend URL.';
  }
  return error?.response?.data?.error || fallback;
}
