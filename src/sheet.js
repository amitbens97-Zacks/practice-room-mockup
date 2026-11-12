// "דף תשובות להתנגדויות": the step's output. Grouped by the five forms of prompt 3.11.
// Each row: what the client said, the worry behind it, an answer and a short WhatsApp
// version. It starts from the client file, the offer and the audience's common objections;
// after every call the rows that came up are rewritten in the user's own words.
// The user can add an objection they heard, and the system suggests the row for it.
import { html, useState, Icon, cx, money } from './lib.js';
import { Button, InlineEdit, Note, PartnerNote, SharkAvatar } from './components.js';
import { Sheet, Tag } from './ui.js';
import { FORMS, CONTEXT, g, suggestLocal, sharkLocal } from './data.js';
import { hasAI, suggestAnswer, sharkLine } from './ai.js';

const joinAnswer = (r) => `${r.ask} ${r.reply} ${r.close}`;

// One objection: what they said and the answer. The worry and the WhatsApp version open on demand.
function Row({ r, setRow, onRemove, fresh, notify }) {
  const [open, setOpen] = useState(false);
  return html`<article id=${`row-${r.id}`} class=${cx('fb-panel !p-4', r.mine && 'ring-2 ring-brand-300', fresh && 'rise ring-2 ring-money')}>
    <div class="mb-3 flex items-start justify-between gap-2">
      <span class="min-w-0"><span class="mb-0.5 flex items-center gap-1 text-[12px] font-bold text-muted"><${Icon} name="message-circle" size=${12} />הלקוח אומר</span><b class="font-display text-[19px] leading-snug">"${r.said}"</b></span>
      <span class="flex shrink-0 items-center gap-1">
        ${r.mine && html`<${Tag} tone="blue"><${Icon} name="pencil" size=${12} />במילים שלך<//>`}
        ${r.added && html`<${Tag} tone="live"><${Icon} name="plus" size=${12} />הוספת<//>`}
        ${r.added && html`<button type="button" aria-label="הסרה מהדף" class="rounded p-1 text-faint hover:bg-error-50 hover:text-error cursor-pointer" onClick=${() => onRemove(r.id)}><${Icon} name="x" size=${15} /></button>`}
      </span>
    </div>
    <p class="mb-1.5 flex items-center gap-1 text-[12px] font-bold text-brand-600"><${Icon} name="corner-down-left" size=${12} />מה עונים</p>
    ${r.mine && html`<div class="mb-2.5 rounded-xl bg-brand-50 px-3 py-2 ring-1 ring-brand-200">
      <span class="mb-0.5 block text-[12px] font-bold text-brand-600">${r.src?.split(' · ')[0] || 'מהשיחה'} · במילים שלך</span>
      <div class="text-[16px] leading-relaxed"><${InlineEdit} multiline value=${r.answer} onSave=${(v) => setRow(r.id, { answer: v, edited: true })} /></div>
    </div>`}
    <ol class="flex flex-col gap-2">
      ${SUGGEST_STEPS.map(([k, label], n) => html`<li key=${k} class="flex items-start gap-2.5">
        <span class="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-600">${n + 1}</span>
        <span class="min-w-0 flex-1 text-[16px] leading-relaxed"><b class="block text-[13px] text-brand-600">${label}</b><${InlineEdit} multiline value=${r[k]} onSave=${(v) => setRow(r.id, { [k]: v, edited: true, ...(r.mine ? {} : { answer: joinAnswer({ ...r, [k]: v }) }) })} /></span>
      </li>`)}
    </ol>
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

// "התנגדות חדשה": what the client said (and when, optional), and the system suggests a row
// in the sheet's three steps. With a key Claude writes it from the prompt and the context
// block; without one the mockup answers from patterns built on the same block. Every part of
// the suggestion can be edited, and its form changed, before it goes on the sheet.
const EXAMPLES = ['אני אנסה קודם לבד', 'יש לך לקוחות שעשו את זה?', 'אחרי החגים נדבר', 'קיבלתי הצעה יותר זולה'];
const SUGGEST_STEPS = [
  ['ask', 'שואלים', 'מה באמת מדאיג'],
  ['reply', 'עונים', 'על הדאגה, עם ההצעה'],
  ['close', 'סוגרים', 'לולאה, ורק אז מבקשים שוב'],
];

function NewObjection({ sheet, onAdd, onClose }) {
  const [said, setSaid] = useState('');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const [s, setS] = useState(null);
  const [v, setV] = useState(0);
  const [note, setNote] = useState('');
  const ai = hasAI();
  const ta = 'w-full resize-none rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100';
  const run = async (again) => {
    const text = said.trim().replace(/^["״]|["״]$/g, '');
    if (!text || busy) return;
    setBusy(true);
    setNote('');
    try {
      const out = ai
        ? { ...(await suggestAnswer({ said: text, when: when.trim(), sheet, before: again ? s : null })), src: 'הוספת · הצעה של המערכת' }
        : (await new Promise((r) => setTimeout(r, 650)), suggestLocal(text));
      setS({ ...out, said: text });
    } catch (e) {
      setNote(e?.status === 401 ? 'המפתח לא התקבל, אז ההצעה נבנתה מהדף.' : 'Claude לא ענה הפעם, אז ההצעה נבנתה מהדף.');
      setS({ ...suggestLocal(text), said: text });
    }
    setV((x) => x + 1);
    setBusy(false);
  };
  const edit = (k) => (val) => setS((x) => ({ ...x, [k]: val }));
  const add = () => onAdd({ ...s, id: `u${Date.now()}`, added: true, answer: joinAnswer(s) });
  const form = s && FORMS.find((f) => f.id === s.form);
  return html`<section class="rise fb-panel mb-5 !p-4 ring-2 ring-brand-300 md:!p-5" aria-label="התנגדות חדשה">
    <div class="mb-3 flex items-start justify-between gap-2">
      <div>
        <h2 class="font-display text-[20px] font-bold">התנגדות חדשה</h2>
        <p class="text-[14px] text-muted">${g('כתוב', 'כתבי')} מה הלקוח אמר, והמערכת תציע תשובה מההצעה וכללי המחיר שלך.</p>
      </div>
      <button type="button" aria-label="סגירה" class="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink cursor-pointer" onClick=${onClose}><${Icon} name="x" size=${18} /></button>
    </div>
    <label class="mb-1 block text-[14px] font-bold" for="new-said">מה הלקוח אמר?</label>
    <textarea id="new-said" rows="2" class=${ta} value=${said} onInput=${(e) => setSaid(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), run())} placeholder='כמו שזה נשמע, למשל: "יש לי כבר מישהו שעושה לי פייסבוק"'></textarea>
    ${!s && html`<div class="mt-2 flex flex-wrap gap-1.5">
      ${EXAMPLES.map((x) => html`<button key=${x} type="button" class="rounded-full border border-line bg-white px-2.5 py-1 text-[13px] text-muted hover:border-brand-300 hover:text-ink cursor-pointer" onClick=${() => setSaid(x)}>"${x}"</button>`)}
    </div>`}
    <label class="mb-1 mt-3 block text-[14px] font-bold" for="new-when">מתי זה עלה? <span class="font-normal text-faint">לא חובה</span></label>
    <input id="new-when" class=${cx(ta, 'h-11 py-0')} value=${when} onInput=${(e) => setWhen(e.target.value)} placeholder="למשל: מיד אחרי שאמרתי את המחיר" />
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <${Button} disabled=${!said.trim() || busy} onClick=${() => run(false)}>
        ${busy ? html`<span class="fb-spin" style=${{ width: 16, height: 16 }}></span>כותב תשובה...` : html`<${Icon} name="sparkles" size=${16} />${s ? 'להציע מחדש' : 'להציע תשובה'}`}
      <//>
      ${s && ai && !busy && html`<${Button} variant="quiet" onClick=${() => run(true)}><${Icon} name="refresh-cw" size=${15} />גישה אחרת<//>`}
    </div>
    ${note && html`<p class="mt-2 text-[13px] text-warn">${note}</p>`}
    ${s && !busy && html`<div key=${v} class="rise mt-4 border-t border-line pt-4">
      <div class="mb-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="סוג ההתנגדות">
        <span class="text-[13px] font-bold text-muted">סוג:</span>
        ${FORMS.map((f) => html`<button key=${f.id} type="button" role="radio" aria-checked=${s.form === f.id} onClick=${() => edit('form')(f.id)} class=${cx('inline-flex h-8 items-center gap-1 rounded-lg border-[1.5px] px-2.5 text-[13px] font-bold cursor-pointer', s.form === f.id ? 'border-brand-600 bg-brand-100 text-brand-600' : 'border-line bg-white text-muted hover:border-brand-300')}><${Icon} name=${f.icon} size=${13} />${f.label}</button>`)}
      </div>
      <p class="mb-3 text-[15px]"><b>מה מדאיג אותו:</b> <${InlineEdit} value=${s.worry} onSave=${edit('worry')} /></p>
      <ol class="flex flex-col gap-2.5">
        ${SUGGEST_STEPS.map(([k, label, why], i) => html`<li key=${k} class="flex items-start gap-2.5">
          <span class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-[12px] font-bold text-white">${i + 1}</span>
          <div class="min-w-0 flex-1">
            <div class="text-[13px] font-bold text-brand-600">${label} <span class="font-normal text-faint">· ${why}</span></div>
            <div class="text-[16px] leading-relaxed"><${InlineEdit} multiline value=${s[k]} onSave=${edit(k)} /></div>
          </div>
        </li>`)}
      </ol>
      <div class="mt-3 flex items-start gap-2 rounded-xl bg-warn-50 px-3 py-2 text-[14px]">
        <span class="mt-0.5 text-warn"><${Icon} name="scale" size=${15} /></span>
        <span class="min-w-0 flex-1"><b>כשזה אמיתי:</b> <${InlineEdit} multiline value=${s.honest} onSave=${edit('honest')} /></span>
      </div>
      <div class="mt-2 flex items-start gap-2 rounded-xl bg-[#e7f6e9] px-3 py-2 text-[14px]">
        <span class="mt-0.5 text-[#128c4a]"><${Icon} name="message-circle" size=${15} /></span>
        <span class="min-w-0 flex-1"><${InlineEdit} multiline value=${s.short} onSave=${edit('short')} /></span>
      </div>
      <p class="mt-2 text-[13px] text-faint">${s.src}. כל חלק נערך בלחיצה.</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <${Button} onClick=${add}><${Icon} name="plus" size=${16} />להוסיף לדף, תחת ${form?.label}<//>
        <${Button} variant="quiet" onClick=${onClose}>ביטול<//>
      </div>
    </div>`}
  </section>`;
}

export function AnswerSheet({ sheet, setRow, addRow, removeRow, notify, onScript }) {
  const [form, setForm] = useState('all');
  const [adding, setAdding] = useState(false);
  const [fresh, setFresh] = useState(null);
  const onAdd = (row) => {
    addRow(row);
    setAdding(false);
    setForm('all');
    setFresh(row.id);
    notify('נוסף לדף ולתסריט', 'check');
    setTimeout(() => {
      const el = document.getElementById(`row-${row.id}`);
      const main = document.querySelector('main');
      if (el && main) main.scrollTo({ top: main.scrollTop + el.getBoundingClientRect().top - main.getBoundingClientRect().top - 120 });
    }, 120);
  };
  const onRemove = (id) => {
    removeRow(id);
    notify('הוסר מהדף', 'trash-2');
  };
  const rows = sheet.filter((r) => form === 'all' || r.form === form);
  const groups = FORMS.filter((f) => rows.some((r) => r.form === f.id));
  return html`<div class="mx-auto max-w-[820px] px-4 py-6 md:px-8 md:py-8">
    <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
                <h1 class="fb-h1 text-[26px] md:text-[32px]">דף <span class="fb-marker">תשובות להתנגדויות</span></h1>
        <p class="mt-1 max-w-[52ch] text-[16px] text-muted">כשלקוח אומר אחד מהמשפטים האלה, זה מה שעונים. לפתוח 5 דקות לפני כל שיחה. מה שעלה בתרגול נכתב מחדש במילים שלך.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        ${!adding && html`<${Button} variant="mini" onClick=${() => setAdding(true)}><${Icon} name="plus" size=${15} />התנגדות חדשה<//>`}
        <${Button} variant="mini" class="!bg-money !border-money" onClick=${onScript}><${Icon} name="scroll-text" size=${15} />התסריט שלך<//>
        <${Button} variant="mini" onClick=${() => notify('ה-PDF ירד, ונשמר בקבצים › מגדילים מכירות', 'download')}><${Icon} name="download" size=${15} />הורדה<//>
      </div>
    </div>
    <ol class="mb-4 grid gap-2 sm:grid-cols-3" aria-label="איך עונים על התנגדות">
      ${SUGGEST_STEPS.map(([k, label, why], n) => html`<li key=${k} class="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 ring-1 ring-line">
        <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-[12px] font-bold text-white">${n + 1}</span>
        <span class="text-[14px] leading-tight"><b class="block">${label}</b><span class="text-muted">${why}</span></span>
      </li>`)}
    </ol>
    ${adding && html`<${NewObjection} sheet=${sheet} onAdd=${onAdd} onClose=${() => setAdding(false)} />`}
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
            (r) => html`<${Row} key=${r.id} r=${r} setRow=${setRow} onRemove=${onRemove} fresh=${fresh === r.id} notify=${notify} />`,
          )}
        </div>
      </section>`,
    )}
  </div>`;
}

// "כרטיס הכנה לשיחה": before the real call with a client the user described, everything
// to have open on one card: the opening, three questions, the expected objection with the
// answer from the sheet, the fit, the next step to ask for, what is still a guess, and the
// one fix from the last practice with this client.
export function PrepSheet({ client: c, sheet, calls, onClose, notify }) {
  const he = (m, f) => (c.fem ? f : m);
  const H = c.hidden;
  const form = FORMS.find((f) => f.id === c.form) || FORMS[0];
  const row = [...sheet.filter((r) => r.form === c.form)].sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0))[0];
  const tries = (c.desc?.tries || '').trim();
  const worry = (c.desc?.worry || '').trim() || H.objection;
  const last = [...calls].reverse().find((x) => x.clientId === c.id && x.feedback);
  const guess = (t) => !t || /^השערה|לא נאמר בתיאור|במוק-אפ/.test(String(t));
  const check = [['למה זה חשוב עכשיו', H.motive], [`מה ${he('ניסה', 'ניסתה')} עד היום`, H.tries?.[0]], ['מה הפתרון חייב לכלול', H.need], ['מי עוד מחליט', H.decider], ['תקציב', H.budget]].filter(([, v]) => guess(v)).map(([k]) => k);
  const fitGuess = guess(H.fit.text);
  if (fitGuess) check.push('האם זה באמת מתאים, ולאיזה מסלול');
  const fitLabel = fitGuess ? 'השערה' : { fit: 'מתאים', other: 'מסלול אחר', none: 'לא מתאים' }[H.fit.kind];
  const opening = `היי ${c.first}, תודה שקבעת. בחצי השעה הקרובה אשאל קצת על העסק, ${g('אספר איך אני עובד', 'אספר איך אני עובדת')}, ובסוף נחליט יחד אם זה מתאים, כן או לא. מתאים לך?`;
  const qs = [
    [tries ? 'מה בדיוק לא עבד שם?' : 'מה כבר ניסית עד היום, ומה לא עבד?', tries ? `על "${tries}"` : 'מה שנכשל הוא מה שהפתרון חייב לסגור'],
    ['ומה ישתנה לך כשזה ייפתר?', 'המניע, מתחת לבעיה'],
    ['מה צריך שיהיה הפעם, כדי שזה באמת יעבוד לך?', 'לפי זה בודקים התאמה'],
  ];
  const ask =
    H.fit.kind === 'none'
      ? 'לא לדחוף. כיוון אחד או הפניה, ופרידה יפה.'
      : c.form === 'authority'
        ? '"רוצה שנקבע שיחה קצרה ביחד, כדי שתחליטו עם כל המידע? מחר ב-9:00 מתאים?"'
        : `"${he('בוא', 'בואי')} נתקדם. מתי נוח לך השבוע לפגישה הראשונה?"`;
  const text = [
    `כרטיס הכנה: השיחה עם ${c.first}`,
    `פתיחה: "${opening}"`,
    `3 שאלות: ${qs.map(([q], i) => `${i + 1}. "${q}"`).join(' ')}`,
    `ההתנגדות הצפויה (${form.label}): "${worry}". תשובה: ${row?.answer || ''}`,
    `התאמה: ${H.fit.text}`,
    `לבקש בסוף: ${ask}`,
    check.length ? `לברר בשיחה: ${check.join(', ')}` : '',
    last?.feedback.fix ? `מהתרגול: ${last.feedback.fix.alt}` : '',
  ].filter(Boolean).join('\n');
  const copy = () => {
    try {
      navigator.clipboard?.writeText(text);
    } catch (e) {}
    notify('הכרטיס הועתק', 'copy');
  };
  const block = (icon, title, body) => html`<section class="border-b border-line py-3 last:border-0">
    <h3 class="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-muted"><${Icon} name=${icon} size=${14} class="text-[#a8701a]" />${title}</h3>
    ${body}
  </section>`;
  return html`<${Sheet}
    title=${`כרטיס הכנה: השיחה עם ${c.first}`}
    wide
    onClose=${onClose}
    footer=${html`<${Button} variant="secondary" onClick=${copy}><${Icon} name="copy" size=${15} />העתקה<//><${Button} onClick=${() => notify('הכרטיס נשלח אליך בוואטסאפ', 'message-circle')}><${Icon} name="message-circle" size=${15} />לשלוח לי לוואטסאפ<//>`}
  >
    <p class="mb-1 text-[15px] text-muted">לפתוח 5 דקות לפני השיחה. נבנה מהתיאור שלך, מדף התשובות ומהתרגול עם ${c.first}.</p>
    ${block('door-open', 'פתיחה', html`<p class="text-[16px] font-semibold leading-relaxed">"${opening}"</p>`)}
    ${block('message-circle-question', '3 שאלות, אחת בכל פעם', html`<ol class="flex flex-col gap-1.5">${qs.map(([q, why], i) => html`<li key=${i} class="flex items-start gap-2"><span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#a8701a] text-[11px] font-bold text-white">${i + 1}</span><span><b class="text-[16px]">"${q}"</b> <span class="text-[14px] text-muted">${why}</span></span></li>`)}</ol>`)}
    ${block(form.icon, `ההתנגדות הצפויה · ${form.label}`, html`<p class="mb-1.5 text-[16px]">"${worry}"</p><p class="rounded-xl bg-brand-50 px-3 py-2 text-[15px] leading-relaxed">${row?.mine && html`<b class="mb-0.5 block text-[12px] text-brand-600">מדף התשובות · במילים שלך</b>`}${row?.answer}</p>`)}
    ${block('puzzle', `התאמה · ${fitLabel}`, html`<p class="text-[15px]">${H.fit.text}</p>`)}
    ${block('calendar-check', 'מה לבקש בסוף', html`<p class="text-[16px] font-semibold">${ask}</p>`)}
    ${check.length > 0 && block('search', 'לברר בשיחה (לא הגיע ממך, הושלם כהשערה)', html`<p class="text-[15px]">${check.join(' · ')}</p>`)}
    ${block('repeat', 'מהתרגול', last?.feedback.fix ? html`<p class="text-[15px]"><b>${last.feedback.fix.title.split(':')[0]}:</b> ${last.feedback.fix.alt}</p>` : html`<p class="text-[15px] text-muted">עוד לא התאמנת על ${c.first}. שיחה אחת לפני, ו${g('תגיע מוכן', 'תגיעי מוכנה')} יותר.</p>`)}
  <//>`;
}

// "התסריט שלך": one page to open before every sales call, and the user's to edit. The
// structure of the call (prompt v2 section 4, in six parts with minutes and ready lines), every
// objection on the sheet in three steps (ask, answer, close), and what to remember from the
// practice. A generic line the user said well in practice replaces the ready line, marked as
// theirs; a client-specific one (opening, summary, fit) is shown under the ready line.
// Every line can be edited, and lines can be added to each part (state.script).
function scriptOf(state) {
  const done = state.calls.filter((c) => c.feedback && c.f);
  const said = (k) => [...done].reverse().map((c) => c.f[k]).find(Boolean) || null;
  const mineConfirmed = [...done].reverse().find((c) => c.f.summary && c.f.confirmed)?.f.summary || null;
  const core = CONTEXT.tracks.find((t) => t.core) || CONTEXT.tracks[0];
  const parts = [
    {
      title: 'פתיחה ומסגור', min: 2, goal: 'פותחים באדם, ואומרים מה יקרה בשיחה ושבסוף מחליטים.',
      lines: [[null, `היי ___, תודה שקבעת. בחצי השעה הקרובה אשאל קצת על העסק, ${g('אספר איך אני עובד', 'אספר איך אני עובדת')}, ובסוף נחליט יחד אם זה מתאים, כן או לא. מתאים לך?`, said('frame')]],
    },
    {
      title: 'הגילוי', min: 10, goal: `שאלה אחת בכל פעם. הלקוח מדבר, ${g('אתה מקשיב', 'את מקשיבה')}. על כל תשובה: "מה זאת אומרת ___?" במילה שלו.`,
      lines: [[null, 'מה קרה שדווקא עכשיו פנית?'], [said('tries'), 'מה כבר ניסית, ומה לא עבד?'], [said('motive'), 'ומה ישתנה לך כשזה ייפתר?'], [said('need'), 'מה צריך שיהיה הפעם, כדי שזה באמת יעבוד לך?']],
    },
    {
      title: 'סיכום והתאמה', min: 5, goal: 'הלקוח שומע את הבעיה שלו במילים שלו, ואז אומרים בקול אם זה מתאים.',
      lines: [
        [null, `אז אם ${g('אני מסכם', 'אני מסכמת')}: היום ___, רוצה להגיע ל-___, ניסית ___ וזה נתקע ב-___. ומה שחייב להיות הפעם זה ___. הבנתי נכון?`, mineConfirmed],
        [said('decider') || said('budget'), 'מי עוד מחליט איתך, וכמה מתאים לך להשקיע בזה?'],
        [null, 'לפי מה שאמרת, זה מתאים לך: ___, כי ___. (לא מתאים? אומרים את זה, ונותנים כיוון.)', said('fitRight')],
      ],
    },
    {
      title: 'ההצעה', min: 5, goal: 'מבקשים רשות, ומציגים רק את מה שמחובר למה שנאמר. שלושה דברים, לא עשרה.',
      lines: [[said('permission'), 'יש לי כמה מחשבות איך לסגור את זה. רוצה לשמוע?']],
    },
    {
      title: 'מחיר והחלטה', min: 5, goal: 'שלוש שאלות, המספר, ושקט.',
      lines: [[said('threeQ'), 'לפני המספר, שלוש שאלות: זה פותר את ___? נוח לך לעבוד איתי? ואם המספר הגיוני, אתה בעמדה להחליט?'], [null, `${core.name}: ${money(core.price)}, אפשר ב-3 תשלומים. (ושותקים.)`]],
    },
    {
      title: 'צעד הבא', min: 3, goal: 'יש התאמה: מועד ביומן. אין: כיוון או הפניה, ופרידה יפה.',
      lines: [[said('nextStep'), 'בוא נתקדם. מתי נוח לך השבוע לפגישה הראשונה?']],
    },
  ];
  const objections = FORMS.flatMap((f) => state.sheet.filter((r) => r.form === f.id));
  const fixes = [];
  [...done].reverse().forEach((c) => {
    const fx = c.feedback.fix;
    const k = fx?.title.split(':')[0];
    if (fx && !fixes.some((x) => x.k === k) && fixes.length < 3) fixes.push({ k, alt: fx.alt });
  });
  return { parts, objections, fixes };
}

const STEPS = [
  ['ask', 'שואלים', 'מה באמת מדאיג'],
  ['reply', 'עונים', 'על הדאגה, עם ההצעה'],
  ['close', 'סוגרים', 'לולאה, ורק אז מבקשים שוב'],
];

// The shark's help with one line of the script: shorter, more like the user talks, softer,
// or whatever the user asks. With a key Claude rewrites the line (ai.sharkLine); without
// one the mockup uses the shark's ready rewrites of the untouched lines, and "shorter".
const SHARK_MODES = [
  ['short', 'קצר יותר', 'scissors'],
  ['natural', g('כמו שאני מדבר', 'כמו שאני מדברת'), 'message-circle'],
  ['soft', 'יותר רך', 'feather'],
];

function SharkHelp({ id, text, where, isDefault, onApply, onClose }) {
  const ai = hasAI();
  const [busy, setBusy] = useState(null);
  const [res, setRes] = useState(null);
  const [wish, setWish] = useState('');
  const [msg, setMsg] = useState('');
  const run = async (mode) => {
    if (busy || (mode === 'custom' && !wish.trim())) return;
    setBusy(mode);
    setMsg('');
    let out = null;
    if (ai) {
      try {
        out = await sharkLine({ text, where, mode, ask: wish.trim() });
      } catch (e) {
        out = mode === 'custom' ? null : sharkLocal({ key: id, text, isDefault, mode });
        if (!out) setMsg('הכריש לא ענה הפעם. אפשר לנסות שוב.');
      }
    } else {
      await new Promise((r) => setTimeout(r, 450));
      out = mode === 'custom' ? null : sharkLocal({ key: id, text, isDefault, mode });
      if (!out) setMsg(mode === 'short' ? 'השורה כבר קצרה. אפשר לבקש משהו אחר.' : 'במוק-אפ בלי מפתח הכריש מציע כאן רק "קצר יותר". עם מפתח (Shift+D) הוא כותב כל בקשה, לכל שורה.');
    }
    setRes(out ? { ...out, mode } : null);
    setBusy(null);
  };
  const chip = 'inline-flex h-8 items-center gap-1 rounded-lg border-[1.5px] px-2.5 text-[13px] font-bold cursor-pointer disabled:opacity-50';
  return html`<div class="rise mt-2 rounded-2xl border-[1.5px] border-brand-200 bg-white p-3 shadow-[0_6px_18px_rgba(30,40,90,.08)]" role="group" aria-label="הכריש עוזר לערוך">
    <div class="mb-2 flex items-center gap-2">
      <${SharkAvatar} size=${28} mood="thinking" />
      <b class="text-[14px]">הכריש · לשפר את השורה</b>
      <button type="button" aria-label="סגירה" class="ms-auto rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink cursor-pointer" onClick=${onClose}><${Icon} name="x" size=${16} /></button>
    </div>
    <div class="flex flex-wrap gap-1.5">
      ${SHARK_MODES.map(([m, label, icon]) => html`<button key=${m} type="button" disabled=${!!busy} onClick=${() => run(m)} class=${cx(chip, res?.mode === m ? 'border-brand-600 bg-brand-100 text-brand-600' : 'border-line bg-white text-ink hover:border-brand-300')}><${Icon} name=${icon} size=${13} />${label}</button>`)}
    </div>
    <form class="mt-2 flex gap-1.5" onSubmit=${(e) => (e.preventDefault(), run('custom'))}>
      <input class="h-9 min-w-0 flex-1 rounded-lg border-[1.5px] border-line bg-white px-2.5 text-[14px] outline-none focus:border-brand-600 disabled:bg-canvas" value=${wish} disabled=${!ai} onInput=${(e) => setWish(e.target.value)} placeholder=${ai ? 'או לכתוב לכריש מה לשנות, למשל: "יותר ישיר"' : 'בקשה חופשית לכריש: עם מפתח (Shift+D)'} />
      <button type="submit" aria-label="לשלוח לכריש" disabled=${!ai || !wish.trim() || !!busy} class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-white disabled:opacity-40 cursor-pointer"><${Icon} name="send" size=${15} /></button>
    </form>
    ${busy && html`<p class="mt-2.5 flex items-center gap-2 text-[14px] text-muted"><span class="fb-spin" style=${{ width: 14, height: 14, borderColor: '#2f5fc4', borderTopColor: 'transparent' }}></span>הכריש כותב...</p>`}
    ${msg && !busy && html`<p class="mt-2 text-[13px] text-warn">${msg}</p>`}
    ${res && !busy && html`<div class="rise mt-3 rounded-xl bg-brand-50 p-3">
      <p class="text-[15px] font-semibold leading-relaxed">${res.line}</p>
      <p class="mt-1 text-[13px] text-muted">${res.why}</p>
      <div class="mt-2.5 flex flex-wrap items-center gap-2">
        <${Button} variant="mini" onClick=${() => onApply(res.line)}><${Icon} name="check" size=${15} />להכניס לתסריט<//>
        ${ai && html`<${Button} variant="quiet" onClick=${() => run(res.mode)}><${Icon} name="refresh-cw" size=${14} />עוד ניסיון<//>`}
      </div>
    </div>`}
  </div>`;
}

const SharkBtn = ({ on, onClick }) => html`<button type="button" aria-label="לשפר עם הכריש" title="לשפר עם הכריש" aria-expanded=${on} onClick=${onClick} class=${cx('mt-0.5 shrink-0 rounded-full transition cursor-pointer', on ? 'ring-2 ring-brand-600' : 'opacity-75 hover:opacity-100 hover:ring-2 hover:ring-brand-200')}><${SharkAvatar} size=${26} /></button>`;

export function CallScript({ state, setScript, notify, onSheet }) {
  const { parts, objections, fixes } = scriptOf(state);
  const edits = state.script?.edits || {};
  const added = state.script?.added || {};
  const sharked = state.script?.shark || {};
  const [sharkAt, setSharkAt] = useState(null);
  const dirty = Object.keys(edits).length > 0 || Object.values(added).some((a) => a.length);
  const clean = (t) => (t || '').replace(/^"|"$/g, '');
  const save = (key, v, byShark) => setScript({ edits: { ...edits, [key]: v.trim() }, shark: { ...sharked, [key]: !!byShark } });
  const setAdded = (i, list) => setScript({ added: { ...added, [i]: list } });
  const lineOf = (i, j, mine, def) => edits[`p${i}.l${j}`] ?? clean(mine || def);
  const stepOf = (r, k) => edits[`o.${r.id}.${k}`] ?? r[k] ?? '';
  const text = [
    'התסריט שלך לשיחת מכירה',
    ...parts.map((p, i) => `${i + 1}. ${p.title} (${p.min} דק'): ${[...p.lines.map(([m, d], j) => lineOf(i, j, m, d)), ...(added[i] || [])].filter(Boolean).map((l) => `"${l}"`).join(' ')}`),
    'התנגדויות ומה עונים:',
    ...objections.map((r) => `"${r.said}": שואלים: ${stepOf(r, 'ask')} עונים: ${stepOf(r, 'reply')} סוגרים: ${stepOf(r, 'close')}`),
    ...(fixes.length ? ['לזכור מהתרגול:', ...fixes.map((f) => `${f.k}: ${f.alt}`)] : []),
  ].join('\n');
  const copy = () => {
    try {
      navigator.clipboard?.writeText(text);
    } catch (e) {}
    notify('התסריט הועתק', 'copy');
  };
  const total = parts.reduce((s, p) => s + p.min, 0);
  const editedTag = (key) => html`<span class="mb-0.5 flex items-center gap-1 text-[12px] font-bold text-[#8a5a12]"><${Icon} name=${sharked[key] ? 'sparkles' : 'pen-line'} size=${11} />${sharked[key] ? 'נערך עם הכריש' : 'נערך'}</span>`;
  const toggleShark = (key) => setSharkAt(sharkAt === key ? null : key);
  const help = (key, value, where, isDefault, apply) =>
    sharkAt === key && html`<${SharkHelp} id=${key} text=${value} where=${where} isDefault=${isDefault} onClose=${() => setSharkAt(null)} onApply=${(v) => (apply(v), setSharkAt(null), notify('הכריש הכניס את השורה', 'sparkles'))} />`;
  return html`<div class="mx-auto max-w-[860px] px-4 py-6 md:px-8 md:py-8">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="fb-eyebrow mb-1">לפתוח 5 דקות לפני כל שיחת מכירה</p>
        <h1 class="fb-h1 text-[28px] md:text-[36px]">התסריט <span class="fb-marker">שלך</span></h1>
        <p class="mt-1 text-[16px] text-muted">מבנה השיחה, מה שואלים ומה עונים, בעמוד אחד. נבנה מהתרגול ומדף התשובות, וכל שורה בו שלך לערוך.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        ${dirty && html`<${Button} variant="mini" onClick=${() => (setScript({ edits: {}, added: {}, shark: {} }), notify('התסריט חזר לגרסה המקורית', 'rotate-ccw'))}><${Icon} name="rotate-ccw" size=${15} />לגרסה המקורית<//>`}
        <${Button} variant="mini" onClick=${copy}><${Icon} name="copy" size=${15} />העתקה<//>
        <${Button} variant="mini" onClick=${() => notify('ה-PDF ירד, ונשמר בקבצים › מגדילים מכירות', 'download')}><${Icon} name="download" size=${15} />הורדה<//>
      </div>
    </div>

    <${PartnerNote} title="למה תסריט" tilt=${-0.6} class="mb-7 !p-4 md:!p-5">
      <p class="mb-2">מוכרים טובים לא מאלתרים. כשהשאלות והתשובות כבר כתובות, הראש פנוי להקשיב ללקוח, ולא לחשוב מה להגיד עכשיו. חמש דקות על העמוד הזה לפני שיחה, ושום התנגדות לא מפתיעה.</p>
      <p class="flex items-start gap-1.5 text-[15px] text-brand-600"><${Icon} name="sparkles" size=${16} class="mt-1 shrink-0" /><span>שורה שלא נשמעת כמוך? ${g('לחץ', 'לחצי')} עליי ליד השורה, ונכתוב אותה יחד: קצר יותר, טבעי יותר או רך יותר. ${g('ואם אתה רוצה', 'ואם את רוצה')} לכתוב לבד, לוחצים על השורה עצמה.</span></p>
    <//>

    <h2 class="mb-3 flex items-center gap-2 text-[16px] font-bold"><${Icon} name="route" size=${18} class="text-brand-600" />מבנה השיחה<span class="text-[13px] font-bold text-muted">· כ-${total} דקות</span></h2>
    <ol class="mb-8 flex flex-col gap-3">
      ${parts.map(
        (p, i) => html`<li key=${p.title} class="flex gap-3">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-[14px] font-bold text-white">${i + 1}</span>
          <div class="fb-panel min-w-0 flex-1 !p-4">
            <p class="mb-0.5 flex flex-wrap items-baseline gap-x-2"><b class="text-[17px]">${p.title}</b><span class="text-[13px] font-bold text-muted">${p.min} דק'</span></p>
            <div class="mb-2.5 text-[14px] text-muted"><${InlineEdit} multiline value=${edits[`p${i}.goal`] ?? p.goal} onSave=${(v) => save(`p${i}.goal`, v)} /></div>
            <ul class="flex flex-col gap-1.5">
              ${p.lines.map(([mine, def, ex], j) => {
                const key = `p${i}.l${j}`;
                const edited = edits[key] != null;
                const value = lineOf(i, j, mine, def);
                return html`<li key=${j}>
                  <div class=${cx('flex items-start gap-2 rounded-xl px-3 py-2 text-[15px] leading-relaxed', edited ? 'bg-[#fdf8ea] ring-1 ring-[#e6cd8e]' : mine ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-canvas')}>
                    <span class="min-w-0 flex-1">
                      ${edited ? editedTag(key) : mine && html`<span class="mb-0.5 flex items-center gap-1 text-[12px] font-bold text-brand-600"><${Icon} name="pencil" size=${11} />מהתרגול שלך</span>`}
                      <${InlineEdit} multiline value=${value} onSave=${(v) => save(key, v)} />
                      ${ex && !edited && html`<span class="mt-1.5 block border-t border-line pt-1.5 text-[13px] text-muted"><b class="text-brand-600">איך זה נשמע אצלך בתרגול:</b> "${clean(ex)}"</span>`}
                    </span>
                    <${SharkBtn} on=${sharkAt === key} onClick=${() => toggleShark(key)} />
                  </div>
                  ${help(key, value, p.title, !edited && !mine, (v) => save(key, v, true))}
                </li>`;
              })}
              ${(added[i] || []).map((l, k) => {
                const key = `a${i}.${k}`;
                const put = (v) => setAdded(i, (added[i] || []).map((x, n) => (n === k ? v : x)).filter((x, n) => n !== k || x.trim()));
                return html`<li key=${key}>
                  <div class="flex items-start gap-1 rounded-xl bg-[#fdf8ea] px-3 py-2 text-[15px] leading-relaxed ring-1 ring-[#e6cd8e]">
                    <span class="min-w-0 flex-1"><span class="mb-0.5 flex items-center gap-1 text-[12px] font-bold text-[#8a5a12]"><${Icon} name="plus" size=${11} />הוספת</span><${InlineEdit} multiline value=${l} placeholder="שורה חדשה: ללחוץ ולכתוב" onSave=${put} /></span>
                    ${l.trim() && html`<${SharkBtn} on=${sharkAt === key} onClick=${() => toggleShark(key)} />`}
                    <button type="button" aria-label="מחיקת השורה" class="rounded p-1 text-muted hover:text-ink cursor-pointer" onClick=${() => setAdded(i, (added[i] || []).filter((x, n) => n !== k))}><${Icon} name="x" size=${15} /></button>
                  </div>
                  ${help(key, l, p.title, false, put)}
                </li>`;
              })}
            </ul>
            <button type="button" class="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-brand-600 hover:underline cursor-pointer" onClick=${() => setAdded(i, [...(added[i] || []), ''])}><${Icon} name="plus" size=${14} />להוסיף שורה</button>
          </div>
        </li>`,
      )}
    </ol>

    <h2 class="mb-1 flex items-center gap-2 text-[16px] font-bold"><${Icon} name="shield-question" size=${18} class="text-brand-600" />התנגדויות נפוצות, ומה עונים</h2>
    <p class="mb-3 text-[14px] text-muted">שלושה צעדים לכל התנגדות: שואלים מה באמת מדאיג, עונים על הדאגה עם ההצעה, ובודקים שזה נפתר לפני שמבקשים שוב. לא מתווכחים, לא לוחצים, ולא מורידים מחיר.</p>
    <div class="mb-3 grid gap-3 md:grid-cols-2">
      ${objections.map((r) => {
        const f = FORMS.find((x) => x.id === r.form);
        return html`<article key=${r.id} class=${cx('fb-panel flex flex-col !p-4', r.mine && 'ring-2 ring-brand-300')}>
          <p class="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-muted"><${Icon} name=${f.icon} size=${13} class="text-brand-600" />${f.label}${r.mine && html`<span class="ms-auto"><${Tag} tone="blue">ענית בתרגול<//></span>`}</p>
          <p class="text-[17px] font-bold">"${r.said}"</p>
          <p class="mb-3 text-[13px] text-muted">מה באמת מדאיג: ${r.worry}</p>
          <ol class="flex flex-col gap-2">
            ${STEPS.map(([k, label, sub], n) => {
              const key = `o.${r.id}.${k}`;
              const edited = edits[key] != null;
              const value = stepOf(r, k);
              return html`<li key=${k}>
                <div class="flex items-start gap-2">
                  <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-600">${n + 1}</span>
                  <span class="min-w-0 flex-1 text-[15px] leading-relaxed"><b class="text-[13px] text-brand-600">${label}</b> <small class="text-[12px] text-faint">${sub}</small>${edited && html` <small class="text-[12px] font-bold text-[#8a5a12]">· ${sharked[key] ? 'נערך עם הכריש' : 'נערך'}</small>`}<br /><${InlineEdit} multiline value=${value} onSave=${(v) => save(key, v)} /></span>
                  <${SharkBtn} on=${sharkAt === key} onClick=${() => toggleShark(key)} />
                </div>
                ${help(key, value, `התנגדות "${r.said}", צעד: ${label} (${sub})`, false, (v) => save(key, v, true))}
              </li>`;
            })}
          </ol>
          ${r.honest && html`<p class="mt-3 flex items-start gap-1.5 rounded-xl bg-warn-50 px-3 py-2 text-[13px] text-ink"><${Icon} name="scale" size=${14} class="mt-0.5 shrink-0 text-warn" /><span>${r.honest}</span></p>`}
          ${r.mine && html`<p class="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-[13px]"><b class="block text-brand-600">איך ענית בתרגול</b>${r.answer}</p>`}
        </article>`;
      })}
    </div>
    <p class="mb-8 text-[14px] text-muted">גרסה קצרה לוואטסאפ לכל התנגדות, ב<button type="button" class="font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${onSheet}>דף התשובות</button>.</p>

    ${fixes.length > 0 &&
    html`<${Note} tone="white" tilt=${-0.6} class="!p-5">
      <span class="fb-note-kicker">לזכור מהתרגול</span>
      <ul class="mt-1 flex flex-col gap-2">${fixes.map((f) => html`<li key=${f.k} class="text-[15px]"><b>${f.k}:</b> ${f.alt}</li>`)}</ul>
    <//>`}
  </div>`;
}
