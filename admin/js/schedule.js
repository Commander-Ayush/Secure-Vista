// ==========================================================
// Schedule page controller — only loaded by schedule.html
// ----------------------------------------------------------
// Talks to the backend through the small AdminScheduleApi
// wrapper below. Every method first tries a matching function
// on `AdminApi` (admin-api.js) and falls back to
// realistic in-memory mock data so this page is fully clickable
// even before the backend endpoints exist.
//
// Real endpoints this expects from admin-api.js:
//   AdminApi.getScheduleSettings()          -> { autoEnabled, busyThreshold, fullThreshold }
//   AdminApi.saveScheduleSettings(settings) -> same shape
//   AdminApi.getScheduleMonth(year, month)  -> { "YYYY-MM-DD": { bookingCount, manualStatus }, ... }
//   AdminApi.setDayStatus(date, status)     -> status: null | "avail" | "busy" | "full"
//
// Optional (used for bulk-apply if present, otherwise this file
// just loops individual setDayStatus calls — see applyBulkStatus):
//   AdminApi.bulkSetDayStatus(dates, status)
// ==========================================================

const AdminScheduleApi = (function () {
    let mockSettings = { autoEnabled: true, busyThreshold: 3, fullThreshold: 6 };
    const mockOverrides = {}; // dateKey -> manualStatus

    function getBackendApi() {
        return typeof AdminApi !== 'undefined' ? AdminApi : null;
    }

    function mockBookingCount(dateKey) {
        // Deterministic placeholder so the demo looks plausible —
        // replace entirely once the real endpoint is wired in.
        const n = dateKey.split('-').reduce((sum, part) => sum + parseInt(part, 10), 0);
        return n % 9;
    }

    function getSettings() {
        const api = getBackendApi();
        if (api && typeof api.getScheduleSettings === 'function') {
            return api.getScheduleSettings();
        }
        return Promise.resolve({ ...mockSettings });
    }

    function saveSettings(settings) {
        const api = getBackendApi();
        if (api && typeof api.saveScheduleSettings === 'function') {
            return api.saveScheduleSettings(settings);
        }
        mockSettings = { ...settings };
        return Promise.resolve({ ...mockSettings });
    }

    function getMonth(year, month) {
        const api = getBackendApi();
        if (api && typeof api.getScheduleMonth === 'function') {
            return api.getScheduleMonth(year, month);
        }
        const totalDays = new Date(year, month, 0).getDate(); // month is 1-indexed here
        const data = {};
        for (let d = 1; d <= totalDays; d++) {
            const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            data[key] = {
                bookingCount: mockBookingCount(key),
                manualStatus: mockOverrides[key] || null,
            };
        }
        return Promise.resolve(data);
    }

    function setDayStatus(dateKey, status) {
        const api = getBackendApi();
        if (api && typeof api.setDayStatus === 'function') {
            return api.setDayStatus(dateKey, status);
        }
        if (status) {
            mockOverrides[dateKey] = status;
        } else {
            delete mockOverrides[dateKey];
        }
        return Promise.resolve({ date: dateKey, manualStatus: status || null });
    }

    function bulkSetDayStatus(dateKeys, status) {
        const api = getBackendApi();
        if (api && typeof api.bulkSetDayStatus === 'function') {
            return api.bulkSetDayStatus(dateKeys, status);
        }
        // Fallback: no bulk endpoint yet, so apply one at a time.
        return Promise.all(dateKeys.map((d) => setDayStatus(d, status)));
    }

    return { getSettings, saveSettings, getMonth, setDayStatus, bulkSetDayStatus };
})();

document.addEventListener('DOMContentLoaded', function () {
    const adminDate = document.getElementById('admin-date');
    if (adminDate) {
        adminDate.textContent = new Date().toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    if (typeof window.showToast !== 'function') {
        window.showToast = function (message) {
            const toast = document.getElementById('sv-toast');
            if (!toast) return;
            toast.textContent = message;
            toast.classList.add('show');
            clearTimeout(toast._hideTimer);
            toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2400);
        };
    }

    const months = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // baseYear/baseMonth = the first month shown (leftmost on desktop)
    let baseYear = today.getFullYear();
    let baseMonth = today.getMonth(); // 0-indexed

    let currentSettings = { autoEnabled: true, busyThreshold: 3, fullThreshold: 6 };
    let monthDataCache = {}; // merged cache across all months fetched this session

    const calendarRow = document.getElementById('calendar-row');
    const rangeLabel = document.getElementById('cal-range-label');

    // ---- Multi-select state ----
    let selectionMode = false;
    const selectedDates = new Set();
    const LONG_PRESS_MS = 500;

    const selectModeBtn = document.getElementById('select-mode-btn');
    const bulkBar = document.getElementById('bulk-action-bar');
    const bulkCount = document.getElementById('bulk-count');
    const bulkCancelBtn = document.getElementById('bulk-cancel-btn');

    function monthsToShow() {
        return window.matchMedia('(max-width: 900px)').matches ? 1 : 2;
    }

    function formatDateKey(year, monthIdx, day) {
        return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function computeAutoStatus(bookingCount) {
        if (!currentSettings.autoEnabled) return 'avail';
        if (bookingCount >= currentSettings.fullThreshold) return 'full';
        if (bookingCount >= currentSettings.busyThreshold) return 'busy';
        return 'avail';
    }

    function effectiveStatus(info) {
        if (!info) return { status: 'avail', isOverride: false };
        if (info.manualStatus) return { status: info.manualStatus, isOverride: true };
        return { status: computeAutoStatus(info.bookingCount || 0), isOverride: false };
    }

    // ---- Selection mode helpers ----
    function enterSelectionMode() {
        if (selectionMode) return;
        selectionMode = true;
        if (selectModeBtn) selectModeBtn.classList.add('active');
    }

    function exitSelectionMode() {
        selectionMode = false;
        if (selectModeBtn) selectModeBtn.classList.remove('active');
        selectedDates.clear();
        document.querySelectorAll('.cal-day.multi-selected').forEach(el => el.classList.remove('multi-selected'));
        updateBulkBar();
    }

    function toggleDaySelection(dateKey, dayEl) {
        if (selectedDates.has(dateKey)) {
            selectedDates.delete(dateKey);
            dayEl.classList.remove('multi-selected');
        } else {
            selectedDates.add(dateKey);
            dayEl.classList.add('multi-selected');
        }
        updateBulkBar();
    }

    function updateBulkBar() {
        if (!bulkBar || !bulkCount) return;
        bulkCount.textContent = `${selectedDates.size} selected`;
        bulkBar.classList.toggle('show', selectedDates.size > 0);
    }

    function applyBulkStatus(status) {
        const dates = Array.from(selectedDates);
        if (dates.length === 0) return;

        AdminScheduleApi.bulkSetDayStatus(dates, status)
            .then(() => {
                dates.forEach((d) => {
                    monthDataCache[d] = monthDataCache[d] || { bookingCount: 0 };
                    monthDataCache[d].manualStatus = status || null;
                });
                showToast(`Updated ${dates.length} day${dates.length === 1 ? '' : 's'}.`);
                exitSelectionMode();
                loadAndRenderCalendar();
            })
            .catch((err) => {
                showToast('Could not update: ' + (err && err.message ? err.message : 'unknown error'));
            });
    }

    if (selectModeBtn) {
        selectModeBtn.addEventListener('click', () => {
            if (selectionMode) {
                exitSelectionMode();
            } else {
                enterSelectionMode();
            }
        });
    }

    if (bulkCancelBtn) {
        bulkCancelBtn.addEventListener('click', exitSelectionMode);
    }

    document.querySelectorAll('.bulk-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            applyBulkStatus(btn.dataset.status || null);
        });
    });

    function buildMonthPanel(year, monthIdx) {
        const panel = document.createElement('div');
        panel.className = 'month-panel';
        panel.dataset.year = year;
        panel.dataset.month = monthIdx;

        const title = document.createElement('div');
        title.className = 'month-panel-title';
        title.textContent = `${months[monthIdx]} ${year}`;
        panel.appendChild(title);

        const weekdaysRow = document.createElement('div');
        weekdaysRow.className = 'cal-weekdays';
        ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach(w => {
            const span = document.createElement('span');
            span.textContent = w;
            weekdaysRow.appendChild(span);
        });
        panel.appendChild(weekdaysRow);

        const grid = document.createElement('div');
        grid.className = 'cal-grid';
        grid.id = `cal-grid-${year}-${monthIdx}`;
        panel.appendChild(grid);

        return panel;
    }

    function renderMonthGrid(year, monthIdx) {
        const grid = document.getElementById(`cal-grid-${year}-${monthIdx}`);
        if (!grid) return;
        grid.innerHTML = '';

        const firstDayIndex = new Date(year, monthIdx, 1).getDay();
        const totalDays = new Date(year, monthIdx + 1, 0).getDate();

        for (let i = 0; i < firstDayIndex; i++) {
            const empty = document.createElement('div');
            empty.className = 'cal-day disabled';
            grid.appendChild(empty);
        }

        for (let d = 1; d <= totalDays; d++) {
            const dateKey = formatDateKey(year, monthIdx, d);
            const cellDate = new Date(year, monthIdx, d);
            const isPast = cellDate < today;
            const isToday = cellDate.getTime() === today.getTime();

            const info = monthDataCache[dateKey];
            const { status, isOverride } = effectiveStatus(info);
            const bookingCount = info ? (info.bookingCount || 0) : 0;

            const dayEl = document.createElement('div');
            dayEl.className = `cal-day ${isPast ? 'past' : status}`;
            if (isToday) dayEl.classList.add('today');
            if (!isPast && selectedDates.has(dateKey)) dayEl.classList.add('multi-selected');
            dayEl.dataset.date = dateKey;

            dayEl.innerHTML = `
        <span class="day-num">${d}</span>
        <span class="day-count">${bookingCount} bkg</span>
        ${isOverride && !isPast ? '<span class="override-pin" title="Manually set"></span>' : ''}
      `;

            if (!isPast) {
                // Normal click: selection-mode toggle, or open the single-day modal.
                dayEl.addEventListener('click', () => {
                    if (selectionMode) {
                        toggleDaySelection(dateKey, dayEl);
                    } else {
                        openDayModal(dateKey, isPast);
                    }
                });

                // Long-press (touch devices): enters selection mode and selects
                // this day, without opening the modal. A normal tap still opens
                // the modal as long as it's released before LONG_PRESS_MS.
                let longPressTimer = null;
                let longPressFired = false;

                dayEl.addEventListener('touchstart', () => {
                    longPressFired = false;
                    longPressTimer = setTimeout(() => {
                        longPressFired = true;
                        enterSelectionMode();
                        toggleDaySelection(dateKey, dayEl);
                        if (navigator.vibrate) navigator.vibrate(15);
                    }, LONG_PRESS_MS);
                }, { passive: true });

                dayEl.addEventListener('touchend', (e) => {
                    clearTimeout(longPressTimer);
                    if (longPressFired) {
                        // Prevent the click event that follows touchend from also
                        // firing (which would otherwise immediately open the modal
                        // or double-toggle the selection).
                        e.preventDefault();
                    }
                });

                dayEl.addEventListener('touchmove', () => clearTimeout(longPressTimer));
                dayEl.addEventListener('contextmenu', (e) => e.preventDefault());
            }

            grid.appendChild(dayEl);
        }
    }

    function updateRangeLabel(visibleMonths) {
        if (visibleMonths.length === 1) {
            rangeLabel.textContent = `${months[visibleMonths[0].m]} ${visibleMonths[0].y}`;
        } else {
            const first = visibleMonths[0];
            const last = visibleMonths[visibleMonths.length - 1];
            rangeLabel.textContent = `${months[first.m]} ${first.y} – ${months[last.m]} ${last.y}`;
        }
    }

    function loadAndRenderCalendar() {
        const count = monthsToShow();
        calendarRow.className = `calendar-row ${count === 1 ? 'single' : ''}`;
        calendarRow.innerHTML = '';

        const visibleMonths = [];
        for (let i = 0; i < count; i++) {
            const totalIdx = baseMonth + i;
            const y = baseYear + Math.floor(totalIdx / 12);
            const m = ((totalIdx % 12) + 12) % 12;
            visibleMonths.push({ y, m });
            calendarRow.appendChild(buildMonthPanel(y, m));
        }

        updateRangeLabel(visibleMonths);

        Promise.all(visibleMonths.map(({ y, m }) => AdminScheduleApi.getMonth(y, m + 1)))
            .then((results) => {
                results.forEach((monthData) => {
                    Object.assign(monthDataCache, monthData);
                });
                visibleMonths.forEach(({ y, m }) => renderMonthGrid(y, m));
            })
            .catch((err) => {
                showToast('Could not load schedule: ' + (err && err.message ? err.message : 'unknown error'));
            });
    }

    document.getElementById('cal-prev').addEventListener('click', () => {
        baseMonth -= 1;
        if (baseMonth < 0) { baseMonth = 11; baseYear -= 1; }
        loadAndRenderCalendar();
    });

    document.getElementById('cal-next').addEventListener('click', () => {
        baseMonth += 1;
        if (baseMonth > 11) { baseMonth = 0; baseYear += 1; }
        loadAndRenderCalendar();
    });

    document.getElementById('cal-today-btn').addEventListener('click', () => {
        baseYear = today.getFullYear();
        baseMonth = today.getMonth();
        loadAndRenderCalendar();
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(loadAndRenderCalendar, 200);
    });

    // ---- Day status modal (single-day edit) ----
    const dayModal = document.getElementById('day-status-modal');
    const dayModalDate = document.getElementById('day-modal-date');
    const dayModalWeekday = document.getElementById('day-modal-weekday');
    const dayModalCount = document.getElementById('day-modal-count');
    const dayStatusOptions = document.getElementById('day-status-options');
    const dayModalSaveBtn = document.getElementById('day-modal-save-btn');

    let activeDateKey = null;
    let activeSelection = null;

    window.closeDayModal = function () {
        dayModal.classList.remove('open');
        activeDateKey = null;
    };

    function openDayModal(dateKey, isPast) {
        if (isPast) return; // past days aren't editable

        activeDateKey = dateKey;
        const info = monthDataCache[dateKey] || { bookingCount: 0, manualStatus: null };
        activeSelection = info.manualStatus || '';

        const [y, m, d] = dateKey.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);

        dayModalDate.textContent = dateKey;
        dayModalWeekday.textContent = weekdaysFull[dateObj.getDay()];
        dayModalCount.textContent = `${info.bookingCount || 0} booking${info.bookingCount === 1 ? '' : 's'} scheduled` +
            (currentSettings.autoEnabled
                ? ` — auto status would be "${computeAutoStatus(info.bookingCount || 0)}"`
                : '');

        renderStatusOptions();
        dayModal.classList.add('open');
    }

    function renderStatusOptions() {
        dayStatusOptions.querySelectorAll('.status-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.status === activeSelection);
            opt.onclick = () => {
                activeSelection = opt.dataset.status;
                renderStatusOptions();
            };
        });
    }

    dayModalSaveBtn.addEventListener('click', () => {
        if (!activeDateKey) return;
        AdminScheduleApi.setDayStatus(activeDateKey, activeSelection || null)
            .then(() => {
                monthDataCache[activeDateKey] = monthDataCache[activeDateKey] || { bookingCount: 0 };
                monthDataCache[activeDateKey].manualStatus = activeSelection || null;
                showToast('Day status updated.');
                closeDayModal();
                loadAndRenderCalendar();
            })
            .catch((err) => {
                showToast('Could not save: ' + (err && err.message ? err.message : 'unknown error'));
            });
    });

    // ---- Settings card ----
    const autoEnabledInput = document.getElementById('auto-enabled');
    const busyThresholdInput = document.getElementById('busy-threshold');
    const fullThresholdInput = document.getElementById('full-threshold');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const settingsSaveStatus = document.getElementById('settings-save-status');

    function applySettingsToForm(settings) {
        currentSettings = settings;
        autoEnabledInput.checked = !!settings.autoEnabled;
        busyThresholdInput.value = settings.busyThreshold;
        fullThresholdInput.value = settings.fullThreshold;
    }

    saveSettingsBtn.addEventListener('click', () => {
        const busyThreshold = parseInt(busyThresholdInput.value, 10) || 1;
        const fullThreshold = parseInt(fullThresholdInput.value, 10) || (busyThreshold + 1);

        if (fullThreshold <= busyThreshold) {
            showToast('Full threshold must be greater than the Busy threshold.');
            return;
        }

        const settings = {
            autoEnabled: autoEnabledInput.checked,
            busyThreshold,
            fullThreshold,
        };

        settingsSaveStatus.textContent = 'Saving…';
        AdminScheduleApi.saveSettings(settings)
            .then((saved) => {
                applySettingsToForm(saved);
                settingsSaveStatus.textContent = 'Saved.';
                showToast('Availability rules updated.');
                loadAndRenderCalendar(); // re-color days against the new thresholds
                setTimeout(() => { settingsSaveStatus.textContent = ''; }, 2000);
            })
            .catch((err) => {
                settingsSaveStatus.textContent = '';
                showToast('Could not save rules: ' + (err && err.message ? err.message : 'unknown error'));
            });
    });

    // ---- Boot ----
    AdminScheduleApi.getSettings()
        .then((settings) => {
            applySettingsToForm(settings);
            loadAndRenderCalendar();
        })
        .catch(() => {
            loadAndRenderCalendar();
        });
});