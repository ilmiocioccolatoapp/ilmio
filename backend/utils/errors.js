// Never log exception messages, stacks, request objects or provider responses:
// they can include connection strings, tokens and request payloads.
const safeCodes = new Set([
  'P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1010', 'P1011', 'P1012', 'P1017',
  'P2000', 'P2002', 'P2003', 'P2021', 'P2022', 'P2024', 'P2025',
  'LIMIT_PART_COUNT', 'LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT', 'LIMIT_FIELD_KEY',
  'LIMIT_FIELD_VALUE', 'LIMIT_FIELD_COUNT', 'LIMIT_UNEXPECTED_FILE',
  'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'
]);
const safeErrorNames = new Set([
  'PrismaClientInitializationError',
  'PrismaClientKnownRequestError',
  'PrismaClientValidationError'
]);

function logError(operation, error) {
  const details = {};
  if (safeErrorNames.has(error?.name)) {
    details.name = error.name;
  }
  if (safeCodes.has(error?.code)) {
    details.code = error.code;
  }
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599) {
    details.status = error.status;
  }
  console.error(operation, details);
}

function serverError(res, error, operation) {
  logError(operation, error);
  return res.status(500).json({
    success: false,
    error: 'Could not complete the request. Please try again.'
  });
}

function uploadErrorMessage(error) {
  if (error?.code === 'LIMIT_FILE_SIZE') return 'File too large. Maximum size is 10MB';
  if (error?.message === 'Only image files are allowed!') return 'Only image files are allowed!';
  return 'Image upload failed. Please try again.';
}

function errorHandler(error, req, res, next) {
  logError('HTTP request failed', error);
  if (res.headersSent) {
    // Express's default handler can log the original stack. Abort a partial
    // response here rather than passing a potentially sensitive exception on.
    res.destroy();
    return;
  }

  let status = 500;
  let message = 'Could not complete the request. Please try again.';
  if (error?.code === 'LIMIT_FILE_SIZE' || error?.message === 'Only image files are allowed!') {
    status = 400;
    message = uploadErrorMessage(error);
  } else if (error?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON request.';
  } else if (error?.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large.';
  }
  return res.status(status).json({ success: false, error: message });
}

module.exports = { logError, serverError, uploadErrorMessage, errorHandler };
