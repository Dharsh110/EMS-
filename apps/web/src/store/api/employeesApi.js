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
export const employeesApi = createApi({
    reducerPath: 'employeesApi',
    baseQuery: rawBaseQuery,
    tagTypes: ['Employee'],
    endpoints: (builder) => ({
        getEmployees: builder.query({
            queryFn: async (_arg, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/employees', params: { limit: 1000 } });
                const data = result.data?.data;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: (result) => result
                ? [...result.map((e) => ({ type: 'Employee', id: e._id })), { type: 'Employee', id: 'LIST' }]
                : [{ type: 'Employee', id: 'LIST' }],
        }),
        createEmployee: builder.mutation({
            queryFn: async (body, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/employees', method: 'POST', body });
                const parsed = result.data;
                if (!result.error && parsed?.data)
                    return { data: { ...parsed.data, credentials: parsed.credentials } };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Employee', id: 'LIST' }],
        }),
        updateEmployee: builder.mutation({
            queryFn: async ({ id, ...body }, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/employees/${id}`, method: 'PUT', body });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Employee', id },
                { type: 'Employee', id: 'LIST' },
            ],
        }),
        getMyProfile: builder.query({
            queryFn: async (_arg, _api, _extra, baseQuery) => {
                const result = await baseQuery('/employees/me/profile');
                const data = result.data?.data;
                if (!result.error)
                    return { data: data ?? null };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: [{ type: 'Employee', id: 'ME' }],
        }),
        updateMyProfile: builder.mutation({
            queryFn: async (body, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/employees/me/profile', method: 'PUT', body });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Employee', id: 'ME' }],
        }),
        deleteEmployee: builder.mutation({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/employees/${id}`, method: 'DELETE' });
                if (!result.error)
                    return { data: { message: 'Employee deactivated.' } };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Employee', id: 'LIST' }],
        }),
    }),
});
export const { useGetEmployeesQuery, useCreateEmployeeMutation, useUpdateEmployeeMutation, useDeleteEmployeeMutation, useGetMyProfileQuery, useUpdateMyProfileMutation, } = employeesApi;
