let toastImpl = null;
let navImpl = null;
let refreshing = null;
let tokenTimeout, serverErrorTimeout;
export function bindRuntime({ toast, navigate }) { toastImpl = toast; navImpl = navigate; }

function tokenOf() { return localStorage.getItem('bookshelf.token') || ''; }
function refreshTokenOf() { return localStorage.getItem('bookshelf.refreshToken') || ''; }

function storeTokens(token, refreshToken) {
  localStorage.setItem('bookshelf.token', token);
  if (refreshToken) localStorage.setItem('bookshelf.refreshToken', refreshToken);
}
function clearTokens() {
  localStorage.removeItem('bookshelf.token');
  localStorage.removeItem('bookshelf.user');
  localStorage.removeItem('bookshelf.refreshToken');
}

async function tryRefresh() {
  const rt = refreshTokenOf();
  if (!rt) return false;
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt })
  });
  if (!res.ok) { clearTokens(); return false; }
  const data = await res.json();
  storeTokens(data.token, data.refreshToken);
  if (data.user) localStorage.setItem('bookshelf.user', JSON.stringify(data.user));
  return true;
}

async function request(method, url, body, isForm=false) {
  const headers = {};
  const token = tokenOf();
  if (token) headers.Authorization = 'Bearer ' + token;
  if (!isForm) headers['Content-Type'] = 'application/json';
  const base = import.meta.env.VITE_API_BASE_URL || '';
  if (base && url.startsWith('/')) url = base + url;

  let res;
  try {
    res = await fetch(url, { method, headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined
    });
  } catch {
    if (toastImpl) toastImpl.error('Sin conexión con el servidor');
    return { __error: true, code: 0, error: 'Sin conexión' };
  }

  if (res.status === 401 && token) {
    if (!refreshing) refreshing = tryRefresh().finally(() => { refreshing = null; });
    const refreshed = await refreshing;
    if (refreshed) {
      headers.Authorization = 'Bearer ' + tokenOf();
      try {
        res = await fetch(url, { method, headers,
          body: body ? (isForm ? body : JSON.stringify(body)) : undefined
        });
      } catch {
        if (toastImpl) toastImpl.error('Sin conexión con el servidor');
        return { __error: true, code: 0, error: 'Sin conexión' };
      }
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return json;
      }
    } else {
      clearTokens();
      if (toastImpl) toastImpl.info('Sesión expirada');
      clearTimeout(tokenTimeout);
      tokenTimeout = setTimeout(() => navImpl && navImpl('/login'), 800);
    }
  }

  const json = await res.json().catch(() => ({}));
  if (res.status === 401) return { __error: true, ...json, code: 401 };
  if (res.status >= 500) {
    if (toastImpl) toastImpl.error('Error del servidor');
    return { __error: true, ...json, code: 500 };
  }
  if (res.status === 400) {
    return { __error: true, ...json, code: 400 };
  }
  if (res.status >= 400) {
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
  if (r && r.__error && r.code >= 500 && navImpl) {
    clearTimeout(serverErrorTimeout);
    serverErrorTimeout = setTimeout(() => navImpl('/error/500'), 1200);
  }
  return r;
}
