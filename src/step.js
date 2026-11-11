// Step 12 "חדר התרגול": the opening, the room (who do we practise with today), the brief
// before a call, and the finish. The call, the feedback and the tools are in call.js and
// tools.js; the answer sheet is in sheet.js.
import { html, useState, useEffect, Icon, cx, confetti, money, PencilLine } from './lib.js';
import { Button, Note, StepHeading, SharkAvatar } from './components.js';
import { Sheet, Tag, Field, Chips, inputCls } from './ui.js';
import { USER, CLIENTS, POOL_CLIENTS, CONTEXT, CLIENT_FILE, FORMS, LEVELS, GROUPS, STAGES, PARTS, g } from './data.js';

export const formOf = (id) => FORMS.find((f) => f.id === id);
export const OUTCOME = {
  buy: { label: 'קנה', icon: 'badge-check', tone: 'blue' },
  next: { label: 'צעד הבא נקבע', icon: 'calendar-check', tone: 'blue' },
  no: { label: 'סירב בצדק, ונפרדתם יפה', icon: 'hand', tone: 'blue' },
  think: { label: '"צריך לחשוב"', icon: 'hourglass', tone: 'draft' },
  lost: { label: 'סירב אחרי לחץ', icon: 'circle-x', tone: 'draft' },
};
export const outcomeLabel = (o, c) => (o === 'buy' ? (c?.fem ? 'קנתה' : 'קנה') : o === 'lost' ? (c?.fem ? 'סירבה אחרי לחץ' : 'סירב אחרי לחץ') : o === 'no' ? (c?.fem ? 'סירבה בצדק, ונפרדתם יפה' : 'סירב בצדק, ונפרדתם יפה') : OUTCOME[o]?.label);

export function Avatar({ client, size = 44 }) {
  const tint = client.tint || '#e9effb';
  return html`<span class="grid shrink-0 place-items-center rounded-full font-display font-black text-brand-600 ring-2 ring-white" style=${{ width: size, height: size, background: tint, fontSize: size * 0.42, boxShadow: '0 0 0 2px #8fb3ef' }}>${client.first[0]}</span>`;
}

// ---------- opening (first entry only) ----------
export function Opening() {
  return html`<div class="mx-auto grid max-w-[1120px] items-center gap-8 px-4 py-6 md:grid-cols-[1.1fr_0.9fr] md:gap-12 md:px-8 md:py-8">
    <div>
      <${StepHeading} n="12" eyebrow="שלב 12 · מגדילים מכירות" title=${['מתאמנים על השיחה, לפני ', 'הלקוח הבא', '']} />
      <p class="mb-6 max-w-[50ch] text-[18px] text-ink">לקוחות שנבנים מתיק הלקוח, מהסל ומההצעה שלך, וכשנגמרים מוסיפים עוד. ${g('מנהל', 'מנהלת')} מולם שיחת מכירה מלאה, ובסוף ${g('מקבל', 'מקבלת')} משוב מדויק: מה עבד, התיקון האחד, וניסוח שאפשר להגיד כבר בשיחה הבאה.</p>
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
// One thing to do: pick a client. The recommended one is marked. "לקוח חדש" adds one more
// client from the client file, so the practice does not run out after three calls. Each card
// shows the levels already practised with that client, to invite a harder round.
// The tools sit quietly at the bottom.
export function Room({ state, onPick, onAdd, onBuild, onMore, onResume, onTool, onContext, onSheet }) {
  const [building, setBuilding] = useState(false);
  const [describe, setDescribe] = useState(false);
  const [buildingReal, setBuildingReal] = useState(null);
  const [filter, setFilter] = useState('all');
  const added = state.added || [];
  const shown = CLIENTS.filter((c) => (!c.pool && !c.real) || added.includes(c.id));
  const left = POOL_CLIENTS.filter((c) => !added.includes(c.id));
  const done = state.calls.filter((c) => c.feedback);
  const lastOf = (id) => [...done].reverse().find((c) => c.clientId === id);
  const levelsOf = (id) => new Set(done.filter((c) => c.clientId === id).map((c) => c.level));
  const lastFix = [...done].reverse().find((c) => c.feedback?.fix);
  const next = shown.find((c) => !lastOf(c.id))?.id;
  const fresh = added[added.length - 1];
  const forms = FORMS.filter((f) => shown.some((c) => c.form === f.id));
  const list = filter === 'all' ? shown : shown.filter((c) => c.form === filter);
  const avg = done.length ? done.reduce((s, c) => s + c.feedback.avg, 0) / done.length : null;
  const add = () => {
    if (building) return;
    if (!left.length) return onMore();
    setBuilding(true);
    setFilter('all');
    setTimeout(() => {
      onAdd(left[0].id);
      setBuilding(false);
    }, 1100);
  };
  // A real client: build it (the model, or the description alone), then show it.
  const submitReal = async (d) => {
    setDescribe(false);
    setFilter('all');
    setBuildingReal(d.first.trim());
    const t0 = Date.now();
    const c = await onBuild(d);
    setTimeout(() => {
      onAdd(c.id, c);
      setBuildingReal(null);
    }, Math.max(0, 1100 - (Date.now() - t0)));
  };
  const stat = (n, label) => html`<span class="flex flex-col items-center px-3 first:ps-0 last:pe-0"><b class="font-display text-[22px] leading-none text-ink">${n}</b><small class="mt-1 text-[12px] font-bold text-muted">${label}</small></span>`;

  return html`<div class="mx-auto max-w-[1060px] px-4 py-6 md:px-8 md:py-8">
    <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <h1 class="fb-h1 mb-1 text-[28px] md:text-[34px]">עם מי <span class="fb-marker">מתאמנים</span> היום?</h1>
        <p class="max-w-[52ch] text-[17px] text-muted">כל לקוח מגיע עם דאגה אחרת, ומסתיר משהו שנפתח רק לשאלה טובה.</p>
      </div>
      ${done.length > 0 && html`<div class="flex divide-x divide-x-reverse divide-line rounded-2xl bg-white px-4 py-2.5 ring-1 ring-line">
        ${stat(done.length, done.length === 1 ? 'שיחה' : 'שיחות')}${stat(avg.toFixed(1), 'ממוצע')}${stat(shown.length, 'לקוחות בחדר')}
      </div>`}
    </div>

    ${lastFix && html`<button type="button" class="rise mb-5 flex w-full max-w-[640px] items-center gap-3 rounded-2xl border-[1.5px] border-brand-300 bg-brand-50 p-3 text-start hover:border-brand-600 cursor-pointer" onClick=${() => onResume(lastFix)}>
      <${SharkAvatar} size=${36} />
      <span class="min-w-0 flex-1"><small class="block text-[13px] font-bold text-brand-600">להמשיך מהפעם הקודמת</small><b class="block text-[16px]">${lastFix.feedback.fix.title.split(':')[0]}</b></span>
      <${Icon} name="arrow-left" size=${18} class="text-brand-600" />
    </button>`}

    ${shown.length > 3 && html`<div class="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="סינון לפי דאגה">
      <span class="me-1 text-[14px] font-bold text-muted">לפי דאגה:</span>
      ${[{ id: 'all', label: 'הכל' }, ...forms].map((f) => {
        const on = filter === f.id;
        const n = f.id === 'all' ? shown.length : shown.filter((c) => c.form === f.id).length;
        return html`<button key=${f.id} type="button" aria-pressed=${on} onClick=${() => setFilter(f.id)} class=${cx('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold transition cursor-pointer', on ? 'bg-brand-600 text-white' : 'bg-white text-ink ring-1 ring-line hover:ring-brand-300')}>${f.icon && html`<${Icon} name=${f.icon} size=${14} />`}${f.label}<span class=${cx('text-[12px]', on ? 'text-white/80' : 'text-faint')}>${n}</span></button>`;
      })}
    </div>`}

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      ${list.map((c) => {
        const last = lastOf(c.id);
        const form = formOf(c.form);
        const lv = levelsOf(c.id);
        const rec = c.id === next && !lastFix;
        const isNew = c.id === fresh && !last;
        return html`<button key=${c.id} type="button" class=${cx('fb-panel group relative flex flex-col !p-0 text-start transition hover:-translate-y-0.5 hover:border-brand-600 cursor-pointer', rec && '!border-brand-600 ring-4 ring-brand-100', isNew && 'rise')} onClick=${() => onPick(c.id)}>
          ${(rec || isNew || c.real) && html`<span class=${cx('absolute -top-3 end-4 rounded-full px-3 py-0.5 text-[12px] font-bold text-white', c.real ? 'bg-[#a8701a]' : rec ? 'bg-brand-600' : 'bg-money')}>${c.real ? (c.fem ? 'הלקוחה שלך' : 'הלקוח שלך') : rec ? 'מומלץ להתחיל' : 'חדש בחדר'}</span>`}
          <span class="flex items-center gap-3 p-4 pb-3">
            <${Avatar} client=${c} size=${52} />
            <span class="min-w-0"><b class="block font-display text-[19px] leading-tight">${c.name}</b><small class="block text-[14px] text-muted">${c.who}</small></span>
          </span>
          <span class="block px-4">
            <span class="block rounded-2xl rounded-ss-sm bg-canvas px-3 py-2 text-[15px] text-ink">"${c.said}"</span>
            <small class="mt-2 flex items-start gap-1.5 text-[13px] text-muted"><${Icon} name="corner-down-left" size=${13} class="mt-0.5 shrink-0" />${c.from}</small>
          </span>
          ${last && html`<small class="mx-4 mt-3 flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-[13px] font-semibold text-brand-600"><${Icon} name=${OUTCOME[last.outcome]?.icon || 'message-circle'} size=${13} />בפעם האחרונה: ${outcomeLabel(last.outcome, c)} · ${last.feedback.avg.toFixed(1)}</small>`}
          <span class="mt-auto block pt-3"><span class="flex items-center gap-2 border-t border-line px-4 py-3">
            <span class="inline-flex min-w-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[13px] font-bold text-brand-600"><${Icon} name=${form.icon} size=${13} /><span class="truncate">${c.tag}</span></span>
            <span class="ms-auto flex shrink-0 items-center gap-1" title=${`רמות שתרגלת עם ${c.first}`} aria-label=${`רמות שתרגלת: ${[...lv].sort().join(', ') || 'עוד לא'}`}>${LEVELS.map((l) => html`<span key=${l.id} class=${cx('h-2 w-2 rounded-full', lv.has(l.id) ? 'bg-brand-600' : 'bg-line')}></span>`)}</span>
            <span class="inline-flex shrink-0 items-center gap-1 text-[14px] font-bold text-brand-600">${last ? 'עוד שיחה' : 'לשיחה'}<${Icon} name="arrow-left" size=${16} class="transition group-hover:-translate-x-0.5" /></span>
          </span></span>
        </button>`;
      })}
      ${filter === 'all' && html`<button type="button" onClick=${add} aria-busy=${building} class="group flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-brand-300 bg-white/50 p-5 text-center transition hover:border-brand-600 hover:bg-brand-50 cursor-pointer">
        ${building
          ? html`<span class="grid h-12 w-12 place-items-center rounded-full bg-brand-50"><span class="fb-spin" style=${{ width: 20, height: 20, borderColor: '#2f5fc4', borderTopColor: 'transparent' }}></span></span><b class="font-display text-[18px]">בונה לקוח חדש...</b><small class="max-w-[30ch] text-[14px] text-muted">מתיק הלקוח, מהסל ומההצעה שלך. עסק אחר, דאגה אחרת.</small>`
          : html`<span class="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white transition group-hover:scale-105"><${Icon} name="user-plus" size=${22} /></span><b class="font-display text-[19px]">לקוח חדש</b><small class="max-w-[30ch] text-[14px] text-muted">עוד לקוח מאותו קהל, עם דאגה שעוד לא פגשת. אפשר להוסיף כמה שרוצים.</small>`}
      </button>`}
      ${filter === 'all' && html`<button type="button" onClick=${() => !buildingReal && setDescribe(true)} aria-busy=${!!buildingReal} class="group flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-[#e6cd8e] bg-[#fdf8ea] p-5 text-center transition hover:border-[#a8701a] cursor-pointer">
        ${buildingReal
          ? html`<span class="grid h-12 w-12 place-items-center rounded-full bg-[#f7ebc8]"><span class="fb-spin" style=${{ width: 20, height: 20, borderColor: '#a8701a', borderTopColor: 'transparent' }}></span></span><b class="font-display text-[18px]">בונה את ${buildingReal}...</b><small class="max-w-[30ch] text-[14px] text-muted">מהתיאור שלך, ומה שחסר מתיק הלקוח.</small>`
          : html`<span class="grid h-12 w-12 place-items-center rounded-full bg-[#a8701a] text-white transition group-hover:scale-105"><${Icon} name="notebook-pen" size=${21} /></span><b class="font-display text-[19px]">לקוח אמיתי שלך</b><small class="max-w-[32ch] text-[14px] text-muted">יש שיחה אמיתית בקרוב? ${g('תאר', 'תארי')} את הלקוח, ו${g('תתאמן', 'תתאמני')} עליו לפני.</small>`}
      </button>`}
    </div>

    ${describe && html`<${RealClientSheet} onClose=${() => setDescribe(false)} onSubmit=${submitReal} />`}
    <h2 class="mb-3 mt-10 text-[15px] font-bold text-muted">עוד בחדר</h2>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      ${[
        ['zap', 'סבב התנגדויות מהיר', 'משפט, תשובה ותיקון. חמש דקות', () => onTool('drill')],
        ['file-search', 'ניתוח שיחה שהייתה', 'מדביקים תמלול, מקבלים מפה', () => onTool('analysis')],
        ['file-text', 'דף התשובות', `${state.sheet.length} התנגדויות, במילים שלך`, onSheet],
        ['folder-open', 'מה הלקוחות יודעים', 'ההקשר שממנו הם נבנים', onContext],
      ].map(([icon, label, sub, fn]) => html`<button key=${label} type="button" class="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 text-start transition hover:border-brand-300 cursor-pointer" onClick=${fn}><span class="fb-chip-ic h-10 w-10 shrink-0"><${Icon} name=${icon} size=${18} /></span><span class="min-w-0"><b class="block text-[15px]">${label}</b><small class="block text-[13px] text-muted">${sub}</small></span></button>`)}
    </div>
  </div>`;
}

// "לקוח אמיתי שלך": the user describes a client before a real call, in the client's words.
export function RealClientSheet({ onClose, onSubmit }) {
  const [d, setD] = useState({ first: '', fem: false, who: '', from: '', said: '', form: '', worry: '', tries: '', known: '' });
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const he = (m, f) => (d.fem ? f : m);
  const ok = d.first.trim() && d.who.trim() && d.said.trim() && d.form;
  const ta = 'w-full resize-none rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-[16px] text-ink outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100';
  const form = d.form && formOf(d.form);
  const his = he('שלו', 'שלה');
  return html`<${Sheet}
    title=${`${g('תאר', 'תארי')} לקוח אמיתי`}
    wide
    onClose=${onClose}
    footer=${html`<small class="flex items-center gap-1.5 text-[13px] text-muted"><${Icon} name="lock" size=${13} />נשמר רק אצלך, ומשמש רק לתרגול</small><${Button} disabled=${!ok} onClick=${() => ok && onSubmit(d)}>לבנות את הלקוח<//>`}
  >
    <p class="mb-4 text-[15px] text-muted">יש שיחה אמיתית בקרוב? מה ${g('שתכתוב', 'שתכתבי')} נכנס כמו שהוא, ומה שחסר משלימים מתיק הלקוח ומסמנים כהשערה. ככל ${g('שתכתוב', 'שתכתבי')} יותר במילים ${his}, השיחה קרובה יותר לאמיתית.</p>
    <div class="grid gap-x-3 sm:grid-cols-[1fr_auto]">
      <${Field} label="שם"><input class=${inputCls} value=${d.first} onInput=${set('first')} placeholder="למשל: שירן" /><//>
      <div class="mb-4"><span class="mb-1 block text-[14px] font-bold text-ink">לשון</span><${Chips} small options=${[{ id: 'm', label: 'הוא' }, { id: 'f', label: 'היא' }]} value=${d.fem ? 'f' : 'm'} onChange=${(v) => setD({ ...d, fem: v === 'f' })} /></div>
    </div>
    <${Field} label=${he('מי הוא', 'מי היא')} hint="עיסוק, וכמה גדול העסק"><input class=${inputCls} value=${d.who} onInput=${set('who')} placeholder=${he('מתקין פרגולות, 2 עובדים', 'בעלת סטודיו לפילאטיס, 2 מדריכות')} /><//>
    <${Field} label=${he('מה הוא כתב או אמר לך', 'מה היא כתבה או אמרה לך')} hint=${`כמו שזה הגיע, במילים ${his}`}><textarea rows="2" class=${ta} value=${d.said} onInput=${set('said')} placeholder="ראיתי את הפוסט שלך. כמה זה עולה?"></textarea><//>
    <div class="mb-4">
      <span class="mb-1 block text-[14px] font-bold text-ink">${he('מה הכי מדאיג אותו', 'מה הכי מדאיג אותה')}</span>
      <${Chips} small options=${FORMS.map((f) => ({ id: f.id, label: f.label }))} value=${d.form} onChange=${(v) => setD({ ...d, form: v })} />
      <input class=${cx(inputCls, 'mt-2')} value=${d.worry} onInput=${set('worry')} placeholder=${form ? `במילים ${his}, למשל: "${form.sounds}"` : `במילים ${his} (לא חובה)`} />
    </div>
    <${Field} label=${he('מאיפה הגיע', 'מאיפה הגיעה')} hint="לא חובה"><input class=${inputCls} value=${d.from} onInput=${set('from')} placeholder=${he('השאיר פרטים אחרי הרצאה', 'השאירה פרטים אחרי הרצאה')} /><//>
    <${Field} label=${he('מה הוא כבר ניסה', 'מה היא כבר ניסתה')} hint=${`לא חובה. במילים ${his}`}><input class=${inputCls} value=${d.tries} onInput=${set('tries')} placeholder='"ניסיתי פרסום בפייסבוק, לא הביא כלום"' /><//>
    <${Field} label="עוד משהו שחשוב לדעת" hint="לא חובה. תקציב, מי עוד מחליט, אופי" class="!mb-0"><textarea rows="2" class=${ta} value=${d.known} onInput=${set('known')} placeholder=${he('ענייני, ממהר, יש לו שותף', 'עניינית, ממהרת, יש לה שותף')}></textarea><//>
  <//>`;
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
export function Brief({ client, level, setLevel, onPrep }) {
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
      ${client.real && html`<p class="mt-2 flex items-start gap-1.5 border-t border-line pt-2 text-[14px] text-muted"><${Icon} name="notebook-pen" size=${14} class="mt-0.5 shrink-0" />נבנה מהתיאור שלך. מה שלא כתבת הושלם כהשערה, ומסומן במשוב.</p>
      <button type="button" onClick=${onPrep} class="mt-2 inline-flex items-center gap-1.5 text-[14px] font-bold text-[#8a5a12] underline underline-offset-2 cursor-pointer"><${Icon} name="clipboard-list" size=${15} />כרטיס הכנה לשיחה האמיתית</button>`}
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
