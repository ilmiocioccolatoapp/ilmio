const { performance } = require('perf_hooks');

async function measure(req, name, operation) {
  const started = performance.now();
  try {
    return await operation();
  } finally {
    const timings = req.performanceTimings;
    if (timings) {
      timings.phases[name] = (timings.phases[name] || 0) + performance.now() - started;
    }
  }
}

function timingMiddleware(req, res, next) {
  const path = req.originalUrl.split('?')[0];
  if (!['/api/admin/me', '/api/admin/bootstrap', '/api/admin/dashboard'].includes(path)) {
    return next();
  }

  req.performanceTimings = { startedAt: performance.now(), phases: {} };
  const respondWithTiming = res.json.bind(res);
  res.json = body => {
    setServerTiming(req, res);
    return respondWithTiming(body);
  };
  res.on('finish', () => {
    const { startedAt, phases } = req.performanceTimings;
    console.info(JSON.stringify({
      event: 'admin_request_performance',
      path,
      method: req.method,
      status: res.statusCode,
      phasesMs: Object.fromEntries(Object.entries(phases).map(([name, value]) => [name, Number(value.toFixed(1))])),
      totalMs: Number((performance.now() - startedAt).toFixed(1)),
      instanceAgeMs: req.appInstanceAgeMs ?? null
    }));
  });
  next();
}

function setServerTiming(req, res) {
  const timings = req.performanceTimings;
  if (!timings) return;
  const entries = Object.entries(timings.phases)
    .map(([name, value]) => `${name};dur=${value.toFixed(1)}`);
  entries.push(`app;dur=${(performance.now() - timings.startedAt).toFixed(1)}`);
  res.set('Server-Timing', entries.join(', '));
}

module.exports = { measure, timingMiddleware, setServerTiming };
