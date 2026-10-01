// One RTK Query API for the whole app (server state lives only here).
// Features add their endpoints with baseApi.injectEndpoints(); socket events
// invalidate these tags so screens refresh themselves.
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { SALES_API } from "@/lib/config";
import { loggedOut } from "./authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: SALES_API,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

// A 401 means the session is over (expired / deactivated) → back to login
const baseQuery = async (args, api, extra) => {
  const result = await rawBaseQuery(args, api, extra);
  if (result.error?.status === 401 && api.getState().auth.token) api.dispatch(loggedOut());
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["Me", "Meta", "Dashboard", "Leads", "Counts", "Lead", "Team", "Unassigned", "Settings", "Conversations", "Conversation", "Insights", "Tasks", "Meetings", "Sla"],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
