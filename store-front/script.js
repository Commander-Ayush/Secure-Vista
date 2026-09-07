document.addEventListener("DOMContentLoaded", function () {
    // 1. Client Data Injection (static fallback)
    const data = window.CLIENT_DATA || {};
    if (data.businessName) {
        const siteLogo = document.getElementById("site-logo");
        if (siteLogo) siteLogo.innerHTML = `${data.businessName.replace(/(Vista|Security)/, "<span>$1</span>")}`;
        const footerName = document.getElementById("footer-name");
        if (footerName) footerName.textContent = data.businessName;
    }

    if (data.phone) {
        const phoneEl = document.getElementById("contact-phone");
        if (phoneEl) phoneEl.textContent = data.phone;
    }

    if (data.email) {
        const emailEl = document.getElementById("contact-email");
        if (emailEl) emailEl.textContent = data.email;
    }

    if (data.address) {
        const addrEl = document.getElementById("contact-address");
        if (addrEl) addrEl.textContent = data.address;
    }

    const footerYear = document.getElementById("footer-year");
    if (footerYear) footerYear.textContent = new Date().getFullYear();

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str == null ? "" : String(str);
        return div.innerHTML;
    }

    // 1b. Live company info from the backend.
    if (typeof Api !== "undefined" && Api.getCompany) {
        Api.getCompany()
            .then((company) => {
                if (!company) return;

                if (company.name) {
                    const siteLogo = document.getElementById("site-logo");
                    if (siteLogo) siteLogo.innerHTML = company.name.replace(/(Vista|Security)/, "<span>$1</span>");
                    const footerName = document.getElementById("footer-name");
                    if (footerName) footerName.textContent = company.name;
                }

                if (company.phone) {
                    const phoneEl = document.getElementById("contact-phone");
                    if (phoneEl) phoneEl.textContent = company.phone;
                }

                if (company.email) {
                    const emailEl = document.getElementById("contact-email");
                    if (emailEl) emailEl.textContent = company.email;
                }

                if (company.city || company.foundedYear) {
                    const aboutSub = document.querySelector(".about-section .section-sub");
                    if (aboutSub) {
                        const founded = company.foundedYear ? ` since ${company.foundedYear}` : "";
                        const city = company.city ? ` in ${company.city}` : "";
                        aboutSub.textContent = `Providing top-tier low-voltage integration and peace of mind${city}${founded}.`;
                    }
                }
            })
            .catch((err) => {
                console.warn("Could not load company info from backend, keeping static content:", err.message);
            });
    }

    // 2. Mobile Nav Toggle
    const navToggle = document.getElementById("nav-toggle");
    const navMenu = document.getElementById("nav-menu");
    if (navToggle && navMenu) {
        navToggle.addEventListener("click", () => {
            navMenu.classList.toggle("active");
        });
    }

    // 3. Scroll Reveal & Diagonal Glare Observer
    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
            }
        });
    }, { threshold: 0.1 });
    reveals.forEach(el => observer.observe(el));

    const glareCard = document.getElementById('glareCard');
    if (glareCard) {
        const glareObserver = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    glareCard.classList.add('glare-active');
                    observerInstance.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        glareObserver.observe(glareCard);
    }

    // 4. Hero Plexus Interactive Background
    const canvas = document.getElementById("plexus-canvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;

        const particles = [];
        const particleCount = Math.min(Math.floor(width / 15), 60);

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.6,
                radius: Math.random() * 2 + 1
            });
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                let p = particles[i];
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#1e293b';
                ctx.fill();

                for (let j = i + 1; j < particles.length; j++) {
                    let p2 = particles[j];
                    let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = 'rgba(30, 41, 59, 0.12)';
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animate);
        }

        animate();

        window.addEventListener("resize", () => {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
        });
    }

    // 5. Services Carousel (Symmetrical Centering - Left & Right Cards)
    function initServicesCarousel() {
        const stage = document.getElementById('services-stage');
        if (!stage) return;

        const cards = Array.from(stage.querySelectorAll('.service-card'));
        const totalCards = cards.length;
        if (totalCards === 0) return;

        let currentIndex = Math.floor(totalCards / 2);
        let isDragging = false;
        let startX = 0;
        let dragDistance = 0;
        const CLICK_THRESHOLD = 6;

        function getCardSpacing() {
            const vw = window.innerWidth;
            if (vw < 480) return 180;
            if (vw < 900) return 220;
            return 250;
        }

        function wrapDiff(diff, total) {
            diff = ((diff % total) + total) % total;
            if (diff > total / 2) diff -= total;
            return diff;
        }

        function renderServices() {
            const spacing = getCardSpacing();
            const vw = window.innerWidth;

            cards.forEach((card, i) => {
                const diff = wrapDiff(i - currentIndex, totalCards);
                const absDiff = Math.abs(diff);

                const translateX = diff * spacing;
                const baseScale = vw < 600 ? 1.0 : 1.15;
                const scale = Math.max(0.6, baseScale - (absDiff * 0.18));
                const zIndex = Math.round(100 - (absDiff * 20));

                let opacity = Math.max(0, 1 - (absDiff * 0.3));
                let brightness = Math.max(0.4, 1 - (absDiff * 0.25));

                card.style.transform = `translate3d(${translateX}px, 0, 0) scale(${scale})`;
                card.style.zIndex = zIndex;
                card.style.opacity = opacity;
                card.style.filter = `brightness(${brightness})`;

                if (absDiff < 0.4) {
                    card.classList.add('is-center');
                } else {
                    card.classList.remove('is-center');
                }
            });
        }

        function snapToNearestCard() {
            currentIndex = Math.round(currentIndex);
            currentIndex = ((currentIndex % totalCards) + totalCards) % totalCards;
            renderServices();
        }

        let lastClientX = 0;

        function onPointerDown(e) {
            isDragging = true;
            dragDistance = 0;
            startX = e.clientX || (e.touches && e.touches[0].clientX);
            lastClientX = startX;
            stage.style.cursor = 'grabbing';
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            const currentX = e.clientX || (e.touches && e.touches[0].clientX);
            const deltaX = currentX - startX;
            dragDistance += Math.abs(deltaX);
            const spacing = getCardSpacing();

            currentIndex -= deltaX / (spacing * 1.8);

            startX = currentX;
            lastClientX = currentX;
            renderServices();
        }

        function onPointerUp() {
            if (!isDragging) return;
            isDragging = false;
            stage.style.cursor = 'grab';

            if (dragDistance < CLICK_THRESHOLD) {
                const stageRect = stage.getBoundingClientRect();
                const stageCenter = stageRect.left + stageRect.width / 2;
                currentIndex += lastClientX < stageCenter ? -1 : 1;
            }

            snapToNearestCard();
        }

        stage.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        stage.addEventListener('touchstart', onPointerDown, { passive: true });
        window.addEventListener('touchmove', onPointerMove, { passive: true });
        window.addEventListener('touchend', onPointerUp);

        window.addEventListener('resize', renderServices);
        renderServices();
    }

    // Global View Toggle Handler
    const toggleServicesBtn = document.getElementById('toggle-services-btn');
    const servicesGrid = document.getElementById('services-grid');
    const stage = document.getElementById('services-stage');

    if (toggleServicesBtn && servicesGrid && stage) {
        toggleServicesBtn.addEventListener('click', () => {
            const isGridVisible = !servicesGrid.classList.contains('hidden');

            if (isGridVisible) {
                servicesGrid.classList.add('hidden');
                stage.classList.remove('hidden');
                toggleServicesBtn.textContent = 'Show All';
            } else {
                servicesGrid.classList.remove('hidden');
                stage.classList.add('hidden');
                toggleServicesBtn.textContent = 'Show Carousel';
            }
        });
    }

    // 5b. Pull real service catalog from backend
    function buildServiceCardHTML(svc) {
        const iconSvg = typeof resolveIconSvg === "function"
            ? resolveIconSvg(svc.icon)
            : "";
        return `
            <div class="service-card" data-id="${escapeHtml(svc.id)}">
                <div class="service-icon">${iconSvg}</div>
                <h3>${escapeHtml(svc.name)}</h3>
                <p>${escapeHtml(svc.description || "")}</p>
                ${svc.price ? `<span class="service-price">${escapeHtml(svc.price)}</span>` : ""}
            </div>`;
    }

    function renderServiceCards(services) {
        const stage = document.getElementById('services-stage');
        const servicesGrid = document.getElementById('services-grid');
        if (!stage || !Array.isArray(services) || services.length === 0) return false;

        const cardsHtml = services.map(buildServiceCardHTML).join('');
        stage.innerHTML = cardsHtml;

        if (servicesGrid) {
            servicesGrid.innerHTML = cardsHtml;
        }

        return true;
    }

    function renderBookingServiceOptions(services) {
        const select = document.getElementById('serviceOfferingId');
        if (!select || !Array.isArray(services)) return;

        select.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.disabled = true;
        placeholder.selected = true;
        placeholder.textContent = 'Select a Service';
        select.appendChild(placeholder);

        services.forEach(svc => {
            const opt = document.createElement('option');
            opt.value = svc.id;
            opt.textContent = svc.name;
            select.appendChild(opt);
        });
    }

    function bootServices() {
        // Initialize carousel immediately so skeleton placeholders display with 3D positioning
        initServicesCarousel();

        if (typeof Api !== "undefined" && Api.getServices) {
            Api.getServices()
                .then((services) => {
                    if (renderServiceCards(services)) {
                        renderBookingServiceOptions(services);
                    }
                })
                .catch((err) => {
                    console.warn("Could not load services from backend, keeping static cards:", err.message);
                })
                .finally(() => {
                    // Re-run carousel logic once real cards are inserted into DOM
                    initServicesCarousel();
                });
        }
    }

    bootServices();

    // 7. Reviews "Show All" Toggle Logic
    const toggleReviewsBtn = document.getElementById('toggle-reviews-btn');
    const reviewsSummaryLayout = document.getElementById('reviews-summary-layout');
    const reviewsGrid = document.getElementById('reviews-grid');

    if (toggleReviewsBtn && reviewsSummaryLayout && reviewsGrid) {
        const allReviews = [
            { name: "Alex M.", stars: "★★★★★", text: "Outstanding setup. Installed 8 CCTV cameras around our warehouse with zero downtime." },
            { name: "Sarah K.", stars: "★★★★★", text: "The access control app is super smooth. Our office team loves not carrying physical keys." },
            { name: "David P.", stars: "★★★★★", text: "Fast maintenance response time! They fixed our panel issue within 2 hours." },
            { name: "Elena R.", stars: "★★★★★", text: "Clean cabling and high quality 4K camera streams. Very professional team." },
            { name: "Marcus T.", stars: "★★★★★", text: "24/7 monitoring gives us total peace of mind for our retail store." }
        ];

        allReviews.forEach(rev => {
            const card = document.createElement('div');
            card.className = 'review-card';
            card.innerHTML = `
                <div class="review-header">
                    <span class="reviewer-name">${rev.name}</span>
                    <span class="review-stars">${rev.stars}</span>
                </div>
                <p class="review-text">${rev.text}</p>
            `;
            reviewsGrid.appendChild(card);
        });

        toggleReviewsBtn.addEventListener('click', () => {
            const isGridVisible = !reviewsGrid.classList.contains('hidden');

            if (isGridVisible) {
                reviewsGrid.classList.add('hidden');
                reviewsSummaryLayout.classList.remove('hidden');
                toggleReviewsBtn.textContent = 'Show All';
            } else {
                reviewsGrid.classList.remove('hidden');
                reviewsSummaryLayout.classList.add('hidden');
                toggleReviewsBtn.textContent = 'Show Summary';
            }
        });
    }

    // 8. Photo Gallery Center Scroll Helper
    const galleryContainer = document.querySelector('.gallery-container');
    const centerCard = document.querySelector('.center-card');

    if (galleryContainer && centerCard) {
        const galleryObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && window.innerWidth <= 1024) {
                    centerCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        }, { threshold: 0.5 });

        galleryObserver.observe(galleryContainer);
    }

    // 9. Booking Form Submission
    const bookingForm = document.getElementById('booking-form');
    const bookingStatus = document.getElementById('booking-status');

    if (bookingForm) {
        bookingForm.addEventListener("submit", function (e) {
            e.preventDefault();

            if (!bookingForm.checkValidity()) {
                bookingForm.reportValidity();
                return;
            }

            if (bookingStatus) {
                bookingStatus.textContent = "Sending consultation request...";
                bookingStatus.style.color = "var(--primary)";
            }

            const formData = new FormData(bookingForm);
            const payload = Object.fromEntries(formData.entries());

            if (payload.serviceOfferingId) {
                payload.serviceOfferingId = Number(payload.serviceOfferingId);
            }

            ["address", "preferredDate", "notes"].forEach((key) => {
                if (payload[key] === "") payload[key] = null;
            });

            if (typeof Api !== "undefined" && Api.submitBooking) {
                Api.submitBooking(payload)
                    .then(() => {
                        if (bookingStatus) {
                            bookingStatus.textContent = "Thank you! Your request has been submitted successfully.";
                            bookingStatus.style.color = "#10b981";
                        }
                        bookingForm.reset();
                    })
                    .catch((err) => {
                        if (bookingStatus) {
                            bookingStatus.textContent = err && err.message
                                ? err.message
                                : "An error occurred. Please try again later.";
                            bookingStatus.style.color = "#ef4444";
                        }
                    });
            } else {
                setTimeout(() => {
                    if (bookingStatus) {
                        bookingStatus.textContent = "Thank you! Your request has been submitted.";
                        bookingStatus.style.color = "#10b981";
                    }
                    bookingForm.reset();
                }, 800);
            }
        });
    }

    // 9b. Review Submission
    const reviewSubmitBtn = document.getElementById('review-submit-btn');
    const reviewNameInput = document.getElementById('review-name-input');
    const reviewTextInput = document.getElementById('review-text-input');
    const reviewStatus = document.getElementById('review-status');

    if (reviewSubmitBtn) {
        reviewSubmitBtn.addEventListener('click', function () {
            const name = reviewNameInput ? reviewNameInput.value.trim() : '';
            const text = reviewTextInput ? reviewTextInput.value.trim() : '';

            if (reviewStatus) reviewStatus.style.display = 'block';

            if (!name) {
                if (reviewStatus) {
                    reviewStatus.textContent = 'Please enter your name.';
                    reviewStatus.style.color = '#ef4444';
                }
                return;
            }
            if (!currentReviewRating) {
                if (reviewStatus) {
                    reviewStatus.textContent = 'Please select a star rating.';
                    reviewStatus.style.color = '#ef4444';
                }
                return;
            }

            const payload = { reviewerName: name, stars: currentReviewRating, text: text };

            if (reviewStatus) {
                reviewStatus.textContent = 'Submitting your review...';
                reviewStatus.style.color = 'var(--primary)';
            }

            if (typeof Api !== 'undefined' && Api.submitReview) {
                Api.submitReview(payload)
                    .then(() => {
                        if (reviewStatus) {
                            reviewStatus.textContent = 'Thank you! Your review has been submitted.';
                            reviewStatus.style.color = '#10b981';
                        }
                        if (reviewNameInput) reviewNameInput.value = '';
                        if (reviewTextInput) reviewTextInput.value = '';
                        setRating(0);
                    })
                    .catch((err) => {
                        if (reviewStatus) {
                            reviewStatus.textContent = err && err.message
                                ? err.message
                                : 'An error occurred. Please try again later.';
                            reviewStatus.style.color = '#ef4444';
                        }
                    });
            } else {
                setTimeout(() => {
                    if (reviewStatus) {
                        reviewStatus.textContent = 'Thank you! Your review has been submitted.';
                        reviewStatus.style.color = '#10b981';
                    }
                    if (reviewNameInput) reviewNameInput.value = '';
                    if (reviewTextInput) reviewTextInput.value = '';
                    setRating(0);
                }, 800);
            }
        });
    }

    // 10. Booking Calendar (date-only, availability-aware, no hardcoded data)
    (function initBookingCalendar() {
        const trigger = document.getElementById('datepickerTrigger');
        const drawer = document.getElementById('calendarDrawer');
        if (!trigger || !drawer) return;

        const triggerText = document.getElementById('triggerText');
        const monthYearEl = document.getElementById('calMonthYear');
        const gridEl = document.getElementById('calGrid');
        const hiddenDateInput = document.getElementById('preferredDate');
        const prevBtn = document.getElementById('calPrev');
        const nextBtn = document.getElementById('calNext');
        const doneBtn = document.getElementById('calDoneBtn');

        const months = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        const statusLabels = { avail: "Available", busy: "Busy", full: "Full" };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let currYear = today.getFullYear();
        let currMonth = today.getMonth();
        let availabilityCache = {};

        // Expected shape once wired to the backend:
        // { "2026-09-08": { status: "busy" }, "2026-09-10": { status: "full" } }
        // Until that endpoint exists, this resolves to {} and every day
        // defaults to "avail" — so the calendar works end-to-end today.
        function fetchAvailability(year, month) {
            if (typeof Api !== "undefined" && Api.getAvailability) {
                return Api.getAvailability(year, month + 1).catch(() => ({}));
            }
            return Promise.resolve({});
        }

        function formatDateKey(year, month, day) {
            return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }

        function renderCalendar() {
            monthYearEl.textContent = `${months[currMonth]} ${currYear}`;
            gridEl.innerHTML = '';

            const firstDayIndex = new Date(currYear, currMonth, 1).getDay();
            const totalDays = new Date(currYear, currMonth + 1, 0).getDate();

            for (let i = 0; i < firstDayIndex; i++) {
                const empty = document.createElement('div');
                empty.className = 'cal-day disabled';
                gridEl.appendChild(empty);
            }

            for (let d = 1; d <= totalDays; d++) {
                const dateKey = formatDateKey(currYear, currMonth, d);
                const cellDate = new Date(currYear, currMonth, d);
                const isPast = cellDate < today;
                const info = availabilityCache[dateKey] || { status: "avail" };

                const dayEl = document.createElement('div');
                dayEl.className = `cal-day ${isPast ? 'past' : info.status}`;
                if (hiddenDateInput.value === dateKey) dayEl.classList.add('selected');

                dayEl.innerHTML = `
                <span class="day-num">${d}</span>
                <span class="day-status">${isPast ? '' : (statusLabels[info.status] || 'Available')}</span>
            `;

                if (info.status !== 'full' && !isPast) {
                    dayEl.addEventListener('click', () => {
                        document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
                        dayEl.classList.add('selected');
                        hiddenDateInput.value = dateKey;
                        triggerText.classList.remove('placeholder');
                        triggerText.textContent = dateKey;
                    });
                }

                gridEl.appendChild(dayEl);
            }
        }

        function loadMonth() {
            fetchAvailability(currYear, currMonth).then((data) => {
                availabilityCache = data || {};
                renderCalendar();
            });
        }

        trigger.addEventListener('click', () => {
            drawer.classList.toggle('open');
            trigger.classList.toggle('active');
        });

        prevBtn.addEventListener('click', () => {
            currMonth--;
            if (currMonth < 0) { currMonth = 11; currYear--; }
            loadMonth();
        });

        nextBtn.addEventListener('click', () => {
            currMonth++;
            if (currMonth > 11) { currMonth = 0; currYear++; }
            loadMonth();
        });

        doneBtn.addEventListener('click', () => {
            drawer.classList.remove('open');
            trigger.classList.remove('active');
        });

        loadMonth();
    })();
});

let currentReviewRating = 0;
function setRating(rating) {
    currentReviewRating = rating;
    const stars = document.querySelectorAll('#starPicker span');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}