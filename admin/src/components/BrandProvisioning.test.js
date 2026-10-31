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
  { id: 'brand-1', orgId: 'org-1', name: 'Il Mio Cioccolato', slug: 'ilmio', currency: 'AED', timezone: 'Asia/Dubai', status: 'active' },
  { id: 'brand-2', orgId: 'org-1', name: 'Coffee Beans World', slug: 'cbw', currency: 'AED', timezone: 'Asia/Dubai', status: 'active' }
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

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  platformService.post.mockResolvedValue({});
  platformService.put.mockResolvedValue({});
  platformService.remove.mockResolvedValue({});
  element = document.createElement('div');
  document.body.appendChild(element);
  root = createRoot(element);
  await flush(() => root.render(
    <BrandProvisioning brands={brands} onChanged={jest.fn()} />
  ));
});

afterEach(async () => {
  await flush(() => root.unmount());
  element.remove();
});

test('brand management lists brand cards without organization terminology', () => {
  expect(element.textContent).toContain('Il Mio Cioccolato');
  expect(element.textContent).toContain('Coffee Beans World');
  expect(element.textContent).toContain('ilmio');
  expect(element.textContent).toContain('cbw');
  expect(element.textContent).not.toContain('Organization');
  expect(element.querySelectorAll('.brand-card')).toHaveLength(2);
});

test('adding a brand does not ask for or send an owner organization', async () => {
  platformService.post.mockResolvedValue({
    id: 'brand-3',
    orgId: 'org-1',
    name: 'New Cafe',
    slug: 'new-cafe',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    status: 'active'
  });
  await flush(() => button('+ Add brand').click());
  const dialog = element.querySelector('[role="dialog"]');
  expect(dialog.textContent).not.toContain('Organization');
  const name = dialog.querySelector('input');
  await setValue(name, 'New Cafe');
  const codeInput = dialog.querySelectorAll('input')[1];
  await setValue(codeInput, 'new-cafe');
  await flush(() => dialog.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(platformService.post).toHaveBeenCalledWith('/brands', expect.objectContaining({
    name: 'New Cafe',
    slug: 'new-cafe'
  }));
  expect(element.textContent).toContain('New Cafe');
});

test('brand edits use the settings endpoint', async () => {
  await flush(() => [...element.querySelectorAll('.brand-card')][0].querySelector('button').click());
  const dialog = element.querySelector('[role="dialog"]');
  await setValue(dialog.querySelector('input'), 'Il Mio Chocolate');
  platformService.put.mockResolvedValue({ ...brands[0], name: 'Il Mio Chocolate' });
  await flush(() => dialog.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(platformService.put).toHaveBeenCalledWith('/brands/brand-1/settings', expect.objectContaining({
    name: 'Il Mio Chocolate',
    slug: 'ilmio'
  }));
});

test('brand deletion asks for confirmation before removing the brand', async () => {
  const original = window.confirm;
  window.confirm = jest.fn(() => true);
  try {
    const deleteButton = [...element.querySelectorAll('.brand-card')][0].querySelectorAll('button')[1];
    await flush(() => deleteButton.click());
    expect(platformService.remove).toHaveBeenCalledWith('/brands/brand-1');
  } finally {
    window.confirm = original;
  }
});
