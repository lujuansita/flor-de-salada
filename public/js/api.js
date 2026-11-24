async function api(path, options = {}) {
  const opts = { credentials: 'same-origin', ...options, headers: { ...(options.headers || {}) } };
  if (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(options.body);
  }
  const response = await fetch(path, opts);
  let data = {};
  try { data = await response.json(); } catch (e) { data = {}; }
  if (!response.ok) throw new Error(data.error || 'Ocurrió un error. Intentá de nuevo.');
  return data;
}

window.api = api;
