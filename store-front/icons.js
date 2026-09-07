// ============================================================
// SecureVista — shared icon library
// ============================================================
// A curated set of named icons. The *name* (e.g. "cctv") is the only
// thing that ever gets stored in the database (ServiceOffering.icon)
// or sent over the wire — never raw SVG markup. Both the admin panel
// (icon picker) and the storefront (service cards) load this same
// file so they always render identically and stay in sync by
// construction, not by convention.
//
// To add a new icon: add one entry here, it shows up in the admin
// picker automatically and resolves correctly on the storefront.
// No backend change needed — the DB column is just a free string.

const ICON_LIBRARY = {
    shield: {
        label: "Shield",
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/></svg>`,
    },
    cctv: {
        label: "CCTV Camera",
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="10" rx="2"/><path d="M16 10l6-3v10l-6-3"/></svg>`,
    },
    access: {
        label: "Access Control",
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    },
    alarm: {
        label: "Alarm / Monitoring",
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>`,
    },
    cabling: {
        label: "Structured Cabling",
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h4l3 8 4-16 3 8h4"/></svg>`,
    },
    monitor: {
        label: "Remote Monitoring",
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
    },
    wrench: {
        label: "Installation / Support",
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 1 0-5.4 5.4l-6.6 6.6a1.5 1.5 0 0 0 2.1 2.1l6.6-6.6a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.1-2.1 2.5-2.5z"/></svg>`,
    },
    lock: {
        label: "Smart Lock",
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    },
    network: {
        label: "Server / Network",
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="6" rx="1.5"/><rect x="3" y="15" width="18" height="6" rx="1.5"/><circle cx="7" cy="6" r="0.6" fill="currentColor" stroke="none"/><circle cx="7" cy="18" r="0.6" fill="currentColor" stroke="none"/></svg>`,
    },
    bell: {
        label: "Notification / Alert",
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`,
    },
    phone: {
        label: "Support Line",
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>`,
    },
    checkmark: {
        label: "Verified / Guarantee",
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M8.5 12l2.3 2.3L15.5 9.5"/></svg>`,
    },
};

// Resolves an icon *name* (e.g. "cctv") to its SVG markup. Falls back
// to the shield icon for anything unset, unrecognized, or left over
// from before this system existed (old emoji strings, typos, etc).
function resolveIconSvg(name) {
    const entry = ICON_LIBRARY[name];
    return entry ? entry.svg : ICON_LIBRARY.shield.svg;
}
