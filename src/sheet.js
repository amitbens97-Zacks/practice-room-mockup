// "דף תשובות להתנגדויות": the step's output. Grouped by the five forms of prompt 3.11.
// Each row: what the client said, the worry behind it, an answer and a short WhatsApp
// version. It starts from the client file, the offer and the audience's common objections;
// after every call the rows that came up are rewritten in the user's own words.
import { html, useState, Icon, cx } from './lib.js';
import { Button, InlineEdit } from './components.js';
import { Tag } from './ui.js';
import { FORMS } from './data.js';

// One objection: what they said and the answer. The worry and the WhatsApp version open on demand.
function Row({ r, setRow, notify }) {
  const [open, setOpen] = useState(false);
  return html`<article class=${cx('fb-panel !p-4', r.mine && 'ring-2 ring-brand-300')}>
    <div class="mb-1.5 flex items-start justify-between gap-2">
      <b class="font-display text-[18px] leading-snug">"${r.said}"</b>
      ${r.mine && html`<${Tag} tone="blue"><${Icon} name="pencil" size=${12} />במילים שלך<//>`}
    </div>
    <div class="text-[16px] leading-relaxed"><${InlineEdit} multiline value=${r.answer} onSave=${(v) => setRow(r.id, { answer: v, edited: true })} /></div>
    <button type="button" aria-expanded=${open} class="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-muted hover:text-ink cursor-pointer" onClick=${() => setOpen(!open)}><${Icon} name=${open ? 'chevron-up' : 'chevron-down'} size=${14} />הדאגה שמאחור וגרסה לוואטסאפ</button>
    ${open && html`<div class="rise mt-2 flex flex-col gap-2">
      <p class="text-[14px] text-muted"><b>הדאגה:</b> ${r.worry} · <span class="text-faint">${r.src}</span></p>
      <div class="flex items-start gap-2 rounded-xl bg-[#e7f6e9] px-3 py-2 text-[14px]">
        <span class="mt-0.5 text-[#128c4a]"><${Icon} name="message-circle" size=${15} /></span>
        <span class="min-w-0 flex-1">${r.short}</span>
        <button type="button" aria-label="העתקה" class="rounded p-1 text-muted hover:text-ink cursor-pointer" onClick=${() => notify('הועתק לוואטסאפ', 'copy')}><${Icon} name="copy" size=${15} /></button>
      </div>
    </div>`}
  </article>`;
}

export function AnswerSheet({ sheet, setRow, notify }) {
  const [form, setForm] = useState('all');
  const rows = sheet.filter((r) => form === 'all' || r.form === form);
  const groups = FORMS.filter((f) => rows.some((r) => r.form === f.id));
  return html`<div class="mx-auto max-w-[820px] px-4 py-6 md:px-8 md:py-8">
    <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
                <h1 class="fb-h1 text-[26px] md:text-[32px]">דף <span class="fb-marker">תשובות להתנגדויות</span></h1>
        <p class="mt-1 text-[16px] text-muted">התוצר של השלב. מה שעלה בשיחה נכתב מחדש במילים שלך.</p>
      </div>
      <div class="flex gap-2">
        <${Button} variant="mini" onClick=${() => notify('ה-PDF ירד, ונשמר בקבצים › מגדילים מכירות', 'download')}><${Icon} name="download" size=${15} />הורדה<//>
      </div>
    </div>
    <div class="mb-5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="סינון לפי סוג">
      ${[{ id: 'all', label: `הכל (${sheet.length})` }, ...FORMS.map((f) => ({ id: f.id, label: `${f.label} (${sheet.filter((r) => r.form === f.id).length})`, icon: f.icon }))].map(
        (o) => html`<button key=${o.id} type="button" role="radio" aria-checked=${form === o.id} onClick=${() => setForm(o.id)} class=${cx('inline-flex h-9 items-center gap-1.5 rounded-xl border-[1.5px] px-3 text-[14px] font-bold cursor-pointer', form === o.id ? 'border-brand-600 bg-brand-100 text-brand-600' : 'border-line bg-white hover:border-brand-300')}>${o.icon && html`<${Icon} name=${o.icon} size=${14} />`}${o.label}</button>`,
      )}
    </div>
    ${groups.map(
      (f) => html`<section key=${f.id} class="mb-4">
        <h2 class="mb-2 flex items-center gap-2 text-[15px] font-bold text-muted"><${Icon} name=${f.icon} size=${16} class="text-brand-600" />${f.label}</h2>
        <div class="flex flex-col gap-2.5">
          ${rows.filter((r) => r.form === f.id).map(
            (r) => html`<${Row} key=${r.id} r=${r} setRow=${setRow} notify=${notify} />`,
          )}
        </div>
      </section>`,
    )}
  </div>`;
}
