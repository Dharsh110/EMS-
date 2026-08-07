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
export const leavesApi = createApi({
    reducerPath: 'leavesApi',
    baseQuery: rawBaseQuery,
    tagTypes: ['Leave'],
    endpoints: (builder) => ({
        getLeaves: builder.query({
            queryFn: async (arg, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/leaves', params: { limit: 100, ...(arg || {}) } });
                const data = result.data?.data;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: (result) => result ? [...result.map((l) => ({ type: 'Leave', id: l._id })), { type: 'Leave', id: 'LIST' }] : [{ type: 'Leave', id: 'LIST' }],
        }),
        getMyLeaves: builder.query({
            queryFn: async (_arg, _api, _extra, baseQuery) => {
                const result = await baseQuery('/leaves/my');
                const data = result.data?.data;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: [{ type: 'Leave', id: 'MINE' }],
        }),
        applyLeave: builder.mutation({
            queryFn: async (body, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/leaves', method: 'POST', body });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Leave', id: 'LIST' }, { type: 'Leave', id: 'MINE' }],
        }),
        updateLeaveStatus: builder.mutation({
            queryFn: async ({ id, status, reason }, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/leaves/${id}/status`, method: 'PUT', body: { status, rejectionReason: reason } });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: (_r, _e, { id }) => [{ type: 'Leave', id }, { type: 'Leave', id: 'LIST' }, { type: 'Leave', id: 'MINE' }],
        }),
        cancelLeave: builder.mutation({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/leaves/${id}/cancel`, method: 'DELETE' });
                if (!result.error)
                    return { data: { message: 'Leave cancelled.' } };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Leave', id: 'LIST' }, { type: 'Leave', id: 'MINE' }],
        }),
    }),
});
export const { useGetLeavesQuery, useGetMyLeavesQuery, useApplyLeaveMutation, useUpdateLeaveStatusMutation, useCancelLeaveMutation, } = leavesApi;
