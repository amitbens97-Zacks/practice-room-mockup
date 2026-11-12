// "הסבר מהכריש": a fixed button in the top bar, on every screen of the step. It opens the shark's
// note with a short explanation of the screen (what we do here, what you see, why it matters).
// From the note, "לשאול את הכריש" opens a chat about the step: ready questions with written
// answers, and with an API key (Shift+D) any question goes to the model (ai.chat).
import { html, useState, useRef, useEffect, Icon, cx } from './lib.js';
import { SharkAvatar } from './components.js';
import { g } from './data.js';
import * as ai from './ai.js';
import { hasAI } from './ai.js';

export const EXPLAIN = {
  opening: {
    title: 'חדר התרגול',
    what: 'כאן מתאמנים על שיחת מכירה מול לקוחות מהקהל שלך, לפני שמגיעים ללקוח אמיתי.',
    see: 'שיחה של כ-20 דקות, ובסוף משוב עם תיקון אחד. מה שעונים טוב נכנס לדף התשובות ולתסריט.',
    why: 'ליד אמיתי שורפים פעם אחת. כאן אפשר לטעות, לנסות שוב, ולהגיע לשיחה האמיתית מוכנים.',
    qa: [
      ['כמה שיחות צריך?', 'שיחה אחת עם משוב מספיקה כדי לסיים את השלב. מי שעושה שלוש, שומע את עצמו משתפר.'],
      ['הלקוחות אמיתיים?', 'הם נבנים מהקהל שלך ומההצעה שלך, כל אחד עם דאגה אחרת. אפשר גם לתאר לקוח אמיתי שיש איתו שיחה בקרוב.'],
    ],
  },
  room: {
    title: 'החדר',
    what: 'כאן בוחרים עם מי מתאמנים.',
    see: 'כל כרטיס הוא לקוח: מה הוא כתב ומה מדאיג אותו. אפשר להוסיף לקוח חדש, או לקוח אמיתי שלך. בצד: התסריט, דף התשובות ושני כלים מהירים.',
    why: 'כל לקוח מסתיר משהו שנפתח רק לשאלה טובה. ככה מתרגלים לשאול, לא רק לענות.',
    qa: [
      ['במי כדאי להתחיל?', 'בלקוח שהדאגה שלו הכי מוכרת לך מהשיחות האמיתיות. שם התרגול הכי שווה.'],
      ['מה זה "לקוח אמיתי שלך"?', 'מתארים לקוח שיש איתו שיחה בקרוב, ואני בונה ממנו לקוח לתרגול. מה שלא ידוע מסומן כהשערה.'],
    ],
  },
  brief: {
    title: 'לפני השיחה',
    what: 'כאן מתכוננים לשיחה לפני שהיא מתחילה.',
    see: 'מי הלקוח ומה הוא כתב, המטרה של השיחה, ורמת הקושי.',
    why: 'מי שנכנס לשיחה עם מטרה ברורה מוביל אותה. המטרה היא החלטה, לא "אחשוב על זה".',
    qa: [
      ['איזו רמה לבחור?', 'בפעם הראשונה רמה 2. אחרי שיחה חזקה עם רמז אחד לכל היותר, עולים רמה.'],
      ['מה ההבדל בין הרמות?', 'ככל שהרמה עולה, הלקוח פותח פחות, בודק יותר ומעלה יותר התנגדויות.'],
    ],
  },
  call: {
    title: 'השיחה',
    what: 'כאן מדברים עם הלקוח, כמו בשיחה אמיתית.',
    see: 'למעלה החלק של השיחה שבו נמצאים ומה מכוונים אליו עכשיו. כשנתקעים, "רמז" נותן כיוון בלי לתת תשובה.',
    why: 'הלקוח לא מגלה הכול לבד. מה שמסתתר אצלו נפתח רק לשאלה טובה.',
    qa: [
      ['רמז מוריד ציון?', 'לא. הרמזים נספרים במשוב, כדי לדעת מתי לעלות רמה.'],
      ['מתי לסיים?', 'כשהלקוח החליט. אפשר גם לעצור בכל רגע ולקבל משוב על מה שהיה.'],
    ],
  },
  feedback: {
    title: 'המשוב',
    what: 'כאן רואים איך הלכה השיחה.',
    see: 'ציון לכל חלק בשיחה, מה עבד ומה לא, ותיקון אחד עם משפט להגיד בפעם הבאה. לחיצה על שורה פותחת את הפירוט.',
    why: 'תיקון אחד, לא עשרה. אותו מתרגלים עד שהוא יוצא טבעי.',
    qa: [
      ['למה רק תיקון אחד?', 'כי בשיחה אמיתית זוכרים דבר אחד. בוחרים את המקום הראשון שבו השיחה נשברה.'],
      ['מה זה "מה היה בראש שלו"?', 'מה שהלקוח הסתיר, ומה מזה גילית בשאלות שלך. נמצא למטה, תחת "להעמיק".'],
    ],
  },
  stage: {
    title: 'תרגול שלב אחד',
    what: 'כאן מתרגלים רק את הרגע שבו השיחה נשברה.',
    see: 'מה הלקוח אמר עד לשם, ומה עונים עכשיו. אחרי כל ניסיון, תיקון אחד, עד שזה נעשה.',
    why: 'במקום שיחה שלמה, חוזרים על הרגע הקשה כמה פעמים עד שהוא יושב.',
    qa: [['כמה פעמים לנסות?', 'עד שזה עובר. בדרך כלל שניים או שלושה ניסיונות.']],
  },
  drill: {
    title: 'סבב מהיר',
    what: 'כאן עונים על חמש התנגדויות ברצף.',
    see: 'לכל התנגדות: מה עבד, מה לתקן ותשובה לדוגמה. בסוף, איפה חזק ואיפה עוד נופלים.',
    why: g('התנגדות לא צריכה לתפוס אותך לא מוכן. כמה דקות כאן, וכבר שמעת את כולן.', 'התנגדות לא צריכה לתפוס אותך לא מוכנה. כמה דקות כאן, וכבר שמעת את כולן.'),
    qa: [['אפשר להוסיף התנגדות?', 'כן. מה ששמעת באמת מליד נכנס לסבב, למטה.']],
  },
  analysis: {
    title: 'ניתוח שיחה',
    what: 'כאן מנתחים שיחת מכירה אמיתית שכבר הייתה.',
    see: 'מדביקים תמלול או סיכום. אני מראה איפה השיחה נסגרה או נפלה, ותיקון אחד.',
    why: 'משיחה אמיתית לומדים הכי הרבה, גם כשהיא לא נסגרה.',
    qa: [['התמלול נשמר?', 'לא. רק המשוב נשמר, והתמלול נמחק.']],
  },
  sheet: {
    title: 'דף התשובות',
    what: 'כאן כל ההתנגדויות ומה עונים לכל אחת.',
    see: 'בכל כרטיס: מה הלקוח אומר ותשובה קצרה. "התשובה המלאה" פותחת שלושה צעדים: שואלים, עונים, סוגרים.',
    why: 'כשהתשובה כבר כתובה, שום התנגדות לא מפתיעה. מה שענית טוב בתרגול נכתב כאן במילים שלך.',
    qa: [
      ['אפשר להוסיף התנגדות?', 'כן, ב"התנגדות חדשה". כותבים מה הלקוח אמר, ואני מציע תשובה מלאה.'],
      ['למה לא מורידים מחיר?', 'כי זה אומר ללקוח שזה שווה פחות. עונים על מה שבאמת מדאיג אותו.'],
    ],
  },
  script: {
    title: 'התסריט שלך',
    what: 'כאן התסריט לשיחת מכירה, בעמוד אחד.',
    see: 'שישה חלקים, מה אומרים בכל אחד, ומה עונים להתנגדויות. כל שורה נערכת, ואני עוזר לשפר.',
    why: 'כשהשאלות כבר כתובות, הראש פנוי להקשיב ללקוח. בזום או בטלפון, להשאיר אותו פתוח מול העיניים.',
    qa: [
      ['זה לא יישמע כמו רובוט?', 'לא, אם השורות במילים שלך. לחיצה על הכריש ליד שורה משפרת אותה יחד איתי.'],
      ['מאיפה השורות?', 'ממה שעבד בתרגול ומדף התשובות. מה שלא תרגלת, כתבתי מההצעה שלך.'],
    ],
  },
  done: {
    title: 'השלב הושלם',
    what: 'יצאת מהשלב עם תסריט ודף תשובות, שמורים בקבצים.',
    see: 'התסריט, הדבר האחד לזכור לשיחה הבאה, ומה עשית בחדר.',
    why: 'החדר נשאר פתוח. לפני כל שיחה חשובה, אפשר לחזור ולהתאמן.',
    qa: [['איפה הקבצים?', 'בקבצים › מגדילים מכירות. אפשר להוריד כ-PDF או להעתיק.']],
  },
};

// The button in the top bar. It tells the page to open the shark's note (main.js listens).
export function ExplainButton({ class: cls = '' }) {
  return html`<button type="button" onClick=${() => window.dispatchEvent(new CustomEvent('fb:explain'))} aria-label="הסבר מהכריש" class=${cx('no-print inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white pe-1 ps-1 text-[14px] font-bold text-brand-600 ring-1 ring-brand-200 transition hover:bg-brand-50 hover:ring-brand-300 sm:pe-3.5 cursor-pointer', cls)}>
    <${SharkAvatar} size=${30} /><span class="whitespace-nowrap max-sm:hidden">הסבר מהכריש</span>
  </button>`;
}

// The inside of the shark's note: the explanation, then the chat.
export function SharkTalk({ screen }) {
  const ex = EXPLAIN[screen] || EXPLAIN.opening;
  const [chat, setChat] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useRef(null);
  useEffect(() => list.current?.scrollTo(0, 1e6), [msgs.length, busy]);
  const asked = new Set(msgs.filter((m) => m.me).map((m) => m.text));
  const send = async (q) => {
    q = q.trim();
    if (!q || busy) return;
    setText('');
    const history = [...msgs, { me: true, text: q }];
    setMsgs(history);
    setBusy(true);
    const ready = ex.qa.find(([k]) => k === q);
    let reply;
    if (ready) {
      await new Promise((r) => setTimeout(r, 500));
      reply = ready[1];
    } else if (hasAI()) {
      try {
        reply = await ai.chat(ex.title, history);
      } catch (e) {
        console.error(e);
        reply = 'לא הצלחתי לענות כרגע. אפשר לנסות שוב בעוד רגע.';
      }
    } else {
      await new Promise((r) => setTimeout(r, 400));
      reply = 'במוקאפ אני עונה על השאלות המוכנות. עם מפתח API (Shift+D) אפשר לשאול אותי כל דבר על השלב.';
    }
    setMsgs((m) => [...m, { me: false, text: reply }]);
    setBusy(false);
  };

  if (!chat)
    return html`<div class="text-[15px] leading-relaxed">
      <p class="mb-2 font-display text-[17px] font-bold text-brand-900">${ex.title}</p>
      <p>${ex.what}</p>
      <p class="mt-1.5 text-muted">${ex.see}</p>
      <p class="mt-2 rounded-xl bg-brand-50 px-3 py-2 font-semibold text-brand-900">${ex.why}</p>
      <button type="button" onClick=${() => setChat(true)} class="mt-3 inline-flex items-center gap-1.5 text-[15px] font-bold text-brand-600 hover:underline cursor-pointer"><${Icon} name="message-circle" size=${16} />לשאול את הכריש</button>
    </div>`;

  return html`<div class="text-[15px]">
    <button type="button" onClick=${() => setChat(false)} class="mb-2 inline-flex items-center gap-1 text-[13px] font-bold text-muted hover:text-ink cursor-pointer"><${Icon} name="arrow-right" size=${14} />חזרה להסבר</button>
    <div ref=${list} class="thin-scroll flex max-h-[240px] flex-col gap-2 overflow-y-auto">
      ${msgs.length === 0 && html`<p class="text-muted">${g('מה תרצה לדעת על', 'מה תרצי לדעת על')} "${ex.title}"?</p>`}
      ${msgs.map((m, i) => html`<p key=${i} class=${cx('max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-snug', m.me ? 'self-start rounded-ss-md bg-brand-600 text-white' : 'self-end rounded-se-md bg-canvas ring-1 ring-line')}>${m.text}</p>`)}
      ${busy && html`<p class="self-end rounded-2xl bg-canvas px-3 py-2 text-muted ring-1 ring-line">הכריש כותב...</p>`}
    </div>
    ${ex.qa.some(([q]) => !asked.has(q)) && html`<div class="mt-2.5 flex flex-wrap gap-1.5">${ex.qa.filter(([q]) => !asked.has(q)).map(([q]) => html`<button key=${q} type="button" onClick=${() => send(q)} class="rounded-full bg-white px-2.5 py-1 text-start text-[13px] font-semibold text-brand-600 ring-1 ring-brand-200 hover:bg-brand-50 cursor-pointer">${q}</button>`)}</div>`}
    <form class="mt-2.5 flex gap-1.5" onSubmit=${(e) => (e.preventDefault(), send(text))}>
      <input value=${text} onInput=${(e) => setText(e.target.value)} onKeyDown=${(e) => e.stopPropagation()} placeholder="לשאול על השלב..." aria-label="שאלה לכריש" class="h-10 min-w-0 flex-1 rounded-xl bg-white px-3 text-[15px] ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand-300" />
      <button type="submit" disabled=${!text.trim() || busy} aria-label="לשלוח" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white disabled:opacity-40 cursor-pointer"><${Icon} name="send" size=${17} /></button>
    </form>
  </div>`;
}
