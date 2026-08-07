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
export const messagesApi = createApi({
    reducerPath: 'messagesApi',
    baseQuery: rawBaseQuery,
    tagTypes: ['Message'],
    endpoints: (builder) => ({
        getSent: builder.query({
            queryFn: async (_arg, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/messages', params: { type: 'sent' } });
                const data = result.data?.messages;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: [{ type: 'Message', id: 'SENT' }],
        }),
        getInbox: builder.query({
            queryFn: async (_arg, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/messages', params: { type: 'inbox' } });
                const data = result.data?.messages;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: [{ type: 'Message', id: 'INBOX' }],
        }),
        sendMessage: builder.mutation({
            queryFn: async (body, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/messages', method: 'POST', body });
                const saved = result.data?.message;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Message', id: 'SENT' }],
        }),
        markMessageRead: builder.mutation({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/messages/${id}/read`, method: 'PUT' });
                if (!result.error)
                    return { data: { message: 'Marked read' } };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Message', id: 'INBOX' }],
        }),
        deleteMessage: builder.mutation({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/messages/${id}`, method: 'DELETE' });
                if (!result.error)
                    return { data: { message: 'Deleted' } };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Message', id: 'SENT' }],
        }),
    }),
});
export const { useGetSentQuery, useGetInboxQuery, useSendMessageMutation, useMarkMessageReadMutation, useDeleteMessageMutation, } = messagesApi;
