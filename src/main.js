// Task 7: step 12 "חדר התרגול", built on the sales coach system prompt
// (Meetings_Summary/practice-room/sales-coach-prompt.md).
// Screens: opening → room (three clients, "לקוח חדש" for more, the quick round, the
// analysis, the answer sheet) → brief → call → feedback → (single-stage practice) → answer sheet → done.
// There is no model in the mockup: coach.js plays the client by the rules of prompt 5.3
// and builds the feedback from what happened. The sample call with רונית and its
// feedback are written in advance, to show a full feedback.
// Link params: ?screen=opening|room|brief|call|sample|stage|drill|analysis|sheet|done,
// ?user=f, ?embed = phone layout. Shift+D opens the developer notes.
import { html, render, useState, useEffect, useRef, Icon } from './lib.js';
import { PartnerBubble, Progress, TopBar, BottomBar, Status, PrimaryButton, Button, Toast } from './components.js';
import { STEP, PARTS, CLIENTS, FORMS, SHEET, SHEET_FROM_SAMPLE, SAMPLE_CALL, SAMPLE_FEEDBACK, STAGE_DRILL, clientFromDescription, registerClient, g } from './data.js';
import { newCall, userSays, hintFor, feedbackFor, talkRatio } from './coach.js';
import * as ai from './ai.js';
import { hasAI } from './ai.js';
import { Opening, Room, ContextSheet, Brief, Done } from './step.js';
import { Call, Feedback, StageDrill } from './call.js';
import { PrepSheet, CallScript } from './sheet.js';
import { Drill, Analysis } from './tools.js';
import { AnswerSheet } from './sheet.js';
import { DevPanel } from './devnotes.js';
import { EMBED, IS_PHONE, readView, saveView, writeHandoff, takeHandoff, applyPhoneViewport, ViewToggle, PhonePreview } from './viewswitch.js';

const params = new URLSearchParams(location.search);
const KEY = 'flowbiz-pr-state';
const SCREENS = ['opening', 'room', 'brief', 'call', 'feedback', 'stage', 'drill', 'analysis', 'sheet', 'script', 'done'];
const PART_OF = { room: 0, brief: 0, drill: 0, analysis: 0, call: 1, feedback: 2, stage: 2, sheet: 3, script: 3 };

const freshState = () => ({ calls: [], added: [], real: [], sheet: SHEET.map((r) => ({ ...r })), script: { edits: {}, added: {} }, drill: { done: 0 }, done: false });
// The mockup always opens the step from zero: no calls, no "מהפעם הקודמת".
// Progress lives only while the page is open (and across the phone/desktop switch).
function loadState() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  return freshState();
}
const saveState = () => {};

let seq = Date.now();
const nextId = () => `c${seq++}`;

// The sample call, finished, with its feedback (mockup only).
const SAMPLE_REACHED = Object.keys(SAMPLE_FEEDBACK.map).map(Number).filter((n) => SAMPLE_FEEDBACK.map[n] !== 'missing');
const sampleAvg = () => {
  const real = SAMPLE_FEEDBACK.scores.filter((s) => s[1] != null);
  return real.reduce((s, x) => s + x[1], 0) / real.length;
};
function sampleCall(done) {
  return {
    ...newCall('ronit', 2),
    id: nextId(),
    sample: true,
    msgs: SAMPLE_CALL.map(([who, text]) => ({ who: who === 'me' ? 'me' : 'client', text })).concat(done ? [{ who: 'end', text: 'רונית קבעה: מחר ב-9:00' }] : []),
    reached: done ? SAMPLE_REACHED : [],
    outcome: done ? 'next' : null,
    feedback: done ? { ...SAMPLE_FEEDBACK, avg: sampleAvg() } : null,
  };
}

const SHARK_LINE = {
  opening: 'הדרך הכי זולה לשרוף ליד היא להתאמן עליו. כאן מתאמנים על לקוחות שלא הולכים לשום מקום.',
  room: 'שיחה אחת מספיקה כדי לסיים את השלב. אבל מי שעושה שלוש, שומע את עצמו משתפר.',
  brief: g('תזכור: מי ששואל מוביל. המטרה היא החלטה ברורה, לא "אחשוב על זה".', 'תזכרי: מי ששואלת מובילה. המטרה היא החלטה ברורה, לא "אחשוב על זה".'),
  feedback: 'תיקון אחד. לא עשרה. את הזה כדאי לתרגל עד שהוא יוצא טבעי.',
  sheet: 'זה הדף שכדאי לפתוח חמש דקות לפני כל שיחה אמיתית.',
};

function App({ view: shellView, onViewChange }) {
  const handoff = useRef(takeHandoff()).current;
  (handoff?.state?.real || []).forEach(registerClient);
  const [route, setRoute] = useState(handoff?.route || startRoute());
  const [state, setState] = useState(handoff?.state || loadState());
  const [level, setLevel] = useState(2);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [dev, setDev] = useState(false);
  const [unread, setUnread] = useState(true);
  const [busy, setBusy] = useState(null); // 'hint' | 'feedback' while the model works
  const [prepFor, setPrepFor] = useState(null); // a real client's id: the prep card is open
  const timers = useRef({});
  const stateRef = useRef(state);
  stateRef.current = state;

  function startRoute() {
    const s = params.get('screen');
    // A fresh page has no calls, so a reload on the feedback opens the sample feedback.
    if (s === 'sample' || s === 'feedback') return { screen: 'feedback', sampleNow: true };
    if (s === 'brief' || s === 'call') return { screen: s, clientId: 'ronit', fresh: s === 'call' };
    if (s === 'stage') return { screen: 'stage', stageN: STAGE_DRILL[params.get('stage')] ? Number(params.get('stage')) : 8, clientId: 'ronit' };
    return { screen: SCREENS.includes(s) ? s : 'opening' };
  }

  useEffect(() => {
    saveState(state);
    window.__flowbizSnapshot = () => ({ route, state });
  });
  useEffect(() => {
    const q = new URLSearchParams();
    q.set('screen', route.screen);
    if (EMBED) q.set('embed', '1');
    if (params.get('user')) q.set('user', params.get('user'));
    history.replaceState(null, '', `${location.pathname}?${q}`);
    setUnread(true);
    document.querySelector('main')?.scrollTo(0, 0);
  }, [route.screen]);
  useEffect(() => {
    const k = (e) => {
      const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (e.key === 'D' && e.shiftKey && !typing) setDev((d) => !d);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const notify = (text, icon = 'info') => {
    setToast({ id: Date.now(), text, icon });
    clearTimeout(timers.current.toast);
    timers.current.toast = setTimeout(() => setToast(null), 2800);
  };
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const setCall = (id, p) => setState((s) => ({ ...s, calls: s.calls.map((c) => (c.id === id ? { ...c, ...(typeof p === 'function' ? p(c) : p) } : c)) }));
  const setRow = (id, p) => setState((s) => ({ ...s, sheet: s.sheet.map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  const addRow = (row) => setState((s) => ({ ...s, sheet: [...s.sheet, row] }));
  const removeRow = (id) => setState((s) => ({ ...s, sheet: s.sheet.filter((r) => r.id !== id) }));
  const go = (r) => setRoute(r);

  // ---------- calls ----------
  // focus: what this call is about, when it repeats a call to work on the one fix.
  const startCall = (clientId, lvl = level, focus) => {
    const c = { ...newCall(clientId, lvl), id: nextId(), ...(focus ? { focus } : {}) };
    setState((s) => ({ ...s, calls: [...s.calls, c] }));
    go({ screen: 'call', callId: c.id });
  };
  const showSample = () => {
    const c = sampleCall(true);
    setState((s) => ({ ...s, calls: [...s.calls, c] }));
    applySample();
    go({ screen: 'feedback', callId: c.id });
  };
  // Deep links that need a call in the state.
  useEffect(() => {
    if (route.sampleNow) showSample();
    else if (route.fresh) startCall(route.clientId);
  }, []);

  const call = state.calls.find((c) => c.id === route.callId);
  const client = CLIENTS.find((c) => c.id === (call?.clientId || route.clientId));

  const endLine = (o) => (o === 'buy' ? (client.fem ? `${client.first} קנתה` : `${client.first} קנה`) : o === 'next' ? 'נקבע צעד הבא' : o === 'no' ? `${client.first} ${client.fem ? 'סירבה' : 'סירב'}` : `${client.first}: "צריך לחשוב על זה"`);
  const aiError = (e) => {
    console.error(e);
    const s = e?.status;
    return s === 401 ? 'המפתח לא תקין. בודקים אותו בהערות (Shift+D)' : s === 429 || s === 529 ? 'המודל עמוס כרגע. שולחים שוב בעוד רגע' : `המודל לא ענה (${e?.message || 'שגיאה'}). שולחים שוב`;
  };
  const send = (text, done) => {
    if (hasAI() && !stateRef.current.calls.find((c) => c.id === route.callId)?.sample) return sendAI(text, done);
    clearTimeout(timers.current.reply);
    timers.current.reply = setTimeout(() => {
      const cur = stateRef.current.calls.find((c) => c.id === route.callId);
      if (!cur) return done();
      const st = userSays(cur, text);
      if (st.outcome) st.msgs = [...st.msgs, { who: 'end', text: endLine(st.outcome) }];
      setCall(cur.id, st);
      done();
    }, 700 + Math.min(text.length * 6, 900));
  };
  // With a key: the trainee's line shows at once, the client answers from Claude.
  const sendAI = async (text, done) => {
    const id = route.callId;
    const prev = stateRef.current.calls.find((c) => c.id === id);
    const msgs = [...prev.msgs.filter((m) => m.who !== 'note'), { who: 'me', text }];
    setCall(id, { msgs, turns: prev.turns + 1 });
    try {
      const r = await ai.clientTurn({ ...prev, msgs });
      setCall(id, (c) => ({
        msgs: [...c.msgs, { who: 'client', text: r.reply }, ...(r.outcome ? [{ who: 'end', text: endLine(r.outcome) }] : [])],
        reached: c.reached.includes(r.stage) ? c.reached : [...c.reached, r.stage],
        outcome: r.outcome || c.outcome,
        ai: true,
      }));
    } catch (e) {
      setCall(id, (c) => ({ msgs: [...c.msgs, { who: 'note', text: aiError(e) }] }));
    }
    done();
  };
  const hint = async () => {
    const id = call.id;
    if (!hasAI() || call.sample) return setCall(id, (c) => ({ msgs: [...c.msgs, { who: 'hint', text: hintFor(c) }], hints: c.hints + 1 }));
    if (busy) return;
    setBusy('hint');
    try {
      const text = await ai.hint(stateRef.current.calls.find((c) => c.id === id));
      setCall(id, (c) => ({ msgs: [...c.msgs, { who: 'hint', text }], hints: c.hints + 1 }));
    } catch (e) {
      // The button always gives a hint: if the model fails, the rule hint reads the same conversation.
      setCall(id, (c) => ({ msgs: [...c.msgs, ...(e?.status === 401 ? [{ who: 'note', text: aiError(e) }] : []), { who: 'hint', text: hintFor(c) }], hints: c.hints + 1 }));
      if (e?.status !== 401) console.error(e);
    }
    setBusy(null);
  };
  // "במוק-אפ: להריץ שיחה לדוגמה": plays the sample call into the open call.
  const playSample = () => {
    const id = call.id;
    const lines = SAMPLE_CALL.map(([who, text]) => ({ who: who === 'me' ? 'me' : 'client', text }));
    setCall(id, { msgs: [], sample: true });
    lines.forEach((m, i) => {
      timers.current[`s${i}`] = setTimeout(() => {
        const reached = SAMPLE_REACHED.slice(0, Math.ceil(((i + 1) / lines.length) * SAMPLE_REACHED.length));
        setCall(id, (c) => ({ msgs: [...c.msgs, m], reached, ...(i === lines.length - 1 ? { outcome: 'next' } : {}) }));
        if (i === lines.length - 1) setCall(id, (c) => ({ msgs: [...c.msgs, { who: 'end', text: 'רונית קבעה: מחר ב-9:00' }] }));
      }, 380 * (i + 1));
    });
  };
  const applySample = () => {
    const p = SHEET_FROM_SAMPLE.s1;
    setRow('s1', { answer: p.answer, short: p.short, src: p.src, mine: true });
  };
  const finishCall = async () => {
    const cur = stateRef.current.calls.find((c) => c.id === route.callId);
    if (busy) return;
    let fb;
    if (cur.sample) fb = { ...SAMPLE_FEEDBACK, avg: sampleAvg() };
    else if (hasAI()) {
      setBusy('feedback');
      try {
        fb = await ai.feedback(cur, talkRatio(cur.msgs));
      } catch (e) {
        setCall(cur.id, (c) => ({ msgs: [...c.msgs, { who: 'note', text: aiError(e) }] }));
        setBusy(null);
        return;
      }
      setBusy(null);
    } else fb = feedbackFor(cur);
    setCall(cur.id, { feedback: fb, outcome: fb.outcome });
    if (cur.sample) {
      applySample();
      setTimeout(() => notify('התשובה להתנגדות הזהב עודכנה בדף, במילים שלך', 'file-pen'), 600);
    } else if (fb.sheet?.answer) {
      // Any call where the objection was handled rewrites that row in the user's words.
      const cl = CLIENTS.find((x) => x.id === cur.clientId);
      const row = stateRef.current.sheet.find((r) => r.form === cl.form);
      if (row) {
        setRow(row.id, { answer: fb.sheet.answer, short: fb.sheet.short || row.short, src: `מהשיחה עם ${cl.first} · במילים שלך`, mine: true });
        setTimeout(() => notify(`התשובה ל"${row.said}" עודכנה בדף, במילים שלך`, 'file-pen'), 600);
      }
    }
    go({ screen: 'feedback', callId: cur.id });
  };
  // After feedback, another call with the same client works on the one fix.
  const retry = () => startCall(call.clientId, call.level, call.feedback?.fix?.principle || call.focus);
  const levelUp = () => {
    setLevel(call.level + 1);
    startCall(call.clientId, call.level + 1);
  };

  // "לקוח אמיתי שלך": with a key the model builds the hidden state from the description;
  // without one (or if the call fails), the description alone is used.
  const buildReal = async (d) => {
    let hidden = null;
    if (hasAI()) {
      try {
        const H = await ai.buildClient(d, FORMS.find((f) => f.id === d.form)?.label);
        hidden = { ...H, tries: H.tries?.length ? H.tries : ['השערה: לא ידוע'] };
      } catch (e) {
        notify('המודל לא זמין כרגע. הלקוח נבנה מהתיאור בלבד', 'info');
      }
    }
    return registerClient(clientFromDescription(d, hidden));
  };

  const hasFeedback = state.calls.some((c) => c.feedback);
  const finishStep = () => {
    patch({ done: true });
    go({ screen: 'done' });
  };

  const jump = (id) => {
    setDev(false);
    if (id === 'sample') return showSample();
    if (id === 'call') return startCall('ronit');
    if (id === 'brief') return go({ screen: 'brief', clientId: 'ronit' });
    if (id === 'stage') return go({ screen: 'stage', stageN: 8, clientId: 'ronit' });
    go({ screen: id });
  };
  const reset = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setState(freshState());
    setDev(false);
    go({ screen: 'opening' });
    notify('הנתונים אופסו', 'rotate-ccw');
  };

  // ---------- the frame of the step ----------
  const screen = route.screen === 'call' && !call ? 'room' : route.screen === 'feedback' && !call?.feedback ? 'room' : route.screen;
  const part = PART_OF[screen];
  const devBtn = html`<button type="button" onClick=${() => setDev((d) => !d)} title="הערות למפתחים (Shift+D)" aria-label="הערות למפתחים" class="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-brand-50 hover:text-brand-600 cursor-pointer max-md:hidden"><${Icon} name="code-xml" size=${18} /></button>`;
  const goHome = () => notify('במוק-אפ דף הבית לא פעיל. השלב נשאר פתוח במפה', 'house');
  const toPart = (i) => go({ screen: ['room', 'call', 'feedback', 'sheet'][i], callId: route.callId });
  const top = html`<${TopBar}
    step=${STEP}
    progress=${part == null ? null : html`<${Progress} parts=${PARTS} current=${part} maxReached=${hasFeedback ? 3 : part} done=${screen === 'done'} onJump=${(i) => ((i === 1 && !call) || (i === 2 && !call?.feedback) ? notify('בוחרים לקוח ומתחילים שיחה מהחדר', 'info') : toPart(i))} />`}
    tools=${html`${!EMBED && html`<${ViewToggle} view=${shellView} onChange=${onViewChange} class="max-md:hidden" />`}${devBtn}`}
    onHome=${goHome}
  />`;

  const toRoom = html`<${Button} variant="secondary" onClick=${() => go({ screen: 'room' })}>חזרה לחדר<//>`;
  const finishBtn = html`<${PrimaryButton} label="סיום השלב" check disabled=${!hasFeedback} onClick=${finishStep} />`;
  const needCall = !hasFeedback ? 'צריך שיחה אחת לפחות, עם משוב' : null;
  const myTurns = call ? call.msgs.filter((m) => m.who === 'me').length : 0;

  const bottom = {
    opening: html`<${BottomBar} status=${html`<span></span>`} primary=${html`<${PrimaryButton} label="מתחילים" onClick=${() => go({ screen: 'room' })} />`} />`,
    room: html`<${BottomBar} status=${html`<${Status} reason=${needCall} hint="בוחרים לקוח ומתחילים" />`} primary=${finishBtn} />`,
    brief: html`<${BottomBar} back=${toRoom} status=${html`<${Status} hint=${`רמה ${level} · כ-20 דקות`} />`} primary=${html`<${PrimaryButton} label="להתחיל את השיחה" onClick=${() => startCall(route.clientId)} />`} />`,
    call: call && html`<${BottomBar}
      back=${toRoom}
      extra=${call.msgs.length > 0 && html`<${Button} variant="text" onClick=${retry}><${Icon} name="rotate-ccw" size=${16} />לנסות שוב<//>`}
      status=${html`<${Status} reason=${myTurns === 0 ? 'עוד לא אמרת כלום' : null} hint=${call.outcome ? 'השיחה הסתיימה' : `${myTurns} ${myTurns === 1 ? 'הודעה' : 'הודעות'} שלך`} />`}
      primary=${html`<${PrimaryButton} label=${busy === 'feedback' ? 'הכריש כותב משוב...' : call.outcome ? 'למשוב' : 'לסיים ולקבל משוב'} disabled=${myTurns === 0 || !!busy} onClick=${finishCall} />`}
    />`,
    feedback: call && html`<${BottomBar}
      back=${toRoom}
      extra=${html`<${Button} variant="text" onClick=${retry}><${Icon} name="rotate-ccw" size=${16} />עוד שיחה עם ${client?.first}<//>`}
      status=${html`<span></span>`}
      primary=${html`<${PrimaryButton} label="לדף התשובות" onClick=${() => go({ screen: 'sheet', callId: route.callId })} />`}
    />`,
    stage: html`<${BottomBar} back=${html`<${Button} variant="secondary" onClick=${() => (call?.feedback ? go({ screen: 'feedback', callId: route.callId }) : go({ screen: 'room' }))}>${call?.feedback ? 'חזרה למשוב' : 'חזרה לחדר'}<//>`} status=${html`<span></span>`} primary=${html`<span></span>`} />`,
    drill: html`<${BottomBar} back=${toRoom} status=${html`<span></span>`} primary=${html`<span></span>`} />`,
    analysis: html`<${BottomBar} back=${toRoom} status=${html`<span></span>`} primary=${html`<span></span>`} />`,
    sheet: html`<${BottomBar} back=${toRoom} status=${html`<${Status} reason=${needCall} save=${'saved'} />`} primary=${finishBtn} />`,
    script: html`<${BottomBar} back=${html`<${Button} variant="secondary" onClick=${() => go({ screen: state.done ? 'done' : 'room' })}>${state.done ? 'חזרה לסיום' : 'חזרה לחדר'}<//>`} status=${html`<${Status} reason=${needCall} />`} primary=${state.done ? html`<${PrimaryButton} label="לשלב הבא" onClick=${() => notify('השלב הבא נפתח במפה: שלב 13', 'arrow-left')} />` : finishBtn} />`,
    done: html`<${BottomBar}
      extra=${html`<${Button} variant="text" onClick=${() => go({ screen: 'room' })}><${Icon} name="door-open" size=${16} />לחדר התרגול<//><${Button} variant="text" onClick=${() => go({ screen: 'sheet' })}><${Icon} name="file-text" size=${16} />דף התשובות<//>`}
      primary=${html`<${PrimaryButton} label="לשלב הבא" onClick=${() => notify('השלב הבא נפתח במפה: שלב 13', 'arrow-left')} />`}
    />`,
  }[screen];

  const body = {
    opening: html`<${Opening} />`,
    room: html`<${Room}
      state=${state}
      onPick=${(id) => go({ screen: 'brief', clientId: id })}
      onAdd=${(id, c) => setState((s) => ({ ...s, added: [...(s.added || []), id], real: c ? [...(s.real || []), c] : s.real || [] }))}
      onBuild=${buildReal}
      onMore=${() => notify('במערכת: לקוח חדש בכל לחיצה, שהמודל בונה מתיק הלקוח. במוק-אפ יש ארבעה נוספים', 'user-plus')}
      onResume=${(c) => (STAGE_DRILL[c.feedback.next?.stageN] ? go({ screen: 'stage', stageN: c.feedback.next.stageN, clientId: c.clientId, callId: c.id }) : go({ screen: 'brief', clientId: c.clientId }))}
      onTool=${(t) => go({ screen: t })}
      onContext=${() => setCtxOpen(true)}
      onSheet=${() => go({ screen: 'sheet' })}
    />`,
    brief: client && html`<${Brief} client=${client} level=${level} setLevel=${setLevel} onPrep=${() => setPrepFor(client.id)} last=${[...state.calls].reverse().find((c) => c.clientId === client.id && c.feedback)} />`,
    call: call && html`<${Call} key=${call.id} call=${call} busy=${busy} onSend=${send} onHint=${hint} onSample=${playSample} />`,
    feedback: call?.feedback && html`<${Feedback} key=${call.id} call=${call} notify=${notify} onPractice=${(n) => go({ screen: 'stage', stageN: n, clientId: call.clientId, callId: call.id })} onRetry=${retry} onLevelUp=${levelUp} onPrep=${() => setPrepFor(call.clientId)} />`,
    stage: html`<${StageDrill} stageN=${route.stageN} clientId=${route.clientId} onDone=${() => (call?.feedback ? go({ screen: 'feedback', callId: route.callId }) : go({ screen: 'room' }))} />`,
    drill: html`<${Drill} sheet=${state.sheet} onFinish=${() => (patch({ drill: { done: (state.drill?.done || 0) + 1 } }), go({ screen: 'room' }))} />`,
    analysis: html`<${Analysis} notify=${notify} />`,
    sheet: html`<${AnswerSheet} sheet=${state.sheet} setRow=${setRow} addRow=${addRow} removeRow=${removeRow} notify=${notify} onScript=${() => go({ screen: 'script' })} />`,
    script: html`<${CallScript} state=${state} setScript=${(p) => setState((s) => ({ ...s, script: { ...(s.script || { edits: {}, added: {} }), ...p } }))} notify=${notify} onSheet=${() => go({ screen: 'sheet' })} />`,
    done: html`<${Done} state=${state} onScript=${() => go({ screen: 'script' })} />`,
  }[screen];

  const isCall = screen === 'call';
  return html`<div class="fb-notebook flex h-dvh flex-col text-ink" dir="rtl">
    ${top}
    <main class=${isCall ? 'relative min-h-0 flex-1 overflow-hidden' : 'thin-scroll relative min-h-0 flex-1 overflow-y-auto'}>
      ${body}
      ${SHARK_LINE[screen] && html`<${PartnerBubble} key=${screen} message=${SHARK_LINE[screen]} unread=${unread} onRead=${() => setUnread(false)} />`}
    </main>
    ${bottom}
    <${Toast} toast=${toast} />
    ${ctxOpen && html`<${ContextSheet} onClose=${() => setCtxOpen(false)} />`}
    ${prepFor && CLIENTS.some((c) => c.id === prepFor) && html`<${PrepSheet} client=${CLIENTS.find((c) => c.id === prepFor)} sheet=${state.sheet} calls=${state.calls} notify=${notify} onClose=${() => setPrepFor(null)} />`}
    <${DevPanel} open=${dev} onClose=${() => setDev(false)} onJump=${jump} onReset=${reset} notify=${notify} />
  </div>`;
}

function Root() {
  const [view, setView] = useState(readView);
  useEffect(() => applyPhoneViewport(view), [view]);
  const change = (v) => {
    if (v === 'mobile') {
      try {
        writeHandoff(window.__flowbizSnapshot?.());
      } catch {}
    }
    saveView(v);
    setView(v);
  };
  if (!EMBED && !IS_PHONE && view === 'mobile') return html`<${PhonePreview} onSwitch=${change} />`;
  return html`<${App} view=${view} onViewChange=${change} />`;
}

applyPhoneViewport(readView());
render(html`<${Root} />`, document.getElementById('app'));
