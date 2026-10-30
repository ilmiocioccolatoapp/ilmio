import axios from 'axios';
import api from './api';
import { supabase } from '../supabase';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      request: jest.fn()
    })),
    post: jest.fn()
  }
}));

jest.mock('../supabase', () => ({
  supabase: { auth: { getSession: jest.fn(), refreshSession: jest.fn() } }
}));

const responseErrorHandler = api.interceptors.response.use.mock.calls[0][1];

beforeEach(() => {
  jest.clearAllMocks();
});

test('refreshes an expired admin session once and retries the failed request', async () => {
  const client = api;
  const config = { headers: { Accept: 'application/json' } };
  const response = { data: { success: true } };
  supabase.auth.refreshSession.mockResolvedValue({
    data: { session: { access_token: 'fresh-access-token' } },
    error: null
  });
  client.request.mockResolvedValue(response);

  await expect(responseErrorHandler({
    config,
    response: { status: 401, data: { error: 'Could not verify your admin session.' } }
  })).resolves.toBe(response);

  expect(supabase.auth.refreshSession).toHaveBeenCalledTimes(1);
  expect(client.request).toHaveBeenCalledWith({
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer fresh-access-token'
    },
    adminAuthRetried: true
  });
});

test('does not retry indefinitely when the refreshed admin session is rejected', async () => {
  const client = api;
  const config = { adminAuthRetried: true, headers: {} };
  const error = {
    config,
    response: { status: 401, data: { error: 'Could not verify your admin session.' } }
  };

  await expect(responseErrorHandler(error)).rejects.toEqual(error.response.data);
  expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
  expect(client.request).not.toHaveBeenCalled();
});
