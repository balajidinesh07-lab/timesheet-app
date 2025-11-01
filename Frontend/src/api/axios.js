// frontend/src/api/api.js
import axios from "axios";

import { getToken } from "../utils/session";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // include /api
  timeout: 10000,
});

// attach JWT automatically
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// normalize responses/errors so callers get clean data or thrown Error(message)
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "Request failed";
    return Promise.reject(new Error(msg));
  }
);

export default api;
