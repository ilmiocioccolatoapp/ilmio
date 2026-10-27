const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadController(name, prisma) {
  const path = require.resolve(`../controllers/${name}`);
  const original = Module._load;
  Module._load = function (dependency, ...args) {
    if (dependency === '../config/prisma') return prisma;
    return original.call(this, dependency, ...args);
  };
  try { delete require.cache[path]; return require(path); }
  finally { Module._load = original; }
}
const response = () => ({ status() { return this; }, json(body) { this.body = body; return this; } });

for (const endpoint of ['getProducts', 'getAvailableProducts']) {
  test(`${endpoint} starts product reads while category ordering is still pending`, async () => {
    let release;
    let productStarted = false;
    const controller = loadController('productController', {
      category: { findMany: () => new Promise(resolve => { release = resolve; }) },
      product: { findMany: async (query) => {
        productStarted = true;
        assert.deepEqual(query, endpoint === 'getAvailableProducts' ? { where: { available: true } } : undefined);
        return [
          { dbId: '1', category: 'cake', createdAt: '2026-01-01' },
          { dbId: '2', category: 'coffee', createdAt: '2026-01-01' }
        ];
      } }
    });
    const res = response();
    const request = controller[endpoint]({}, res);
    await Promise.resolve();
    assert.equal(productStarted, true, 'product query must not wait for the category round trip');
    release([{ id: 'coffee' }, { id: 'cake' }]);
    await request;
    assert.deepEqual(res.body.data.map(p => p._id), ['2', '1']);
  });
}

test('category listing starts counts before the category query resolves', async () => {
  let release;
  let countsStarted = false;
  const controller = loadController('categoryController', {
    category: { findMany: () => new Promise(resolve => { release = resolve; }) },
    product: { groupBy: async () => {
      countsStarted = true;
      return [{ category: 'cake', _count: { _all: 3 } }];
    } }
  });
  const res = response();
  const request = controller.getCategories({}, res);
  await Promise.resolve();
  assert.equal(countsStarted, true);
  release([{ id: 'cake', dbId: 'category-1' }]);
  await request;
  assert.equal(res.body.data[0].count, 3);
});
