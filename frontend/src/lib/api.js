import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Si el access_token (dura 60 min) expira durante una sesión larga de admin,
// el backend responde 401. Antes de mostrar error, intentamos refrescar la sesión
// una vez via /auth/refresh (usa el refresh_token de 7 días) y reintentamos la
// petición original. Si el refresh también falla, se propaga el error normalmente.
let isRefreshing = false;
let pendingQueue = [];

function resolvePendingQueue() {
  pendingQueue.forEach((cb) => cb());
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthEndpoint = config?.url?.includes("/auth/");
    if (response?.status === 401 && config && !config._retriedAfterRefresh && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push(() => {
            config._retriedAfterRefresh = true;
            api(config).then(resolve).catch(reject);
          });
        });
      }
      config._retriedAfterRefresh = true;
      isRefreshing = true;
      try {
        await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        isRefreshing = false;
        resolvePendingQueue();
        return api(config);
      } catch (refreshError) {
        isRefreshing = false;
        pendingQueue = [];
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const FSC_LOGO =
  "https://customer-assets.emergentagent.com/job_dd2523b3-e20b-4cc5-9d6d-534c6d02a185/artifacts/y4ulg6l9_FUTRE%20SOCCER%20CUP%202025_Mesa%20de%20trabajo%201.png";

export function formatApiError(detail) {
  if (detail == null) return "Ha ocurrido un error.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

/** Resolve any URL: pass-through full URLs, prefix relative /api/files paths with backend host. */
export function imgSrc(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/api/")) return `${BACKEND_URL}${url}`;
  return url;
}
