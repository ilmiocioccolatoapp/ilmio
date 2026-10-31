import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { authService, productService, categoryService, createCatalogServices, platformService } from './services/api';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({ supabaseConfigured: true, supabase: { auth: {
  onAuthStateChange: jest.fn(), signOut: jest.fn()
} } }));
jest.mock('./services/api', () => ({
  authService: { getCurrentUser: jest.fn(), getBootstrap: jest.fn() },
  createCatalogServices: jest.fn(),
  platformService: {get:jest.fn(),post:jest.fn(),put:jest.fn(),remove:jest.fn()},
  productService: { getAllProducts: jest.fn(), toggleAvailability: jest.fn(), updateProduct: jest.fn(), createProduct: jest.fn(), deleteProduct: jest.fn() },
  categoryService: { getAllCategories: jest.fn() }
}));
let root, element, emit;
const session = { access_token: 'test-token', user: { id: 'admin-1' } };
const membership = {profileId:'profile-1',orgMemberships:[],brandMemberships:[{brandId:'brand-1',role:'BRAND_ADMIN'}],orgs:[{id:'org-1',name:'Owner'}],brands:[{id:'brand-1',orgId:'org-1',name:'Il Mio',currency:'AED',timezone:'Asia/Dubai'}]};
const product = {
  _id: 'cake-1', title: 'Cake', category: 'cakes', price: 'AED 25.00',
  image: 'https://example.test/cake.jpg', description: 'Chocolate cake', ingredients: 'Cocoa',
  sizes: [{ id: 'size-small', name: 'Small', priceAmount: '12.00' }],
  addOnGroups: [{ id: 'group-shot', name: 'Extra shot', selection: 'multiple', options: [{ id: 'option-shot', name: 'Extra shot', priceAmount: '4.00' }] }],
  available: true, createdAt: '2026-01-01'
};
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
  authService.getBootstrap.mockResolvedValue({user:{...membership,id:'admin-1',email:'admin@example.test'},dashboard:null});
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
  expect(element.querySelector('.product-card img').getAttribute('src')).toContain('example.test/cake.jpg');
  expect(element.querySelector('.sidebar-menu button svg')).not.toBeNull();
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

test('product editor saves drink sizes and priced add-on groups', async () => {
  await flush(() => button('Products').click());
  await flush(() => button('Edit').click());
  expect(element.querySelector('input[aria-label="Size 1 name"]').value).toBe('Small');
  await flush(() => button('+ Add size').click());
  const setValue=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  const sizeName=element.querySelector('input[aria-label="Size 2 name"]');
  const sizePrice=element.querySelector('input[aria-label="Size 2 price"]');
  await flush(()=>{setValue.call(sizeName,'Large');sizeName.dispatchEvent(new Event('input',{bubbles:true}));});
  await flush(()=>{setValue.call(sizePrice,'18.50');sizePrice.dispatchEvent(new Event('input',{bubbles:true}));});
  await flush(() => button('+ Milk options').click());
  const milkPrice=element.querySelector('input[aria-label="Milk options option 2 price"]');
  await flush(()=>{setValue.call(milkPrice,'2.00');milkPrice.dispatchEvent(new Event('input',{bubbles:true}));});
  productService.updateProduct.mockResolvedValue({data:{...product}});
  await flush(() => button('Save draft changes').click());
  expect(productService.updateProduct).toHaveBeenCalledWith('cake-1',expect.objectContaining({
    fields:expect.objectContaining({
      sizes:expect.arrayContaining([expect.objectContaining({name:'Large',priceAmount:'18.50'})]),
      addOnGroups:expect.arrayContaining([expect.objectContaining({
        name:'Milk options',
        selection:'single',
        options:expect.arrayContaining([expect.objectContaining({name:'Oat milk',priceAmount:'2.00'})])
      })])
    })
  }));
});

test('repeated sign-in events keep authorized views visible; refresh revalidates in background', async () => {
  await flush(() => button('Products').click());
  await flush(() => emit('SIGNED_IN', { ...session }));
  expect(element.querySelector('.products-grid')).not.toBeNull();
  expect(authService.getBootstrap).toHaveBeenCalledTimes(1);
  expect(authService.getCurrentUser).not.toHaveBeenCalled();
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
  authService.getBootstrap.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await flush(() => emit('SIGNED_IN', { access_token: 'other-token', user: { id: 'admin-2' } }));
  expect(element.querySelector('.workspace')).toBeNull();
  expect(element.textContent).toContain('Checking your sign-in');
  productService.getAllProducts.mockResolvedValue({ data: [] });
  await flush(() => finish({user:{...membership, id: 'admin-2', email: 'other@example.test'},dashboard:null}));
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

test('sign out clears a stale session locally without retaining its refresh error on login', async () => {
  supabase.auth.signOut.mockImplementation(async () => {
    emit('SIGNED_OUT', null);
    return { error: null };
  });
  await flush(() => button('Sign out').click());
  expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(element.textContent).toContain('Admin sign in');
  expect(element.textContent).not.toContain('Invalid Refresh Token');
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

test('Platform Admin has a dashboard and simple store and brand management sections', async () => {
  const platformUser={...membership,isPlatformAdmin:true,orgs:[{id:'org-1',name:'Owner'}],brands:[
    {id:'brand-1',orgId:'org-1',name:'Il Mio Cioccolato',slug:'ilmio',currency:'AED',timezone:'Asia/Dubai',status:'active'},
    {id:'brand-2',orgId:'org-1',name:'Coffee Beans World',slug:'cbw',currency:'AED',timezone:'Asia/Dubai',status:'active'}
  ],id:'admin-1',email:'platform@example.test'};
  authService.getCurrentUser.mockResolvedValue(platformUser);
  platformService.get.mockImplementation(path => Promise.resolve(path==='/dashboard'
    ? {asOf:new Date().toISOString(),onlineWindowMinutes:10,stores:[
      {id:'store-1',orgId:'org-1',name:'Main store',status:'active',ownerName:'Owner',devices:[{id:'device-1',deviceLabel:'Front tablet',lastSeenAt:new Date().toISOString()}]},
      {id:'store-2',orgId:'org-1',name:'Second store',status:'active',ownerName:'Owner',devices:[]}
    ]}
    : []));
  await flush(() => emit('TOKEN_REFRESHED',{...session,access_token:'platform-token'}));
  expect(button('Dashboard')).toBeDefined();
  expect(button('Store management')).toBeDefined();
  expect(button('Brand management')).toBeDefined();
  expect(element.textContent).toContain('Front tablet');
  expect(element.textContent).toContain('Main store');
  expect(element.textContent).toContain('Second store');
  expect(element.textContent).not.toContain('Owner');
  await flush(() => button('Brand management').click());
  expect(element.querySelector('.brand-card')).not.toBeNull();
  expect(element.textContent).toContain('Coffee Beans World');
  expect(button('Add brand')).toBeDefined();
});

test('Manage branches filters stores to the selected brand and opens its assignment', async () => {
  const platformUser={...membership,isPlatformAdmin:true,orgs:[{id:'org-1',name:'Owner'}],brands:[
    {id:'brand-1',orgId:'org-1',name:'Il Mio Cioccolato',slug:'ilmio',currency:'AED',timezone:'Asia/Dubai',status:'active'},
    {id:'brand-2',orgId:'org-1',name:'Coffee Beans World',slug:'cbw',currency:'AED',timezone:'Asia/Dubai',status:'active'}
  ],id:'admin-1',email:'platform@example.test'};
  authService.getCurrentUser.mockResolvedValue(platformUser);
  const coffeeAssignment={id:'assignment-coffee',storeId:'store-1',brandId:'brand-2',brand:platformUser.brands[1],status:'active',store:{id:'store-1',name:'Main store'}};
  platformService.get.mockImplementation(path => {
    if(path==='/stores') return Promise.resolve([
      {id:'store-1',orgId:'org-1',name:'Main store',loginCode:'main',status:'active',assignments:[
        {id:'assignment-ilmio',brand:platformUser.brands[0],status:'active'},coffeeAssignment
      ]},
      {id:'store-2',orgId:'org-1',name:'Il Mio branch',loginCode:'ilmio-branch',status:'active',assignments:[
        {id:'assignment-other',brand:platformUser.brands[0],status:'active'}
      ]}
    ]);
    if(path==='/brands/brand-2/stores') return Promise.resolve([coffeeAssignment]);
    return Promise.resolve([]);
  });
  await flush(() => emit('TOKEN_REFRESHED',{...session,access_token:'platform-branch-filter-token'}));
  await flush(() => button('Brand management').click());
  await flush(() => element.querySelector('[aria-label="Manage branches for Coffee Beans World"]').click());
  expect(element.textContent).toContain('Stores assigned to Coffee Beans World');
  expect(element.querySelectorAll('.store-card')).toHaveLength(1);
  expect(element.textContent).toContain('Main store');
  expect(element.textContent).not.toContain('Il Mio branch');
  await flush(() => element.querySelector('.store-card-main').click());
  expect(element.textContent).toContain('Coffee Beans World menu');
  expect(element.textContent).toContain('Store availability & publishing');
});

test('Platform Admin renders bootstrap dashboard without a second dashboard request', async () => {
  const platformUser={...membership,isPlatformAdmin:true,orgs:[{id:'org-1',name:'Owner'}],brands:[],id:'admin-2',email:'platform@example.test'};
  const initialDashboard={asOf:new Date().toISOString(),onlineWindowMinutes:10,stores:[
    {id:'store-1',orgId:'org-1',name:'Main store',status:'active',devices:[]}
  ]};
  authService.getBootstrap.mockResolvedValue({user:platformUser,dashboard:initialDashboard});
  await flush(() => emit('SIGNED_IN',{access_token:'platform-initial-token',user:{id:'admin-2'}}));
  expect(element.textContent).toContain('Main store');
  expect(platformService.get).not.toHaveBeenCalledWith('/dashboard');
});

test('Platform Admin keeps Stores top-level and can create a store from its directory', async () => {
  const platformUser={...membership,isPlatformAdmin:true,orgs:[{id:'org-1',name:'Owner'}],id:'admin-1',email:'platform@example.test'};
  authService.getCurrentUser.mockResolvedValue(platformUser);
  const createdStore={
    id:'store-new',orgId:'org-1',name:'New branch',ownerName:'Owner',loginCode:'new-branch',
    status:'active',passwordConfigured:true,
    assignments:[{id:'assignment-new',brand:{id:'brand-1',name:'Il Mio',orgId:'org-1'},status:'active'}]
  };
  let storeFetches=0;
  platformService.get.mockImplementation(path => {
    if(path==='/stores') return Promise.resolve(++storeFetches===1?[]:[createdStore]);
    return Promise.resolve([]);
  });
  platformService.post.mockImplementation(path => Promise.resolve(path.endsWith('/stores')?createdStore:{id:'assignment-new'}));
  await flush(() => emit('TOKEN_REFRESHED',{...session,access_token:'platform-store-token'}));
  expect(button('Store management')).toBeDefined();
  expect(button('Brand management')).toBeDefined();
  await flush(() => button('Store management').click());
  expect(button('Create store')).toBeDefined();
  expect(element.textContent).toContain('Select a store card to manage its menu, devices, and tablet login.');
  await flush(() => button('Create store').click());
  expect(element.querySelector('[role="dialog"]')).not.toBeNull();
  expect(element.querySelector('[role="dialog"]').textContent).not.toContain('Owner');
  expect(element.querySelectorAll('[role="dialog"] select')).toHaveLength(1);
  expect(element.textContent).toContain('Tablet Store ID');
  expect(element.querySelector('input[type="password"]').minLength).toBe(6);
  const inputs=[...element.querySelectorAll('[role="dialog"] input')];
  const setValue=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  const values=['New branch','new-branch','new-branch-id','tablet-pass-1'];
  for(let index=0;index<inputs.length;index++){
    await flush(()=>{setValue.call(inputs[index],values[index]);inputs[index].dispatchEvent(new Event('input',{bubbles:true}));});
  }
  await flush(()=>element.querySelector('[role="dialog"] form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(platformService.post).toHaveBeenCalledWith('/orgs/org-1/stores',expect.objectContaining({name:'New branch',loginCode:'new-branch-id'}));
  expect(platformService.post).toHaveBeenCalledWith('/orgs/org-1/brand-assignments',{storeId:'store-new',brandId:'brand-1'});
  expect(element.textContent).toContain('New branch');
  expect(element.textContent).toContain('Tablet login');
});

test('store cards open menu, categories, and tablet login for the selected store', async () => {
  const platformUser={...membership,isPlatformAdmin:true,orgs:[{id:'org-1',name:'Owner'}],id:'admin-1',email:'platform@example.test'};
  authService.getCurrentUser.mockResolvedValue(platformUser);
  platformService.get.mockImplementation(path => {
    if(path==='/stores') return Promise.resolve([{
      id:'store-1',orgId:'org-1',ownerName:'Owner',name:'Main store',loginCode:'main-store',status:'active',passwordConfigured:true,
      assignments:[{id:'assignment-1',brand:{id:'brand-1',name:'Il Mio'},status:'active',unpublishedChanges:false}]
    },{
      id:'store-2',orgId:'org-1',ownerName:'Owner',name:'Second store',loginCode:'second-store',status:'active',passwordConfigured:false,assignments:[]
    }]);
    if(path==='/brands/brand-1/stores') return Promise.resolve([{
      id:'assignment-1',storeId:'store-1',brandId:'brand-1',store:{id:'store-1',name:'Main store'},status:'active',overrides:[]
    }]);
    if(path==='/orgs/org-1/stores/store-1/sessions') return Promise.resolve([{
      id:'session-1',deviceLabel:'Front tablet',lastSeenAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),revokedAt:null
    }]);
    return Promise.resolve([]);
  });
  await flush(() => emit('TOKEN_REFRESHED',{...session,access_token:'platform-branch-menu-token'}));
  await flush(() => button('Store management').click());
  expect(element.querySelectorAll('.store-card')).toHaveLength(2);
  expect(element.textContent).toContain('Main store');
  expect(element.textContent).toContain('Second store');
  await flush(() => element.querySelector('.store-card-main').click());
  expect(element.textContent).toContain('Main store');
  expect(button('Menu')).toBeDefined();
  expect(button('Categories')).toBeDefined();
  expect(button('Devices')).toBeDefined();
  expect(button('Tablet login')).toBeDefined();
  await flush(() => button('Edit name').click());
  const storeNameInput=element.querySelector('input[aria-label="Store name"]');
  const setInputValue=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  await flush(()=>{setInputValue.call(storeNameInput,'Main store renamed');storeNameInput.dispatchEvent(new Event('input',{bubbles:true}));});
  await flush(()=>button('Save name').click());
  expect(platformService.put).toHaveBeenCalledWith('/orgs/org-1/stores/store-1',{name:'Main store renamed'});
  expect(element.querySelector('.store-detail-heading h1').textContent).toBe('Main store renamed');
  expect(element.textContent).toContain('Store availability & publishing');
  expect(element.textContent).toContain('Publish to this store');
  expect(element.textContent).toContain('Size and add-on availability');
  const sizeAvailable=element.querySelector('.store-option-list input');
  await flush(()=>sizeAvailable.click());
  await flush(()=>button('Save option availability').click());
  expect(platformService.put).toHaveBeenCalledWith('/brands/brand-1/stores/store-1/items/cake-1/override',{unavailableOptionIds:['size-small']});
  expect(button('Menu items')).toBeUndefined();
  await flush(() => button('Devices').click());
  expect(element.textContent).toContain('Front tablet');
  expect(element.textContent).toContain('Online');
  expect(platformService.get).toHaveBeenCalledWith('/orgs/org-1/stores/store-1/sessions');
  await flush(() => button('Tablet login').click());
  expect(element.textContent).toContain('Tablet login details');
  expect(element.textContent).toContain('main-store');
  expect(element.textContent).toContain('Set — hidden for security');
  expect(button('Show tablet login QR')).toBeDefined();
  expect(element.querySelector('input[type="password"]').minLength).toBe(6);
  await flush(() => button('← All stores').click());
  expect(element.querySelector('.store-card')).not.toBeNull();
});

test('store cards require confirmation and report when published menu history blocks deletion', async () => {
  const platformUser={...membership,isPlatformAdmin:true,orgs:[{id:'org-1',name:'Owner'}],id:'admin-1',email:'platform@example.test'};
  authService.getCurrentUser.mockResolvedValue(platformUser);
  platformService.get.mockImplementation(path => Promise.resolve(path==='/stores' ? [{
    id:'store-1',orgId:'org-1',ownerName:'Owner',name:'Main store',loginCode:'main-store',status:'active',
    assignments:[{id:'assignment-1',brand:{id:'brand-1',name:'Il Mio'},status:'active'}]
  }] : []));
  const originalConfirm = window.confirm;
  window.confirm = jest.fn(() => true);
  try {
    await flush(() => emit('TOKEN_REFRESHED',{...session,access_token:'platform-store-delete-token'}));
    await flush(() => button('Store management').click());
    platformService.remove.mockRejectedValue({error:'This store has published menu history and cannot be permanently deleted.'});
    await flush(() => element.querySelector('.store-card-delete').click());
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Main store'));
    expect(platformService.remove).toHaveBeenCalledWith('/orgs/org-1/stores/store-1');
    expect(element.querySelector('[role="alert"]').textContent).toContain('published menu history');
    expect(element.textContent).toContain('Main store');
  } finally {
    window.confirm = originalConfirm;
  }
});
