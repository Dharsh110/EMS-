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
export const payrollApi = createApi({
    reducerPath: 'payrollApi',
    baseQuery: rawBaseQuery,
    tagTypes: ['Payroll'],
    endpoints: (builder) => ({
        getPayroll: builder.query({
            queryFn: async (arg, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/payroll', params: { limit: 100, ...(arg || {}) } });
                const data = result.data?.data;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: (result) => result ? [...result.map((p) => ({ type: 'Payroll', id: p._id })), { type: 'Payroll', id: 'LIST' }] : [{ type: 'Payroll', id: 'LIST' }],
        }),
        getMyPayslips: builder.query({
            queryFn: async (_arg, _api, _extra, baseQuery) => {
                const result = await baseQuery('/payroll/my');
                const data = result.data?.data;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: [{ type: 'Payroll', id: 'MINE' }],
        }),
        generatePayroll: builder.mutation({
            queryFn: async (body, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/payroll/generate', method: 'POST', body });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Payroll', id: 'LIST' }],
        }),
        processPayment: builder.mutation({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/payroll/${id}/pay`, method: 'PUT' });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: (_r, _e, id) => [{ type: 'Payroll', id }, { type: 'Payroll', id: 'LIST' }],
        }),
    }),
});
export const { useGetPayrollQuery, useGetMyPayslipsQuery, useGeneratePayrollMutation, useProcessPaymentMutation, } = payrollApi;
