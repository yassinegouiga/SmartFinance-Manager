import axios from 'axios';
import { auth } from '../firebaseConfig';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8888',
});

api.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

api.interceptors.response.use(
  response => response,
  error => Promise.reject(error)
);

export default api;
