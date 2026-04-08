import axios from 'axios';

// Centralized Axios instance for all frontend API calls.
// Using relative baseURL so it works in any deployment environment.
// Error interceptor extracts plain-language messages from API responses
// so every page gets consistent error handling without repetition.
const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export default api;
