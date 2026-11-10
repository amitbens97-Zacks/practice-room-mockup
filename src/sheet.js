// "דף תשובות להתנגדויות": the step's output. Grouped by the five forms of prompt 3.11.
// Each row: what the client said, the worry behind it, an answer and a short WhatsApp
// version. It starts from the client file, the offer and the audience's common objections;
// after every call the rows that came up are rewritten in the user's own words.
import { html, useState, Icon, cx } from './lib.js';
import { Button, InlineEdit } from './components.js';
import { Tag } from './ui.js';
import { FORMS } from './data.js';

export function AnswerSheet({ sheet, setRow, notify }) {
  const [form, setForm] = useState('all');
  const rows = sheet.filter((r) => form === 'all' || r.form === form);
  const groups = FORMS.filter((f) => rows.some((r) => r.form === f.id));
  return html`<div class="mx-auto max-w-[1120px] px-4 py-5 md:px-8 md:py-6">
    <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="fb-eyebrow mb-1">התוצר של השלב</p>
        <h1 class="fb-h1 text-[26px] md:text-[32px]">דף <span class="fb-marker">תשובות להתנגדויות</span></h1>
        <p class="mt-1 max-w-[64ch] text-[16px]">מה הלקוח אומר, איזו דאגה עומדת מאחורי זה, ומה עונים. כל שורה שעלתה בשיחה נכתבת מחדש במילים שלך.</p>
      </div>
      <div class="flex gap-2">
        <${Button} variant="mini" onClick=${() => notify('ה-PDF ירד, ונשמר בקבצים › מגדילים מכירות', 'download')}><${Icon} name="download" size=${15} />הורדה<//>
      </div>
    </div>
    <div class="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="סינון לפי סוג">
      ${[{ id: 'all', label: `הכל (${sheet.length})` }, ...FORMS.map((f) => ({ id: f.id, label: `${f.label} (${sheet.filter((r) => r.form === f.id).length})`, icon: f.icon }))].map(
        (o) => html`<button key=${o.id} type="button" role="radio" aria-checked=${form === o.id} onClick=${() => setForm(o.id)} class=${cx('inline-flex h-9 items-center gap-1.5 rounded-xl border-[1.5px] px-3 text-[14px] font-bold cursor-pointer', form === o.id ? 'border-brand-600 bg-brand-100 text-brand-600' : 'border-line bg-white hover:border-brand-300')}>${o.icon && html`<${Icon} name=${o.icon} size=${14} />`}${o.label}</button>`,
      )}
    </div>
    ${groups.map(
      (f) => html`<section key=${f.id} class="mb-4">
        <h2 class="mb-2 flex items-center gap-2 text-[15px] font-bold text-muted"><${Icon} name=${f.icon} size=${16} class="text-brand-600" />${f.label} · "${f.sounds}"</h2>
        <div class="grid gap-2.5 md:grid-cols-2">
          ${rows.filter((r) => r.form === f.id).map(
            (r) => html`<article key=${r.id} class=${cx('fb-panel !p-4', r.mine && 'ring-2 ring-brand-300')}>
              <div class="mb-1.5 flex items-start justify-between gap-2">
                <b class="font-display text-[17px] leading-snug">"${r.said}"</b>
                <${Tag} tone=${r.mine ? 'blue' : 'muted'}>${r.mine ? html`<${Icon} name="pencil" size=${12} />` : ''}${r.src}<//>
              </div>
              <p class="mb-2 text-[14px] text-muted"><b>הדאגה שמאחור:</b> ${r.worry}</p>
              <div class="mb-2 text-[15px] leading-relaxed"><${InlineEdit} multiline value=${r.answer} onSave=${(v) => setRow(r.id, { answer: v, edited: true })} /></div>
              <div class="flex items-start gap-2 rounded-xl bg-[#e7f6e9] px-3 py-2 text-[14px]">
                <span class="mt-0.5 text-[#128c4a]"><${Icon} name="message-circle" size=${15} /></span>
                <span class="min-w-0 flex-1"><b class="block text-[12px] text-muted">לוואטסאפ</b>${r.short}</span>
                <button type="button" aria-label="העתקה" class="rounded p-1 text-muted hover:text-ink cursor-pointer" onClick=${() => notify('הועתק לוואטסאפ', 'copy')}><${Icon} name="copy" size=${15} /></button>
              </div>
            </article>`,
          )}
        </div>
      </section>`,
    )}
  </div>`;
}
