import axios from 'axios';
import api, { createCatalogServices } from './api';
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

test('sends drink sizes and add-on groups with the product catalog request', async () => {
  const sizes=[{id:'size-small',name:'Small',priceAmount:'12.00'}];
  const addOnGroups=[{
    id:'milk-group',
    name:'Milk options',
    selection:'single',
    options:[{id:'oat-milk',name:'Oat milk',priceAmount:'2.00'}]
  }];
  api.post=jest.fn().mockResolvedValue({data:{data:{
    id:'latte-1',name:'Latte',category:{code:'drinks'},priceAmount:'12.00',currency:'AED',sizes,addOnGroups
  }}});
  const services=createCatalogServices({id:'brand-1'});
  const result=await services.productService.createProduct({fields:{
    title:'Latte',category:'drinks',description:'Coffee',ingredients:'Coffee, milk',
    price:'AED 12.00',available:true,sizes,addOnGroups
  },file:null});
  expect(api.post).toHaveBeenCalledWith('/admin/brands/brand-1/items',expect.objectContaining({
    sizes,
    addOnGroups
  }));
  expect(result.data.sizes).toEqual(sizes);
  expect(result.data.addOnGroups).toEqual(addOnGroups);
});
