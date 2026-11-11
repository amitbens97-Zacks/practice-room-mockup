// "דף תשובות להתנגדויות": the step's output. Grouped by the five forms of prompt 3.11.
// Each row: what the client said, the worry behind it, an answer and a short WhatsApp
// version. It starts from the client file, the offer and the audience's common objections;
// after every call the rows that came up are rewritten in the user's own words.
import { html, useState, Icon, cx, money } from './lib.js';
import { Button, InlineEdit, Note } from './components.js';
import { Sheet, Tag } from './ui.js';
import { FORMS, CONTEXT, g } from './data.js';

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

export function AnswerSheet({ sheet, setRow, notify, onScript }) {
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
        <${Button} variant="mini" onClick=${onScript}><${Icon} name="scroll-text" size=${15} />התסריט שלך<//>
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

// "התסריט שלך": one page to open before every sales call. The structure of the call (prompt
// v2 section 4, in six parts with minutes and ready lines), the common objections with the
// short answers from the sheet (the user's own words first), and what to remember from the
// practice. A line the user said well in practice replaces the ready line, marked as theirs.
function scriptOf(state) {
  const done = state.calls.filter((c) => c.feedback && c.f);
  const said = (k, ok = () => true) => [...done].reverse().map((c) => c.f[k]).find((x) => x && ok(x)) || null;
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
  const objections = FORMS.map((f) => [...state.sheet.filter((r) => r.form === f.id)].sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0))[0]).filter(Boolean);
  const fixes = [];
  [...done].reverse().forEach((c) => {
    const fx = c.feedback.fix;
    const k = fx?.title.split(':')[0];
    if (fx && !fixes.some((x) => x.k === k) && fixes.length < 3) fixes.push({ k, alt: fx.alt });
  });
  return { parts, objections, fixes };
}

export function CallScript({ state, notify, onSheet }) {
  const { parts, objections, fixes } = scriptOf(state);
  const clean = (t) => t.replace(/^"|"$/g, '');
  const text = [
    'התסריט שלך לשיחת מכירה',
    ...parts.map((p, i) => `${i + 1}. ${p.title} (${p.min} דק'): ${p.lines.map(([m, d]) => `"${clean(m || d)}"`).join(' ')}`),
    'התנגדויות נפוצות:',
    ...objections.map((r) => `"${r.said}": ${r.short}`),
    ...(fixes.length ? ['לזכור מהתרגול:', ...fixes.map((f) => `${f.k}: ${f.alt}`)] : []),
  ].join('\n');
  const copy = () => {
    try {
      navigator.clipboard?.writeText(text);
    } catch (e) {}
    notify('התסריט הועתק', 'copy');
  };
  const total = parts.reduce((s, p) => s + p.min, 0);
  return html`<div class="mx-auto max-w-[820px] px-4 py-6 md:px-8 md:py-8">
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="fb-h1 text-[26px] md:text-[32px]">התסריט <span class="fb-marker">שלך</span></h1>
        <p class="mt-1 text-[16px] text-muted">עמוד אחד לפתוח לפני כל שיחת מכירה. נבנה מהתרגול ומדף התשובות.</p>
      </div>
      <div class="flex gap-2">
        <${Button} variant="mini" onClick=${copy}><${Icon} name="copy" size=${15} />העתקה<//>
        <${Button} variant="mini" onClick=${() => notify('ה-PDF ירד, ונשמר בקבצים › מגדילים מכירות', 'download')}><${Icon} name="download" size=${15} />הורדה<//>
      </div>
    </div>

    <h2 class="mb-3 flex items-center gap-2 text-[16px] font-bold"><${Icon} name="route" size=${18} class="text-brand-600" />מבנה השיחה<span class="text-[13px] font-bold text-muted">· כ-${total} דקות</span></h2>
    <ol class="relative mb-8 flex flex-col gap-3 before:absolute before:bottom-4 before:start-[15px] before:top-4 before:w-0.5 before:bg-brand-100">
      ${parts.map(
        (p, i) => html`<li key=${p.title} class="relative flex gap-3">
          <span class="z-[1] grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-[14px] font-bold text-white ring-4 ring-canvas">${i + 1}</span>
          <div class="fb-panel min-w-0 flex-1 !p-4">
            <p class="mb-0.5 flex flex-wrap items-baseline gap-x-2"><b class="text-[17px]">${p.title}</b><span class="text-[13px] font-bold text-muted">${p.min} דק'</span></p>
            <p class="mb-2.5 text-[14px] text-muted">${p.goal}</p>
            <ul class="flex flex-col gap-1.5">
              ${p.lines.map(([mine, def, ex], j) => html`<li key=${j} class=${cx('rounded-xl px-3 py-2 text-[15px] leading-relaxed', mine ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-canvas')}>
                ${mine && html`<span class="mb-0.5 flex items-center gap-1 text-[12px] font-bold text-brand-600"><${Icon} name="pencil" size=${11} />מהתרגול שלך</span>`}
                "${clean(mine || def)}"
                ${ex && html`<span class="mt-1.5 block border-t border-line pt-1.5 text-[13px] text-muted"><b class="text-brand-600">איך זה נשמע אצלך בתרגול:</b> "${clean(ex)}"</span>`}
              </li>`)}
            </ul>
          </div>
        </li>`,
      )}
    </ol>

    <h2 class="mb-3 flex items-center gap-2 text-[16px] font-bold"><${Icon} name="shield-question" size=${18} class="text-brand-600" />התנגדויות נפוצות, ומה עונים</h2>
    <div class="mb-8 grid gap-2.5 md:grid-cols-2">
      ${objections.map((r) => {
        const f = FORMS.find((x) => x.id === r.form);
        return html`<article key=${r.id} class=${cx('fb-panel !p-4', r.mine && 'ring-2 ring-brand-300')}>
          <p class="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-muted"><${Icon} name=${f.icon} size=${13} class="text-brand-600" />${f.label}${r.mine && html`<span class="ms-auto"><${Tag} tone="blue">במילים שלך<//></span>`}</p>
          <p class="mb-1.5 text-[16px] font-bold">"${r.said}"</p>
          <p class="text-[15px] leading-relaxed">${r.short}</p>
        </article>`;
      })}
    </div>
    <p class="-mt-5 mb-8 text-[14px] text-muted">התשובות המלאות, עם הדאגה שמאחורי כל משפט, ב<button type="button" class="font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${onSheet}>דף התשובות</button>.</p>

    ${fixes.length > 0 &&
    html`<${Note} tone="white" tilt=${-0.6} class="!p-5">
      <span class="fb-note-kicker">לזכור מהתרגול</span>
      <ul class="mt-1 flex flex-col gap-2">${fixes.map((f) => html`<li key=${f.k} class="text-[15px]"><b>${f.k}:</b> ${f.alt}</li>`)}</ul>
    <//>`}
  </div>`;
}
