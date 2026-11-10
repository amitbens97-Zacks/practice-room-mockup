// Developer notes for task 7, plus a jump list of every screen (Shift+D).
import { html, Icon, cx, useState } from './lib.js';
import { GENDER, setDemoGender } from './data.js';
import { getKey, setKey } from './ai.js';

export const JUMPS = [
  { id: 'opening', label: 'שלב 12: מסך פתיחה' },
  { id: 'room', label: 'החדר: בחירת לקוח' },
  { id: 'brief', label: 'לפני השיחה (רונית)' },
  { id: 'call', label: 'השיחה (רונית, ריקה)' },
  { id: 'sample', label: 'משוב על השיחה לדוגמה' },
  { id: 'stage', label: 'תרגול שלב אחד: סיכום ותיוג' },
  { id: 'drill', label: 'סבב התנגדויות מהיר' },
  { id: 'analysis', label: 'ניתוח שיחה שהייתה' },
  { id: 'sheet', label: 'דף תשובות להתנגדויות' },
  { id: 'done', label: 'סיום השלב' },
];

const NOTES = [
  {
    title: 'מה יש כאן',
    items: [
      'שלב 12 "חדר התרגול", הראשון בפרק "מגדילים מכירות". היום השלב נקרא "אימון מכירות".',
      'הבסיס: הסיסטם פרומפט של מאמן שיחות המכירה (practice-room/sales-coach-prompt.md), שמגיע מ-FlowBiz. המוק-אפ מראה איך כל חלק בפרומפט נראה בתוך השלב.',
      'עם מפתח API (למעלה בפאנל) השיחה, הרמז והמשוב רצים על Claude (claude-opus-5-5) עם הפרומפט המלא מ-doc/sales-coach-prompt.md. סעיף 9 בו מוחלף בבלוק ההקשר מהנתונים של המשתמש, וההוראה לכל קריאה מוסיפה את הדמות והמצב הנסתר שלה. הקוד ב-src/ai.js. בלי מפתח, src/coach.js משחק את הלקוח לפי כללים פשוטים, רק כדי שאפשר יהיה לעבור על המסכים. השיחה לדוגמה עם רונית והמשוב עליה כתובים מראש.',
    ],
  },
  {
    title: 'מהפרומפט למסכים',
    items: [
      'סעיף 2 וסעיף 10 (תפריט ארבעת המצבים) הופכים למסך החדר: שלושה לקוחות (סימולציה), "סבב התנגדויות מהיר" ו"ניתוח שיחה שהייתה". "תרגול שלב אחד" נפתח מ"התרגיל הבא" שבמשוב.',
      'הפקודות הופכות לכפתורים: /רמז = "רמז", /עצור = "לסיים ולקבל משוב", /מחדש = "לנסות שוב", /ציון = לשונית "הציונים", /הסבר = "להסבר קצר" ליד העיקרון במשוב.',
      'סעיף 9 (בלוק ההקשר) נבנה בקוד מהנתונים של המשתמש: "אני והעסק" (קהל, B2B/B2C), תיק הלקוח (כאב, טריגר, איפה, התנגדות הזהב), סל המוצרים (מסלולים ומחירים כולל מע"מ), תנאי התשלום מ"העסק במספרים", ההצעה המנצחת (בונוס, ערבות, שאלות). הדוגמה של FlowBiz בפרומפט היא דוגמה בלבד.',
      'הוכחות: אם אין לקוחות בבלוק ההקשר, הסיפור בשיחה מגיע מהניסיון של המשתמש (דף המסרים) או מדוגמה שנאמרת כדוגמה. לא מורידים ציון על חוסר בסיפור לקוח. עדות ממוצאת מסומנת כדגל אדום.',
      'פנייה למשתמש לפי ההגדרה "איך נפנה אליך?". הפרומפט כתוב בלשון זכר, וההנחיה למודל צריכה לציין את המגדר. גם הלקוח המדומה פונה למשתמש לפי המגדר.',
      'לקוח עסקי מול לקוח פרטי (B2B/B2C משלב 2) קובע את סוג הדמויות: בעל עסק שמחליט, מול לקוח פרטי.',
    ],
  },
  {
    title: 'הסימולציה',
    items: [
      'שלושה לקוחות, כל אחד עם דאגה מרכזית אחרת: התנגדות הזהב מתיק הלקוח, מחיר (מהסל ומההצעה), וזמן או אמון. המצב הנסתר (סעיף 5.1) נוצר פעם אחת כשנכנסים ללקוח, נשמר, ונשאר קבוע בכל השיחות איתו.',
      'רמת קושי 1-4 נבחרת לפני כל שיחה. ברירת מחדל 2.',
      'בכל תור: קריאה אחת למודל עם הפרומפט, בלוק ההקשר, המצב הנסתר וההיסטוריה. התשובה: ההודעה של הלקוח, ומספר השלב (0-13) שאליו הגיעה השיחה, בשביל הפס מעל השיחה.',
      'הפס מראה 6 קבוצות של 14 השלבים: פתיחה ומסגור (0-2), הגילוי (3-6), סיכום וערך (7-8), ההצעה (9-10), מחיר והחלטה (11-12), צעד הבא (13). במשוב רואים את כל 14. מתחת לפס: שורת "עכשיו:" עם מה מכוונים אליו בחלק הנוכחי (טקסט קבוע לכל קבוצה, ב-call.js). כשכל השלבים של קבוצה נעשו, היא עוברת לקבוצה הבאה.',
      '"רמז": קריאה קצרה ונפרדת, שורה או שתיים מחוץ לדמות, כיוון בלי תשובה. מוצג כבועה של הכריש, לא כהודעה של הלקוח. הכריש לא כותב את התשובה במקום המשתמש: בשלב הזה "להכניס לתשובה" כבוי.',
      'מונה "מי מדבר יותר" מחושב בקוד מאורך ההודעות (בלי הערות במה בסוגריים).',
      'תקרה: 40 הודעות של המשתמש בשיחה. ההגבלה של טוקנים למשתמש (הבקשה הדחופה) חלה גם כאן.',
    ],
  },
  {
    title: 'המשוב',
    items: [
      'קריאה נפרדת בסוף השיחה, שמחזירה JSON לפי סעיף 8: outcome, line, worked[] (ציטוט + מה עשה), fix (title, what, effect, principle, alt, stage), more[] (עד 3), flags[] (סעיף 8.2), scores[9] (ממד, 1-5 או null = "לא הגיע", הסבר), hidden_hits, map (0-13: done/partial/missing/early), next (stage, text), ratio.',
      'ממוצע הציונים והממד החלש מחושבים בקוד, לא במודל.',
      'התוצאה: קנה / צעד הבא נקבע / סירב בצדק ונפרדתם יפה = הצלחה. "צריך לחשוב" ושיחה שנעצרה לפני החלטה = לא הצלחה. זה מוצג, אבל לא חוסם את סיום השלב.',
      'לשונית "מה היה בראש של..." חושפת את המצב הנסתר רק אחרי השיחה, עם "גילית / פספסת" לכל פריט.',
      'בכניסה הבאה לחדר מוצג "מהפעם הקודמת" עם התיקון האחד (סעיף 10).',
    ],
  },
  {
    title: 'דף תשובות להתנגדויות',
    items: [
      'התוצר של השלב. מקובץ לפי חמש הצורות (זמן, כסף, התאמה, סמכות, הימנעות). בכל שורה: מה הלקוח אמר, הדאגה שמאחור, תשובה, וגרסה קצרה לוואטסאפ, עם המקור.',
      'בהתחלה: התנגדות הזהב מתיק הלקוח, השאלות מההצעה המנצחת, וההתנגדויות הנפוצות של הקהל. אחרי כל שיחה, שורה שעלתה בה נכתבת מחדש במילים של המשתמש ומסומנת "במילים שלך".',
      'כל תשובה ניתנת לעריכה. הורדה כ-PDF, ושמירה בקבצים › מגדילים מכירות.',
    ],
  },
  {
    title: 'סבב מהיר וניתוח',
    items: [
      'סבב התנגדויות: 5 התנגדויות מכל הצורות, משוב בשלוש שורות ותשובה לדוגמה מדף התשובות, וסיכום אחרי 5 (איפה חזק, איפה נופל). אפשר להוסיף לסבב התנגדות ששמעו באמת.',
      'ניתוח: מדביקים תמלול או סיכום. מיפוי ל-14 השלבים, רגע המפתח, כל התנגדות לאחור, יחס דיבור, ומשוב לפי סעיף 8. התמלול לא נשמר, רק המשוב.',
    ],
  },
  {
    title: 'סיום השלב ומה יורד',
    items: [
      'סיום השלב: אחרי סימולציה אחת לפחות שקיבלה משוב. השלב נשאר פתוח מהמפה ומדף התשובות.',
      'יורד: חמש הדמויות הקבועות (personas.jsx), המאמן שעוצר באמצע השיחה (coach_intervention), sale_closed כמדד היחיד, והסיכום הריק.',
      'יורד: "להכניס לתשובה" של הכריש בתוך השיחה (useMentorFillCurrent בשלב 21 הישן).',
      'יורד: ה"ספארינג" בשלב 11 (warm-outreach/SparringPhase). כל התרגול בשלב 12.',
      'השיחות הישנות (sales_training.conversations) לא עוברות לשלב החדש.',
    ],
  },
];

function KeyBox({ notify }) {
  const [has, setHas] = useState(!!getKey());
  const [val, setVal] = useState('');
  const save = () => {
    if (!val.trim()) return;
    setKey(val);
    setVal('');
    setHas(true);
    notify?.('המפתח נשמר. השיחה רצה עכשיו על המודל', 'sparkles');
  };
  return html`<section class="mb-4 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 p-3">
    <h3 class="mb-1 font-bold text-brand-900">המודל בשיחה</h3>
    <p class="mb-2 flex items-center gap-1.5 text-[13px] font-bold ${has ? 'text-brand-600' : 'text-muted'}"><${Icon} name=${has ? 'sparkles' : 'cog'} size=${14} />${has ? 'Claude עם הפרומפט המלא' : 'בלי מפתח: לקוח מדומה לפי כללים'}</p>
    ${has
      ? html`<button type="button" class="text-[13px] font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${() => (setKey(''), setHas(false))}>למחוק את המפתח מהדפדפן</button>`
      : html`<div class="flex gap-1.5"><input type="password" autocomplete="off" dir="ltr" placeholder="sk-ant-..." value=${val} onInput=${(e) => setVal(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && save()} class="min-w-0 flex-1 rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-[13px]" aria-label="מפתח Anthropic API" /><button type="button" class="rounded-lg bg-brand-600 px-3 text-[13px] font-bold text-white cursor-pointer" onClick=${save}>לשמור</button></div>`}
    <p class="mt-2 text-[12px] text-muted">המפתח נשמר רק בדפדפן הזה ונשלח רק ל-Anthropic. כדאי מפתח נפרד עם תקרת הוצאה. במערכת עצמה הקריאה עוברת דרך השרת, והמשתמש לא רואה מפתח.</p>
  </section>`;
}

export function DevPanel({ open, onClose, onJump, onReset, notify }) {
  return html`<aside
    class=${cx(
      'fixed inset-y-0 end-0 z-[70] flex w-full max-w-sm flex-col border-s border-slate-200 bg-white shadow-2xl transition-transform duration-200',
      open ? 'translate-x-0' : '-translate-x-full pointer-events-none invisible',
    )}
    aria-hidden=${!open}
  >
    <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <h2 class="flex items-center gap-2 text-[16px] font-bold text-slate-900"><${Icon} name="code-xml" size=${17} /> הערות למפתחים</h2>
      <button type="button" onClick=${onClose} aria-label="סגירה" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"><${Icon} name="x" size=${18} /></button>
    </div>
    <div class="thin-scroll flex-1 overflow-y-auto p-4 text-[14px] leading-relaxed text-slate-700">
      <${KeyBox} notify=${notify} />
      <section class="mb-4 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 p-3">
        <h3 class="mb-2 font-bold text-brand-900">המשתמש לדוגמה</h3>
        <div class="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="המשתמש לדוגמה">
          ${[
            ['m', 'דניאל', 'פנייה בלשון זכר'],
            ['f', 'דניאלה', 'פנייה בלשון נקבה'],
          ].map(
            ([id, name, sub]) => html`<button
              key=${id}
              type="button"
              role="radio"
              aria-checked=${GENDER === id}
              onClick=${() => GENDER !== id && setDemoGender(id)}
              class=${cx('rounded-lg border px-3 py-1.5 text-start cursor-pointer', GENDER === id ? 'border-brand-600 bg-brand-100 text-brand-600' : 'border-brand-200 bg-white text-brand-900')}
            ><b class="block text-[14px]">${name}</b><small class="text-[12px]">${sub}</small></button>`,
          )}
        </div>
        <button type="button" class="mt-2 text-[13px] font-bold text-brand-600 underline underline-offset-2 cursor-pointer" onClick=${onReset}>לאפס את כל הנתונים</button>
      </section>
      <section class="mb-5 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 p-3">
        <h3 class="mb-2 font-bold text-brand-900">מעבר מהיר בין המסכים</h3>
        <div class="flex flex-col gap-1.5">
          ${JUMPS.map((j) => html`<button key=${j.id} type="button" onClick=${() => onJump(j.id)} class="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-start text-[13px] font-semibold hover:bg-brand-50 cursor-pointer">${j.label}</button>`)}
        </div>
      </section>
      ${NOTES.map(
        (n) => html`<section key=${n.title} class="mb-4 p-1">
          <h3 class="mb-1.5 font-bold text-slate-900">${n.title}</h3>
          <ul class="list-disc space-y-1 ps-4">${n.items.map((t) => html`<li>${t}</li>`)}</ul>
        </section>`,
      )}
    </div>
  </aside>`;
}
