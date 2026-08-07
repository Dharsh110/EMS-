import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/apiConfig';
const rawBaseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
        const token = localStorage.getItem('ems_token');
        if (token)
            headers.set('Authorization', `Bearer ${token}`);
        return headers;
    },
});
export const timesheetsApi = createApi({
    reducerPath: 'timesheetsApi',
    baseQuery: rawBaseQuery,
    tagTypes: ['Timesheet'],
    endpoints: (builder) => ({
        getMyTimesheets: builder.query({
            queryFn: async (arg, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/timesheets/my', params: arg || {} });
                const data = result.data?.data;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: [{ type: 'Timesheet', id: 'MINE' }],
        }),
        saveTimesheetDraft: builder.mutation({
            queryFn: async (body, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/timesheets', method: 'POST', body });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Timesheet', id: 'MINE' }, { type: 'Timesheet', id: 'LIST' }],
        }),
        submitTimesheet: builder.mutation({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/timesheets/${id}/submit`, method: 'PUT' });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Timesheet', id: 'MINE' }, { type: 'Timesheet', id: 'LIST' }],
        }),
        resubmitTimesheet: builder.mutation({
            queryFn: async ({ id, entries }, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/timesheets/${id}/resubmit`, method: 'PUT', body: { entries } });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Timesheet', id: 'MINE' }, { type: 'Timesheet', id: 'LIST' }],
        }),
        getAllTimesheets: builder.query({
            queryFn: async (arg, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/timesheets', params: { limit: 200, ...(arg || {}) } });
                const data = result.data?.data;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: [{ type: 'Timesheet', id: 'LIST' }],
        }),
        approveTimesheet: builder.mutation({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/timesheets/${id}/approve`, method: 'PUT' });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Timesheet', id: 'LIST' }],
        }),
        rejectTimesheet: builder.mutation({
            queryFn: async ({ id, reason }, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/timesheets/${id}/reject`, method: 'PUT', body: { reason } });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Timesheet', id: 'LIST' }],
        }),
        getTimesheetSummary: builder.query({
            queryFn: async (arg, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/timesheets/summary', params: arg || {} });
                const parsed = result.data;
                if (!result.error && parsed?.summary)
                    return { data: parsed.summary };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: [{ type: 'Timesheet', id: 'SUMMARY' }],
        }),
    }),
});
export const { useGetMyTimesheetsQuery, useSaveTimesheetDraftMutation, useSubmitTimesheetMutation, useResubmitTimesheetMutation, useGetAllTimesheetsQuery, useApproveTimesheetMutation, useRejectTimesheetMutation, useGetTimesheetSummaryQuery, } = timesheetsApi;
