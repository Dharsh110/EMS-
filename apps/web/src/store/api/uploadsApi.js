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
export const uploadsApi = createApi({
    reducerPath: 'uploadsApi',
    baseQuery: rawBaseQuery,
    tagTypes: ['Upload'],
    endpoints: (builder) => ({
        getMyUploads: builder.query({
            queryFn: async (_arg, _api, _extra, baseQuery) => {
                const result = await baseQuery('/uploads/my');
                const data = result.data?.data;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { data: [] };
            },
            providesTags: (result) => result ? [...result.map((u) => ({ type: 'Upload', id: u._id })), { type: 'Upload', id: 'MINE' }] : [{ type: 'Upload', id: 'MINE' }],
        }),
        // The list endpoint excludes `data` (base64) for performance — fetch the full record
        // on demand only when actually viewing/downloading a file (see apps/api/src/controllers/uploadController.ts).
        getUploadById: builder.query({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery(`/uploads/${id}`);
                const data = result.data?.data;
                if (!result.error && data)
                    return { data };
                if (result.error)
                    return { error: result.error };
                return { data: null };
            },
            providesTags: (_r, _e, id) => [{ type: 'Upload', id }],
        }),
        uploadFile: builder.mutation({
            queryFn: async (body, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/uploads', method: 'POST', body });
                const data = result.data?.data;
                if (!result.error && data)
                    return { data };
                if (result.error)
                    return { error: result.error };
                return { error: { status: 'CUSTOM_ERROR', error: 'Upload failed' } };
            },
            invalidatesTags: [{ type: 'Upload', id: 'MINE' }],
        }),
        updateUpload: builder.mutation({
            queryFn: async ({ id, ...body }, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/uploads/${id}`, method: 'PUT', body });
                const data = result.data?.data;
                if (!result.error && data)
                    return { data };
                if (result.error)
                    return { error: result.error };
                return { error: { status: 'CUSTOM_ERROR', error: 'Update failed' } };
            },
            invalidatesTags: (_r, _e, { id }) => [{ type: 'Upload', id }, { type: 'Upload', id: 'MINE' }],
        }),
        deleteUpload: builder.mutation({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/uploads/${id}`, method: 'DELETE' });
                if (!result.error)
                    return { data: { message: 'File deleted.' } };
                return { error: result.error };
            },
            invalidatesTags: (_r, _e, id) => [{ type: 'Upload', id }, { type: 'Upload', id: 'MINE' }],
        }),
    }),
});
export const { useGetMyUploadsQuery, useLazyGetUploadByIdQuery, useUploadFileMutation, useUpdateUploadMutation, useDeleteUploadMutation, } = uploadsApi;
