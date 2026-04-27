import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

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
