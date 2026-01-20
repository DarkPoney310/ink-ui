// wwwroot/js/ink.js

// 1) Reveal on scroll (one-time)
export function observeReveals() {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;

    const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
            if (e.isIntersecting) {
                e.target.classList.add("is-in");
                io.unobserve(e.target);
            }
        }
    }, { threshold: 0.12 });

    els.forEach(el => io.observe(el));
}

// 1b) Stack marquee sizing (keeps constant speed on all screens)
const _marqueeState = new WeakMap();

function _computeAndApplyMarqueeDuration(marqueeEl) {
    const track = marqueeEl.querySelector(".stack-track");
    const seq = marqueeEl.querySelector(".stack-seq");
    if (!track || !seq) return;

    // Use getBoundingClientRect for sub-pixel precision
    const rectWidth = seq.getBoundingClientRect().width;
    const seqWidth = Math.max(1, rectWidth || seq.scrollWidth || 1);
    
    // 1. Duration logic
    const pxPerSecond = 60; // tweakable
    const duration = Math.max(10, Math.min(60, seqWidth / pxPerSecond));
    marqueeEl.style.setProperty("--stack-duration", `${duration}s`);

    // 2. Exact pixel width for seamless looping (fixes the "jump" at 50%)
    // We move exactly the width of one sequence.
    marqueeEl.style.setProperty("--marquee-width", `-${seqWidth}px`);
}

function _restartMarquee(marqueeEl) {
    marqueeEl.classList.remove("is-ready");
    // Force reflow so the animation restarts cleanly after var updates.
    // eslint-disable-next-line no-unused-expressions
    marqueeEl.offsetWidth;
    marqueeEl.classList.add("is-ready");
}

function _waitForImages(marqueeEl, timeoutMs) {
    const imgs = Array.from(marqueeEl.querySelectorAll("img"));
    if (!imgs.length) return Promise.resolve();

    let remaining = imgs.length;
    return new Promise((resolve) => {
        const finish = () => {
            remaining -= 1;
            if (remaining <= 0) resolve();
        };

        const timer = window.setTimeout(resolve, timeoutMs);

        imgs.forEach((img) => {
            if (img.complete) return finish();
            img.addEventListener("load", finish, { once: true });
            img.addEventListener("error", finish, { once: true });
        });

        // Ensure we don't keep the timer if all images finish early.
        Promise.resolve().then(() => {
            if (remaining <= 0) {
                window.clearTimeout(timer);
                resolve();
            }
        });
    });
}

export function initStackMarquees() {
    const marquees = document.querySelectorAll(".stack-marquee");
    if (!marquees.length) return;

    marquees.forEach((marqueeEl) => {
        if (_marqueeState.has(marqueeEl)) return;
        const state = { ro: null, resizeTimer: 0 };
        _marqueeState.set(marqueeEl, state);

        // Wait for images or a short timeout, then start animation (prevents visible "reset").
        requestAnimationFrame(async () => {
            await _waitForImages(marqueeEl, 900);
            _computeAndApplyMarqueeDuration(marqueeEl);
            marqueeEl.classList.add("is-ready");
        });

        const seq = marqueeEl.querySelector(".stack-seq");
        if (seq && typeof ResizeObserver !== "undefined") {
            state.ro = new ResizeObserver(() => {
                window.clearTimeout(state.resizeTimer);
                state.resizeTimer = window.setTimeout(() => {
                    _computeAndApplyMarqueeDuration(marqueeEl);
                    if (marqueeEl.classList.contains("is-ready")) _restartMarquee(marqueeEl);
                }, 120);
            });
            state.ro.observe(seq);
        }
    });
}

// 1c) Scroll to section (used for in-page navigation with ink wipe)
export function scrollToId(id) {
    const safeId = (id || "").replace(/^#/, "");
    if (!safeId) return;
    const el = document.getElementById(safeId);
    if (!el) return;
    // Use immediate jump so the ink-wipe feels like a real "page transition"
    el.scrollIntoView({ behavior: "auto", block: "start" });
}

// 2) Ink wipe transition - returns duration in ms
export function playInkWipe() {
    const el = document.getElementById("inkWipe");
    if (!el) return 0;

    document.body.classList.add("no-scroll");
    el.classList.add("is-active");

    const duration = 560;

    window.setTimeout(() => {
        el.classList.remove("is-active");
        document.body.classList.remove("no-scroll");
    }, duration);

    return duration;
}
