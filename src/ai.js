// The real coach: the call, the hint and the feedback run on Claude with the sales-coach
// prompt (doc/sales-coach-prompt.md) as written. Only section 9 changes: FlowBiz's
// example block is replaced by the context block built from the user's data, as the
// system does in production.
// The mockup is a static page, so the API key is typed by whoever opens it (Shift+D) and
// is kept only in that browser's localStorage. Without a key, coach.js plays the client.
import { USER, CONTEXT, CLIENT_FILE, CLIENTS, LEVELS, STAGES, DIMS as DIM_LIST, g } from './data.js';
import { money } from './lib.js';

const KEY = 'flowbiz-pr-apikey';
const MODEL = 'claude-opus-5-5';
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.3.0/+esm';

export const getKey = () => {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
};
export const setKey = (v) => {
  try {
    if (v) localStorage.setItem(KEY, v.trim());
    else localStorage.removeItem(KEY);
  } catch {}
  client = null;
};
export const hasAI = () => !!getKey();

let client = null;
async function getClient() {
  if (client) return client;
  const { default: Anthropic } = await import(SDK_URL);
  // A key typed into this page by its own user, for a demo; production calls go through the server.
  client = new Anthropic({ apiKey: getKey(), dangerouslyAllowBrowser: true });
  return client;
}

// ---------- the system prompt ----------
let promptText = null;
async function basePrompt() {
  if (promptText) return promptText;
  const res = await fetch(new URL('../doc/sales-coach-prompt.md', import.meta.url));
  if (!res.ok) throw new Error('הפרומפט לא נטען');
  let t = (await res.text()).replace(/\r\n/g, '\n');
  t = t.replace(/^>.*\n+---\n+/m, ''); // the source note at the top of the file
  t = t.replace(/(## 9\.[^\n]*\n[\s\S]*?)```[\s\S]*?```/, (_, head) => `${head}\`\`\`\n${contextBlock()}\n\`\`\``);
  promptText = t;
  return t;
}

// Prompt section 9, from the user's own steps.
export function contextBlock() {
  return [
    `שם העסק: ${USER.business}`,
    `מה מוכרים: ${CONTEXT.sells}. ${USER.field}.`,
    `מי הלקוחות: ${USER.audience} (${USER.b2b ? 'B2B: בעלי עסקים שמחליטים בעצמם' : 'B2C: לקוחות פרטיים'}).`,
    `הכאב: ${CLIENT_FILE.pain}. הטריגר: ${CLIENT_FILE.trigger}. איפה הם: ${CLIENT_FILE.where}.`,
    `התנגדות הזהב: "${CLIENT_FILE.golden}".`,
    '',
    'מסלולים (המחירים כוללים מע"מ):',
    ...CONTEXT.tracks.map((t) => `- ${t.name}: ${money(t.price)}${t.price === 2200 ? ' לחודש' : ''}. ${t.note}.`),
    `בונוס: ${CONTEXT.bonus}.`,
    `ערבות: ${CONTEXT.guarantee}.`,
    '',
    `הוכחות שמותר להזכיר: אין עדיין לקוחות. מותר לספר מהניסיון של ${USER.firstName}: ${USER.experience}. עדות או תוצאת לקוח שהומצאה בשיחה היא דגל אדום. לא מורידים ציון על חוסר בסיפור לקוח.`,
    '',
    `התנגדויות נפוצות: ${CONTEXT.common.map((c) => `"${c}"`).join(', ')}.`,
    '',
    'כללים של העסק:',
    ...CONTEXT.rules.map((r) => `- ${r}.`),
  ].join('\n');
}

const trainee = () =>
  `המתאמן: ${USER.fullName}. ${g('פונים אליו בלשון זכר', 'פונים אליה בלשון נקבה')}, גם כשהפרומפט כתוב בזכר.`;

function persona(c, level) {
  const H = c.hidden;
  const L = LEVELS.find((l) => l.id === level);
  return [
    `הדמות שאתה משחק (נבחרה מראש, ובמקום שאלות 5.1 היא המצב הנסתר; אל תחשוף אותו):`,
    `- מי: ${H.who}. ${c.fem ? 'אישה: היא מדברת על עצמה בלשון נקבה.' : 'גבר: מדבר על עצמו בלשון זכר.'}`,
    `- איך הגיע לשיחה: ${c.from}. מה כתב: "${c.said}".`,
    `- הסיבה המוצהרת: ${H.stated}.`,
    `- המניע האמיתי: ${H.motive}.`,
    `- ניסיונות קודמים: ${H.tries.join(' | ')}.`,
    `- הצורך (מה פתרון חייב לכלול; יגיד רק אם ישאלו): ${H.need}.`,
    `- התאמה אמיתית (סעיף 3.6): ${H.fit.text}. הדמות לא הופכת למתאימה כי המתאמן הציג יפה.`,
    `- מכשול נסתר: ${H.obstacle}.`,
    `- מקבל החלטות נוסף: ${H.decider}.`,
    `- תקציב: ${H.budget}.`,
    `- אופי: ${H.character}.`,
    `- ההתנגדות העיקרית אחרי המחיר: "${H.objection}".`,
    `- תנאי לקנייה: ${H.condition}.`,
    `רמת קושי: ${L.label} (סעיף 5.2).`,
  ].join('\n');
}

const STAGE_LIST = STAGES.map((s) => `${s.n} ${s.name}`).join(', ');

// The conversation as the API sees it: the trainee is the user, the client is the assistant.
function history(call) {
  const out = [];
  for (const m of call.msgs) {
    if (m.who !== 'me' && m.who !== 'client') continue;
    const role = m.who === 'me' ? 'user' : 'assistant';
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += `\n${m.text}`;
    else out.push({ role, content: m.text });
  }
  return out;
}

async function ask({ system, messages, schema, effort = 'low', maxTokens = 4000 }) {
  const anthropic = await getClient();
  const prompt = await basePrompt();
  const req = {
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // The prompt is the same in every call, so it is cached; the per-call part follows it.
    system: [
      { type: 'text', text: prompt, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: system },
    ],
    messages,
    output_config: { effort, ...(schema ? { format: { type: 'json_schema', schema } } : {}) },
  };
  const res = await anthropic.beta.messages.create(req);
  if (res.stop_reason === 'refusal') throw new Error('המודל סירב לבקשה');
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  if (!schema) return text.trim();
  return JSON.parse(text);
}

// ---------- the client's turn (mode א) ----------
const TURN_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'מה הלקוח אומר עכשיו, בעברית מדוברת, עם הערות במה בסוגריים כשהן משנות משהו' },
    stage: { type: 'integer', description: 'השלב בסעיף 4 (0-15) שהשיחה הגיעה אליו בהודעה האחרונה של המתאמן' },
    outcome: { type: 'string', enum: ['none', 'buy', 'next', 'no', 'lost', 'think'] },
  },
  required: ['reply', 'stage', 'outcome'],
  additionalProperties: false,
};

export async function clientTurn(call) {
  const c = CLIENTS.find((x) => x.id === call.clientId);
  const system = [
    'מצב פעיל: סימולציה (מצב א). השיחה כבר התחילה, אל תציג את התפריט ואל תשאל את שאלות 5.1. אתה בדמות.',
    trainee(),
    persona(c, call.level),
    `ענה רק כלקוח, לפי 5.3 ו-5.4. בשדה stage: מספר השלב שהמתאמן הגיע אליו (${STAGE_LIST}).`,
    'בשדה outcome: none כל עוד אין החלטה. buy אם הדמות קנתה, next אם נקבע צעד הבא מוגדר (מועד, שליחת הצעה ושיחה נוספת), no אם הדמות סירבה בצדק או שנפרדתם (גם פרידה יפה כשאין התאמה), lost אם הדמות סירבה כי המתאמן המשיך לדחוף אחרי שהתברר שאין התאמה, think אם הדמות דחתה ל"צריך לחשוב" ומסיימת את השיחה.',
  ].join('\n\n');
  const out = await ask({ system, messages: history(call), schema: TURN_SCHEMA, effort: 'low' });
  return { reply: out.reply, stage: Math.max(0, Math.min(15, out.stage | 0)), outcome: out.outcome === 'none' ? null : out.outcome };
}

// ---------- "לקוח אמיתי שלי": the hidden state of a client the user described ----------
const S = { type: 'string' };
const CLIENT_SCHEMA = {
  type: 'object',
  properties: {
    who: { type: 'string', description: 'שם, גיל משוער, עיסוק, ותק והיקף העסק' },
    stated: S,
    motive: S,
    tries: { type: 'array', items: S },
    need: S,
    fit: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['fit', 'other', 'none'] },
        track: { type: 'string', enum: ['core', 'vip', 'workshop', 'none'] },
        text: S,
      },
      required: ['kind', 'track', 'text'],
      additionalProperties: false,
    },
    obstacle: S,
    decider: S,
    budget: S,
    character: S,
    objection: S,
    condition: S,
  },
  required: ['who', 'stated', 'motive', 'tries', 'need', 'fit', 'obstacle', 'decider', 'budget', 'character', 'objection', 'condition'],
  additionalProperties: false,
};

export async function buildClient(d, formLabel) {
  const he = (m, f) => (d.fem ? f : m);
  const system = [
    'מצב פעיל: בניית לקוח לתרגול. אל תשחק את הדמות עכשיו ואל תציג את התפריט. החזר רק את המצב הנסתר לפי 5.1.',
    trainee(),
    [
      'המתאמן תיאר לקוח אמיתי שלו, כדי להתאמן לפני שיחה אמיתית איתו. בנה ממנו מצב נסתר מלא לפי 5.1, נאמן לתיאור:',
      '- מה שכתוב בתיאור הוא עובדה. אל תשנה אותו ואל תסתור אותו.',
      '- מה שחסר, השלם באופן סביר מהעיסוק ומבלוק ההקשר, והתחל כל שדה שהשלמת במילה "השערה:". בלי מספרים מדויקים שלא נאמרו.',
      '- התאמה אמיתית (3.6): בדוק בכנות מול המסלולים בבלוק. core = המוצר המרכזי, vip = יום VIP, workshop = הסדנה. kind=none ו-track=none אם שום מסלול לא עונה על מה שתואר. אל תטה ל"מתאים" כי זה לקוח של המתאמן.',
      '- ההתנגדות העיקרית היא הדאגה שהמתאמן תיאר, במילים שלו.',
      `- ${he('הלקוח גבר', 'הלקוחה אישה')}. כתוב את השדות בגוף שלישי.`,
    ].join('\n'),
    [
      'התיאור:',
      `- שם: ${d.first}`,
      `- מי: ${d.who}`,
      `- איך הגיע: ${d.from || 'לא נאמר'}`,
      `- מה כתב או אמר: "${d.said}"`,
      `- מה מדאיג (צורה: ${formLabel}): ${d.worry || 'לא נאמר במילים שלו'}`,
      `- מה כבר ניסה: ${d.tries || 'לא נאמר'}`,
      `- עוד ידוע: ${d.known || 'לא נאמר'}`,
    ].join('\n'),
  ].join('\n\n');
  return ask({ system, messages: [{ role: 'user', content: 'בנה את המצב הנסתר של הלקוח.' }], schema: CLIENT_SCHEMA, effort: 'medium', maxTokens: 6000 });
}

// ---------- "/רמז" ----------
const HINT_SCHEMA = {
  type: 'object',
  properties: { hint: { type: 'string', description: 'הרמז: שורה או שתיים, מחוץ לדמות' } },
  required: ['hint'],
  additionalProperties: false,
};

export async function hint(call) {
  const c = CLIENTS.find((x) => x.id === call.clientId);
  const before = call.msgs.filter((m) => m.who === 'hint').map((m) => `- ${m.text}`);
  const system = [
    'מצב פעיל: סימולציה. המתאמן ביקש /רמז (סעיף 2): צא מהדמות לשורה או שתיים, תן כיוון בלי לפתור ובלי לכתוב את המשפט הבא במקומו. אל תחשוף את המצב הנסתר.',
    trainee(),
    persona(c, call.level),
    [
      'הרמז נשען על מה שקרה בשיחה עצמה, לא על כלל כללי:',
      `- התחל ממה שקרה עכשיו: ציטוט קצר מההודעה האחרונה של ${c.first} או של המתאמן, ואז הכיוון.`,
      '- אם המתאמן פספס משהו ש' + c.first + ' אמר (פרט, מספר, רגש), כוון אליו.',
      '- אם השיחה לא התחילה, כוון לפתיחה ולמסגור.',
      '- בלי פתיח ובלי "רמז:".',
      before.length ? `רמזים שכבר ניתנו בשיחה הזאת, אל תחזור עליהם:\n${before.join('\n')}` : '',
    ].filter(Boolean).join('\n'),
  ].join('\n\n');
  const msgs = history(call);
  if (msgs.length && msgs[msgs.length - 1].role === 'user') msgs[msgs.length - 1].content += '\n\n/רמז';
  else msgs.push({ role: 'user', content: msgs.length ? '/רמז' : '(השיחה עוד לא התחילה) /רמז' });
  // Room for thinking: a small max_tokens can end before any text comes out.
  const out = await ask({ system, messages: msgs, schema: HINT_SCHEMA, effort: 'low', maxTokens: 4000 });
  const text = (out.hint || '').trim();
  if (!text) throw new Error('הרמז חזר ריק');
  return text;
}

// ---------- "/עצור": the feedback (section 8) ----------
export const DIMS = DIM_LIST.map((d) => d.name);
const nb = { anyOf: [{ type: 'boolean' }, { type: 'null' }] };
const mapProps = Object.fromEntries(STAGES.map((s) => [`s${s.n}`, { type: 'string', enum: ['done', 'partial', 'missing', 'early'] }]));
const FEEDBACK_SCHEMA = {
  type: 'object',
  properties: {
    outcome: { type: 'string', enum: ['buy', 'next', 'no', 'lost', 'think'] },
    line: { type: 'string' },
    worked: { type: 'array', items: { type: 'object', properties: { quote: { type: 'string' }, did: { type: 'string' } }, required: ['quote', 'did'], additionalProperties: false } },
    fix: {
      type: 'object',
      properties: { title: { type: 'string' }, what: { type: 'string' }, effect: { type: 'string' }, principle: { type: 'string' }, alt: { type: 'string' }, stageN: { type: 'integer' } },
      required: ['title', 'what', 'effect', 'principle', 'alt', 'stageN'],
      additionalProperties: false,
    },
    more: { type: 'array', items: { type: 'string' } },
    flags: { type: 'array', items: { type: 'string' } },
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: { dim: { type: 'string', enum: DIMS }, score: { anyOf: [{ type: 'integer' }, { type: 'null' }] }, why: { type: 'string' } },
        required: ['dim', 'score', 'why'],
        additionalProperties: false,
      },
    },
    hiddenHits: {
      type: 'object',
      properties: { motive: nb, tries: nb, need: nb, fit: nb, obstacle: nb, decider: nb, budget: nb, condition: nb },
      required: ['motive', 'tries', 'need', 'fit', 'obstacle', 'decider', 'budget', 'condition'],
      additionalProperties: false,
    },
    map: { type: 'object', properties: mapProps, required: Object.keys(mapProps), additionalProperties: false },
    next: { type: 'object', properties: { stageN: { type: 'integer' }, text: { type: 'string' } }, required: ['stageN', 'text'], additionalProperties: false },
    sheet: { anyOf: [{ type: 'null' }, { type: 'object', properties: { answer: { type: 'string' }, short: { type: 'string' } }, required: ['answer', 'short'], additionalProperties: false }] },
  },
  required: ['outcome', 'line', 'worked', 'fix', 'more', 'flags', 'scores', 'hiddenHits', 'map', 'next', 'sheet'],
  additionalProperties: false,
};

export async function feedback(call, ratio) {
  const c = CLIENTS.find((x) => x.id === call.clientId);
  const system = [
    'המתאמן כתב /עצור. צא מהדמות ותן משוב מלא לפי סעיף 8, כשדות JSON:',
    trainee(),
    persona(c, call.level),
    [
      `outcome: התוצאה לפי 3.1 (buy, next, no, think). שיחה שנעצרה לפני החלטה היא think. התוצאה שנקבעה בשיחה: ${call.outcome || 'אין'}.`,
      'line: השורה האחת. worked: 2-3 דברים, עם ציטוט מדויק של המתאמן. fix: התיקון האחד לפי הכלל בסעיף 8, השלב השבור המוקדם ביותר (title קצר, what = ציטוט או תיאור הרגע, effect = מה זה עשה ללקוח, principle, alt = ניסוח חלופי מוכן, stageN = השלב בסעיף 4).',
      'more: עד 3. flags: דגלים אדומים מ-8.2 שקרו, ניסוח קצר. scores: 10 הממדים של 8.1 לפי הסדר, score 1-5 או null ל"לא הגיע" או "לא נדרש", why = משפט אחד.',
      `hiddenHits: לכל פריט במצב הנסתר, true אם המתאמן גילה אותו, false אם פספס, null אם לא רלוונטי (למשל אין מקבל החלטות נוסף). fit = true אם המתאמן אמר בקול את ההתאמה הנכונה (המסלול הנכון, או שאין התאמה). map: לכל שלב s0-s15: done, partial, missing או early. next: התרגיל הבא (stageN = השלב לתרגל, text = הצעה מדויקת). לשלבים 8 ו-10 יש תרגול שלב בודד. לכל שלב אחר התרגיל הוא שוב אותה שיחה, וה-text מתחיל ב"שוב אותה שיחה, עם ${c.first}. הפעם:".`,
      `sheet: התשובה של המתאמן להתנגדות של ${c.first} ("${c.hidden.objection}") בשיחה הזאת, במילים שלו, מסודרת קלות לשורה בדף התשובות: answer = התשובה המלאה (אפשר "(ואחרי שעונה:)" בין שני חלקים), short = גרסה קצרה לוואטסאפ, עד 110 תווים. בלי להמציא מה שהמתאמן לא אמר. null אם ההתנגדות לא עלתה, או שהתשובה לא עבדה (ויכוח, לחץ, הנחה, או שהלקוח לא השתכנע).`,
      call.hints ? `המתאמן ביקש ${call.hints === 1 ? 'רמז אחד' : `${call.hints} רמזים`} במהלך השיחה. ציין את זה בשורה אחת ב-more, בלי להוריד ציונים בגלל זה.` : 'המתאמן לא ביקש רמזים בשיחה.',
      `יחס הדיבור שנמדד בקוד: ${c.first} ${ratio}% מהמילים.`,
      `כתוב בעברית, פנה למתאמן ${g('בלשון זכר', 'בלשון נקבה')}, ועל ${c.first} ${c.fem ? 'בלשון נקבה' : 'בלשון זכר'}.`,
    ].join('\n'),
  ].join('\n\n');
  const msgs = history(call);
  if (msgs.length && msgs[msgs.length - 1].role === 'user') msgs[msgs.length - 1].content += '\n\n/עצור';
  else msgs.push({ role: 'user', content: '/עצור' });
  const fb = await ask({ system, messages: msgs, schema: FEEDBACK_SCHEMA, effort: 'medium', maxTokens: 16000 });
  const scores = DIMS.map((d) => {
    const s = fb.scores.find((x) => x.dim === d);
    return [d, s?.score == null ? null : Math.max(1, Math.min(5, s.score)), s?.why || 'לא הגיע'];
  });
  const real = scores.filter((s) => s[1] != null);
  return {
    ...fb,
    more: fb.more.slice(0, 3),
    scores,
    avg: real.length ? real.reduce((s, x) => s + x[1], 0) / real.length : 0,
    map: Object.fromEntries(STAGES.map((s) => [s.n, fb.map[`s${s.n}`]])),
    ratio,
    ai: true,
  };
}
