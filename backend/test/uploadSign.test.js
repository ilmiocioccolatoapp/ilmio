const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const uploadRouter = require('../routes/uploadRoutes');

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
}

const signLayer = uploadRouter.stack.find(
  (layer) => layer.route && layer.route.path === '/sign' && layer.route.methods.post
);
const signHandler = signLayer.route.stack[signLayer.route.stack.length - 1].handle;

test('Upload signing generates a 64-character SHA-256 signature matching Cloudinary SDK specification', async (t) => {
  const originalEnv = { ...process.env };
  process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
  process.env.CLOUDINARY_API_KEY = 'test_api_key';
  process.env.CLOUDINARY_API_SECRET = 'test_api_secret_12345';

  t.after(() => {
    process.env = originalEnv;
  });

  const req = {
    admin: { email: 'admin@example.test' },
    body: {}
  };
  const res = createMockResponse();

  await signHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.body, 'Response body must exist');
  assert.equal(res.body.success, true);

  const data = res.body.data;
  assert.ok(data, 'Data payload must exist');
  assert.equal(data.cloudName, 'test_cloud');
  assert.equal(data.apiKey, 'test_api_key');
  assert.equal(data.folder, 'il-mio-cioccolato');

  // Verify 64-character hex format
  const signature = data.signature;
  assert.equal(typeof signature, 'string');
  assert.equal(signature.length, 64, 'SHA-256 signature must be exactly 64 characters long');
  assert.match(signature, /^[a-f0-9]{64}$/, 'SHA-256 signature must be a valid lowercase hex string');

  // Verify exact match with Cloudinary SDK official api_sign_request
  cloudinary.config({
    cloud_name: 'test_cloud',
    api_key: 'test_api_key',
    api_secret: 'test_api_secret_12345',
    signature_algorithm: 'sha256'
  });
  const sdkExpected = cloudinary.utils.api_sign_request(
    { folder: data.folder, timestamp: data.timestamp },
    process.env.CLOUDINARY_API_SECRET
  );
  assert.equal(signature, sdkExpected, 'Signature must match Cloudinary SDK api_sign_request');

  // Verify full signed request parameter shape:
  // For Cloudinary direct upload, the signed body parameters must be strictly:
  // [folder, timestamp], plus non-signed transport fields [api_key, file, signature].
  // Unsigned fields like signature_algorithm must NOT be in the signed request body.
  const signedParams = ['folder', 'timestamp'];
  const expectedStringToSign = signedParams
    .map((k) => `${k}=${data[k]}`)
    .join('&') + process.env.CLOUDINARY_API_SECRET;

  const cryptoExpected = crypto.createHash('sha256').update(expectedStringToSign).digest('hex');
  assert.equal(signature, cryptoExpected, 'Signature matches canonical sorted parameter string hash');
});

test('Upload signing returns 500 when Cloudinary credentials are not configured', async (t) => {
  const originalEnv = { ...process.env };
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;

  t.after(() => {
    process.env = originalEnv;
  });

  const req = {
    admin: { email: 'admin@example.test' },
    body: {}
  };
  const res = createMockResponse();

  await signHandler(req, res);

  assert.equal(res.statusCode, 500);
  assert.ok(res.body, 'Response body must exist');
  assert.equal(res.body.success, false);
  assert.match(res.body.error, /Image storage is not configured/);
});
