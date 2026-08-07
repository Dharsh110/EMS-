import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/apiConfig';
const mapComments = (comments) => (comments || []).map((c) => ({ id: c._id, by: c.authorName, role: c.authorRole, text: c.text, at: c.createdAt }));
const mapReport = (r) => ({ ...r, comments: mapComments(r.comments) });
const rawBaseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
        const token = localStorage.getItem('ems_token');
        if (token)
            headers.set('Authorization', `Bearer ${token}`);
        return headers;
    },
});
export const dailyReportsApi = createApi({
    reducerPath: 'dailyReportsApi',
    baseQuery: rawBaseQuery,
    tagTypes: ['DailyReport'],
    endpoints: (builder) => ({
        getDailyReports: builder.query({
            queryFn: async (arg, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/daily-reports', params: arg || {} });
                const reports = result.data?.reports;
                if (!result.error && Array.isArray(reports))
                    return { data: reports.map(mapReport) };
                return { data: [] };
            },
            providesTags: [{ type: 'DailyReport', id: 'LIST' }],
        }),
        getMyDailyReports: builder.query({
            queryFn: async (_arg, _api, _extra, baseQuery) => {
                const result = await baseQuery('/daily-reports/mine');
                const reports = result.data?.reports;
                if (!result.error && Array.isArray(reports))
                    return { data: reports.map(mapReport) };
                return { data: [] };
            },
            providesTags: [{ type: 'DailyReport', id: 'MINE' }],
        }),
        createDailyReport: builder.mutation({
            queryFn: async (body, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/daily-reports', method: 'POST', body });
                const report = result.data?.report;
                if (!result.error && report)
                    return { data: mapReport(report) };
                if (result.error)
                    return { error: result.error };
                return { error: { status: 'CUSTOM_ERROR', error: 'Failed to submit report' } };
            },
            invalidatesTags: [{ type: 'DailyReport', id: 'LIST' }, { type: 'DailyReport', id: 'MINE' }],
        }),
        updateDailyReport: builder.mutation({
            queryFn: async ({ id, ...body }, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/daily-reports/${id}`, method: 'PUT', body });
                const report = result.data?.report;
                if (!result.error && report)
                    return { data: mapReport(report) };
                if (result.error)
                    return { error: result.error };
                return { error: { status: 'CUSTOM_ERROR', error: 'Failed to update report' } };
            },
            invalidatesTags: (_r, _e, { id }) => [{ type: 'DailyReport', id }, { type: 'DailyReport', id: 'LIST' }, { type: 'DailyReport', id: 'MINE' }],
        }),
        deleteDailyReport: builder.mutation({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/daily-reports/${id}`, method: 'DELETE' });
                if (!result.error)
                    return { data: { message: 'Report deleted.' } };
                return { error: result.error };
            },
            invalidatesTags: [{ type: 'DailyReport', id: 'LIST' }, { type: 'DailyReport', id: 'MINE' }],
        }),
        addDailyReportComment: builder.mutation({
            queryFn: async ({ id, text }, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/daily-reports/${id}/comments`, method: 'POST', body: { text } });
                const report = result.data?.report;
                if (!result.error && report)
                    return { data: mapReport(report) };
                if (result.error)
                    return { error: result.error };
                return { error: { status: 'CUSTOM_ERROR', error: 'Failed to add comment' } };
            },
            invalidatesTags: [{ type: 'DailyReport', id: 'LIST' }, { type: 'DailyReport', id: 'MINE' }],
        }),
    }),
});
export const { useGetDailyReportsQuery, useGetMyDailyReportsQuery, useCreateDailyReportMutation, useUpdateDailyReportMutation, useDeleteDailyReportMutation, useAddDailyReportCommentMutation, } = dailyReportsApi;
