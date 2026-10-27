import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { authService, productService, categoryService } from './services/api';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({ supabaseConfigured: true, supabase: { auth: {
  onAuthStateChange: jest.fn(), signOut: jest.fn()
} } }));
jest.mock('./services/api', () => ({
  authService: { getCurrentUser: jest.fn() },
  productService: { getAllProducts: jest.fn(), toggleAvailability: jest.fn(), updateProduct: jest.fn(), deleteProduct: jest.fn() },
  categoryService: { getAllCategories: jest.fn() }
}));
let root, element, emit;
const session = { access_token: 'test-token', user: { id: 'admin-1' } };
const product = { _id: 'cake-1', title: 'Cake', category: 'cakes', price: 'AED 25.00', available: true, createdAt: '2026-01-01' };
const flush = async action => { await act(async () => { if (action) action(); }); };
const button = name => [...element.querySelectorAll('button')].find(b => b.textContent.trim() === name);

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  element = document.createElement('div'); document.body.appendChild(element);
  root = createRoot(element);
  supabase.auth.onAuthStateChange.mockImplementation(callback => {
    emit = callback;
    callback('INITIAL_SESSION', session);
    return { data: { subscription: { unsubscribe() {} } } };
  });
  authService.getCurrentUser.mockResolvedValue({ id: 'admin-1', email: 'admin@example.test' });
  productService.getAllProducts.mockResolvedValue({ data: [product] });
  categoryService.getAllCategories.mockResolvedValue([{ _id: 'cat-1', id: 'cakes', name: 'Cakes', order: 1 }]);
  await flush(() => root.render(<App />));
});
afterEach(async () => { await flush(() => root.unmount()); element.remove(); });

test('tab navigation and acknowledged availability changes require no full-catalog refetch', async () => {
  await flush(() => button('Products').click());
  expect(element.textContent).toContain('Cake');
  productService.toggleAvailability.mockResolvedValue({ data: { ...product, available: false } });
  await flush(() => button('Suspend').click());
  expect(button('Resume')).toBeDefined();
  await flush(() => button('Categories').click());
  expect(element.textContent).toContain('1 product');
  await flush(() => button('Dashboard').click());
  const values = [...element.querySelectorAll('.stat-value')].map(e => e.textContent);
  expect(values).toEqual(['1', '0', '1']);
  await flush(() => button('Products').click());
  expect(productService.getAllProducts).toHaveBeenCalledTimes(1);
  expect(categoryService.getAllCategories).toHaveBeenCalledTimes(1);
});

test('repeated sign-in events keep authorized views visible; refresh revalidates in background', async () => {
  await flush(() => button('Products').click());
  await flush(() => emit('SIGNED_IN', { ...session }));
  expect(element.querySelector('.products-grid')).not.toBeNull();
  expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
  let finish;
  authService.getCurrentUser.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await flush(() => emit('TOKEN_REFRESHED', { ...session, access_token: 'new-test-token' }));
  expect(element.querySelector('.products-grid')).not.toBeNull();
  await flush(() => finish({ id: 'admin-1', email: 'admin@example.test' }));
  expect(productService.getAllProducts).toHaveBeenCalledTimes(1);
});

test('failed writes leave the existing catalog unchanged', async () => {
  const originalAlert = window.alert; window.alert = jest.fn();
  const originalError = console.error; console.error = jest.fn();
  try {
    await flush(() => button('Products').click());
    productService.toggleAvailability.mockRejectedValue(new Error('offline'));
    await flush(() => button('Suspend').click());
    expect(button('Suspend')).toBeDefined();
    expect(window.alert).toHaveBeenCalled();
    expect(productService.getAllProducts).toHaveBeenCalledTimes(1);
  } finally { window.alert = originalAlert; console.error = originalError; }
});

test('server authorization failure removes the cached panel', async () => {
  authService.getCurrentUser.mockRejectedValue(new Error('Access revoked'));
  await flush(() => emit('TOKEN_REFRESHED', { ...session, access_token: 'rejected-token' }));
  expect(element.textContent).toContain('Access revoked');
  expect(element.querySelector('.container')).toBeNull();
});


test('confirmed deletion updates the catalog and category counts without a reload', async () => {
  const originalConfirm = window.confirm; window.confirm = () => true;
  try {
    productService.deleteProduct.mockResolvedValue({ success: true, data: {} });
    await flush(() => button('Products').click());
    await flush(() => button('Delete').click());
    expect(element.querySelector('.product-card')).toBeNull();
    await flush(() => button('Categories').click());
    expect(element.textContent).toContain('0 products');
    expect(productService.getAllProducts).toHaveBeenCalledTimes(1);
  } finally { window.confirm = originalConfirm; }
});

test('switching accounts hides the previous catalog until the new account is verified', async () => {
  let finish;
  authService.getCurrentUser.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await flush(() => emit('SIGNED_IN', { access_token: 'other-token', user: { id: 'admin-2' } }));
  expect(element.querySelector('.container')).toBeNull();
  expect(element.textContent).toContain('Checking your sign-in');
  productService.getAllProducts.mockResolvedValue({ data: [] });
  await flush(() => finish({ id: 'admin-2', email: 'other@example.test' }));
  expect(element.textContent).toContain('other@example.test');
  expect([...element.querySelectorAll('.stat-value')].map(e => e.textContent)).toEqual(['0', '0', '0']);
  expect(productService.getAllProducts).toHaveBeenCalledTimes(2);
});
