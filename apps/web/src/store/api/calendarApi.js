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
export const calendarApi = createApi({
    reducerPath: 'calendarApi',
    baseQuery: rawBaseQuery,
    tagTypes: ['CalendarEvent'],
    endpoints: (builder) => ({
        getEvents: builder.query({
            queryFn: async (_arg, _api, _extra, baseQuery) => {
                const result = await baseQuery('/calendar');
                const data = result.data?.data;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: [{ type: 'CalendarEvent', id: 'LIST' }],
        }),
        createEvent: builder.mutation({
            queryFn: async (body, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/calendar', method: 'POST', body });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'CalendarEvent', id: 'LIST' }],
        }),
        deleteEvent: builder.mutation({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/calendar/${id}`, method: 'DELETE' });
                if (!result.error)
                    return { data: { message: 'Deleted' } };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'CalendarEvent', id: 'LIST' }],
        }),
    }),
});
export const { useGetEventsQuery, useCreateEventMutation, useDeleteEventMutation } = calendarApi;
