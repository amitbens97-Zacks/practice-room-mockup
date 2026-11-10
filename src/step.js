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
export function Room({ state, onPick, onResume, onTool, onContext, onSheet }) {
  const lastByClient = (id) => [...state.calls].reverse().find((c) => c.clientId === id);
  const lastFix = [...state.calls].reverse().find((c) => c.feedback?.fix);
  return html`<div class="mx-auto max-w-[1120px] px-4 py-5 md:px-8 md:py-6">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="fb-eyebrow mb-1">חדר התרגול</p>
        <h1 class="fb-h1 text-[26px] md:text-[32px]">עם מי <span class="fb-marker">מתאמנים</span> היום?</h1>
        <p class="mt-1 max-w-[62ch] text-[16px]">כל לקוח נבנה מתיק הלקוח, מהסל ומההצעה שלך, ומביא דאגה אחרת. שיחה אחת מספיקה כדי לסיים את השלב.</p>
      </div>
      <button type="button" class="inline-flex items-center gap-1.5 text-[14px] font-bold text-brand-600 underline-offset-4 hover:underline cursor-pointer" onClick=${onContext}><${Icon} name="folder-open" size=${16} />מה הלקוחות יודעים על העסק</button>
    </div>
    ${lastFix && html`<${Note} tone="white" tilt=${-0.8} class="rise mb-4 flex max-w-[760px] items-start gap-3 !p-3">
      <${SharkAvatar} size=${36} />
      <span class="min-w-0 flex-1 text-[15px]"><span class="fb-note-kicker">מהפעם הקודמת</span><b class="block">${lastFix.feedback.fix.title.split(':')[0]}</b>אפשר להמשיך בדיוק מהתיקון הזה, עם ${CLIENTS.find((c) => c.id === lastFix.clientId).first}.</span>
      <${Button} variant="mini" onClick=${() => onResume(lastFix)}>להמשיך מכאן<//>
    <//>`}
    <div class="grid gap-3 md:grid-cols-3">
      ${CLIENTS.map((c) => {
        const last = lastByClient(c.id);
        const form = formOf(c.form);
        return html`<button key=${c.id} type="button" class="fb-panel group flex flex-col !p-4 text-start transition-colors hover:border-brand-300 cursor-pointer" onClick=${() => onPick(c.id)}>
          <span class="mb-2 flex items-center gap-3">
            <${Avatar} client=${c} />
            <span class="min-w-0"><b class="block font-display text-[18px]">${c.name}</b><small class="block truncate text-[13px] text-muted">${c.who}</small></span>
          </span>
          <span class="mb-2 text-[14px] text-muted"><${Icon} name="map-pin" size=${14} class="me-1 text-brand-600" />${c.from}</span>
          <span class="mb-3 rounded-xl bg-canvas px-3 py-2 text-[15px]">"${c.said}"</span>
          <span class="mt-auto flex flex-wrap items-center gap-1.5">
            <${Tag} tone="blue"><${Icon} name=${form.icon} size=${13} />${form.label} · ${c.tag}<//>
            <span class="text-[12px] text-muted">${c.tagFrom}</span>
          </span>
          <span class="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-[14px]">
            ${last ? html`<span class="text-muted">${last.feedback ? `${outcomeLabel(last.outcome, c)} · ${last.feedback.avg.toFixed(1)}` : 'באמצע שיחה'}</span>` : html`<span class="text-faint">עוד לא דיברתם</span>`}
            <span class="inline-flex items-center gap-1 font-bold text-brand-600">${last ? 'עוד שיחה' : 'לשיחה'}<${Icon} name="arrow-left" size=${16} /></span>
          </span>
        </button>`;
      })}
    </div>
    <div class="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_0.8fr]">
      <button type="button" class="fb-panel flex items-center gap-3 !p-4 text-start hover:border-brand-300 cursor-pointer" onClick=${() => onTool('drill')}>
        <span class="fb-chip-ic h-11 w-11 shrink-0"><${Icon} name="zap" size=${22} /></span>
        <span class="min-w-0"><b class="block text-[16px]">סבב התנגדויות מהיר</b><small class="block text-[14px] text-muted">5 התנגדויות, ותשובה לדוגמה אחרי כל אחת${state.drill?.done ? ` · ${state.drill.done === 1 ? 'עשית סבב אחד' : `עשית ${state.drill.done} סבבים`}` : ''}</small></span>
      </button>
      <button type="button" class="fb-panel flex items-center gap-3 !p-4 text-start hover:border-brand-300 cursor-pointer" onClick=${() => onTool('analysis')}>
        <span class="fb-chip-ic h-11 w-11 shrink-0"><${Icon} name="file-search" size=${22} /></span>
        <span class="min-w-0"><b class="block text-[16px]">ניתוח שיחה שהייתה</b><small class="block text-[14px] text-muted">מדביקים תמלול או סיכום, ורואים איפה היא נסגרה או נפלה</small></span>
      </button>
      <button type="button" class="fb-panel flex items-center gap-3 !p-4 text-start hover:border-brand-300 cursor-pointer" onClick=${onSheet}>
        <span class="fb-chip-ic h-11 w-11 shrink-0"><${Icon} name="file-text" size=${22} /></span>
        <span class="min-w-0"><b class="block text-[16px]">דף התשובות</b><small class="block text-[14px] text-muted">${state.sheet.length} התנגדויות${state.sheet.some((r) => r.mine) ? ', חלקן במילים שלך' : ''}</small></span>
      </button>
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
export function Brief({ client, level, setLevel }) {
  const form = formOf(client.form);
  return html`<div class="mx-auto grid max-w-[1080px] gap-6 px-4 py-5 md:grid-cols-[1.15fr_0.85fr] md:px-8 md:py-7">
    <div>
      <p class="fb-eyebrow mb-1">לפני השיחה</p>
      <div class="mb-4 flex items-center gap-3">
        <${Avatar} client=${client} size=${56} />
        <div><h1 class="fb-h1 text-[28px] md:text-[32px]">${client.name}</h1><p class="text-[16px] text-muted">${client.who}</p></div>
      </div>
      <section class="fb-panel mb-4 !p-4">
        <p class="mb-1 text-[14px] font-bold text-muted">מה ידוע לך</p>
        <p class="mb-1 text-[16px]"><${Icon} name="map-pin" size=${15} class="me-1 text-brand-600" />${client.from}</p>
        <p class="text-[16px]"><${Icon} name="message-circle" size=${15} class="me-1 text-brand-600" />${client.fem ? 'כתבה' : 'כתב'}: "${client.said}"</p>
        <p class="mt-3 border-t border-line pt-2 text-[14px] text-muted">בשיחה אמיתית: תזכורת אישית לפני, שאלה או שתיים על הבעיה, ובדיקה שכל מי שמחליט יהיה בשיחה.</p>
      </section>
      <p class="mb-1.5 text-[14px] font-bold">רמת קושי</p>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="רמת קושי">
        ${LEVELS.map(
          (l) => html`<button key=${l.id} type="button" role="radio" aria-checked=${level === l.id} onClick=${() => setLevel(l.id)} class=${cx('rounded-xl border-[1.5px] px-3 py-2 text-start cursor-pointer', level === l.id ? 'border-brand-600 bg-brand-100' : 'border-line bg-white hover:border-brand-300')}>
            <b class=${cx('block text-[14px]', level === l.id && 'text-brand-600')}>${l.label}</b><small class="block text-[12px] leading-snug text-muted">${l.sub}</small>
          </button>`,
        )}
      </div>
    </div>
    <div class="flex flex-col gap-3">
      <${Note} tone="white" tilt=${-1} class="!p-4">
        <span class="fb-note-kicker">המטרה של השיחה</span>
        <b class="block text-[17px]">החלטה ברורה, וצעד הבא ביומן</b>
        <span class="text-[15px]">גם "לא" הוגן הוא תוצאה טובה. מה שלא נחשב הצלחה: "צריך לחשוב על זה".</span>
      <//>
      <section class="fb-panel !p-4">
        <p class="mb-2 text-[14px] font-bold text-muted">מבנה השיחה</p>
        <ol class="flex flex-col gap-1.5">
          ${GROUPS.map((gr, i) => html`<li key=${gr} class="flex items-start gap-2 text-[15px]"><span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-[12px] font-bold text-brand-600">${i + 1}</span><span><b>${gr}</b> <small class="text-muted">${STAGES.filter((s) => s.group === i).map((s) => s.name).join(' · ')}</small></span></li>`)}
        </ol>
      </section>
      <p class="flex items-center gap-2 text-[14px] text-muted"><${Icon} name=${form.icon} size=${15} class="text-brand-600" />הדאגה של ${client.first} תעלה אם לא תצא לפני המחיר.</p>
    </div>
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
