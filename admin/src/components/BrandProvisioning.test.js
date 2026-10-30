import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import BrandProvisioning from './BrandProvisioning';
import { platformService } from '../services/api';

jest.mock('../services/api', () => ({
  platformService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    remove: jest.fn()
  }
}));

const brands = [
  { id: 'brand-1', orgId: 'org-1', name: 'Il Mio', slug: 'ilmio', currency: 'AED', timezone: 'Asia/Dubai' },
  { id: 'brand-2', orgId: 'org-1', name: 'Il Mio', slug: 'ilmio-cafe', currency: 'AED', timezone: 'Asia/Dubai' }
];
let element;
let root;
const flush = async action => act(async () => { if (action) action(); });
const button = name => [...element.querySelectorAll('button')].find(item => item.textContent.trim() === name);
const setValue = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(input.constructor.prototype, 'value').set;
  await flush(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};
const submit = async form => flush(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  platformService.get.mockResolvedValue([]);
  platformService.post.mockResolvedValue({});
  platformService.put.mockResolvedValue({});
  platformService.remove.mockResolvedValue({});
  element = document.createElement('div');
  document.body.appendChild(element);
  root = createRoot(element);
  await flush(() => root.render(
    <BrandProvisioning
      organizations={[{ id: 'org-1', name: 'Il Mio Holdings' }]}
      brands={brands}
      selectedOrg={{ id: 'org-1', name: 'Il Mio Holdings' }}
      onChanged={jest.fn()}
    />
  ));
});

afterEach(async () => {
  await flush(() => root.unmount());
  element.remove();
});

test('brand dashboard distinguishes same-name brands by slug and edits through settings API', async () => {
  const slugs = [...element.querySelectorAll('.brand-slug')].map(item => item.textContent.trim());
  expect(element.querySelectorAll('.brand-record')).toHaveLength(2);
  expect(slugs).toEqual(['· ilmio', '· ilmio-cafe']);
  await flush(() => button('Edit Brand').click());
  const dialog = element.querySelector('[role="dialog"]');
  expect(dialog.querySelector('input[readonly]').value).toBe('ilmio');
  await setValue(dialog.querySelector('input[required]'), 'Il Mio Chocolate');
  await submit(dialog.querySelector('form'));
  expect(platformService.put).toHaveBeenCalledWith('/brands/brand-1/settings', expect.objectContaining({
    name: 'Il Mio Chocolate',
    slug: 'ilmio',
    currency: 'AED'
  }));
  expect(element.textContent).toContain('Brand updated.');
});

test('brand dashboard creates a branch through the atomic brand endpoint', async () => {
  platformService.post.mockResolvedValue({ id: 'store-1' });
  platformService.get.mockResolvedValue([]);
  await flush(() => button('Manage Branches').click());
  const dialog = element.querySelector('[role="dialog"]');
  const inputs = dialog.querySelectorAll('input');
  await setValue(inputs[0], 'Airport branch');
  await setValue(inputs[1], 'airport-branch');
  await setValue(inputs[2], 'airport-tablet');
  await setValue(inputs[3], 'tablet-123');
  await setValue(inputs[4], 'Terminal 1');
  await submit(dialog.querySelector('form'));
  expect(platformService.post).toHaveBeenCalledWith('/brands/brand-1/stores', expect.objectContaining({
    name: 'Airport branch',
    slug: 'airport-branch',
    loginCode: 'airport-tablet',
    address: 'Terminal 1'
  }));
  expect(element.textContent).toContain('Branch created and assigned to this brand.');
});

test('brand dashboard asks for confirmation before deleting', async () => {
  const originalConfirm = window.confirm;
  window.confirm = jest.fn(() => true);
  try {
    await flush(() => button('Delete Brand').click());
    expect(platformService.remove).toHaveBeenCalledWith('/brands/brand-1');
    expect(element.textContent).toContain('Brand deleted.');
  } finally {
    window.confirm = originalConfirm;
  }
});
