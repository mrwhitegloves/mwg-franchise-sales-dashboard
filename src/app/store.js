import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import auth, { loggedOut } from "./authSlice";
import { baseApi } from "./baseApi";

export const store = configureStore({
  reducer: { auth, [baseApi.reducerPath]: baseApi.reducer },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});

setupListeners(store.dispatch);

// Logging out (or a 401) drops every cached response of the previous user
let lastToken = store.getState().auth.token;
store.subscribe(() => {
  const t = store.getState().auth.token;
  if (lastToken && !t) store.dispatch(baseApi.util.resetApiState());
  lastToken = t;
});

export { loggedOut };
