const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { adminOrigins, corsMiddleware, securityHeaders } = require('../config/security');
const { logError, serverError, errorHandler, uploadErrorMessage } = require('../utils/errors');

const secret = 'DUMMY_CREDENTIAL_DO_NOT_EMIT';
function response() {
  return {
    headers: {}, statusCode: 200, body: undefined, ended: false,
    set(name, value) { this.setHeader(name, value); return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    getHeader(name) { return this.headers[name.toLowerCase()]; },
    vary(name) { this.setHeader('Vary', name); },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; },
    destroy() { this.destroyed = true; }
  };
}
function captureLogs(action) {
  const old = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  return Promise.resolve().then(() => action(logs)).finally(() => { console.error = old; });
}
function corsRequest(origin, method = 'GET', env = {}) {
  const res = response();
  let forwarded = false;
  corsMiddleware({ NODE_ENV: 'production', ...env })(
    { method, headers: { origin, 'access-control-request-headers': 'authorization,content-type' } },
    res, () => { forwarded = true; });
  return { res, forwarded };
}
const MOCKABLE_MODULES = {
  '../controllers/productController': {
    resolve: () => require.resolve('../controllers/productController'),
    load: () => require('../controllers/productController')
  },
  '../controllers/categoryController': {
    resolve: () => require.resolve('../controllers/categoryController'),
    load: () => require('../controllers/categoryController')
  },
  '../middleware/requireAdmin': {
    resolve: () => require.resolve('../middleware/requireAdmin'),
    load: () => require('../middleware/requireAdmin')
  }
};

function loadMocked(path, mocks) {
  const target = MOCKABLE_MODULES[path];
  if (!target) {
    throw new Error(`Untrusted or unmapped module path in test mock: ${path}`);
  }
  const old = Module._load;
  Module._load = function (name, ...args) {
    return Object.hasOwn(mocks, name) ? mocks[name] : old.call(this, name, ...args);
  };
  try {
    delete require.cache[target.resolve()];
    return target.load();
  } finally { Module._load = old; }
}

test('CORS supports exact configured origins and bearer preflight; denies suffix/null origins', () => {
  const env = { ADMIN_ORIGINS: 'https://admin.example.test,https://preview.example.test' };
  for (const origin of ['https://admin.example.test', 'https://preview.example.test']) {
    const { res } = corsRequest(origin, 'OPTIONS', env);
    assert.equal(res.getHeader('Access-Control-Allow-Origin'), origin);
    assert.equal(res.statusCode, 204);
    assert.equal(res.ended, true);
    assert.match(res.getHeader('Access-Control-Allow-Headers'), /Authorization/);
    assert.equal(res.getHeader('Access-Control-Allow-Credentials'), undefined);
    assert.match(res.getHeader('Vary'), /Origin/);
  }
  for (const origin of ['null', 'https://admin.example.test.evil.test', 'https://evil.test', undefined]) {
    const { res, forwarded } = corsRequest(origin, 'GET', env);
    assert.equal(res.getHeader('Access-Control-Allow-Origin'), undefined);
    // CORS is a browser policy, not a replacement for route authentication.
    assert.equal(forwarded, true);
  }
});

test('existing admin default, native requests, and localhost development are preserved', () => {
  assert.equal(corsRequest('https://ilmio-admin.vercel.app').res.getHeader('Access-Control-Allow-Origin'), 'https://ilmio-admin.vercel.app');
  assert.equal(corsRequest(undefined).forwarded, true);
  assert.ok(adminOrigins({ NODE_ENV: 'development' }).has('http://localhost:3000'));
  assert.ok(!adminOrigins({ NODE_ENV: 'production' }).has('http://localhost:3000'));
  assert.equal(adminOrigins({ ADMIN_ORIGINS: '' }).size, 0);
});

test('invalid/unsafe origin configuration fails closed without echoing its value', () => {
  for (const value of ['*', 'null', 'https://example.test/path', 'https://example.test/', 'https://user:password@example.test', 'http://example.test']) {
    assert.throws(() => adminOrigins({ NODE_ENV: 'production', ADMIN_ORIGINS: value }));
  }
});

test('framing headers apply without adding script/resource restrictions', () => {
  const res = response(); let next = false;
  securityHeaders({}, res, () => { next = true; });
  assert.equal(res.getHeader('X-Frame-Options'), 'DENY');
  assert.equal(res.getHeader('Content-Security-Policy'), "frame-ancestors 'none'");
  assert.equal(res.getHeader('Vary'), 'Origin');
  assert.equal(next, true);
});

test('unexpected errors expose neither messages/stacks nor provider/request/credential data in logs', async () => {
  await captureLogs(logs => {
    const error = Object.assign(new Error(secret), { code: secret, status: 503, request: { headers: { Authorization: secret } }, response: { data: secret } });
    error.stack = secret;
    const res = response();
    errorHandler(error, {}, res, () => assert.fail('must not delegate raw exception'));
    assert.equal(res.statusCode, 500);
    assert.equal(JSON.stringify(res.body).includes(secret), false);
    logError('Provider failure', error);
    logError('Malformed provider code', { code: ['P2002', secret] });
    assert.equal(JSON.stringify(logs).includes(secret), false);
    assert.deepEqual(logs[0], ['HTTP request failed', { status: 503 }]);
  });
});

test('known safe validation failures retain useful messages; partial responses abort safely', async () => {
  await captureLogs(() => {
    for (const [error, status, message] of [
      [{ code: 'LIMIT_FILE_SIZE', message: secret }, 400, 'File too large. Maximum size is 10MB'],
      [{ message: 'Only image files are allowed!' }, 400, 'Only image files are allowed!'],
      [{ type: 'entity.parse.failed', message: secret }, 400, 'Invalid JSON request.'],
      [{ type: 'entity.too.large', message: secret }, 413, 'Request body is too large.']
    ]) {
      const res = response(); errorHandler(error, {}, res, () => {});
      assert.equal(res.statusCode, status); assert.equal(res.body.error, message);
    }
    assert.equal(uploadErrorMessage({ message: secret }), 'Image upload failed. Please try again.');
    const res = response(); res.headersSent = true;
    errorHandler(new Error(secret), {}, res, () => assert.fail('raw error must not reach default logger'));
    assert.equal(res.destroyed, true);
  });
});

test('database errors retain an allowlisted diagnostic code without connection strings', async () => {
  await captureLogs(logs => {
    const res = response(); serverError(res, { code: 'P1001', message: secret, stack: secret }, 'Database request failed');
    assert.equal(res.statusCode, 500);
    assert.deepEqual(logs, [['Database request failed', { code: 'P1001' }]]);
    assert.equal(JSON.stringify(res.body).includes(secret), false);
  });
});

test('all product/category controller failures are stable; duplicate/category validation remains intact', async () => {
  await captureLogs(async logs => {
    const failure = async () => { throw Object.assign(new Error(secret), { code: 'P1001' }); };
    const prisma = {
      category: { findMany: failure, findUnique: failure, create: failure },
      product: { findMany: failure, findUnique: failure, create: failure }
    };
    const products = loadMocked('../controllers/productController', { '../config/prisma': prisma, cloudinary: { v2: {} } });
    const categories = loadMocked('../controllers/categoryController', { '../config/prisma': prisma });
    const valid = { title: 'Cake', category: 'cakes', image: 'https://example.test/cake.png', description: 'Cake', ingredients: 'Flour', price: 'AED 20.00', id: 'cakes', name: 'Cakes', icon: '🍰' };
    for (const handler of [...Object.values(products), ...Object.values(categories)]) {
      const res = response(); await handler({ body: valid, params: { id: 'dummy' } }, res);
      assert.equal(res.statusCode, 500);
      assert.equal(res.body.error, 'Could not complete the request. Please try again.');
    }
    prisma.category.create = async () => { throw { code: 'P2002', message: secret }; };
    let res = response(); await categories.createCategory({ body: valid }, res);
    assert.equal(res.statusCode, 400); assert.equal(res.body.error, 'Category ID already exists');
    prisma.product.create = async () => { throw { code: 'P2003', message: secret }; };
    res = response(); await products.createProduct({ body: valid }, res);
    assert.equal(res.statusCode, 400); assert.match(res.body.error, /Invalid category/);
    assert.equal(JSON.stringify(logs).includes(secret), false);
  });
});

test('bearer authentication and fail-closed errors remain enforced; every protected result is no-store', async () => {
  await captureLogs(async logs => {
    const names = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ADMIN_EMAILS'];
    const old = Object.fromEntries(names.map(k => [k, process.env[k]]));
    try {
      Object.assign(process.env, { SUPABASE_URL: 'https://example.invalid', SUPABASE_PUBLISHABLE_KEY: 'dummy', SUPABASE_ADMIN_EMAILS: 'admin@example.test' });
      let providerResult = { data: { user: { id: 'dummy', email: 'admin@example.test' } } };
      const middleware = loadMocked('../middleware/requireAdmin', { '@supabase/supabase-js': { createClient: () => ({ auth: { getUser: async () => providerResult } }) } });
      let res = response(); await middleware({ get: () => '' }, res, () => assert.fail('anonymous'));
      assert.equal(res.statusCode, 401); assert.equal(res.getHeader('Cache-Control'), 'no-store');
      providerResult = { data: { user: { email: 'other@example.test' } } };
      res = response(); await middleware({ get: () => 'Bearer dummy' }, res, () => assert.fail('not allowlisted'));
      assert.equal(res.statusCode, 403);
      providerResult = { error: { status: 503, message: secret } };
      res = response(); await middleware({ get: () => 'Bearer dummy' }, res, () => assert.fail('provider failure'));
      assert.equal(res.statusCode, 503); assert.equal(JSON.stringify(res.body).includes(secret), false);
      providerResult = { data: { user: { id: 'dummy', email: 'admin@example.test' } } };
      res = response(); let authorized = false;
      await middleware({ get: () => 'Bearer dummy' }, res, () => { authorized = true; });
      assert.equal(authorized, true); assert.equal(res.getHeader('Cache-Control'), 'no-store');
      delete process.env.SUPABASE_URL;
      const unconfigured = loadMocked('../middleware/requireAdmin', { '@supabase/supabase-js': { createClient: () => assert.fail('missing config') } });
      res = response(); await unconfigured({}, res, () => assert.fail('unconfigured'));
      assert.equal(res.statusCode, 503); assert.equal(res.getHeader('Cache-Control'), 'no-store');
      assert.equal(JSON.stringify(logs).includes(secret), false);
    } finally {
      for (const key of names) { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; }
    }
  });
});
