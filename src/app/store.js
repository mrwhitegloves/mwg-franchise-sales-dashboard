import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import auth, { loggedOut } from "./authSlice";
import { baseApi } from "./baseApi";

// Logging out (button, 401 or force_logout) drops every cached response of the previous user.
// Done in a listener middleware — NOT in store.subscribe(): dispatching from inside a subscriber
// makes RTK's auto-batching skip React's own listeners, so the screen never re-rendered after
// "Sign out" (bug found 2026-10-01).
const listener = createListenerMiddleware();
listener.startListening({
  actionCreator: loggedOut,
  effect: (_, api) => { api.dispatch(baseApi.util.resetApiState()); },
});

export const store = configureStore({
  reducer: { auth, [baseApi.reducerPath]: baseApi.reducer },
  middleware: (getDefault) => getDefault().prepend(listener.middleware).concat(baseApi.middleware),
});

setupListeners(store.dispatch);

export { loggedOut };
