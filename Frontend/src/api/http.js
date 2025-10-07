// frontend/src/api/http.js
// Backwards-compatible wrapper that uses the axios instance under the hood.
// This lets the rest of your app keep importing `{ http }` without changes.

import api from "./axios";

export const http = {
  get: (path, options) => api.get(path, options?.config),
  post: (path, body, options) => api.post(path, body, options?.config),
  put: (path, body, options) => api.put(path, body, options?.config),
  patch: (path, body, options) => api.patch(path, body, options?.config),
  del: (path, options) => api.delete(path, options?.config),
};

export default http;
