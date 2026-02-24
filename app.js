/**
 * Khatmah - CMU-Q MSA Premium
 * Ramadan reading companion. All state in appState; never read from DOM for progress.
 */

/* ============ CONSTANTS ============ */
const JUZ_PER_KHATMAH = 30;
const RAMADAN_DAYS = 30;
const PAGES_IN_QURAN = 604;
const RAMADAN_MONTH = 9; // 9th month in Islamic calendar

const JUZ_PAGE_START = [
    1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
    201, 222, 242, 262, 282, 302, 322, 342, 362, 382,
    402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

const STORAGE_KEYS = {
    targetKhatmahs: 'khatmah_target_khatmahs',
    completedDays: 'khatmah_completed_days',
    hijriOffset: 'khatmah_hijri_offset',
};

/* ============ APP STATE (Single Source of Truth) ============ */
const appState = {
    targetKhatmahs: 1,
    completedDays: [],   // e.g. [1, 3, 5] = days 1, 3, 5 done
    hijriOffset: 0,
};

// Derived (computed from appState + Hijri, never from DOM)
let currentDay = 1;
let inRamadan = false;
let viewingDay = 1; // For keyboard nav scroll target

/* ============ DOM REFERENCES ============ */
let carousel, carouselInner, progressText, progressCompleted, progressBarFill;
let hijriDayDisplay, hijriMinus, hijriPlus;
let khatmahInput, khatmahMinus, khatmahPlus;
let outsideBanner;

/* ============ HIJRI DATE ============ */
function getHijriDate() {
    try {
        const formatter = new Intl.DateTimeFormat('en-SA-u-ca-islamic-umalqura', {
            year: 'numeric', month: 'numeric', day: 'numeric',
        });
        const parts = formatter.formatToParts(new Date());
        const obj = {};
        parts.forEach((p) => { obj[p.type] = parseInt(p.value, 10); });
        return { year: obj.year, month: obj.month, day: obj.day };
    } catch (e) {
        return null;
    }
}

function computeRamadanDay() {
    const hijri = getHijriDate();
    if (!hijri) {
        inRamadan = false;
        return Math.max(1, Math.min(30, 1 + appState.hijriOffset));
    }
    if (hijri.month === RAMADAN_MONTH) {
        inRamadan = true;
        return Math.max(1, Math.min(30, hijri.day + appState.hijriOffset));
    }
    inRamadan = false;
    return Math.max(1, Math.min(30, 1 + appState.hijriOffset));
}

/* ============ SCHEDULE CALCULATION (Equal Distribution) ============ */
/**
 * Pages per day = (604 * targetKhatmahs) / 30
 * Each day gets targetKhatmahs juz' (e.g. 1 khatmah = 1 juz'/day)
 */
function buildSchedule() {
    const k = appState.targetKhatmahs;
    const juzPerDay = k;
    const schedule = [];

    for (let d = 1; d <= RAMADAN_DAYS; d++) {
        const juzStart = (d - 1) * juzPerDay + 1;
        const juzEnd = d * juzPerDay;
        const khatmahNum = Math.ceil(juzEnd / JUZ_PER_KHATMAH);
        const isMilestone = juzEnd % JUZ_PER_KHATMAH === 0;

        schedule.push({
            day: d,
            juzStart,
            juzEnd,
            juzCount: juzPerDay,
            khatmahNumber: khatmahNum,
            isMilestone,
        });
    }
    return schedule;
}

function juzNum(cumulative) {
    return ((cumulative - 1) % JUZ_PER_KHATMAH) + 1;
}

function formatJuzRange(juzStart, juzEnd) {
    const s = juzNum(juzStart);
    const e = juzNum(juzEnd);
    return s === e ? `Juz' ${s}` : `Juz' ${s}-${e}`;
}

function juzToPageRange(juz) {
    const idx = juz - 1;
    const start = JUZ_PAGE_START[idx];
    const end = juz < 30 ? JUZ_PAGE_START[idx + 1] - 1 : PAGES_IN_QURAN;
    return [start, end];
}

function formatPageRange(juzStart, juzEnd) {
    const s = juzNum(juzStart);
    const e = juzNum(juzEnd);
    const [pStart] = juzToPageRange(s);
    const [, pEnd] = juzToPageRange(e);
    return pStart === pEnd ? `p.${pStart}` : `pp.${pStart}-${pEnd}`;
}

/* ============ PERSISTENCE ============ */
function loadState() {
    try {
        const k = localStorage.getItem(STORAGE_KEYS.targetKhatmahs);
        if (k != null) appState.targetKhatmahs = Math.max(1, Math.min(10, parseInt(k, 10)));

        const days = localStorage.getItem(STORAGE_KEYS.completedDays);
        if (days) {
            const arr = JSON.parse(days);
            appState.completedDays = Array.isArray(arr) ? arr.filter((n) => n >= 1 && n <= 30) : [];
        }

        const off = localStorage.getItem(STORAGE_KEYS.hijriOffset);
        if (off != null) appState.hijriOffset = Math.max(-29, Math.min(29, parseInt(off, 10)));
    } catch (e) {}
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEYS.targetKhatmahs, String(appState.targetKhatmahs));
        localStorage.setItem(STORAGE_KEYS.completedDays, JSON.stringify(appState.completedDays));
        localStorage.setItem(STORAGE_KEYS.hijriOffset, String(appState.hijriOffset));
    } catch (e) {}
}

/* ============ STATE ACTIONS (Update appState → save → render) ============ */
function setTargetKhatmahs(value) {
    const k = Math.max(1, Math.min(10, value));
    appState.targetKhatmahs = k;
    saveState();
    render();
}

function setHijriOffset(delta) {
    appState.hijriOffset = Math.max(-29, Math.min(29, appState.hijriOffset + delta));
    currentDay = computeRamadanDay();
    viewingDay = currentDay;
    saveState();
    render();
    scrollToDay(currentDay);
}

function toggleDayComplete(day) {
    const idx = appState.completedDays.indexOf(day);
    if (idx >= 0) {
        appState.completedDays.splice(idx, 1);
    } else {
        appState.completedDays.push(day);
        appState.completedDays.sort((a, b) => a - b);
    }
    if (navigator.vibrate) navigator.vibrate(50);
    saveState();
    render();
}

/* ============ RENDER (UI reflects appState only) ============ */
function renderProgress() {
    const completedCount = appState.completedDays.length;
    const pct = (completedCount / RAMADAN_DAYS) * 100;

    progressText.textContent = `Day ${currentDay} of ${RAMADAN_DAYS}`;
    progressCompleted.textContent = `${completedCount} completed`;
    progressBarFill.style.width = `${pct}%`;
}

function renderControls() {
    hijriDayDisplay.textContent = currentDay;
    khatmahInput.value = appState.targetKhatmahs;
    outsideBanner.classList.toggle('hidden', inRamadan);
}

function renderCarousel() {
    const schedule = buildSchedule();
    carouselInner.innerHTML = schedule
        .map((row) => {
            const juzLabel = formatJuzRange(row.juzStart, row.juzEnd);
            const pageLabel = formatPageRange(row.juzStart, row.juzEnd);
            const isCurrent = row.day === currentDay;
            const isComplete = appState.completedDays.includes(row.day);

            const cardClasses = [
                'day-card carousel-card',
                isCurrent ? 'current-day' : '',
                isComplete ? 'completed' : '',
            ]
                .filter(Boolean)
                .join(' ');

            return `
                <article
                    class="${cardClasses}"
                    data-day="${row.day}"
                    role="button"
                    tabindex="0"
                    aria-label="Day ${row.day}: ${juzLabel} ${pageLabel}"
                >
                    <div class="flex justify-between items-start mb-3">
                        <span class="text-lg font-bold ${isCurrent ? 'text-cmu-red' : 'text-slate-300'}">Day ${row.day}</span>
                        ${isComplete ? '<span class="text-green-400 text-xl" aria-hidden="true">✓</span>' : ''}
                    </div>
                    <div class="text-cmu-red font-semibold mb-1">${juzLabel}</div>
                    <div class="text-sm text-slate-500">${pageLabel}</div>
                    <div class="mt-2 text-xs text-slate-500">Khatmah ${row.khatmahNumber}${row.isMilestone ? ' ✓' : ''}</div>
                </article>
            `;
        })
        .join('');

    carouselInner.querySelectorAll('[data-day]').forEach((el) => {
        el.addEventListener('click', () => toggleDayComplete(parseInt(el.dataset.day, 10)));
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDayComplete(parseInt(el.dataset.day, 10));
            }
        });
    });
}

function render() {
    renderProgress();
    renderControls();
    renderCarousel();
}

/* ============ SCROLL ============ */
function scrollToDay(day) {
    requestAnimationFrame(() => {
        const card = carouselInner.querySelector(`[data-day="${day}"]`);
        if (card) {
            const scrollLeft = card.offsetLeft - carousel.offsetWidth / 2 + card.offsetWidth / 2;
            carousel.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    });
}

/* ============ DRAG TO SCROLL (Desktop) ============ */
function setupDragScroll() {
    let isDown = false;
    let startX;
    let scrollLeft;

    carousel.addEventListener('mousedown', (e) => {
        isDown = true;
        carousel.classList.add('cursor-grabbing');
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
    });

    carousel.addEventListener('mouseleave', () => {
        isDown = false;
        carousel.classList.remove('cursor-grabbing');
    });

    carousel.addEventListener('mouseup', () => {
        isDown = false;
        carousel.classList.remove('cursor-grabbing');
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 1.2;
        carousel.scrollLeft = scrollLeft - walk;
    });
}

/* ============ KEYBOARD NAV ============ */
function setupKeyboardNav() {
    carousel.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            viewingDay = Math.max(1, viewingDay - 1);
            scrollToDay(viewingDay);
        } else if (e.key === 'ArrowRight') {
            viewingDay = Math.min(30, viewingDay + 1);
            scrollToDay(viewingDay);
        }
    });
}

/* ============ INIT ============ */
function init() {
    carousel = document.getElementById('carousel');
    carouselInner = document.getElementById('carousel-inner');
    progressText = document.getElementById('progress-text');
    progressCompleted = document.getElementById('progress-completed');
    progressBarFill = document.getElementById('progress-bar-fill');
    hijriDayDisplay = document.getElementById('hijri-day-display');
    hijriMinus = document.getElementById('hijri-minus');
    hijriPlus = document.getElementById('hijri-plus');
    khatmahInput = document.getElementById('khatmah-input');
    khatmahMinus = document.getElementById('khatmah-minus');
    khatmahPlus = document.getElementById('khatmah-plus');
    outsideBanner = document.getElementById('outside-ramadan-banner');

    loadState();
    currentDay = computeRamadanDay();
    viewingDay = currentDay;

    hijriMinus.addEventListener('click', () => setHijriOffset(-1));
    hijriPlus.addEventListener('click', () => setHijriOffset(1));
    khatmahMinus.addEventListener('click', () => setTargetKhatmahs(appState.targetKhatmahs - 1));
    khatmahPlus.addEventListener('click', () => setTargetKhatmahs(appState.targetKhatmahs + 1));

    setupDragScroll();
    setupKeyboardNav();

    render();
    scrollToDay(currentDay);
}

document.addEventListener('DOMContentLoaded', init);
