const { logError } = require('../utils/errors');
class Problem extends Error {
  constructor(status, detail, retryAfter) { super(detail); this.status = status; this.retryAfter = retryAfter; }
}
const fail = (status, detail) => { throw new Problem(status, detail); };
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
function errors(err, req, res, next) {
  if (res.headersSent) return res.destroy();
  let status = err instanceof Problem ? err.status : 500;
  let detail = err instanceof Problem ? err.message : 'Could not complete the request. Please try again.';
  if (err.code === 'P2002') { status = 409; detail = 'A record with these identifiers already exists.'; }
  if (['P2003', 'P2014'].includes(err.code)) { status = 400; detail = 'Related records must belong to the same scope and remain valid.'; }
  if (err.type === 'entity.parse.failed') { status = 400; detail = 'Invalid JSON request.'; }
  if (err.type === 'entity.too.large') { status = 413; detail = 'Request body is too large.'; }
  if (status === 500) logError('Platform request failed', err);
  if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));
  res.status(status).type('application/problem+json').json({ type: 'about:blank', title: ({400:'Bad request',401:'Unauthorized',403:'Forbidden',404:'Not found',409:'Conflict',429:'Too many requests',503:'Service unavailable'})[status] || 'Request failed', status, detail, success:false, error:detail });
}
function text(value, name, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, name + ' is required and must be at most ' + max + ' characters.');
  return value.trim();
}
function code(value, name = 'Code') {
  const result = text(value, name, 40).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(result)) fail(400, name + ' must contain 3–40 lowercase letters, numbers or hyphens.');
  return result;
}
function money(value, nullable = false) {
  if (nullable && (value === null || value === '')) return null;
  const s = String(value ?? '');
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(s)) fail(400, 'Price must be a non-negative decimal with at most two decimal places.');
  const [whole, fraction = ''] = s.split('.');
  return whole + '.' + fraction.padEnd(2, '0');
}
function bool(value, name) { if (typeof value !== 'boolean') fail(400, name + ' must be true or false.'); return value; }
function order(value) { if (!Number.isInteger(value) || value < 0 || value > 100000) fail(400, 'Display order must be a non-negative integer.'); return value; }
function timezone(value) { const v = text(value, 'Timezone', 80); try { new Intl.DateTimeFormat('en', {timeZone:v}).format(); } catch { fail(400, 'Invalid timezone.'); } return v; }
function imageUrl(value) {
  if (value === null || value === '') return null;
  const v = text(value, 'Image URL', 2048);
  try { const u = new URL(v); if (u.protocol !== 'https:' || u.username || u.password) throw Error(); } catch { fail(400, 'Image URL must use HTTPS.'); }
  return v;
}
module.exports = { Problem, fail, wrap, errors, text, code, money, bool, order, timezone, imageUrl };
