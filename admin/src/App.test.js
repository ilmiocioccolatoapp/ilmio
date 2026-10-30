import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { authService, productService, categoryService, createCatalogServices, platformService } from './services/api';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({ supabaseConfigured: true, supabase: { auth: {
  onAuthStateChange: jest.fn(), signOut: jest.fn()
} } }));
jest.mock('./services/api', () => ({
  authService: { getCurrentUser: jest.fn() },
  createCatalogServices: jest.fn(),
  platformService: {get:jest.fn(),post:jest.fn(),put:jest.fn(),remove:jest.fn()},
  productService: { getAllProducts: jest.fn(), toggleAvailability: jest.fn(), updateProduct: jest.fn(), deleteProduct: jest.fn() },
  categoryService: { getAllCategories: jest.fn() }
}));
let root, element, emit;
const session = { access_token: 'test-token', user: { id: 'admin-1' } };
const membership = {profileId:'profile-1',orgMemberships:[],brandMemberships:[{brandId:'brand-1',role:'BRAND_ADMIN'}],orgs:[{id:'org-1',name:'Owner'}],brands:[{id:'brand-1',orgId:'org-1',name:'Il Mio',currency:'AED',timezone:'Asia/Dubai'}]};
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
  authService.getCurrentUser.mockResolvedValue({...membership, id: 'admin-1', email: 'admin@example.test' });
  createCatalogServices.mockReturnValue({productService,categoryService});
  platformService.get.mockResolvedValue([]);
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
  await flush(() => button('Overview').click());
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
  await flush(() => finish({...membership, id: 'admin-1', email: 'admin@example.test' }));
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
  expect(element.querySelector('.workspace')).toBeNull();
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
  expect(element.querySelector('.workspace')).toBeNull();
  expect(element.textContent).toContain('Checking your sign-in');
  productService.getAllProducts.mockResolvedValue({ data: [] });
  await flush(() => finish({...membership, id: 'admin-2', email: 'other@example.test' }));
  expect(element.textContent).toContain('other@example.test');
  expect([...element.querySelectorAll('.stat-value')].map(e => e.textContent)).toEqual(['0', '0', '0']);
  expect(productService.getAllProducts).toHaveBeenCalledTimes(2);
});

test('overview quick actions use the live catalog and open the working editor', async () => {
  expect(element.textContent).toContain('Good to see you.');
  expect(element.textContent).toContain('Everything is ready for service');
  await flush(() => button('Manage products').click());
  expect(element.querySelector('.products-grid')).not.toBeNull();
  await flush(() => button('Overview').click());
  await flush(() => button('Manage categories').click());
  expect(element.querySelector('.category-card')).not.toBeNull();
  await flush(() => button('Overview').click());
  await flush(() => button('Add product').click());
  expect(element.querySelector('#title')).not.toBeNull();
  expect(element.querySelector('#price')).not.toBeNull();
  expect(productService.getAllProducts).toHaveBeenCalledTimes(1);
  expect(categoryService.getAllCategories).toHaveBeenCalledTimes(1);
});

test('same-user brand switches discard old reads and clear the previous product editor', async () => {
  let finishOld;
  const betaProducts = { ...productService, getAllProducts: jest.fn().mockResolvedValue({data:[{...product,_id:'tea-2',title:'Beta Tea'}]}) };
  const both = {...membership,brands:[...membership.brands,{id:'brand-2',orgId:'org-1',name:'Beta',currency:'AED'}],brandMemberships:[...membership.brandMemberships,{brandId:'brand-2',role:'BRAND_ADMIN'}]};
  createCatalogServices.mockImplementation(brand => ({productService:brand.id==='brand-2'?betaProducts:productService,categoryService}));
  productService.getAllProducts.mockReturnValue(new Promise(resolve => {finishOld=resolve;}));
  authService.getCurrentUser.mockResolvedValue({...both,id:'admin-1',email:'admin@example.test'});
  await flush(() => emit('TOKEN_REFRESHED',{...session,access_token:'more-brands-token'}));
  await flush(() => button('Products').click());
  const selector=element.querySelector('select[aria-label="Brand"]');
  await flush(() => {selector.value='brand-2';selector.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(element.textContent).toContain('Beta Tea');
  await flush(() => finishOld({data:[{...product,title:'Late private A data'}]}));
  expect(element.textContent).not.toContain('Late private A data');
  expect(element.querySelector('.product-form-container')).toBeNull();
  expect(betaProducts.getAllProducts).toHaveBeenCalledTimes(1);
});

test('brand settings use the persistence endpoint and surface failed writes', async () => {
  await flush(() => button('Settings').click());
  expect(element.querySelector('#slug')).toBeNull();
  platformService.put.mockResolvedValue({});
  const form=element.querySelector('form');
  await flush(() => form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(platformService.put).toHaveBeenCalledWith('/brands/brand-1/settings',expect.objectContaining({name:'Il Mio',currency:'AED'}));
  expect(element.textContent).toContain('Settings saved as a draft');
  platformService.put.mockRejectedValue({error:'Could not save this brand'});
  await flush(() => form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(element.textContent).toContain('Could not save this brand');
});

test('organization administrators only see store operations, not brand catalog tools', async () => {
  authService.getCurrentUser.mockResolvedValue({...membership,brandMemberships:[],orgMemberships:[{orgId:'org-1',role:'ORG_ADMIN'}],id:'admin-1',email:'owner@example.test'});
  createCatalogServices.mockClear();
  platformService.get.mockClear();
  await flush(() => emit('TOKEN_REFRESHED',{...session,access_token:'org-admin-token'}));
  expect(button('Stores & owners')).toBeDefined();
  expect(button('Products')).toBeUndefined();
  expect(button('Categories')).toBeUndefined();
  expect(button('Settings')).toBeUndefined();
  expect(createCatalogServices).not.toHaveBeenCalled();
  expect(element.textContent).not.toContain('Create brand');
});

test('Platform Admin can create brands and invite brand administrators from the Brands screen', async () => {
  const platformUser={...membership,isPlatformAdmin:true,orgs:[{id:'org-1',name:'Owner'}],id:'admin-1',email:'platform@example.test'};
  authService.getCurrentUser.mockResolvedValue(platformUser);
  platformService.get.mockResolvedValue([]);
  await flush(() => emit('TOKEN_REFRESHED',{...session,access_token:'platform-token'}));
  expect(button('Brands')).toBeDefined();
  await flush(() => button('Brands').click());
  expect(element.textContent).toContain('Create brand');
  expect(element.textContent).toContain('Invite brand administrator');
  const email=element.querySelector('input[type="email"]');
  const setValue=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  await flush(()=>{setValue.call(email,'brandadmin@example.test');email.dispatchEvent(new Event('input',{bubbles:true}));});
  platformService.post.mockResolvedValue({membership:{id:'membership-1'},inviteSent:true});
  const inviteForm=email.closest('form');
  await flush(()=>inviteForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(platformService.post).toHaveBeenCalledWith('/brands/brand-1/admins',expect.objectContaining({email:'brandadmin@example.test'}));
  expect(element.textContent).toContain('Invitation email sent');
});

test('Platform Admin can find tablet credentials from Stores & owners', async () => {
  const platformUser={...membership,isPlatformAdmin:true,orgs:[{id:'org-1',name:'Owner'}],id:'admin-1',email:'platform@example.test'};
  authService.getCurrentUser.mockResolvedValue(platformUser);
  platformService.get.mockImplementation(path => Promise.resolve(path.endsWith('/stores') ? [{
    id:'store-1',name:'Main store',loginCode:'ilmio-main',status:'active',passwordConfigured:true,assignments:[]
  }] : []));
  await flush(() => emit('TOKEN_REFRESHED',{...session,access_token:'platform-store-token'}));
  await flush(() => button('Stores & owners').click());
  expect(element.textContent).toContain('Stores & tablet access');
  await flush(() => element.querySelector('.branch-card').click());
  expect(element.textContent).toContain('Tablet Store ID: ilmio-main');
  expect(element.textContent).toContain('Store ID: ilmio-main');
  expect(element.textContent).toContain('Set — hidden for security');
  expect(button('Show login QR')).toBeDefined();
  expect(button('Reset tablet password')).toBeDefined();
  await flush(() => button('Reset tablet password').click());
  expect(element.querySelector('input[type="password"]').minLength).toBe(6);
});

test('opening a store card scopes the brand menu editor to that branch', async () => {
  const platformUser={...membership,isPlatformAdmin:true,orgs:[{id:'org-1',name:'Owner'}],id:'admin-1',email:'platform@example.test'};
  authService.getCurrentUser.mockResolvedValue(platformUser);
  platformService.get.mockImplementation(path => {
    if(path==='/orgs/org-1/stores') return Promise.resolve([{
      id:'store-1',orgId:'org-1',name:'Main branch',loginCode:'main-branch',status:'active',passwordConfigured:true,
      assignments:[{id:'assignment-1',brand:{id:'brand-1',name:'Il Mio'},status:'active',unpublishedChanges:false}]
    }]);
    if(path==='/brands/brand-1/stores') return Promise.resolve([{
      id:'assignment-1',storeId:'store-1',store:{id:'store-1',name:'Main branch'},status:'active',overrides:[]
    }]);
    return Promise.resolve([]);
  });
  await flush(() => emit('TOKEN_REFRESHED',{...session,access_token:'platform-branch-menu-token'}));
  await flush(() => button('Stores & owners').click());
  await flush(() => element.querySelector('.branch-card').click());
  expect(element.textContent).toContain('Menus at this branch');
  await flush(() => button('Manage branch menu').click());
  expect(element.textContent).toContain('Main branch — Il Mio menu');
  expect(element.textContent).toContain('Publish to this store');
  expect(button('← Back to branch')).toBeDefined();
  await flush(() => button('← Back to branch').click());
  expect(element.textContent).toContain('Tablet Store ID: main-branch');
  await flush(() => button('← All stores').click());
  expect(element.querySelector('.branch-card')).not.toBeNull();
});
