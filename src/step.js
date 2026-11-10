// Step 12 "חדר התרגול": the opening, the room (who do we practise with today), the brief
// before a call, and the finish. The call, the feedback and the tools are in call.js and
// tools.js; the answer sheet is in sheet.js.
import { html, useEffect, Icon, cx, confetti, money, PencilLine } from './lib.js';
import { Button, Note, StepHeading, SharkAvatar } from './components.js';
import { Sheet, Tag } from './ui.js';
import { USER, CLIENTS, CONTEXT, CLIENT_FILE, FORMS, LEVELS, GROUPS, STAGES, PARTS, g } from './data.js';

export const formOf = (id) => FORMS.find((f) => f.id === id);
export const OUTCOME = {
  buy: { label: 'קנה', icon: 'badge-check', tone: 'blue' },
  next: { label: 'צעד הבא נקבע', icon: 'calendar-check', tone: 'blue' },
  no: { label: 'סירב בצדק, ונפרדתם יפה', icon: 'hand', tone: 'blue' },
  think: { label: '"צריך לחשוב"', icon: 'hourglass', tone: 'draft' },
};
export const outcomeLabel = (o, c) => (o === 'buy' ? (c?.fem ? 'קנתה' : 'קנה') : o === 'no' ? (c?.fem ? 'סירבה בצדק, ונפרדתם יפה' : 'סירב בצדק, ונפרדתם יפה') : OUTCOME[o]?.label);

export function Avatar({ client, size = 44 }) {
  const tint = { ronit: '#dde9fc', avi: '#e9effb', michal: '#eef3fd' }[client.id];
  return html`<span class="grid shrink-0 place-items-center rounded-full font-display font-black text-brand-600 ring-2 ring-white" style=${{ width: size, height: size, background: tint, fontSize: size * 0.42, boxShadow: '0 0 0 2px #8fb3ef' }}>${client.first[0]}</span>`;
}

// ---------- opening (first entry only) ----------
export function Opening() {
  return html`<div class="mx-auto grid max-w-[1120px] items-center gap-8 px-4 py-6 md:grid-cols-[1.1fr_0.9fr] md:gap-12 md:px-8 md:py-8">
    <div>
      <${StepHeading} n="12" eyebrow="שלב 12 · מגדילים מכירות" title=${['מתאמנים על השיחה, לפני ', 'הלקוח הבא', '']} />
      <p class="mb-6 max-w-[50ch] text-[18px] text-ink">שלושה לקוחות שנבנו מתיק הלקוח, מהסל ומההצעה שלך. ${g('מנהל', 'מנהלת')} מולם שיחת מכירה מלאה, ובסוף ${g('מקבל', 'מקבלת')} משוב מדויק: מה עבד, התיקון האחד, וניסוח שאפשר להגיד כבר בשיחה הבאה.</p>
      <div class="flex flex-col gap-2 border-t border-line pt-4 text-[15px]">
        <p class="flex flex-wrap items-center gap-x-2 gap-y-1"><${Icon} name="list" size=${17} class="text-brand-600" /><b>החלקים:</b> ${PARTS.join(' · ')}</p>
        <p class="flex items-center gap-2"><${Icon} name="clock" size=${17} class="text-brand-600" /><b>זמן:</b> כ-20 דקות לשיחה</p>
        <p class="flex items-center gap-2"><${Icon} name="file-check-2" size=${17} class="text-brand-600" /><b>התוצר:</b> דף תשובות להתנגדויות, במילים שלך</p>
      </div>
    </div>
    <div class="relative flex justify-center pb-8">
      <div class="paper w-[330px] rotate-[1deg] rounded-[18px] p-4">
        <div class="mb-3 flex items-center gap-2 border-b border-line pb-2"><${Avatar} client=${CLIENTS[0]} size=${34} /><b class="text-[15px]">רונית לוי</b><span class="ms-auto text-[12px] text-muted">רמה 2</span></div>
        <div class="flex flex-col gap-2 text-[14px]">
          <p class="self-start rounded-2xl rounded-ss-sm bg-canvas px-3 py-2">ניסיתי כבר סוכנות. זה לא עבד.</p>
          <p class="self-end rounded-2xl rounded-se-sm bg-brand-600 px-3 py-2 text-white">מה הכי מפריע לך, שזה יהיה שוב אותו דבר?</p>
          <p class="self-start rounded-2xl rounded-ss-sm bg-canvas px-3 py-2">כן. שאשלם, ושוב לא אדע מה קורה.</p>
        </div>
      </div>
      <${Note} tone="white" tilt=${-3} class="absolute -bottom-2 left-0 w-[210px] !p-3 text-[14px]">
        <span class="fb-note-kicker">התיקון האחד</span>
        <span>לסכם במילים שלה, לפני ההצגה.</span>
      <//>
      <span class="hand absolute -top-3 right-2 rotate-[3deg] text-[26px]">בלי לחץ, עם משוב</span>
    </div>
  </div>`;
}

// ---------- the room: who do we practise with today ----------
// One thing to do: pick a client. The recommended one is marked; the tools sit quietly below.
export function Room({ state, onPick, onResume, onTool, onContext, onSheet }) {
  const lastByClient = (id) => [...state.calls].reverse().find((c) => c.clientId === id);
  const lastFix = [...state.calls].reverse().find((c) => c.feedback?.fix);
  const doneIds = new Set(state.calls.filter((c) => c.feedback).map((c) => c.clientId));
  const next = CLIENTS.find((c) => !doneIds.has(c.id))?.id;
  return html`<div class="mx-auto max-w-[980px] px-4 py-6 md:px-8 md:py-8">
    <h1 class="fb-h1 mb-1 text-[28px] md:text-[34px]">עם מי <span class="fb-marker">מתאמנים</span> היום?</h1>
    <p class="mb-6 text-[17px] text-muted">${g('בחר', 'בחרי')} לקוח. שיחה אחת עם משוב מספיקה כדי לסיים את השלב.</p>
    ${lastFix && html`<button type="button" class="rise mb-5 flex w-full max-w-[640px] items-center gap-3 rounded-2xl border-[1.5px] border-brand-300 bg-brand-50 p-3 text-start hover:border-brand-600 cursor-pointer" onClick=${() => onResume(lastFix)}>
      <${SharkAvatar} size=${36} />
      <span class="min-w-0 flex-1"><small class="block text-[13px] font-bold text-brand-600">להמשיך מהפעם הקודמת</small><b class="block text-[16px]">${lastFix.feedback.fix.title.split(':')[0]}</b></span>
      <${Icon} name="arrow-left" size=${18} class="text-brand-600" />
    </button>`}
    <div class="grid gap-4 md:grid-cols-3">
      ${CLIENTS.map((c) => {
        const last = lastByClient(c.id);
        const form = formOf(c.form);
        const rec = c.id === next && !lastFix;
        return html`<button key=${c.id} type="button" class=${cx('fb-panel group relative flex flex-col items-center !p-5 text-center transition hover:-translate-y-0.5 hover:border-brand-600 cursor-pointer', rec && '!border-brand-600 ring-4 ring-brand-100')} onClick=${() => onPick(c.id)}>
          ${rec && html`<span class="absolute -top-3 rounded-full bg-brand-600 px-3 py-0.5 text-[12px] font-bold text-white">מומלץ להתחיל</span>`}
          <${Avatar} client=${c} size=${64} />
          <b class="mt-3 block font-display text-[20px]">${c.first}</b>
          <small class="mb-3 block text-[14px] text-muted">${c.who}</small>
          <span class="mb-4 text-[15px] italic text-ink">"${c.said}"</span>
          <span class="mt-auto flex w-full items-center justify-between border-t border-line pt-3 text-[14px]">
            <span class="inline-flex items-center gap-1 text-muted"><${Icon} name=${form.icon} size=${14} />${last?.feedback ? `${outcomeLabel(last.outcome, c)} · ${last.feedback.avg.toFixed(1)}` : `דאגה: ${form.label}`}</span>
            <span class="inline-flex items-center gap-1 font-bold text-brand-600">${last ? 'עוד שיחה' : 'לשיחה'}<${Icon} name="arrow-left" size=${16} class="transition group-hover:-translate-x-0.5" /></span>
          </span>
        </button>`;
      })}
    </div>
    <div class="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-4">
      <span class="me-1 text-[14px] font-bold text-muted">עוד בחדר:</span>
      ${[
        ['zap', 'סבב התנגדויות מהיר', () => onTool('drill')],
        ['file-search', 'ניתוח שיחה שהייתה', () => onTool('analysis')],
        ['file-text', 'דף התשובות', onSheet],
        ['folder-open', 'מה הלקוחות יודעים', onContext],
      ].map(([icon, label, fn]) => html`<button key=${label} type="button" class="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[14px] font-semibold hover:border-brand-300 hover:text-brand-600 cursor-pointer" onClick=${fn}><${Icon} name=${icon} size=${15} />${label}</button>`)}
    </div>
  </div>`;
}

// What goes into the context block (prompt section 9), as the user sees it.
export function ContextSheet({ onClose }) {
  const Row = ({ k, children, from }) => html`<div class="border-b border-line py-2.5 last:border-0"><p class="mb-0.5 flex items-center justify-between gap-2 text-[13px] font-bold text-muted">${k}<span class="font-semibold text-faint">${from}</span></p><div class="text-[15px]">${children}</div></div>`;
  return html`<${Sheet} title="מה הלקוחות יודעים על העסק" wide onClose=${onClose}>
    <p class="mb-2 text-[14px] text-muted">הלקוחות המדומים והמשוב נשענים רק על מה שכתוב כאן. מה שחסר, לא ממציאים. אפשר לתקן בשלב שממנו זה הגיע.</p>
    <div class="fb-panel !p-4">
      <${Row} k="מה ${g('אתה מוכר', 'את מוכרת')}" from="ההצעה המנצחת">${CONTEXT.sells}<//>
      <${Row} k="המסלולים" from="סל המוצרים">${CONTEXT.tracks.map((t) => html`<p key=${t.name}><b>${t.name}</b>: ${money(t.price)}${t.price === 2200 ? ' בחודש' : ''} <span class="text-muted">· ${t.note}</span></p>`)}<//>
      <${Row} k="בונוס וערבות" from="ההצעה המנצחת"><p>${CONTEXT.bonus}</p><p>${CONTEXT.guarantee}</p><//>
      <${Row} k="הלקוחות" from="תיק הלקוח"><p>${USER.audience}. הכאב: ${CLIENT_FILE.pain}. הטריגר: ${CLIENT_FILE.trigger}. התנגדות הזהב: "${CLIENT_FILE.golden}".</p><//>
      <${Row} k="הוכחות" from="דף המסרים"><p>עוד אין לקוחות, אז הסיפורים בשיחה מגיעים מהניסיון שלך: ${USER.experience}. עדות ממוצאת מסומנת במשוב כדגל אדום.</p><//>
      <${Row} k="כללים של העסק" from="ההצעה ו'העסק במספרים'">${CONTEXT.rules.map((r) => html`<p key=${r}>${r}</p>`)}<//>
    </div>
  <//>`;
}

// ---------- the brief before a call ----------
// Who, what they wrote, the goal, and how hard. The call structure shows live in the call.
export function Brief({ client, level, setLevel }) {
  const L = LEVELS.find((l) => l.id === level);
  return html`<div class="mx-auto max-w-[620px] px-4 py-6 md:py-10">
    <div class="mb-5 flex flex-col items-center text-center">
      <${Avatar} client=${client} size=${72} />
      <h1 class="fb-h1 mt-3 text-[28px] md:text-[32px]">${client.name}</h1>
      <p class="text-[16px] text-muted">${client.who}</p>
    </div>
    <section class="fb-panel mb-4 !p-4">
      <p class="mb-1 text-[13px] font-bold text-muted">${client.from}</p>
      <p class="text-[17px]">${client.fem ? 'כתבה' : 'כתב'}: <b>"${client.said}"</b></p>
    </section>
    <section class="mb-6 flex items-start gap-3 rounded-2xl bg-brand-50 p-4">
      <span class="fb-chip-ic h-9 w-9 shrink-0"><${Icon} name="target" size=${18} /></span>
      <span><b class="block text-[16px]">המטרה: החלטה ברורה, וצעד הבא ביומן</b><span class="text-[15px] text-muted">גם "לא" הוגן נחשב. "צריך לחשוב" לא.</span></span>
    </section>
    <p class="mb-2 text-[14px] font-bold">רמת קושי</p>
    <div class="grid grid-cols-4 gap-1 rounded-2xl bg-canvas p-1 ring-1 ring-line" role="radiogroup" aria-label="רמת קושי">
      ${LEVELS.map(
        (l) => html`<button key=${l.id} type="button" role="radio" aria-checked=${level === l.id} onClick=${() => setLevel(l.id)} class=${cx('flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[14px] font-bold transition cursor-pointer sm:flex-row sm:justify-center sm:gap-1.5', level === l.id ? 'bg-white text-brand-600 shadow-sm ring-1 ring-brand-300' : 'text-muted hover:text-ink')}><span class=${cx('grid h-6 w-6 place-items-center rounded-full text-[12px]', level === l.id ? 'bg-brand-600 text-white' : 'bg-white ring-1 ring-line')}>${l.id}</span>${l.label.split(' · ')[1]}</button>`,
      )}
    </div>
    <p class="mt-1.5 flex items-center px-2 text-[12px] font-bold text-faint" aria-hidden="true"><span>הכי קל</span><span class="mx-2 h-px flex-1 bg-line"></span><span>הכי קשה</span></p>
    <p class="mt-2 text-center text-[14px] text-muted">${L.sub}</p>
  </div>`;
}

// ---------- the finish ----------
export function Done({ state }) {
  useEffect(() => {
    const t = setTimeout(() => confetti('step'), 200);
    return () => clearTimeout(t);
  }, []);
  const done = state.calls.filter((c) => c.feedback);
  const best = done.reduce((a, b) => (!a || b.feedback.avg > a.feedback.avg ? b : a), null);
  const last = done[done.length - 1];
  const mine = state.sheet.filter((r) => r.mine).length;
  const rows = [
    ['messages-square', 'שיחות', `${done.length} ${done.length === 1 ? 'שיחה' : 'שיחות'}${best ? `, הכי טובה: ${best.feedback.avg.toFixed(1)} עם ${CLIENTS.find((c) => c.id === best.clientId).first}` : ''}`],
    ['target', 'לזכור', last?.feedback?.fix ? last.feedback.fix.title.split(':')[0] : '—'],
    ['file-text', 'דף התשובות', `${state.sheet.length} התנגדויות${mine ? `, ${mine} במילים שלך` : ''}. נשמר בקבצים › מגדילים מכירות`],
    ['door-open', 'החדר', 'נשאר פתוח: אפשר לחזור לפני כל שיחה אמיתית'],
  ];
  return html`<div class="mx-auto grid max-w-[1000px] items-center gap-8 px-4 py-6 md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-10">
    <div>
      <p class="fb-eyebrow mb-1">סיימת את שלב 12</p>
      <h1 class="fb-h1 mb-4 text-[28px] md:text-[36px]">השיחה הבאה <span class="fb-marker">מוכנה</span></h1>
      <section class="fb-panel !p-4 md:!p-5">
        <ul class="flex flex-col divide-y divide-line">
          ${rows.map(([icon, k, v]) => html`<li key=${k} class="flex items-start gap-3 py-2"><span class="mt-0.5 text-brand-600"><${Icon} name=${icon} size=${18} /></span><span class="w-[92px] shrink-0 text-[14px] font-bold">${k}</span><span class="min-w-0 text-[15px]">${v}</span></li>`)}
        </ul>
      </section>
    </div>
    <div class="flex justify-center pt-8">
      <${Note} tone="white" tilt=${-2} class="fb-badge-note !pt-10">
        <span class="fb-note-kicker">שלב הושלם</span>
        <b class="font-display text-[24px]">חדר התרגול</b>
        <span class="text-[14px]">חסכת בשלב הזה</span>
        <span class="relative font-display text-[36px] font-black text-money">${money(750)}<${PencilLine} color="#12805c" class="absolute inset-x-0 -bottom-1 h-2 w-full" /></span>
        <span class="text-[12px] text-muted">כמו פגישת אימון מכירות אחת</span>
      <//>
    </div>
  </div>`;
}
