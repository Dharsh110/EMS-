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
export const tasksApi = createApi({
    reducerPath: 'tasksApi',
    baseQuery: rawBaseQuery,
    tagTypes: ['Task'],
    endpoints: (builder) => ({
        getTasks: builder.query({
            queryFn: async (arg, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/tasks', params: { limit: 100, ...(arg || {}) } });
                const data = result.data?.data;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: (result) => result ? [...result.map((t) => ({ type: 'Task', id: t._id })), { type: 'Task', id: 'LIST' }] : [{ type: 'Task', id: 'LIST' }],
        }),
        getMyTasks: builder.query({
            queryFn: async (_arg, _api, _extra, baseQuery) => {
                const result = await baseQuery('/tasks/my');
                const data = result.data?.data;
                if (!result.error && Array.isArray(data))
                    return { data };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            providesTags: [{ type: 'Task', id: 'MINE' }],
        }),
        createTask: builder.mutation({
            queryFn: async (body, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: '/tasks', method: 'POST', body });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Task', id: 'LIST' }, { type: 'Task', id: 'MINE' }],
        }),
        updateTask: builder.mutation({
            queryFn: async ({ id, ...body }, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/tasks/${id}`, method: 'PUT', body });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: (_r, _e, { id }) => [{ type: 'Task', id }, { type: 'Task', id: 'LIST' }, { type: 'Task', id: 'MINE' }],
        }),
        // Employees are only authorized to update tasks via /submit — PUT /tasks/:id is admin/manager-only
        // (see apps/api/src/routes/task.ts).
        submitTaskUpdate: builder.mutation({
            queryFn: async ({ id, ...body }, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/tasks/${id}/submit`, method: 'PUT', body });
                const saved = result.data?.data;
                if (!result.error && saved)
                    return { data: saved };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: (_r, _e, { id }) => [{ type: 'Task', id }, { type: 'Task', id: 'LIST' }, { type: 'Task', id: 'MINE' }],
        }),
        deleteTask: builder.mutation({
            queryFn: async (id, _api, _extra, baseQuery) => {
                const result = await baseQuery({ url: `/tasks/${id}`, method: 'DELETE' });
                if (!result.error)
                    return { data: { message: 'Task deleted.' } };
                return { error: result.error ?? { status: 'CUSTOM_ERROR', error: 'Unexpected response from server' } };
            },
            invalidatesTags: [{ type: 'Task', id: 'LIST' }],
        }),
    }),
});
export const { useGetTasksQuery, useGetMyTasksQuery, useCreateTaskMutation, useUpdateTaskMutation, useSubmitTaskUpdateMutation, useDeleteTaskMutation, } = tasksApi;
