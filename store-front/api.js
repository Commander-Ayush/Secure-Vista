// ============================================================
// SecureVista — API layer
// ============================================================
// This is the *only* file you should need to touch when pointing
// the storefront at a different backend — everything else discovers
// its data at runtime via fetch(). Mirrors the same api.js pattern
// used by the sister site (GreenCut) against the same backend, minus
// the store/products/orders endpoints, which SecureVista doesn't need.
//
// Tenant resolution: the backend identifies which business this site
// belongs to by reading the browser's Origin header (see the backend's
// PublicTenantResolver) — nothing here is business-specific. The exact
// same three files (index2.html / style2.css / script.js / api.js) can
// be deployed unmodified to any client domain the backend knows about.

const API_BASE = "http://localhost:8080"; // ← change to your VPS's real address

async function apiGet(path) {
    const res = await fetch(API_BASE + path);
    if (!res.ok) {
        let message = `GET ${path} failed: ${res.status}`;
        try {
            const errBody = await res.json();
            if (errBody && errBody.message) message = errBody.message;
        } catch (_) { /* response wasn't JSON — keep the generic message */ }
        throw new Error(message);
    }
    return res.json();
}

async function apiPost(path, body) {
    const res = await fetch(API_BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        // try to surface a server-sent error message if there is one
        let message = `POST ${path} failed: ${res.status}`;
        try {
            const errBody = await res.json();
            if (errBody && errBody.message) message = errBody.message;
        } catch (_) { /* response wasn't JSON — keep the generic message */ }
        throw new Error(message);
    }
    // Some endpoints (like booking submission) may return 2xx with no body
    return res.status === 204 ? null : res.json().catch(() => null);
}

const Api = {
    // GET /company  -> { name, city, foundedYear, yardsServed,
    //                     yearsExperience, phone, email }
    // Note: the backend's CompanyDto has no street-address field (only
    // `city`) — the site's street address stays static in the markup.
    getCompany: () => apiGet("/company"),

    // GET /services        -> [ { id, icon, name, description, price, featured, features } , ... ]
    // GET /services/plans   -> same shape, type = "plan"   (unused by SecureVista today)
    // GET /services/addons  -> same shape, type = "addon"  (unused by SecureVista today)
    getServices: () => apiGet("/services"),
    getPlans: () => apiGet("/services/plans"),
    getAddons: () => apiGet("/services/addons"),

    // POST /booking  body: { firstName, lastName, phone, email, address,
    //                         serviceOfferingId, preferredDate, notes }
    // serviceOfferingId is the real numeric `id` from /services — not a
    // free-text code — so the backend can compute revenue from the
    // service's actual price.
    submitBooking: (payload) => apiPost("/booking", payload),

    // GET /reviews   -> [ { id, name, rating, text, submittedAt }, ... ]
    // POST /reviews  body: { name, rating, text }
    getReviews: () => apiGet("/reviews"),
    submitReview: (payload) => apiPost("/reviews", payload),
    // GET /booking/availability?year=YYYY&month=MM -> { "YYYY-MM-DD": { status: "avail"|"busy"|"full" }, ... }
    getAvailability: (year, month) => apiGet(`/booking/availability?year=${year}&month=${month}`),
};
