// API + Socket.IO endpoints. Production REST goes through api.mrwhitegloves.com
// (Firebase Hosting → Cloud Run); sockets must use the Cloud Run URL directly
// because Firebase Hosting does not proxy WebSockets (same as the admin dashboard).
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_BASE.replace(/\/api\/?$/, "")).replace(/\/$/, "");
export const SALES_API = `${API_BASE}/franchise-sales`;
export const TOKEN_KEY = "salesToken";
