import { createSlice } from "@reduxjs/toolkit";
import { TOKEN_KEY } from "@/lib/config";

const readToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

const authSlice = createSlice({
  name: "auth",
  initialState: { token: readToken(), user: null, scope: null, permissions: null, team: [] },
  reducers: {
    loggedIn(state, { payload }) {
      state.token = payload.token;
      state.user = payload.user;
      try { localStorage.setItem(TOKEN_KEY, payload.token); } catch { /* private mode */ }
    },
    sessionLoaded(state, { payload }) {
      state.user = payload.user;
      state.scope = payload.scope;
      state.permissions = payload.permissions;
      state.team = payload.team || [];
    },
    loggedOut(state) {
      state.token = null; state.user = null; state.scope = null; state.permissions = null; state.team = [];
      try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    },
  },
});

export const { loggedIn, sessionLoaded, loggedOut } = authSlice.actions;
export default authSlice.reducer;

export const selectToken = (s) => s.auth.token;
export const selectUser = (s) => s.auth.user;
export const selectScope = (s) => s.auth.scope;
export const selectPermissions = (s) => s.auth.permissions || {};
export const selectTeam = (s) => s.auth.team || [];
