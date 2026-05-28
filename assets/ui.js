/* ============================================================
 * yellowyellow.co — UI helpers (loading locks, spinners)
 *
 *   YY_UI.withLock(btn, async fn, { label?: 'กำลังบันทึก...' })
 *     → Disables btn, swaps content to spinner + label, awaits fn,
 *       restores even if fn throws. Returns fn's return value.
 *       Idempotent: calling again while locked is a no-op.
 *
 *   YY_UI.showSpinner(msg?)        → full-screen blocking overlay
 *   YY_UI.hideSpinner()
 *
 *   YY_UI.toast(msg, kind?)        → light non-blocking notice
 *      kind = 'ok' | 'er' | 'info'
 *
 *   YY_UI.skeleton(html)           → wraps in skeleton-pulse markup
 * ============================================================ */
(function (root) {
  'use strict';

  function injectStyles() {
    if (document.getElementById('yy-ui-styles')) return;
    const s = document.createElement('style');
    s.id = 'yy-ui-styles';
    s.textContent = `
      /* Button lock spinner */
      .yy-spin {
        display: inline-block;
        width: 14px; height: 14px;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 999px;
        animation: yy-spin .6s linear infinite;
        vertical-align: -2px;
        margin-right: 6px;
      }
      [data-yy-locked] {
        opacity: .82;
        cursor: progress !important;
        position: relative;
        pointer-events: none;
      }
      @keyframes yy-spin { to { transform: rotate(360deg); } }

      /* Full-screen overlay */
      .yy-overlay {
        position: fixed; inset: 0;
        background: rgba(15,15,15,.45);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 99998;
        display: flex; align-items: center; justify-content: center;
        animation: yy-fade .15s ease-out;
      }
      .yy-overlay-card {
        background: #fff;
        padding: 18px 24px;
        border-radius: 16px;
        box-shadow: 0 24px 60px rgba(0,0,0,.3);
        display: flex; align-items: center; gap: 12px;
        font-family: 'Sarabun', system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
        color: #1C1917;
        min-width: 180px; max-width: 320px;
      }
      .yy-overlay-spin {
        width: 22px; height: 22px;
        border: 2.5px solid #E7E5E4;
        border-top-color: #1C1917;
        border-radius: 999px;
        animation: yy-spin .7s linear infinite;
        flex-shrink: 0;
      }
      @keyframes yy-fade { from { opacity: 0; } to { opacity: 1; } }

      /* Lightweight toast (avoids depending on app-specific markup) */
      .yy-ui-toast {
        position: fixed; bottom: 24px; left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: #1C1917; color: #fff;
        padding: 11px 18px;
        border-radius: 999px;
        font-family: 'Sarabun', system-ui, sans-serif;
        font-size: 13.5px; font-weight: 500;
        box-shadow: 0 16px 40px rgba(0,0,0,.3);
        opacity: 0;
        transition: all .22s cubic-bezier(.2,.8,.2,1);
        z-index: 99999;
        max-width: 88vw;
        text-align: center;
      }
      .yy-ui-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
      .yy-ui-toast.ok { background: #059669; }
      .yy-ui-toast.er { background: #DC2626; }

      /* Skeleton */
      .yy-sk {
        background: linear-gradient(90deg, #F5F5F4 0%, #E7E5E4 50%, #F5F5F4 100%);
        background-size: 200% 100%;
        animation: yy-sk-pulse 1.2s ease-in-out infinite;
        border-radius: 8px;
        display: inline-block;
      }
      @keyframes yy-sk-pulse {
        0%   { background-position: 0% 50%; }
        100% { background-position: -200% 50%; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── withLock ──────────────────────────────────────────────
  async function withLock(btn, fn, opts) {
    injectStyles();
    opts = opts || {};
    if (!btn) {
      try { return await fn(); } finally { /* nothing to unlock */ }
    }
    // Idempotent: if already locked, ignore subsequent clicks
    if (btn.dataset.yyLocked === '1') return;
    btn.dataset.yyLocked = '1';
    btn.setAttribute('data-yy-locked', '');
    btn.disabled = true;
    const prevHtml = btn.innerHTML;
    const label = opts.label || 'กำลังโหลด...';
    btn.innerHTML = `<span class="yy-spin"></span>${label}`;
    try {
      return await fn();
    } finally {
      // Restore (unless caller explicitly asks to keep locked)
      if (!opts.keepLocked) {
        btn.innerHTML = prevHtml;
        btn.disabled = false;
        btn.removeAttribute('data-yy-locked');
        delete btn.dataset.yyLocked;
      }
    }
  }

  // ── Spinner overlay ───────────────────────────────────────
  let overlayEl = null;
  let overlayCount = 0;
  function showSpinner(msg) {
    injectStyles();
    overlayCount++;
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.className = 'yy-overlay';
      overlayEl.innerHTML = `
        <div class="yy-overlay-card">
          <div class="yy-overlay-spin"></div>
          <span id="yy-overlay-msg">${msg || 'กำลังโหลด...'}</span>
        </div>
      `;
      document.body.appendChild(overlayEl);
    } else {
      const m = overlayEl.querySelector('#yy-overlay-msg');
      if (m && msg) m.textContent = msg;
    }
  }
  function hideSpinner() {
    overlayCount = Math.max(0, overlayCount - 1);
    if (overlayCount === 0 && overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
  }

  // ── Toast ─────────────────────────────────────────────────
  let toastEl = null;
  let toastTm  = null;
  function toast(msg, kind) {
    injectStyles();
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'yy-ui-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg || '';
    toastEl.className = 'yy-ui-toast ' + (kind || '');
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastTm);
    toastTm = setTimeout(() => { if (toastEl) toastEl.classList.remove('show'); }, 2200);
  }

  function skeleton(html) {
    return `<span class="yy-sk">${html || ''}</span>`;
  }

  root.YY_UI = { withLock, showSpinner, hideSpinner, toast, skeleton };
})(window);
