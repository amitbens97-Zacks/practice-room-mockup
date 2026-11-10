// Shared pieces: windows (sheets), fields, choice chips, tags.
import { html, useEffect, Icon, cx } from './lib.js';

export function Sheet({ title, onClose, children, footer, wide, full }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return html`<div class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-ink/30" onClick=${onClose}></div>
    <div
      class=${cx(
        'rise pb-safe absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[22px] bg-canvas md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[18px] md:shadow-2xl',
        full ? 'md:h-[88dvh] md:w-[min(1180px,94vw)]' : wide ? 'md:w-[640px]' : 'md:w-[480px]',
      )}
      role="dialog"
      aria-modal="true"
      aria-label=${title}
    >
      <span class="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line md:hidden" aria-hidden="true"></span>
      <div class="flex items-center justify-between gap-3 px-5 pb-2 pt-3 md:pt-4">
        <h2 class="fb-h2 !text-[22px]">${title}</h2>
        <button type="button" aria-label="סגירה" class="rounded-lg p-2 text-muted hover:bg-white cursor-pointer" onClick=${onClose}><${Icon} name="x" size=${18} /></button>
      </div>
      <div class="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-4">${children}</div>
      ${footer && html`<div class="flex items-center justify-between gap-3 border-t border-line px-5 py-3 max-sm:[&>.fb-btn-primary]:flex-1">${footer}</div>`}
    </div>
  </div>`;
}

export function Field({ label, hint, children, class: cls = '' }) {
  return html`<label class=${cx('mb-4 block', cls)}>
    <span class="mb-1 block text-[14px] font-bold text-ink">${label}</span>
    ${children}
    ${hint && html`<span class="mt-1 block text-[12px] text-muted">${hint}</span>`}
  </label>`;
}

export const inputCls = 'h-11 w-full rounded-xl border-[1.5px] border-line bg-white px-3 text-[16px] text-ink outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100';

export function Chips({ options, value, onChange, small }) {
  return html`<div class="flex flex-wrap gap-2" role="radiogroup">
    ${options.map(
      (o) => html`<button
        key=${o.id}
        type="button"
        role="radio"
        aria-checked=${value === o.id}
        onClick=${() => onChange(o.id)}
        class=${cx(
          'rounded-xl border-[1.5px] px-3 font-bold transition-colors cursor-pointer',
          small ? 'h-9 text-[14px]' : 'h-11 text-[14px]',
          value === o.id ? 'border-brand-600 bg-brand-100 text-brand-600' : 'border-line bg-white text-ink hover:border-brand-300',
        )}
      >${o.label}</button>`,
    )}
  </div>`;
}

export function Tag({ tone = 'muted', children }) {
  const cls = {
    live: 'bg-money-50 text-money',
    draft: 'bg-warn-50 text-warn',
    blue: 'bg-brand-100 text-brand-600',
    fix: 'bg-error-50 text-error',
    muted: 'bg-canvas text-muted ring-1 ring-line',
  }[tone];
  return html`<span class=${cx('inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[12px] font-bold', cls)}>${children}</span>`;
}

// A two-way switch for "מחשב / מובייל" inside the editor and previews.
export function DeviceSwitch({ value, onChange }) {
  const opts = [
    ['desktop', 'מחשב', 'monitor'],
    ['mobile', 'מובייל', 'smartphone'],
  ];
  return html`<div role="radiogroup" aria-label="תצוגת הדף" class="flex items-center rounded-xl border border-line bg-white p-0.5">
    ${opts.map(
      ([id, label, icon]) => html`<button
        key=${id}
        type="button"
        role="radio"
        aria-checked=${value === id}
        onClick=${() => onChange(id)}
        class=${cx('flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-bold transition-colors cursor-pointer', value === id ? 'bg-brand-600 text-white' : 'text-muted hover:text-brand-600')}
      ><${Icon} name=${icon} size=${15} />${label}</button>`,
    )}
  </div>`;
}

// A browser window around a page preview, with the short link on top.
export function BrowserFrame({ url, children, class: cls = '', mobile }) {
  return html`<div class=${cx('flex min-h-0 flex-col overflow-hidden bg-white shadow-[0_24px_60px_-30px_rgba(45,62,102,.45)]', mobile ? 'rounded-[34px] border-[10px] border-[#2d3e66]' : 'rounded-2xl border border-line', cls)}>
    ${!mobile &&
    html`<div class="flex h-10 shrink-0 items-center gap-3 border-b border-line bg-[#f4f2ec] px-3">
      <span class="flex gap-1.5" aria-hidden="true"><i class="h-2.5 w-2.5 rounded-full bg-[#e7a29c]"></i><i class="h-2.5 w-2.5 rounded-full bg-[#ecd08f]"></i><i class="h-2.5 w-2.5 rounded-full bg-[#a9d3a0]"></i></span>
      <span class="mx-auto flex h-7 min-w-0 max-w-[420px] flex-1 items-center justify-center rounded-lg bg-white px-3 text-[13px] font-semibold text-muted">${url}</span>
      <span class="w-12"></span>
    </div>`}
    ${children}
  </div>`;
}
