// The practice call (prompt mode א), the feedback after it (section 8), and the
// single-stage practice that the feedback's "next exercise" opens (mode ד).
import { html, useState, useEffect, useRef, Icon, cx } from './lib.js';
import { Button, Note, SharkAvatar } from './components.js';
import { Sheet, Tag } from './ui.js';
import { CLIENTS, GROUPS, STAGES, LEVELS, EXPLAIN, STAGE_DRILL, g } from './data.js';
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

export function Strip({ reached, vertical }) {
  const max = reached.length ? Math.max(...reached) : -1;
  const now = max >= 0 ? STAGES.find((s) => s.n === max).group : 0;
  return html`<ol class=${cx('flex gap-1.5', vertical ? 'flex-col' : 'flex-wrap')} aria-label="שלבי השיחה">
    ${GROUPS.map((gr, i) => {
      const stages = STAGES.filter((s) => s.group === i);
      const hit = stages.filter((s) => reached.includes(s.n)).length;
      const state = hit === stages.length ? 'done' : i === now ? 'now' : hit ? 'part' : 'todo';
      return html`<li key=${gr} class=${cx('flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[13px] font-bold', state === 'now' ? 'bg-brand-100 text-brand-600' : state === 'done' ? 'text-ink' : state === 'part' ? 'text-ink' : 'text-faint')} title=${stages.map((s) => s.name).join(' · ')}>
        <span class=${cx('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px]', state === 'done' ? 'bg-brand-600 text-white' : state === 'now' ? 'bg-white text-brand-600 ring-2 ring-brand-600' : state === 'part' ? 'bg-brand-200 text-brand-600' : 'bg-canvas ring-1 ring-line')}>${state === 'done' ? '✓' : i + 1}</span>${gr}
      </li>`;
    })}
  </ol>`;
}

function Ratio({ msgs, client }) {
  const r = talkRatio(msgs);
  const ok = r >= 60;
  return html`<div>
    <p class="mb-1 flex justify-between text-[13px] font-bold"><span>מי מדבר יותר</span><span class=${ok ? 'text-brand-600' : 'text-warn'}>${client.first} ${r}%</span></p>
    <div class="h-2.5 overflow-hidden rounded-full bg-canvas ring-1 ring-line"><div class="h-full rounded-full bg-brand-300 transition-all" style=${{ width: `${r}%` }}></div></div>
    <p class="mt-1 text-[12px] text-muted">הלקוח צריך לדבר לפחות פי שניים ממך.</p>
  </div>`;
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
  return html`<div class="mx-auto grid h-full max-w-[1120px] gap-4 px-3 py-3 md:grid-cols-[260px_1fr] md:px-8 md:py-4">
    <aside class="hidden min-h-0 flex-col gap-3 overflow-y-auto md:flex">
      <section class="fb-panel !p-3">
        <div class="mb-1 flex items-center gap-2"><${Avatar} client=${client} size=${38} /><span class="min-w-0"><b class="block text-[15px]">${client.name}</b><small class="block truncate text-[12px] text-muted">${client.who}</small></span></div>
        <p class="text-[12px] text-muted">רמה ${level.label}</p>
      </section>
      <section class="fb-panel !p-3"><p class="mb-1.5 text-[13px] font-bold text-muted">איפה השיחה</p><${Strip} reached=${call.reached} vertical /></section>
      <section class="fb-panel !p-3"><${Ratio} msgs=${call.msgs} client=${client} /></section>
    </aside>
    <section class="flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-line bg-surface">
      <div class="flex items-center gap-2 border-b border-line px-3 py-2 md:hidden"><${Avatar} client=${client} size=${30} /><b class="text-[15px]">${client.name}</b><span class="ms-auto text-[12px] text-muted">רמה ${call.level}</span></div>
      <div ref=${scroll} class="thin-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3 md:p-4">
        ${!call.msgs.length &&
        html`<div class="m-auto max-w-[380px] text-center">
          <p class="mb-1 font-display text-[18px] font-bold">${client.first} ${client.fem ? 'מחכה' : 'מחכה'} בזום</p>
          <p class="mb-3 text-[15px] text-muted">${g('אתה פותח', 'את פותחת')} את השיחה. ${client.fem ? 'היא' : 'הוא'} ${client.fem ? 'תענה' : 'יענה'} כמו לקוח${client.fem ? 'ה' : ''} ${client.fem ? 'אמיתית' : 'אמיתי'}: לשאלה שטחית, תשובה שטחית.</p>
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
  const real = fb.scores.filter((s) => s[1] != null);
  const avg = fb.avg ?? real.reduce((s, x) => s + x[1], 0) / real.length;
  const weakest = real.reduce((a, b) => (b[1] < a[1] ? b : a), real[0]);
  const o = OUTCOME[fb.outcome];
  const H = client.hidden;
  const hits = fb.hiddenHits || {};
  const hiddenRows = [
    ['motive', 'המניע האמיתי', H.motive],
    ['tries', 'ניסיונות קודמים', H.tries.join(' · ')],
    ['obstacle', 'המכשול הנסתר', H.obstacle],
    ['decider', 'מי עוד מחליט', H.decider],
    ['budget', 'תקציב', H.budget],
    ['condition', 'מה היה גורם לה/לו להגיד כן'.replace('לה/לו', client.fem ? 'לה' : 'לו'), H.condition],
  ];
  const tabs = [
    ['fb', 'המשוב'],
    ['scores', 'הציונים'],
    ['hidden', `מה היה בראש של ${client.first}`],
    ['map', 'מפת השיחה'],
  ];
  return html`<div class="mx-auto max-w-[1120px] px-4 py-4 md:px-8 md:py-5">
    <div class="mb-3 flex flex-wrap items-start gap-3">
      <${Avatar} client=${client} size=${46} />
      <div class="min-w-0 flex-1">
        <p class="mb-1 flex flex-wrap items-center gap-2"><span class="fb-eyebrow">המשוב · ${client.name}</span><${Tag} tone=${o.tone}><${Icon} name=${o.icon} size=${13} />${outcomeLabel(fb.outcome, client)}<//><span class="text-[13px] text-muted">ממוצע ${avg.toFixed(1)} · רמה ${call.level}</span></p>
        <p class="max-w-[80ch] text-[17px] font-semibold leading-snug">${fb.line}</p>
      </div>
    </div>
    <div class="mb-3 flex gap-1 overflow-x-auto border-b border-line no-scrollbar" role="tablist">
      ${tabs.map(([id, label]) => html`<button key=${id} type="button" role="tab" aria-selected=${tab === id} onClick=${() => setTab(id)} class=${cx('-mb-px whitespace-nowrap border-b-[3px] px-3 py-2 text-[15px] font-bold cursor-pointer', tab === id ? 'border-brand-600 text-brand-600' : 'border-transparent text-muted hover:text-ink')}>${label}</button>`)}
    </div>

    ${tab === 'fb' &&
    html`<div class="grid gap-4 md:grid-cols-[1fr_1.1fr]">
      <div class="flex flex-col gap-3">
        <section>
          <h2 class="fb-h3 mb-2">מה עבד</h2>
          ${fb.worked.length ? fb.worked.map((w, i) => html`<div key=${i} class="fb-panel mb-2 !p-3"><p class="mb-1 text-[15px] font-bold">"${w.quote}"</p><p class="text-[14px] text-muted">${w.did}</p></div>`) : html`<p class="text-[15px] text-muted">השיחה קצרה מדי כדי להצביע על משהו מדויק.</p>`}
        </section>
        ${fb.more.length > 0 && html`<section><h2 class="fb-h3 mb-1.5">עוד דברים לשים לב</h2><ul class="list-disc space-y-1 ps-5 text-[15px]">${fb.more.map((m) => html`<li key=${m}>${m}</li>`)}</ul><p class="mt-1 text-[13px] text-muted">לתרגול הבא, לא לעכשיו.</p></section>`}
        ${fb.flags.length > 0 && html`<${Note} tone="error" tilt=${0} class="!p-3"><span class="fb-note-kicker">דגלים אדומים</span>${fb.flags.map((f) => html`<p key=${f} class="text-[15px]">${f}</p>`)}<//>`}
      </div>
      ${fb.fix &&
      html`<div class="flex flex-col gap-3">
        <${Note} tone="white" tilt=${-0.6} class="!p-4">
          <span class="fb-note-kicker">התיקון האחד</span>
          <b class="mb-2 block font-display text-[19px]">${fb.fix.title}</b>
          <p class="mb-1 text-[14px] font-bold text-muted">מה קרה</p>
          <p class="mb-2 rounded-lg bg-canvas px-3 py-2 text-[15px]">"${fb.fix.what}"</p>
          <p class="mb-1 text-[14px] font-bold text-muted">מה זה עשה ל${client.first}</p>
          <p class="mb-2 text-[15px]">${fb.fix.effect}</p>
          <p class="mb-1 flex items-center justify-between text-[14px] font-bold text-muted">העיקרון${EXPLAIN[fb.fix.stageN] && html`<button type="button" class="text-[13px] text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${() => setExplain(true)}>להסבר קצר</button>`}</p>
          <p class="mb-2 text-[15px]">${fb.fix.principle}</p>
          <p class="mb-1 text-[14px] font-bold text-muted">לומר בפעם הבאה</p>
          <p class="rounded-lg border-[1.5px] border-brand-200 bg-brand-50 px-3 py-2 text-[15px] font-semibold">${fb.fix.alt}</p>
          <button type="button" class="mt-1.5 inline-flex items-center gap-1 text-[13px] font-bold text-brand-600 cursor-pointer" onClick=${() => notify('הניסוח הועתק', 'copy')}><${Icon} name="copy" size=${14} />העתקה</button>
        <//>
        <section class="fb-panel flex items-center gap-3 !p-3">
          <span class="fb-chip-ic h-10 w-10 shrink-0"><${Icon} name="repeat" size=${20} /></span>
          <span class="min-w-0 flex-1"><b class="block text-[14px] text-muted">התרגיל הבא</b><span class="text-[15px]">${fb.next.text}</span></span>
          <${Button} variant="mini" onClick=${() => onPractice(fb.next.stageN)}>לתרגל עכשיו<//>
        </section>
      </div>`}
    </div>`}

    ${tab === 'scores' &&
    html`<section class="fb-panel !p-0">
      <table class="w-full text-[15px]">
        <tbody>
          ${fb.scores.map(([d, n, why]) => html`<tr key=${d} class=${cx('border-b border-line last:border-0', weakest && d === weakest[0] && 'bg-warn-50')}><td class="px-4 py-2.5 md:w-[190px]"><b class="block">${d}</b><span class="block text-[14px] text-muted md:hidden">${why}</span></td><td class="w-[96px] px-2 md:w-[110px]"><${Dots5} n=${n} /></td><td class="hidden px-2 py-2.5 text-muted md:table-cell">${why}</td></tr>`)}
        </tbody>
      </table>
      <p class="border-t border-line px-4 py-3 text-[15px]"><b>ממוצע ${avg.toFixed(1)}</b> · הממד החלש: <b>${weakest?.[0]}</b>, וזה גם התיקון האחד.</p>
    </section>`}

    ${tab === 'hidden' &&
    html`<div class="grid gap-3 md:grid-cols-[1fr_0.7fr]">
      <section class="fb-panel !p-4">
        <p class="mb-2 text-[15px]">${H.who}. ${client.fem ? 'אמרה שהיא כאן כי' : 'אמר שהוא כאן כי'}: "${H.stated}".</p>
        <ul class="flex flex-col divide-y divide-line">
          ${hiddenRows.map(([k, label, v]) => {
            const h = hits[k];
            return html`<li key=${k} class="flex items-start gap-3 py-2"><span class=${cx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold', h === true ? 'bg-brand-600 text-white' : h === false ? 'bg-warn-50 text-warn' : 'bg-canvas text-faint')}>${h === true ? '✓' : h === false ? '!' : '–'}</span><span class="min-w-0"><b class="block text-[14px] text-muted">${label} · ${h === true ? 'גילית' : h === false ? 'פספסת' : 'לא רלוונטי'}</b><span class="text-[15px]">${v}</span></span></li>`;
          })}
        </ul>
      </section>
      <${Note} tone="white" tilt=${-1} class="!p-4 self-start">
        <span class="fb-note-kicker">למה זה מוצג רק עכשיו</span>
        <span class="text-[15px]">בשיחה אמיתית את זה לא רואים. ${client.first} ${client.fem ? 'חשפה' : 'חשף'} שכבה רק אחרי שאלה טובה, וכאן רואים מה עוד היה שם.</span>
      <//>
    </div>`}

    ${tab === 'map' &&
    html`<div class="grid gap-3 md:grid-cols-3">
      ${GROUPS.map((gr, i) => html`<section key=${gr} class="fb-panel !p-3">
        <p class="mb-1.5 text-[14px] font-bold">${i + 1}. ${gr}</p>
        ${STAGES.filter((s) => s.group === i).map((s) => {
          const [label, tone] = MAP_LABEL[fb.map[s.n]] || MAP_LABEL.missing;
          return html`<p key=${s.n} class="flex items-center justify-between gap-2 py-1 text-[14px]"><span>${s.n}. ${s.name}</span><${Tag} tone=${tone}>${label}<//></p>`;
        })}
      </section>`)}
      <p class="text-[14px] text-muted md:col-span-3">יחס הדיבור: ${client.first} ${fb.ratio}% מהשיחה. ${fb.ratio >= 60 ? 'טוב.' : 'הלקוח צריך לדבר לפחות פי שניים.'}</p>
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
  const spec = STAGE_DRILL[stageN] || STAGE_DRILL[7];
  const stage = STAGES.find((s) => s.n === (STAGE_DRILL[stageN] ? stageN : 7));
  const client = CLIENTS.find((c) => c.id === (clientId || 'ronit'));
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
        <span class="mb-1 block text-[14px] font-bold">${g('הסיכום שלך', 'הסיכום שלך')}, במילים של ${client.first}</span>
        <textarea rows="4" value=${text} onInput=${(e) => setText(e.target.value)} placeholder="אז אם אני מסכם..." class="w-full resize-none rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-[16px] outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"></textarea>
      </label>
      <div class="flex gap-2"><${Button} variant="mini" onClick=${check}><${Icon} name="check" size=${15} />לבדוק<//>${last?.res.done && html`<${Button} variant="mini" onClick=${onDone}>חזרה למשוב<//>`}</div>
      ${last &&
      html`<${Note} key=${tries.length} tone="white" tilt=${-0.5} class="rise !p-4">
        <span class="fb-note-kicker">${last.res.done ? 'יצא טבעי' : 'תיקון אחד'}</span>
        <ul class="mb-2 flex flex-col gap-1">${spec.keys.map((k) => {
          const ok = last.res.hits.includes(k);
          return html`<li key=${k.id} class=${cx('flex items-center gap-2 text-[14px]', ok ? 'text-ink' : 'text-muted')}><span class=${cx('grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold', ok ? 'bg-brand-600 text-white' : 'bg-canvas ring-1 ring-line')}>${ok ? '✓' : ''}</span>${k.label}</li>`;
        })}</ul>
        <p class="text-[15px] font-semibold">${last.res.done ? `זה הסיכום. ${client.first} הייתה אומרת "נכון, בדיוק". עכשיו: "זה לא באשמתך, חסרה חתיכה אחת".` : `${last.res.fix} ${g('נסה', 'נסי')} שוב.`}</p>
      <//>`}
    </div>
  </div>`;
}
