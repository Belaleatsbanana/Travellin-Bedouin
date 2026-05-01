import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error?.message || err.message || "Unknown error";
    const error = new Error(message) as Error & { status?: number };
    error.status = err.response?.status;
    return Promise.reject(error);
  }
);
