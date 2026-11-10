// The two tools in the room: a quick objection round (prompt mode ב, section 6) and the
// analysis of a call that happened (mode ג, section 7).
import { html, useState, Icon, cx } from './lib.js';
import { Button, Note } from './components.js';
import { Tag } from './ui.js';
import { DRILL, FORMS, STAGES, GROUPS, SAMPLE_TRANSCRIPT, SAMPLE_ANALYSIS, g } from './data.js';
import { drillFeedback, analyzeText } from './coach.js';
import { formOf } from './step.js';

// ---------- quick objection round ----------
export function Drill({ sheet, onFinish }) {
  const [extra, setExtra] = useState('');
  const [items, setItems] = useState(DRILL);
  const [i, setI] = useState(0);
  const [text, setText] = useState('');
  const [res, setRes] = useState([]);
  const item = items[i];
  const cur = res[i];
  const addReal = () => {
    if (!extra.trim()) return;
    setItems([...items.slice(0, i + 1), { id: `real${Date.now()}`, form: 'avoid', ctx: 'התנגדות ששמעת באמת.', line: extra.trim(), sheet: 's7', real: true }, ...items.slice(i + 1)]);
    setExtra('');
  };
  const send = () => {
    if (!text.trim()) return;
    const row = sheet.find((r) => r.id === item.sheet);
    const next = [...res];
    next[i] = { answer: text, ...drillFeedback(item, text, row) };
    setRes(next);
    setText('');
  };
  if (i >= items.length) {
    const byForm = FORMS.map((f) => {
      const rs = items.map((it, k) => (it.form === f.id ? res[k] : null)).filter(Boolean);
      return { f, n: rs.length, good: rs.filter((r) => r.good).length };
    }).filter((x) => x.n);
    const strong = byForm.reduce((a, b) => (b.good / b.n > a.good / a.n ? b : a), byForm[0]);
    const weak = byForm.reduce((a, b) => (b.good / b.n < a.good / a.n ? b : a), byForm[0]);
    return html`<div class="mx-auto max-w-[760px] px-4 py-6 md:px-8">
      <p class="fb-eyebrow mb-1">סבב התנגדויות · סיכום</p>
      <h1 class="fb-h1 mb-4 text-[26px] md:text-[32px]">${items.length} התנגדויות, ${res.filter((r) => r.good).length} <span class="fb-marker">תשובות חזקות</span></h1>
      <div class="grid gap-3 sm:grid-cols-2">
        <section class="fb-panel !p-4"><p class="text-[14px] font-bold text-muted">איפה ${g('אתה חזק', 'את חזקה')}</p><p class="font-display text-[22px] font-bold">${strong.f.label}</p><p class="text-[14px] text-muted">"${strong.f.sounds}"</p></section>
        <section class="fb-panel !p-4"><p class="text-[14px] font-bold text-muted">איפה ${g('אתה נופל', 'את נופלת')} שוב ושוב</p><p class="font-display text-[22px] font-bold">${weak.f.label}</p><p class="text-[14px] text-muted">"${weak.f.sounds}"</p></section>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <${Button} variant="mini" onClick=${() => (setI(0), setRes([]), setItems(DRILL.filter((d) => d.form === weak.f.id).concat(DRILL.filter((d) => d.form !== weak.f.id)).slice(0, 5)))}><${Icon} name="repeat" size=${15} />עוד סבב, מתחיל ב${weak.f.label}<//>
        <${Button} variant="text" onClick=${onFinish}>חזרה לחדר<//>
      </div>
    </div>`;
  }
  const form = formOf(item.form);
  return html`<div class="mx-auto grid max-w-[1080px] gap-5 px-4 py-5 md:grid-cols-[1fr_0.9fr] md:px-8 md:py-6">
    <div>
      <p class="fb-eyebrow mb-1">סבב התנגדויות מהיר · ${i + 1} מתוך ${items.length}</p>
      <div class="mb-3 flex gap-1">${items.map((it, k) => html`<span key=${it.id} class=${cx('h-1.5 flex-1 rounded-full', k < i || (k === i && cur) ? (res[k]?.good ? 'bg-brand-600' : 'bg-warn') : k === i ? 'bg-brand-300' : 'bg-line')}></span>`)}</div>
      <p class="mb-2 text-[15px] text-muted">${item.ctx}</p>
      <div class="mb-3 flex items-start gap-2">
        <${Tag} tone="blue"><${Icon} name=${form.icon} size=${13} />${form.label}<//>${item.real && html`<${Tag}>ששמעת באמת<//>`}
      </div>
      <p class="paper mb-3 rounded-2xl rounded-es-sm px-4 py-3 font-display text-[20px] font-bold leading-snug">"${item.line}"</p>
      ${!cur
        ? html`<textarea rows="3" value=${text} onInput=${(e) => setText(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), e.stopPropagation(), send())} placeholder=${`מה ${g('אתה עונה', 'את עונה')}?`} class="w-full resize-none rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-[16px] outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"></textarea>
            <div class="mt-2"><${Button} variant="mini" onClick=${send}><${Icon} name="send" size=${15} />לשלוח תשובה<//></div>`
        : html`<p class="rounded-2xl rounded-ee-sm bg-brand-600 px-4 py-2.5 text-[15px] text-white">${cur.answer}</p>`}
      <div class="mt-5 border-t border-line pt-3">
        <p class="mb-1 text-[14px] font-bold">שמעת התנגדות אמיתית מליד? להוסיף לסבב</p>
        <div class="flex gap-2"><input value=${extra} onInput=${(e) => setExtra(e.target.value)} placeholder="למשל: אני כבר עובד עם מישהו" class="h-11 min-w-0 flex-1 rounded-xl border-[1.5px] border-line bg-white px-3 text-[16px] outline-none focus:border-brand-600" /><${Button} variant="mini" onClick=${addReal}>הוספה<//></div>
      </div>
    </div>
    <div>
      ${cur &&
      html`<${Note} tone="white" tilt=${-0.6} class="rise !p-4">
        <span class="fb-note-kicker">משוב בשלוש שורות</span>
        <p class="mb-2 text-[15px]"><b>מה עבד:</b> ${cur.worked}</p>
        <p class="mb-2 text-[15px]"><b>מה לתקן:</b> ${cur.fix}</p>
        <p class="text-[15px]"><b>תשובה לדוגמה:</b></p>
        <p class="mt-1 rounded-lg bg-brand-50 px-3 py-2 text-[15px] font-semibold">${cur.sample}</p>
        <div class="mt-3"><${Button} variant="mini" onClick=${() => setI(i + 1)}>${i === items.length - 1 ? 'לסיכום' : 'להתנגדות הבאה'}<${Icon} name="arrow-left" size=${15} /><//></div>
      <//>`}
      ${!cur && html`<p class="text-[15px] text-muted">קצר ועניני. המטרה כאן היא כמות חזרות, לא עומק.</p>`}
    </div>
  </div>`;
}

// ---------- analysis of a real call ----------
const MAP_TONE = { done: ['נעשה', 'blue'], partial: ['חלקי', 'muted'], missing: ['חסר', 'muted'], early: ['מוקדם מדי', 'fix'] };

export function Analysis({ notify }) {
  const [text, setText] = useState('');
  const [res, setRes] = useState(null);
  const run = () => {
    if (!text.trim()) return;
    const sample = text.trim() === SAMPLE_TRANSCRIPT.trim();
    setRes(sample ? { ...SAMPLE_ANALYSIS, sample: true } : { ...analyzeText(text), sample: false });
  };
  if (!res)
    return html`<div class="mx-auto max-w-[860px] px-4 py-5 md:px-8 md:py-6">
      <p class="fb-eyebrow mb-1">ניתוח שיחה שהייתה</p>
      <h1 class="fb-h1 mb-2 text-[26px] md:text-[32px]">איפה השיחה <span class="fb-marker">נסגרה, או נפלה</span></h1>
      <p class="mb-3 max-w-[60ch] text-[16px]">מדביקים תמלול או סיכום של שיחת מכירה. ממפים אותה לשלבים, מוצאים את רגע המפתח, ועוקבים אחרי כל התנגדות לאחור.</p>
      <textarea rows="9" value=${text} onInput=${(e) => setText(e.target.value)} placeholder=${`${g('אני', 'אני')}: היי...\nהלקוח: ...`} class="thin-scroll w-full resize-none rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"></textarea>
      <div class="mt-2 flex flex-wrap items-center gap-2">
        <${Button} variant="mini" onClick=${run}><${Icon} name="file-search" size=${15} />לנתח<//>
        <button type="button" class="rounded-xl border-[1.5px] border-dashed border-brand-300 px-3 py-1.5 text-[13px] font-bold text-brand-600 hover:bg-brand-50 cursor-pointer" onClick=${() => setText(SAMPLE_TRANSCRIPT)}>במוק-אפ: להדביק שיחה לדוגמה</button>
        <span class="ms-auto flex items-center gap-1 text-[13px] text-muted"><${Icon} name="shield" size=${14} />פרטים אישיים משמשים רק לניתוח. נשמר רק המשוב.</span>
      </div>
    </div>`;
  return html`<div class="mx-auto max-w-[1120px] px-4 py-5 md:px-8 md:py-6">
    <p class="fb-eyebrow mb-1">ניתוח שיחה שהייתה</p>
    <p class="mb-4 max-w-[80ch] text-[17px] font-semibold">${res.line || 'מיפוי לפי השלבים. במערכת המודל כותב כאן את כל המשוב לפי המבנה הקבוע.'}</p>
    <div class="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
      <div class="flex flex-col gap-3">
        ${res.key && html`<${Note} tone="white" tilt=${-0.5} class="!p-4"><span class="fb-note-kicker">רגע המפתח</span><p class="mb-1 rounded-lg bg-canvas px-3 py-2 text-[15px]">"${res.key.quote}"</p><p class="text-[15px]">${res.key.why}</p><//>`}
        ${res.trace &&
        html`<section class="fb-panel !p-4"><h2 class="fb-h3 mb-2">כל התנגדות, לאחור</h2>
          ${res.trace.map((t) => html`<div key=${t.objection} class="border-b border-line py-2 last:border-0"><p class="text-[15px]"><b>"${t.objection}"</b></p><p class="text-[14px] text-muted">היה אפשר להוציא אותה ב${t.where}, עם השאלה:</p><p class="text-[15px] font-semibold text-brand-600">${t.ask}</p></div>`)}
        </section>`}
        ${res.fix && html`<section class="fb-panel !p-4"><p class="text-[14px] font-bold text-muted">התיקון האחד: ${res.fix.title}</p><p class="mt-1 rounded-lg bg-brand-50 px-3 py-2 text-[15px] font-semibold">${res.fix.alt}</p></section>`}
        ${res.flags.length > 0 && html`<${Note} tone="error" tilt=${0} class="!p-3"><span class="fb-note-kicker">דגלים אדומים</span>${res.flags.map((f) => html`<p key=${f} class="text-[15px]">${f}</p>`)}<//>`}
      </div>
      <section class="fb-panel !p-4">
        <h2 class="fb-h3 mb-2">מפת השיחה</h2>
        ${GROUPS.map((gr, i) => html`<div key=${gr} class="mb-1.5"><p class="text-[13px] font-bold text-muted">${gr}</p>${STAGES.filter((s) => s.group === i).map((s) => {
          const [label, tone] = MAP_TONE[res.map[s.n]] || MAP_TONE.missing;
          return html`<p key=${s.n} class="flex items-center justify-between py-0.5 text-[14px]"><span>${s.n}. ${s.name}</span><${Tag} tone=${tone}>${label}<//></p>`;
        })}</div>`)}
        <p class="mt-2 border-t border-line pt-2 text-[14px]">יחס הדיבור: הלקוח ${res.ratio}%. ${res.ratio >= 60 ? 'טוב.' : 'דיברת יותר מהלקוח.'}</p>
      </section>
    </div>
    <div class="mt-3 flex gap-2"><${Button} variant="text" onClick=${() => (setRes(null), setText(''))}>לנתח שיחה אחרת<//><${Button} variant="text" onClick=${() => notify('ההתנגדויות מהשיחה נוספו לדף התשובות', 'file-plus')}>להוסיף את ההתנגדויות לדף התשובות<//></div>
  </div>`;
}
