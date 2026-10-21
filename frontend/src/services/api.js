import axios from 'axios';

export const backendOrigin = import.meta.env.DEV
  ? `http://${window.location.hostname || 'localhost'}:5000`
  : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
export const socketUrl = import.meta.env.DEV ? backendOrigin : (import.meta.env.VITE_SOCKET_URL || backendOrigin);

export const api = axios.create({
  baseURL: `${backendOrigin}/api`,
  withCredentials: true,
  timeout: 10000,
});

export function getApiError(error, fallback = 'Request failed') {
  if (!error?.response && (error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED')) {
    return 'StreamConnect API is offline. Start the backend with: npm --prefix backend run dev';
  }
  return error?.response?.data?.error || fallback;
}
