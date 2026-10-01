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
    activities: b.query({
      query: (arg) => (typeof arg === "string" ? `/leads/${arg}/activities` : { url: `/leads/${arg.id}/activities`, params: { group: arg.group || undefined, before: arg.before || undefined } }),
      providesTags: (r, e, arg) => [{ type: "Lead", id: typeof arg === "string" ? arg : arg.id }],
    }),
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
    // AI + human (FS07)
    setChatMode: b.mutation({
      query: ({ id, ...body }) => ({ url: `/whatsapp/${id}/mode`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Conversation", id }, "Conversations", "Insights"],
    }),
    chatInsights: b.query({ query: (id) => `/whatsapp/${id}/insights`, providesTags: (r, e, id) => [{ type: "Insights", id }] }),
    leadInsights: b.query({ query: (leadId) => `/leads/${leadId}/insights`, providesTags: (r, e, id) => [{ type: "Insights", id }] }),
    suggestReplies: b.mutation({ query: ({ id, refresh }) => ({ url: `/whatsapp/${id}/suggest`, method: "POST", body: { refresh: !!refresh } }) }),
    // ── follow-ups, tasks, meetings, SLA (FS08) ──────────
    followUps: b.query({ query: (params = {}) => ({ url: "/followups", params }), providesTags: ["Tasks"] }),
    tasks: b.query({ query: (params = {}) => ({ url: "/tasks", params }), providesTags: ["Tasks"] }),
    leadTasks: b.query({ query: (leadId) => `/leads/${leadId}/tasks`, providesTags: ["Tasks"] }),
    createTask: b.mutation({ query: (body) => ({ url: "/tasks", method: "POST", body }), invalidatesTags: ["Tasks", "Leads", "Dashboard", "Lead"] }),
    updateTask: b.mutation({ query: ({ id, ...body }) => ({ url: `/tasks/${id}`, method: "PATCH", body }), invalidatesTags: ["Tasks", "Leads", "Dashboard", "Lead", "Counts"] }),
    meetings: b.query({ query: (params = {}) => ({ url: "/meetings", params }), providesTags: ["Meetings"] }),
    createMeeting: b.mutation({ query: (body) => ({ url: "/meetings", method: "POST", body }), invalidatesTags: ["Meetings", "Tasks", "Lead", "Leads", "Dashboard"] }),
    updateMeeting: b.mutation({ query: ({ id, ...body }) => ({ url: `/meetings/${id}`, method: "PATCH", body }), invalidatesTags: ["Meetings", "Tasks", "Lead", "Leads", "Dashboard"] }),
    slaSettings: b.query({ query: () => "/sla", providesTags: ["Sla"] }),
    updateSla: b.mutation({ query: (body) => ({ url: "/sla", method: "PATCH", body }), invalidatesTags: ["Sla"] }),
    // ── proposals, payments, onboarding, revenue (FS09) ──
    proposals: b.query({ query: (params = {}) => ({ url: "/proposals", params }), providesTags: ["Proposals"] }),
    leadProposals: b.query({ query: (leadId) => `/leads/${leadId}/proposals`, providesTags: ["Proposals"] }),
    proposalSettings: b.query({ query: () => "/proposal-settings", providesTags: ["Sla"], keepUnusedDataFor: 600 }),
    updateProposalSettings: b.mutation({ query: (body) => ({ url: "/proposal-settings", method: "PATCH", body }), invalidatesTags: ["Sla"] }),
    createProposal: b.mutation({ query: ({ leadId, ...body }) => ({ url: `/leads/${leadId}/proposals`, method: "POST", body }), invalidatesTags: ["Proposals", "Lead", "Leads", "Dashboard"] }),
    proposalPdf: b.mutation({ query: (id) => ({ url: `/proposals/${id}/pdf` }) }),
    sendProposal: b.mutation({ query: ({ id, via }) => ({ url: `/proposals/${id}/send`, method: "POST", body: { via } }), invalidatesTags: ["Proposals", "Lead", "Leads", "Dashboard", "Conversation", "Conversations"] }),
    proposalOutcome: b.mutation({ query: ({ id, ...body }) => ({ url: `/proposals/${id}/outcome`, method: "POST", body }), invalidatesTags: ["Proposals", "Lead", "Leads", "Dashboard"] }),
    decideDiscount: b.mutation({ query: ({ id, ...body }) => ({ url: `/proposals/${id}/decide`, method: "POST", body }), invalidatesTags: ["Proposals", "Lead"] }),
    payments: b.query({ query: (params = {}) => ({ url: "/payments", params }), providesTags: ["Payments"] }),
    leadPayments: b.query({ query: (leadId) => `/leads/${leadId}/payments`, providesTags: ["Payments"] }),
    requestPayment: b.mutation({ query: ({ leadId, ...body }) => ({ url: `/leads/${leadId}/payments`, method: "POST", body }), invalidatesTags: ["Payments", "Lead", "Leads", "Dashboard"] }),
    sendPaymentLink: b.mutation({ query: (id) => ({ url: `/payments/${id}/send-link`, method: "POST" }), invalidatesTags: ["Payments", "Conversation", "Conversations"] }),
    checkPayment: b.mutation({ query: (id) => ({ url: `/payments/${id}/check`, method: "POST" }), invalidatesTags: ["Payments"] }),
    submitProof: b.mutation({
      query: ({ id, file, reference }) => {
        const body = new FormData();
        if (file) body.append("file", file);
        if (reference) body.append("reference", reference);
        return { url: `/payments/${id}/proof`, method: "POST", body };
      },
      invalidatesTags: ["Payments"],
    }),
    cancelPayment: b.mutation({ query: ({ id, reason }) => ({ url: `/payments/${id}/cancel`, method: "POST", body: { reason } }), invalidatesTags: ["Payments", "Lead", "Leads"] }),
    verifyPayment: b.mutation({ query: ({ id, ...body }) => ({ url: `/payments/${id}/verify`, method: "POST", body }), invalidatesTags: ["Payments", "Lead", "Leads", "Dashboard", "Revenue"] }),
    leadOnboarding: b.query({ query: (leadId) => `/leads/${leadId}/onboarding`, providesTags: ["Payments"] }),
    revenue: b.query({ query: (params = {}) => ({ url: "/revenue", params }), providesTags: ["Revenue"] }),
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
  useSetChatModeMutation, useChatInsightsQuery, useLeadInsightsQuery, useSuggestRepliesMutation,
  useFollowUpsQuery, useTasksQuery, useLeadTasksQuery, useCreateTaskMutation, useUpdateTaskMutation,
  useMeetingsQuery, useCreateMeetingMutation, useUpdateMeetingMutation, useSlaSettingsQuery, useUpdateSlaMutation, useLazyActivitiesQuery,
  useProposalsQuery, useLeadProposalsQuery, useProposalSettingsQuery, useUpdateProposalSettingsMutation, useCreateProposalMutation, useProposalPdfMutation,
  useSendProposalMutation, useProposalOutcomeMutation, useDecideDiscountMutation, usePaymentsQuery, useLeadPaymentsQuery, useRequestPaymentMutation,
  useSendPaymentLinkMutation, useCheckPaymentMutation, useSubmitProofMutation, useCancelPaymentMutation, useVerifyPaymentMutation, useLeadOnboardingQuery, useRevenueQuery,
} = salesApi;
