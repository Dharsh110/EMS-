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
export const departmentsApi = createApi({
    reducerPath: 'departmentsApi',
    baseQuery: rawBaseQuery,
    tagTypes: ['Department'],
    endpoints: (builder) => ({
        getDepartments: builder.query({
            queryFn: async (_arg, _api, _extra, baseQuery) => {
                const result = await baseQuery('/departments');
                const data = result.data?.data;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: (result) => result
                ? [...result.map((d) => ({ type: 'Department', id: d._id })), { type: 'Department', id: 'LIST' }]
                : [{ type: 'Department', id: 'LIST' }],
        }),
        createDepartment: builder.mutation({
            queryFn: async (body, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/departments', method: 'POST', body });
                const parsed = result.data;
                if (!result.error && parsed?.data)
                    return { data: { department: parsed.data, credentials: parsed.credentials, headError: parsed.headError } };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Department', id: 'LIST' }],
        }),
        updateDepartment: builder.mutation({
            queryFn: async ({ id, ...body }, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/departments/${id}`, method: 'PUT', body });
                const parsed = result.data;
                if (!result.error && parsed?.data)
                    return { data: { department: parsed.data, credentials: parsed.credentials } };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: (_r, _e, { id }) => [{ type: 'Department', id }, { type: 'Department', id: 'LIST' }],
        }),
        deleteDepartment: builder.mutation({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/departments/${id}`, method: 'DELETE' });
                if (!result.error)
                    return { data: { message: 'Department deactivated.' } };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Department', id: 'LIST' }],
        }),
    }),
});
export const { useGetDepartmentsQuery, useCreateDepartmentMutation, useUpdateDepartmentMutation, useDeleteDepartmentMutation, } = departmentsApi;
