// Franchise Sales API endpoints (backend2 /api/franchise-sales/*)
import { baseApi } from "./baseApi";

const LIST_TAGS = ["Leads", "Counts", "Dashboard", "Unassigned", "Team"];

export const salesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // ── auth ──────────────────────────────────────────────
    login: b.mutation({ query: (body) => ({ url: "/auth/login", method: "POST", body }) }),
    me: b.query({ query: () => "/auth/me", providesTags: ["Me"] }),
    logout: b.mutation({ query: () => ({ url: "/auth/logout", method: "POST" }) }),
    meta: b.query({ query: () => "/meta", providesTags: ["Meta"], keepUnusedDataFor: 3600 }),

    // ── workspace ─────────────────────────────────────────
    dashboard: b.query({ query: (view = "my") => ({ url: "/dashboard", params: { view } }), providesTags: ["Dashboard"] }),
    leads: b.query({
      query: ({ mode = "all", ...params } = {}) => ({ url: mode === "my" ? "/my-leads" : mode === "hot" ? "/hot-leads" : "/leads", params }),
      providesTags: ["Leads"],
    }),
    leadCounts: b.query({ query: (params = {}) => ({ url: "/leads/counts", params }), providesTags: ["Counts"] }),
    search: b.query({ query: (q) => ({ url: "/search", params: { q } }) }),
    lead: b.query({ query: (id) => `/leads/${id}`, providesTags: (r, e, id) => [{ type: "Lead", id }] }),
    activities: b.query({ query: (id) => `/leads/${id}/activities`, providesTags: (r, e, id) => [{ type: "Lead", id }] }),
    assignmentHistory: b.query({ query: (id) => `/leads/${id}/assignment-history`, providesTags: (r, e, id) => [{ type: "Lead", id }] }),
    checkDuplicate: b.mutation({ query: (body) => ({ url: "/leads/check-duplicate", method: "POST", body }) }),
    createLead: b.mutation({ query: (body) => ({ url: "/leads", method: "POST", body }), invalidatesTags: LIST_TAGS }),
    updateLead: b.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/${id}`, method: "PATCH", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Lead", id }, "Leads"],
    }),
    changeStatus: b.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/${id}/status`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Lead", id }, ...LIST_TAGS],
    }),
    leadEdit: b.query({ query: (id) => `/leads/${id}/edit`, providesTags: (r, e, id) => [{ type: "Lead", id }] }),
    editDetails: b.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/${id}/details`, method: "PATCH", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Lead", id }, "Leads"],
    }),
    addNote: b.mutation({
      query: ({ id, text }) => ({ url: `/leads/${id}/notes`, method: "POST", body: { text } }),
      invalidatesTags: (r, e, { id }) => [{ type: "Lead", id }],
    }),

    // ── control center (managers / admins) ────────────────
    team: b.query({ query: () => "/team", providesTags: ["Team"] }),
    updateTeamMember: b.mutation({ query: ({ userId, ...body }) => ({ url: `/team/${userId}`, method: "PATCH", body }), invalidatesTags: ["Team"] }),
    unassigned: b.query({ query: (params = {}) => ({ url: "/unassigned", params }), providesTags: ["Unassigned"] }),
    assignLead: b.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/${id}/assign`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Lead", id }, ...LIST_TAGS],
    }),
    reassignLead: b.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/${id}/reassign`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Lead", id }, ...LIST_TAGS],
    }),
    bulkAssign: b.mutation({ query: (body) => ({ url: "/leads/bulk-assign", method: "POST", body }), invalidatesTags: LIST_TAGS }),
    assignmentSettings: b.query({ query: () => "/assignment-rules", providesTags: ["Settings"] }),

    // ── central WhatsApp (FS06) ───────────────────────────
    conversations: b.query({ query: (params = {}) => ({ url: "/whatsapp", params }), providesTags: ["Conversations"] }),
    conversation: b.query({
      query: ({ id, before, limit }) => ({ url: `/whatsapp/${id}`, params: { before, limit } }),
      providesTags: (r, e, { id }) => [{ type: "Conversation", id }],
    }),
    leadConversation: b.query({ query: (leadId) => `/leads/${leadId}/conversation`, providesTags: (r, e, id) => [{ type: "Lead", id }] }),
    startConversation: b.mutation({
      query: (leadId) => ({ url: `/leads/${leadId}/conversation`, method: "POST" }),
      invalidatesTags: (r, e, leadId) => [{ type: "Lead", id: leadId }, "Conversations"],
    }),
    waTemplates: b.query({ query: () => "/whatsapp/templates", keepUnusedDataFor: 600 }),
    sendWhatsapp: b.mutation({
      query: ({ id, ...body }) => ({ url: `/whatsapp/${id}/send`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Conversation", id }, "Conversations"],
    }),
    sendWhatsappFile: b.mutation({
      query: ({ id, file, caption, replyToMessageId }) => {
        const body = new FormData();
        body.append("file", file);
        if (caption) body.append("caption", caption);
        if (replyToMessageId) body.append("replyToMessageId", replyToMessageId);
        return { url: `/whatsapp/${id}/send-media`, method: "POST", body };
      },
      invalidatesTags: (r, e, { id }) => [{ type: "Conversation", id }, "Conversations"],
    }),
    sendWhatsappTemplate: b.mutation({
      query: ({ id, ...body }) => ({ url: `/whatsapp/${id}/send-template`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Conversation", id }, "Conversations"],
    }),
    markConversationRead: b.mutation({ query: (id) => ({ url: `/whatsapp/${id}/mark-read`, method: "POST" }), invalidatesTags: ["Conversations"] }),
  }),
});

export const {
  useLoginMutation, useMeQuery, useLogoutMutation, useMetaQuery,
  useDashboardQuery, useLeadsQuery, useLeadCountsQuery, useLazySearchQuery, useLeadQuery, useActivitiesQuery, useAssignmentHistoryQuery,
  useCheckDuplicateMutation, useCreateLeadMutation, useUpdateLeadMutation, useChangeStatusMutation, useAddNoteMutation,
  useLeadEditQuery, useEditDetailsMutation,
  useTeamQuery, useUpdateTeamMemberMutation, useUnassignedQuery, useAssignLeadMutation, useReassignLeadMutation, useBulkAssignMutation,
  useAssignmentSettingsQuery,
  useConversationsQuery, useConversationQuery, useLazyConversationQuery, useLeadConversationQuery, useStartConversationMutation, useWaTemplatesQuery,
  useSendWhatsappMutation, useSendWhatsappFileMutation, useSendWhatsappTemplateMutation, useMarkConversationReadMutation,
} = salesApi;
