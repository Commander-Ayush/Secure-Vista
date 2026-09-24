// TODO: point this at wherever the SecureVista backend is deployed
const API_BASE = "http://localhost:8080";

function getToken() {
  return localStorage.getItem('sv_admin_token');
}

function setToken(token) {
  localStorage.setItem('sv_admin_token', token);
}

function clearToken() {
  localStorage.removeItem('sv_admin_token');
}

function goToLogin() {
  clearToken();
  if (!location.pathname.endsWith('login.html')) {
    location.href = 'login.html';
  }
}

async function authedRequest(path, options = {}) {
  const token = getToken();
  if (!token) {
    goToLogin();
    throw new Error('Not logged in');
  }

  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': 'Bearer ' + token,
    },
  });

  if (res.status === 401) {
    // token missing/expired/invalid — bounce back to login
    goToLogin();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody && errBody.message) message = errBody.message;
    } catch (_) { /* not JSON */ }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

async function authedGet(path) {
  return authedRequest(path, { method: 'GET' });
}

async function authedSend(method, path, body) {
  return authedRequest(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const AdminApi = {
  // POST /auth/login   body: { email, password }  ->  { token }
  // (not authed — this is how you GET a token in the first place)
  login: async (email, password) => {
    const res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(res.status === 401 ? 'Incorrect email or password' : `Login failed: ${res.status}`);
    return res.json();
  },

  logout: () => { clearToken(); },

  // GET /admin/dashboard/summary -> see CONTRACT.md for full shape
  getDashboardSummary: () => authedGet('/admin/dashboard/summary'),

  // GET /admin/bookings -> [ BookingDto, ... ]
  getBookings: () => authedGet('/admin/bookings'),
  completeBooking: (id) => authedSend('POST', `/admin/bookings/${id}/complete`),
  reopenBooking: (id) => authedSend('POST', `/admin/bookings/${id}/reopen`),
  deleteBooking: (id) => authedSend('DELETE', `/admin/bookings/${id}`),

  // GET /admin/services -> { services: [...], plans: [...], addons: [...] }
  getServiceCatalog: () => authedGet('/admin/services'),
  addServiceItem: (payload) => authedSend('POST', '/admin/services', payload),
  editServiceItem: (id, payload) => authedSend('PUT', `/admin/services/${id}`, payload),
  deleteServiceItem: (id) => authedSend('DELETE', `/admin/services/${id}`),

  // POST /admin/account/password  body: { currentPassword, newPassword }
  changePassword: (currentPassword, newPassword) =>
    authedSend('POST', '/admin/account/password', { currentPassword, newPassword }),

  // GET /admin/gallery -> [ { id, imageUrl }, ... ]
  // Backs the storefront's "Our Recent Work" gallery section.
  // Images themselves are hosted on Cloudinary (see admin-cloudinary.js) —
  // the backend only ever stores/returns the resulting URL.
  getGallery: () => authedGet('/admin/gallery'),
  addGalleryImage: (imageUrl) => authedSend('POST', '/admin/gallery', { imageUrl }),
  deleteGalleryImage: (id) => authedSend('DELETE', `/admin/gallery/${id}`),

  // GET /admin/about -> { aboutText, phone, email, address }
  // Backs the storefront's About/Contact section (section-sub paragraph +
  // the three contact-detail rows). Company name is deliberately NOT
  // editable here — it renders in the topbar/logo before any API call
  // resolves, so making it backend-driven would mean it visibly pops
  // in (or shows stale/blank) on slow connections. It stays a static
  // value in the storefront markup.
  // NOTE: this is a superset of the existing public CompanyDto
  // (/company) — that endpoint has no `address` or `aboutText` field
  // yet, so the backend will need to extend it (or expose these via
  // /company too) for edits made here to actually show up on the
  // storefront.
  getAboutSettings: () => authedGet('/admin/about'),
  saveAboutSettings: (payload) => authedSend('PUT', '/admin/about', payload),

  // GET /admin/reviews -> [ ReviewDto, ... ] (all: pending + approved)
  getReviews: () => authedGet('/admin/reviews'),
  approveReview: (id) => authedSend('POST', `/admin/reviews/${id}/approve`),
  deleteReview: (id) => authedSend('DELETE', `/admin/reviews/${id}`),

  // GET /admin/schedule/settings -> { autoEnabled, busyThreshold, fullThreshold }
  getScheduleSettings: () => authedGet('/admin/schedule/settings'),

  // PUT /admin/schedule/settings  body: { autoEnabled, busyThreshold, fullThreshold }
  saveScheduleSettings: (settings) => authedSend('PUT', '/admin/schedule/settings', settings),

  // GET /admin/schedule/month?year=YYYY&month=MM
  // -> { "YYYY-MM-DD": { bookingCount, manualStatus }, ... }
  // manualStatus is null | "avail" | "busy" | "full"
  getScheduleMonth: (year, month) => authedGet(`/admin/schedule/month?year=${year}&month=${month}`),

  // PUT /admin/schedule/day  body: { date, status }
  // status is null (clear override) | "avail" | "busy" | "full"
  setDayStatus: (date, status) => authedSend('PUT', '/admin/schedule/day', { date, status }),

  // PUT /admin/schedule/days  body: { dates: [...], status }
  // status is null (clear overrides) | "avail" | "busy" | "full"
  bulkSetDayStatus: (dates, status) => authedSend('PUT', '/admin/schedule/days', { dates, status }),
};
