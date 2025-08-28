// client/src/api/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000", // change if your backend runs elsewhere
  timeout: 10000,
});

// attach JWT automatically from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
