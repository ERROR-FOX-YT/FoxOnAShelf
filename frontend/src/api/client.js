/**
 * Booked™ - Cliente API.
 *
 * Manejo de errores con mini-redirección automática:
 *   400 -> toast 1.2s, luego /error/400
 *   500 -> toast 1.2s, luego /error/500
 *   401 -> limpia sesión y manda a /login
 */
let toastImpl = null;
let navImpl = null;
export function bindRuntime({ toast, navigate }) { toastImpl = toast; navImpl = navigate; }

function tokenOf() { return localStorage.getItem('booked.token') || ''; }

async function request(method, url, body, isForm=false) {
  const headers = {};
  const token = tokenOf();
  if (token) headers.Authorization = 'Bearer ' + token;
  if (!isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined
    });
  } catch (netErr) {
    if (toastImpl) toastImpl.error('Sin conexión con el servidor');
    setTimeout(() => navImpl && navImpl('/error/500'), 1200);
    throw netErr;
  }

  if (res.status === 401) {
    localStorage.removeItem('booked.token');
    localStorage.removeItem('booked.user');
    if (toastImpl) toastImpl.info('Sesión expirada');
    setTimeout(() => navImpl && navImpl('/login'), 800);
    throw new Error('401');
  }

  if (res.status >= 500) {
    if (toastImpl) toastImpl.error('Error del servidor');
    setTimeout(() => navImpl && navImpl('/error/500'), 1200);
    throw new Error('500');
  }

  const json = await res.json().catch(() => ({}));
  if (res.status === 400) {
    if (toastImpl) toastImpl.error(json.error || 'Solicitud inválida');
    // mini redirect SÓLO si es una operación crítica (marcada por el caller)
    return { __error: true, ...json, code: 400 };
  }
  if (res.status >= 400) {
    if (toastImpl) toastImpl.error(json.error || 'Error');
    return { __error: true, ...json, code: res.status };
  }
  return json;
}

export const api = {
  get:  (u)        => request('GET',    u),
  post: (u, body)  => request('POST',   u, body),
  put:  (u, body)  => request('PUT',    u, body),
  del:  (u)        => request('DELETE', u),
  form: (u, form)  => request('POST',   u, form, true)
};

export async function criticalPost(url, body) {
  const r = await api.post(url, body);
  if (r && r.__error && r.code === 400 && navImpl) {
    setTimeout(() => navImpl('/error/400'), 1200);
  }
  return r;
}
