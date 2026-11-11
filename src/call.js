// The practice call (prompt mode א), the feedback after it (section 8), and the
// single-stage practice that the feedback's "next exercise" opens (mode ד).
import { html, useState, useEffect, useRef, Icon, cx } from './lib.js';
import { Button, Note, SharkAvatar } from './components.js';
import { Sheet, Tag } from './ui.js';
import { CLIENTS, GROUPS, STAGES, LEVELS, EXPLAIN, STAGE_DRILL, fixDim, g } from './data.js';
import { talkRatio, stageFeedback } from './coach.js';
import { Avatar, OUTCOME, outcomeLabel } from './step.js';

// Stage directions in brackets are shown quietly, as in a transcript.
function Said({ text }) {
  const parts = text.split(/(\([^)]*\))/g).filter(Boolean);
  return html`${parts.map((p, i) => (p.startsWith('(') ? html`<i key=${i} class="text-[13px] text-muted">${p}</i>` : html`<span key=${i}>${p}</span>`))}`;
}

function Bubble({ m, client }) {
  if (m.who === 'hint')
    return html`<div class="rise mx-auto my-1 flex max-w-[460px] items-start gap-2 rounded-2xl border border-dashed border-brand-300 bg-brand-50 px-3 py-2 text-[14px]">
      <${SharkAvatar} size=${28} mood="thinking" /><span><b class="text-brand-600">רמז מהכריש · מחוץ לשיחה</b><br />${m.text}</span>
    </div>`;
  if (m.who === 'note')
    return html`<p class="rise mx-auto my-1 flex items-center gap-1.5 rounded-xl bg-warn-50 px-3 py-1.5 text-[13px] font-bold text-warn"><${Icon} name="triangle-alert" size=${14} />${m.text}</p>`;
  if (m.who === 'end')
    return html`<div class="rise mx-auto my-2 rounded-full bg-ink px-4 py-1.5 text-[13px] font-bold text-white">${m.text}</div>`;
  const me = m.who === 'me';
  return html`<div class=${cx('rise flex items-end gap-2', me ? 'flex-row-reverse' : '')}>
    ${!me && html`<${Avatar} client=${client} size=${30} />`}
    <p class=${cx('max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed shadow-sm', me ? 'rounded-ee-sm bg-brand-600 text-white' : 'rounded-es-sm border border-line bg-white text-ink')}><${Said} text=${m.text} /></p>
  </div>`;
}

// What to aim for in each part of the call: one line, so the user always knows what's next.
const NEXT = (c) => [
  'פותחים באדם, ואומרים מה יקרה בשיחה ושבסוף מחליטים.',
  `שאלה אחת בכל פעם: למה עכשיו, מה כבר ${c.fem ? 'ניסתה' : 'ניסה'}, מה ישתנה, ומה הפתרון חייב לכלול. ${c.first} ${c.fem ? 'מדברת' : 'מדבר'}, ${g('אתה מקשיב', 'את מקשיבה')}.`,
  `מסכמים במילים של ${c.first} עד "נכון", שואלים על כסף, זמן ומי מחליט, ואז ${g('אומר', 'אומרת')} בקול: זה מתאים ${c.fem ? 'לה' : 'לו'}?`,
  'מבקשים רשות, ומציגים קצר רק את מה שמתאים. כל משפט מחובר למה שנאמר.',
  'אומרים את המחיר ושותקים. התנגדות? קודם שואלים מה מדאיג.',
  'יש התאמה? מועד ביומן. אין? כיוון או הפניה, ופרידה יפה.',
];
const groupNow = (reached) => {
  const max = reached.length ? Math.max(...reached) : -1;
  const gr = max >= 0 ? STAGES.find((s) => s.n === max).group : 0;
  const full = STAGES.filter((s) => s.group === gr).every((s) => reached.includes(s.n));
  return full ? Math.min(gr + 1, GROUPS.length - 1) : gr;
};

// The six parts of the call as one slim bar.
export function Strip({ reached }) {
  const now = groupNow(reached);
  return html`<ol class="grid grid-cols-6 gap-1" aria-label="שלבי השיחה">
    ${GROUPS.map((gr, i) => {
      const state = i < now ? 'done' : i === now ? 'now' : 'todo';
      return html`<li key=${gr} class="min-w-0" aria-current=${state === 'now' ? 'step' : null}>
        <span class=${cx('block h-1.5 rounded-full transition-colors', state === 'done' ? 'bg-brand-600' : state === 'now' ? 'bg-brand-300' : 'bg-line')}></span>
        <span class=${cx('mt-1 hidden truncate text-[12px] sm:block', state === 'now' ? 'font-bold text-brand-600' : state === 'done' ? 'text-ink' : 'text-faint')}>${gr}</span>
      </li>`;
    })}
  </ol>`;
}

function Ratio({ msgs, client }) {
  const r = talkRatio(msgs);
  if (msgs.filter((m) => m.who === 'me').length < 2) return null;
  const ok = r >= 60;
  return html`<span class=${cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold', ok ? 'bg-brand-50 text-brand-600' : 'bg-warn-50 text-warn')} title="הלקוח צריך לדבר לפחות פי שניים ממך"><${Icon} name="mic" size=${12} />${client.first} ${r}%</span>`;
}

// ---------- the call ----------
export function Call({ call, busy, onSend, onHint, onSample }) {
  const client = CLIENTS.find((c) => c.id === call.clientId);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const scroll = useRef();
  const input = useRef();
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [call.msgs.length, typing]);
  useEffect(() => input.current?.focus(), []);
  const send = () => {
    const t = text.trim();
    if (!t || typing || call.outcome) return;
    setText('');
    setTyping(true);
    onSend(t, () => setTyping(false));
  };
  const level = LEVELS.find((l) => l.id === call.level);
  const now = groupNow(call.reached);
  return html`<div class="mx-auto flex h-full max-w-[860px] flex-col px-3 py-3 md:px-6 md:py-4">
    <section class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-line bg-surface">
      <div class="border-b border-line px-4 pb-3 pt-3">
        <div class="mb-3 flex items-center gap-2.5">
          <${Avatar} client=${client} size=${36} />
          <span class="min-w-0"><b class="block text-[16px] leading-tight">${client.name}</b><small class="text-[12px] text-muted">רמה ${level.label}</small></span>
          <span class="ms-auto"><${Ratio} msgs=${call.msgs} client=${client} /></span>
        </div>
        <${Strip} reached=${call.reached} />
        ${!call.outcome && html`<p key=${now} class="rise mt-2.5 flex items-start gap-1.5 text-[14px]"><${Icon} name="compass" size=${15} class="mt-0.5 shrink-0 text-brand-600" /><span><b>עכשיו:</b> ${NEXT(client)[now]}</span></p>`}
      </div>
      <div ref=${scroll} class="thin-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3 md:p-4">
        ${!call.msgs.length &&
        html`<div class="m-auto flex max-w-[380px] flex-col items-center text-center">
          <${Avatar} client=${client} size=${56} />
          <p class="mb-1 mt-3 font-display text-[19px] font-bold">${client.first} ${client.fem ? 'מחכה' : 'מחכה'} בזום</p>
          <p class="mb-4 text-[15px] text-muted">${g('אתה פותח', 'את פותחת')}. לשאלה שטחית, תשובה שטחית.</p>
          ${client.id === 'ronit' && html`<button type="button" class="rounded-xl border-[1.5px] border-dashed border-brand-300 px-3 py-1.5 text-[13px] font-bold text-brand-600 hover:bg-brand-50 cursor-pointer" onClick=${onSample}>במוק-אפ: להריץ שיחה לדוגמה</button>`}
        </div>`}
        ${call.msgs.map((m, i) => html`<${Bubble} key=${i} m=${m} client=${client} />`)}
        ${typing && html`<div class="flex items-end gap-2"><${Avatar} client=${client} size=${30} /><span class="rounded-2xl rounded-es-sm border border-line bg-white px-3 py-2.5"><span class="inline-flex gap-1"><span class="pulse-dot h-1.5 w-1.5 rounded-full bg-muted"></span><span class="pulse-dot h-1.5 w-1.5 rounded-full bg-muted" style="animation-delay:.2s"></span><span class="pulse-dot h-1.5 w-1.5 rounded-full bg-muted" style="animation-delay:.4s"></span></span></span></div>`}
      </div>
      <div class="flex items-end gap-2 border-t border-line p-2.5">
        <button type="button" class="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border-[1.5px] border-brand-300 bg-white px-3 text-[14px] font-bold text-brand-600 hover:bg-brand-50 disabled:opacity-40 cursor-pointer" disabled=${!!call.outcome || typing || !!busy} onClick=${onHint} title="הכריש יוצא מהשיחה לשורה: כיוון, בלי תשובה"><${Icon} name="lightbulb" size=${16} />${busy === 'hint' ? 'חושב...' : 'רמז'}</button>
        <textarea
          ref=${input}
          rows="1"
          value=${text}
          disabled=${!!call.outcome}
          onInput=${(e) => {
            setText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown=${(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              send();
            }
          }}
          placeholder=${call.outcome ? 'השיחה הסתיימה' : `מה ${g('אתה אומר', 'את אומרת')} ל${client.first}?`}
          class="thin-scroll min-h-11 flex-1 resize-none rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-[16px] outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
        ></textarea>
        <button type="button" aria-label="שליחה" class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white disabled:opacity-40 cursor-pointer" disabled=${!text.trim() || typing || !!call.outcome} onClick=${send}><${Icon} name="send" size=${18} /></button>
      </div>
    </section>
  </div>`;
}

// ---------- the feedback ----------
const MAP_LABEL = { done: ['נעשה', 'blue'], partial: ['חלקי', 'muted'], missing: ['חסר', 'muted'], early: ['מוקדם מדי', 'fix'] };

function Dots5({ n }) {
  if (n == null) return html`<span class="text-[13px] text-faint">לא הגיע</span>`;
  return html`<span class="inline-flex gap-1" aria-label=${`${n} מתוך 5`}>${[1, 2, 3, 4, 5].map((i) => html`<span key=${i} class=${cx('h-3 w-3 rounded-full', i <= n ? (n <= 2 ? 'bg-warn' : 'bg-brand-600') : 'bg-canvas ring-1 ring-line')}></span>`)}</span>`;
}

export function Feedback({ call, onPractice, notify }) {
  const fb = call.feedback;
  const client = CLIENTS.find((c) => c.id === call.clientId);
  const [tab, setTab] = useState('fb');
  const [explain, setExplain] = useState(false);
  const [why, setWhy] = useState(false);
  const [more, setMore] = useState(false);
  const real = fb.scores.filter((s) => s[1] != null);
  const avg = fb.avg ?? real.reduce((s, x) => s + x[1], 0) / real.length;
  // The one fix (prompt v2 8): the earliest broken stage, not always the lowest score.
  const weakest = fb.scores[fixDim(fb.scores)];
  const o = OUTCOME[fb.outcome];
  const H = client.hidden;
  const hits = fb.hiddenHits || {};
  const hiddenRows = [
    ['motive', 'המניע האמיתי', H.motive],
    ['tries', 'ניסיונות קודמים', H.tries.join(' · ')],
    ['need', 'מה הפתרון חייב לכלול', H.need],
    ['fit', 'האם זה באמת התאים', H.fit.text],
    ['obstacle', 'המכשול הנסתר', H.obstacle],
    ['decider', 'מי עוד מחליט', H.decider],
    ['budget', 'תקציב', H.budget],
    ['condition', 'מה היה גורם לה/לו להגיד כן'.replace('לה/לו', client.fem ? 'לה' : 'לו'), H.condition],
  ];
  const tabs = [
    ['fb', 'העיקר'],
    ['scores', 'הציונים'],
    ['hidden', `מה היה בראש של ${client.first}`],
    ['map', 'מפת השיחה'],
  ];
  return html`<div class="mx-auto max-w-[820px] px-4 py-5 md:px-8 md:py-7">
    <div class="mb-4 flex items-start gap-4">
      <div class="min-w-0 flex-1">
        <p class="mb-1.5 flex flex-wrap items-center gap-2"><${Avatar} client=${client} size=${28} /><span class="text-[14px] font-bold text-muted">השיחה עם ${client.first}</span><${Tag} tone=${o.tone}><${Icon} name=${o.icon} size=${13} />${outcomeLabel(fb.outcome, client)}<//></p>
        <p class="text-[19px] font-semibold leading-snug md:text-[21px]">${fb.line}</p>
      </div>
      <div class="shrink-0 rounded-2xl bg-brand-50 px-4 py-2 text-center"><b class="block font-display text-[30px] leading-none text-brand-600">${avg.toFixed(1)}</b><small class="text-[12px] text-muted">מתוך 5</small></div>
    </div>
    <div class="mb-5 flex gap-1 overflow-x-auto border-b border-line no-scrollbar" role="tablist">
      ${tabs.map(([id, label]) => html`<button key=${id} type="button" role="tab" aria-selected=${tab === id} onClick=${() => setTab(id)} class=${cx('-mb-px whitespace-nowrap border-b-[3px] px-3 py-2 text-[15px] font-bold cursor-pointer', tab === id ? 'border-brand-600 text-brand-600' : 'border-transparent text-muted hover:text-ink')}>${label}</button>`)}
    </div>

    ${tab === 'fb' &&
    html`<div class="flex flex-col gap-4">
      ${fb.fix &&
      html`<${Note} tone="white" tilt=${-0.4} class="!p-5">
        <span class="fb-note-kicker">התיקון האחד</span>
        <b class="mb-3 block font-display text-[21px] leading-snug">${fb.fix.title}</b>
        <p class="mb-1 text-[13px] font-bold text-muted">לומר בפעם הבאה</p>
        <p class="rounded-xl border-[1.5px] border-brand-200 bg-brand-50 px-3.5 py-2.5 text-[16px] font-semibold leading-relaxed">${fb.fix.alt}</p>
        <div class="mt-2 flex flex-wrap items-center gap-4">
          <button type="button" class="inline-flex items-center gap-1 text-[14px] font-bold text-brand-600 cursor-pointer" onClick=${() => notify('הניסוח הועתק', 'copy')}><${Icon} name="copy" size=${14} />העתקה</button>
          <button type="button" aria-expanded=${why} class="inline-flex items-center gap-1 text-[14px] font-bold text-muted hover:text-ink cursor-pointer" onClick=${() => setWhy(!why)}><${Icon} name=${why ? 'chevron-up' : 'chevron-down'} size=${15} />למה דווקא זה</button>
        </div>
        ${why && html`<div class="rise mt-3 flex flex-col gap-2.5 border-t border-line pt-3 text-[15px]">
          <p><b class="block text-[13px] text-muted">מה קרה</b>"${fb.fix.what}"</p>
          <p><b class="block text-[13px] text-muted">מה זה עשה ל${client.first}</b>${fb.fix.effect}</p>
          <p><b class="block text-[13px] text-muted">העיקרון</b>${fb.fix.principle}${EXPLAIN[fb.fix.stageN] && html` <button type="button" class="text-[13px] font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${() => setExplain(true)}>להסבר קצר</button>`}</p>
        </div>`}
      <//>`}
      <section class="flex items-center gap-3 rounded-2xl bg-brand-600 p-4 text-white">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15"><${Icon} name="repeat" size=${20} /></span>
        <span class="min-w-0 flex-1"><b class="block text-[13px] opacity-80">התרגיל הבא · דקה-שתיים</b><span class="text-[15px]">${fb.next.text}</span></span>
        <button type="button" class="shrink-0 rounded-xl bg-white px-4 py-2 text-[14px] font-bold text-brand-600 hover:bg-brand-50 cursor-pointer" onClick=${() => onPractice(fb.next.stageN)}>לתרגל עכשיו</button>
      </section>
      <section class="fb-panel !p-4">
        <h2 class="mb-2 text-[15px] font-bold">מה עבד</h2>
        ${fb.worked.length
          ? html`<ul class="flex flex-col gap-2.5">${fb.worked.map((w, i) => html`<li key=${i} class="flex items-start gap-2.5"><span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">✓</span><span class="min-w-0"><b class="block text-[15px]">"${w.quote}"</b><span class="text-[14px] text-muted">${w.did}</span></span></li>`)}</ul>`
          : html`<p class="text-[15px] text-muted">השיחה קצרה מדי כדי להצביע על משהו מדויק.</p>`}
      </section>
      ${fb.flags.length > 0 && html`<p class="flex items-start gap-2 rounded-xl bg-warn-50 px-3.5 py-2.5 text-[15px] text-warn"><${Icon} name="flag" size=${16} class="mt-0.5 shrink-0" /><span>${fb.flags.join(' · ')}</span></p>`}
      ${fb.more.length > 0 &&
      html`<div>
        <button type="button" aria-expanded=${more} class="inline-flex items-center gap-1 text-[14px] font-bold text-muted hover:text-ink cursor-pointer" onClick=${() => setMore(!more)}><${Icon} name=${more ? 'chevron-up' : 'chevron-down'} size=${15} />עוד ${fb.more.length} דברים, לתרגול הבא</button>
        ${more && html`<ul class="rise mt-2 list-disc space-y-1 ps-6 text-[15px]">${fb.more.map((m) => html`<li key=${m}>${m}</li>`)}</ul>`}
      </div>`}
    </div>`}

    ${tab === 'scores' &&
    html`<section class="fb-panel !p-0">
      <table class="w-full text-[15px]">
        <tbody>
          ${fb.scores.map(([d, n, why]) => html`<tr key=${d} class=${cx('border-b border-line last:border-0', weakest && d === weakest[0] && 'bg-warn-50')}><td class="px-4 py-2.5 md:w-[190px]"><b class="block">${d}</b><span class="block text-[14px] text-muted md:hidden">${why}</span></td><td class="w-[96px] px-2 md:w-[110px]"><${Dots5} n=${n} /></td><td class="hidden px-2 py-2.5 text-muted md:table-cell">${why}</td></tr>`)}
        </tbody>
      </table>
      <p class="border-t border-line px-4 py-3 text-[15px]"><b>ממוצע ${avg.toFixed(1)}</b> · התיקון האחד: <b>${weakest?.[0]}</b>, השלב השבור המוקדם ביותר בשיחה.</p>
    </section>`}

    ${tab === 'hidden' &&
    html`<div>
      <p class="mb-3 text-[15px] text-muted">בשיחה אמיתית את זה לא רואים. ${client.first} ${client.fem ? 'חשפה' : 'חשף'} שכבה רק אחרי שאלה טובה. כאן רואים מה עוד היה שם.</p>
      <section class="fb-panel !p-4">
        <p class="mb-2 text-[15px]">${H.who}. ${client.fem ? 'אמרה שהיא כאן כי' : 'אמר שהוא כאן כי'}: "${H.stated}".</p>
        <ul class="flex flex-col divide-y divide-line">
          ${hiddenRows.map(([k, label, v]) => {
            const h = hits[k];
            return html`<li key=${k} class="flex items-start gap-3 py-2.5"><span class=${cx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold', h === true ? 'bg-brand-600 text-white' : h === false ? 'bg-warn-50 text-warn' : 'bg-canvas text-faint')}>${h === true ? '✓' : h === false ? '!' : '–'}</span><span class="min-w-0"><b class="block text-[14px] text-muted">${label} · ${h === true ? 'גילית' : h === false ? 'פספסת' : 'לא רלוונטי'}</b><span class="text-[15px]">${v}</span></span></li>`;
          })}
        </ul>
      </section>
    </div>`}

    ${tab === 'map' &&
    html`<div class="grid gap-3 sm:grid-cols-2">
      ${GROUPS.map((gr, i) => html`<section key=${gr} class="fb-panel !p-3">
        <p class="mb-1.5 text-[14px] font-bold">${i + 1}. ${gr}</p>
        ${STAGES.filter((s) => s.group === i).map((s) => {
          const [label, tone] = MAP_LABEL[fb.map[s.n]] || MAP_LABEL.missing;
          return html`<p key=${s.n} class="flex items-center justify-between gap-2 py-1 text-[14px]"><span>${s.n}. ${s.name}</span><${Tag} tone=${tone}>${label}<//></p>`;
        })}
      </section>`)}
      <p class="text-[14px] text-muted sm:col-span-2">יחס הדיבור: ${client.first} ${fb.ratio}% מהשיחה. ${fb.ratio >= 60 ? 'טוב.' : 'הלקוח צריך לדבר לפחות פי שניים.'}</p>
    </div>`}

    ${explain && EXPLAIN[fb.fix.stageN] &&
    html`<${Sheet} title=${EXPLAIN[fb.fix.stageN].title} onClose=${() => setExplain(false)} footer=${html`<span></span><${Button} variant="primary" onClick=${() => (setExplain(false), onPractice(fb.fix.stageN))}>לתרגל את זה<//>`}>
      <p class="mb-3 text-[16px]">${EXPLAIN[fb.fix.stageN].text}</p>
      <p class="rounded-lg bg-brand-50 px-3 py-2 text-[15px] font-semibold">${EXPLAIN[fb.fix.stageN].example}</p>
    <//>`}
  </div>`;
}

// ---------- single stage, again and again (mode ד) ----------
export function StageDrill({ stageN, clientId, onDone }) {
  const spec = STAGE_DRILL[stageN] || STAGE_DRILL[8];
  const stage = STAGES.find((s) => s.n === (STAGE_DRILL[stageN] ? stageN : 8));
  // The two drills are written around רונית's call, whoever the call was with.
  const client = CLIENTS.find((c) => c.id === 'ronit');
  const [text, setText] = useState('');
  const [tries, setTries] = useState([]);
  const last = tries[tries.length - 1];
  const check = () => {
    if (!text.trim()) return;
    setTries([...tries, { text, res: stageFeedback(spec, text) }]);
  };
  return html`<div class="mx-auto grid max-w-[1080px] gap-5 px-4 py-5 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-6">
    <div>
      <p class="fb-eyebrow mb-1">תרגול שלב אחד · ${stage.n}. ${stage.name}</p>
      <h1 class="fb-h1 mb-3 text-[26px] md:text-[30px]">שוב ושוב, עד שזה <span class="fb-marker">יוצא טבעי</span></h1>
      <section class="fb-panel !p-4">
        <p class="mb-2 flex items-center gap-2 text-[15px]"><${Avatar} client=${client} size=${30} />${spec.ctx}</p>
        <ul class="flex flex-col gap-1.5">${spec.said.map((s) => html`<li key=${s} class="rounded-lg bg-canvas px-3 py-1.5 text-[15px]">${s}</li>`)}</ul>
      </section>
      <p class="mt-3 text-[14px] text-muted">אחרי כל ניסיון, תיקון אחד. ${tries.length ? `ניסיון ${tries.length}` : ''}</p>
    </div>
    <div class="flex flex-col gap-3">
      <label class="block">
        <span class="mb-1 block text-[14px] font-bold">${spec.label}</span>
        <textarea rows="4" value=${text} onInput=${(e) => setText(e.target.value)} placeholder=${spec.placeholder} class="w-full resize-none rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-[16px] outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"></textarea>
      </label>
      <div class="flex gap-2"><${Button} variant="mini" onClick=${check}><${Icon} name="check" size=${15} />לבדוק<//>${last?.res.done && html`<${Button} variant="mini" onClick=${onDone}>חזרה למשוב<//>`}</div>
      ${last &&
      html`<${Note} key=${tries.length} tone="white" tilt=${-0.5} class="rise !p-4">
        <span class="fb-note-kicker">${last.res.done ? 'יצא טבעי' : 'תיקון אחד'}</span>
        <ul class="mb-2 flex flex-col gap-1">${spec.keys.map((k) => {
          const ok = last.res.hits.includes(k);
          return html`<li key=${k.id} class=${cx('flex items-center gap-2 text-[14px]', ok ? 'text-ink' : 'text-muted')}><span class=${cx('grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold', ok ? 'bg-brand-600 text-white' : 'bg-canvas ring-1 ring-line')}>${ok ? '✓' : ''}</span>${k.label}</li>`;
        })}</ul>
        <p class="text-[15px] font-semibold">${last.res.done ? spec.done : `${last.res.fix} ${g('נסה', 'נסי')} שוב.`}</p>
      <//>`}
    </div>
  </div>`;
}
