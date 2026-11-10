// The practice call, as a static mockup can show it. In production every turn of the
// client is written by the model with the sales-coach prompt (practice-room/
// sales-coach-prompt.md) and the hidden state of the client. Here a small rule engine
// plays the client by the same rules of prompt 5.3: a shallow question gets a shallow
// answer, a good question opens one more layer, an exact summary warms the client,
// a long explanation cools them, an early price brings the objection, pressure loses trust.
// The feedback at the end follows prompt section 8 and is built from what happened.
import { g, USER, CLIENTS, STAGES } from './data.js';

const R = (re) => (t) => re.test(t);
const IS = {
  price: R(/₪|\b\d,?\d{3}\b|המחיר|מחיר של|עלות/),
  frame: R(/בסוף (השיחה|נחליט)|נחליט (יחד|ביחד)|כן או לא|מה יקרה בשיחה|בחצי השעה|ברבע השעה|איך השיחה תיראה/),
  whyNow: R(/למה (דווקא )?עכשיו|מה גרם|מה הביא|דווקא עכשיו|השאר(ת|תה|ת־)? (לי )?(את ה)?פרטים|פני(ת|תה) אליי|הגע(ת|תה|תי) אליי|מה (גרם|הביא) לך/),
  about: R(/(^|\s)ת?ספר(י|ו)? (לי )?(על|קצת|מה|איך)|^ת?ספר(י|ו)? לי[.!?]?$|על העסק|מה (את|אתה) עוש(ה|ים)|במה (את|אתה) עוס(ק|קת)|איך העסק|מה העסק|הכירי? לי|תציג(י)? את עצמך/),
  small: R(/מה שלומך|מה נשמע|מה העניינים|איך (את|אתה) מרגיש|מה קורה איתך/),
  turn: R(/^(תורך|תורך\.|אני מקשיב(ה)?|אני איתך|כן\??|נו|יאללה)$|(בוא|בואי|בואו) נתחיל|נתחיל\?|מעולה,? (בוא|בואי)/),
  numbers: R(/כמה (לקוחות|מטופלים|מטופלות|פניות|עבודות|פרויקטים|מרוויח|מרוויחה|הכנסה|עובדים|עובדות)|במספרים|מחזור|הכנסה/),
  tries: R(/ניסית|ניסיתם|מה עשית(ם)? עד|ניסיונות|מה כבר עשית|מה עשית בשביל/),
  likes: R(/אהבת|מה עבד|מה לא עבד|מה היה טוב|מה היה חסר/),
  motive: R(/מה ישתנה|למה (זה )?חשוב|מה יקרה אם|בעוד שנה|בשביל מה|למה דווקא|מה זה (ישנה|יאפשר)|מה (זה )?אומר (לך|עלייך|עליך)/),
  budget: R(/תקציב|כמה (את |אתה |אתם )?(מוכנ|משקיע|יכול)|כמה השקעת|כמה הולך היום/),
  decider: R(/מי עוד|(בן|בת) ה?זוג|שותף|אשתך|בעלך|לבד\?|מחליט(ה)? לבד|בבית/),
  time: R(/כמה זמן (יש|פנוי)|שעות פנויות|זמן פנוי|כמה שעות/),
  success: R(/מה צריך לקרות|שיחה מוצלחת|שתרגיש|שתרגישי/),
  summary: R(/אם אני מסכמ|אם אני מסכם|לסכם|כלומר|הבנתי נכון|אז (את|אתה) היום/),
  fault: R(/לא באשמת|חתיכה/),
  permission: R(/רוצה לשמוע|אפשר לספר|רוצה שאספר|מתאים שאספר/),
  threeQ: R(/בעמדה להחליט|בנוח לעבוד|פותר את/),
  close: R(/נתקדם|נקבע|נסגור|קישור|ראשון או|מתחילים|לסגור/),
  nextStep: R(/מחר|היום ב|ב-?\d{1,2}(:\d\d)?\b|יום (ראשון|שני|שלישי|רביעי|חמישי)/),
  urgency: R(/רק (היום|עד)|נשאר(ו)? (לי )?(רק )?מקום|המחיר עולה|מבצע|לפני שייגמר/),
  discount: R(/הנחה|אוריד|להוריד (את )?המחיר/),
  argue: R(/אבל (את|אתה) לא|(את|אתה) טועה|זה לא נכון|לא הבנת/),
  giveup: R(/תחשוב(י)?( על זה)? ותחזור|תחזור(י)? אליי|תחשבי ותחזרי/),
  isolate: R(/חוץ מזה|עוד משהו שעוצר|עוד משהו שמפריע/),
  worryQ: R(/מה (הכי )?(מפריע|מדאיג)|ממה (את|אתה) חושש|מה עוצר|מה בדיוק לא/),
  loop: R(/זה פותר|זה עונה|זה סוגר/),
  leading: R(/מסכימ(ה)? ש|נכון\?$/),
  judging: R(/למה לא עשית|אז מה הבעיה/),
  question: R(/\?/),
};

const CLIENT_WORDS = {
  ronit: [/חלש/, /30|שלושים/, /עובדות/, /סוכנות|לייק/, /לא ידעת|מה קורה/],
  avi: [/חורף/, /משכורות|עובדים/, /יד2|מודעות/, /זול|מחיר/],
  michal: [/קטנ/, /בית שלם|גדול/, /קורס/, /אינסטגרם/],
};

// The client's lines by what the user did. {u} = how the client addresses the user.
const LINES = {
  ronit: {
    about: ['קליניקה לפיזיותרפיה בקריית ביאליק. אני ועוד שתי מטפלות, שש שנים. רוב המטופלים הגיעו עד עכשיו מהמלצות.', 'מה עוד לספר... בעיקר אורתופדיה וספורטאים.'],
    turn: ['(מחייכת) אני? חשבתי ש{you} {tell} לי.', 'כן, אני מקשיבה.'],
    idle: ['כן?', 'לא בטוחה שהבנתי מה השאלה.', '(מחכה) ו...?'],
    hello: ['היי. עמוס היום, אבל יש לי חצי שעה.'],
    frame: ['כן, סבבה.'],
    whyNow: ['היה לי חודש חלש. ראיתי את הפוסט שלך על פרסום בלי אסטרטגיה, וזה דיבר אליי.', 'חודש חלש.'],
    numbers: ['בערך 30 אחוז פחות מטופלים מהרגיל. ועדיין יש לי שתי עובדות לשלם להן.'],
    tries: ['עבדתי עם סוכנות פרסום ארבעה חודשים. 2,500 בחודש. היו לייקים, פניות כמעט לא.'],
    likes: ['אהבתי שמישהו אחר מטפל בזה. לא אהבתי שלא ידעתי מה קורה. כל חודש דוח עם גרפים שלא הבנתי.'],
    motive: ['(שקט קצר) האמת? הבטחתי לילדים שעד הקיץ אני מפסיקה לעבוד בערבים. כרגע זה לא קורה.'],
    budget: ['לא הרבה. אחרי הסוכנות אני זהירה.'],
    decider: ['אני מחליטה לבד.'],
    time: ['שעה בשבוע אני יכולה למצוא. לא יותר.'],
    success: ['שאצא עם כיוון ברור, גם אם לא נעבוד ביחד.'],
    objection: ['(שותקת כמה שניות) אוקיי. נשמע כמו מה שהסוכנות הבטיחה לי. ניסיתי כבר, זה לא עבד.'],
    worry: ['כן. שאשלם, ושוב לא אדע מה קורה.'],
    isolate: ['לא, זה העיקר. בכסף אני אסתדר.'],
  },
  avi: {
    about: ['מיזוג אוויר. התקנות ותיקונים, אני ושלושה עובדים, בשרון. 15 שנה.', 'מה יש לספר. מזגנים.'],
    turn: ['{you} {called} אליי. מה רצית לשאול?', 'כן, אני פה.'],
    idle: ['כן, ו?', '{say} לי מה {want} לדעת.', '(מסתכל בשעון) יש לי עוד עשר דקות.'],
    hello: ['כן, אהלן. אני בין עבודה לעבודה, יש לי רבע שעה.'],
    frame: ['יאללה, בסדר.'],
    whyNow: ['החורף מגיע. בחורף אצלי מת.', 'החורף.'],
    numbers: ['בקיץ 60 אלף בחודש. בחורף חצי, אם יש.'],
    tries: ['שמתי מודעות ביד2. הגיעו כאלה שרוצים רק מחיר.'],
    likes: ['ביד2 לפחות הטלפון צלצל. אבל אנשים שרוצים זול, לא שירות.'],
    motive: ['(נאנח) בחורף אני משלם משכורות מהחסכונות. אני לא רוצה לפטר אף אחד.'],
    budget: ['אין לי כסף לזה עכשיו, האמת.', 'אם זה מחזיר את עצמו, אפשר לדבר על 2,500 בחודש.'],
    decider: ['מירב, אשתי, מנהלת את הכסף. היא חושבת ששיווק זה בזבוז.'],
    time: ['שעה בשבוע, בערב.'],
    success: ['שאדע אם זה שווה לי, בלי חפירות.'],
    objection: ['7,500? זה יקר לי. אין לי את זה עכשיו.'],
    worry: ['שאשים כסף בחורף, ולא יהיו עבודות.'],
    isolate: ['ומירב. היא צריכה להסכים.'],
  },
  michal: {
    about: ['מעצבת פנים. אני ועוזרת. בעיקר שיפוצים קטנים: מטבח, חדר, פינה.', 'עיצוב פנים. ארבע שנים.'],
    turn: ['אני רק רציתי לשמוע מה יש. {tellImp} {you2} קודם?', 'אוקיי, אני פה.'],
    idle: ['אוקיי, ו?', 'לא הבנתי למה {you} {ask} את זה.', '(רושמת משהו) כן?'],
    hello: ['היי. רק רציתי לשמוע מה יש.'],
    frame: ['אוקיי.'],
    whyNow: ['קראתי את המדריך. טעות 3 זה בדיוק אני.', 'סקרנות.'],
    numbers: ['בערך 25 אלף בחודש. הרבה עבודות קטנות.'],
    tries: ['עשיתי קורס שיווק דיגיטלי אונליין. לא סיימתי.'],
    likes: ['הקורס היה מסודר. אבל לבד אני לא מתקדמת.'],
    motive: ['אני רוצה פרויקטים של בית שלם. נמאס לי מחדר אחד פה ופינה שם.'],
    budget: ['תלוי במה. אני לא שמה כסף על משהו שאני לא מבינה.'],
    decider: ['אני לבד.'],
    time: ['יש לי שלושה פרויקטים פתוחים עד סוף החודש. אין לי רגע.'],
    success: ['שאבין אם זה לוקח לי זמן או חוסך לי זמן.'],
    objection: ['אין לי זמן עכשיו. אולי אחרי החגים?'],
    worry: ['שזה יהיה עוד קורס שאני לא מסיימת.'],
    isolate: ['לא. אם זה באמת שעתיים בשבוע, זה אחרת.'],
  },
};

const pick = (arr, i = 0) => fill(arr[Math.min(i, arr.length - 1)]);
// The client addresses the trainee by the trainee's gender.
const fill = (t) =>
  t
    .replace('{you}', g('אתה', 'את'))
    .replace('{you2}', g('אתה', 'את'))
    .replace('{tell}', g('תספר', 'תספרי'))
    .replace('{tellImp}', g('תספר', 'תספרי'))
    .replace('{called}', g('פנית', 'פנית'))
    .replace('{say}', g('תגיד', 'תגידי'))
    .replace('{want}', g('אתה רוצה', 'את רוצה'))
    .replace('{ask}', g('שואל', 'שואלת'));
const you = (c) => g(c.fem ? 'אתה' : 'אתה', 'את');

export function newCall(clientId, level = 2) {
  return { clientId, level, msgs: [], f: {}, reached: [], warm: 0, pending: false, resolved: false, outcome: null, hints: 0, turns: 0 };
}

const STAGE_OF = { hello: 1, turn: 1, about: 3, frame: 2, whyNow: 3, numbers: 4, budget: 4, decider: 4, time: 4, success: 5, tries: 6, likes: 6, motive: 6, summary: 7, fault: 8, permission: 9, pitch: 9, threeQ: 10, price: 11, worryQ: 12, isolate: 12, loop: 12, close: 12, nextStep: 13 };

// One user message in, the client's reply out. Returns the new call state.
export function userSays(call, text) {
  const c = CLIENTS.find((x) => x.id === call.clientId);
  const L = LINES[c.id];
  const f = { ...call.f };
  const st = { ...call, f, msgs: [...call.msgs, { who: 'me', text }], turns: call.turns + 1 };
  const reach = (k) => {
    const n = STAGE_OF[k];
    if (n != null && !st.reached.includes(n)) st.reached = [...st.reached, n];
  };
  const say = (line) => (st.msgs = [...st.msgs, { who: 'client', text: line }]);
  const long = text.length > 230 && !IS.question(text);
  f.longs = long ? (f.longs || 0) + 1 : 0;
  if (long) f.longEver = true;
  if (IS.leading(text)) f.leading = text;
  if (IS.judging(text)) f.judging = text;
  const first = call.turns === 0;
  if (first) reach('hello');

  // Pressure first: it changes how the client reads everything else.
  if (IS.giveup(text)) {
    f.giveup = text;
    say(c.id === 'michal' ? 'אוקיי. אחשוב על זה ואחזור.' : 'כן, אחשוב על זה.');
    st.outcome = 'think';
    return st;
  }
  if (IS.urgency(text)) {
    f.urgency = text;
    st.warm -= 2;
    say('(נסגר/ת קצת) אני לא אוהב/ת שלוחצים עליי. אני צריך/ה לחשוב על זה.'.replace('נסגר/ת', c.fem ? 'נסגרת' : 'נסגר').replace('אוהב/ת', c.fem ? 'אוהבת' : 'אוהב').replace('צריך/ה', c.fem ? 'צריכה' : 'צריך'));
    st.outcome = st.level >= 3 ? 'think' : null;
    return st;
  }
  if (IS.discount(text) && !f.discount) {
    f.discount = text;
    say(`רגע, אם ${g('אתה מוריד', 'את מורידה')} כל כך מהר, כמה זה באמת שווה?`);
    return st;
  }
  if (IS.argue(text)) {
    f.argue = text;
    st.warm -= 1;
    say('אוקיי... (מחפש/ת יציאה) תשלח/י לי משהו במייל.'.replace('מחפש/ת', c.fem ? 'מחפשת' : 'מחפש').replace('תשלח/י', g('תשלח', 'תשלחי')));
    return st;
  }

  // The answer to the decision.
  if (IS.close(text) || (st.pending && IS.nextStep(text))) {
    reach('close');
    if (IS.nextStep(text)) (f.nextStep = text), reach('nextStep');
    f.close = f.close || text;
    if (!f.price && !IS.price(text)) {
      say(c.id === 'avi' ? 'רגע, כמה זה עולה בכלל?' : 'לפני שקובעים משהו, כמה זה עולה?');
      return st;
    }
    if (st.pending && !st.resolved) {
      say(pick(L.objection, 1) || pick(L.objection));
      return st;
    }
    if (f.summary && f.permission && st.warm >= 2 && st.level <= 2) {
      say(c.fem ? `טוב. ${g('בוא', 'בואי')} נתחיל. ${g('תשלח', 'תשלחי')} לי את הקישור.` : `סגור. ${g('תשלח', 'תשלחי')} קישור, ונתחיל.`);
      st.outcome = 'buy';
    } else if (f.nextStep) {
      say(c.fem ? `מתאים. ${g('תשלח', 'תשלחי')} לי פרטים לפני.` : `סגור. ${g('תשלח', 'תשלחי')} לי פרטים.`);
      st.outcome = 'next';
    } else {
      say('אוקיי... ומה בעצם הצעד הבא?');
    }
    return st;
  }

  if (IS.price(text)) {
    reach('price');
    f.price = f.price || text;
    const ready = f.summary && (f.budget || f.decider || f.time);
    if (!f.summary) f.priceEarly = f.priceEarly || text;
    if (!ready) {
      st.pending = true;
      say(pick(L.objection));
    } else {
      st.pending = c.id === 'avi' && !f.decider;
      say(st.pending ? pick(L.isolate) : c.id === 'avi' ? 'בשלושה תשלומים? זה כבר אחרת.' : '(חושבת) זה לא מעט. אבל זה מה שחסר לי.');
    }
    if (long) f.pitch = f.pitch || text;
    return st;
  }
  if (st.pending && IS.worryQ(text)) {
    reach('worryQ');
    f.worryQ = text;
    say(pick(L.worry));
    return st;
  }
  if (IS.isolate(text)) {
    reach('isolate');
    f.isolate = text;
    say(pick(L.isolate));
    return st;
  }
  if (st.pending && (IS.loop(text) || (f.worryQ && text.length > 60))) {
    reach('loop');
    if (IS.loop(text)) f.loop = text;
    st.resolved = true;
    st.pending = false;
    f.handled = text;
    say(c.id === 'ronit' ? 'זה כבר נשמע אחרת. אני רוצה לראות איך נראה המעקב הזה לפני שאני מחליטה.' : c.id === 'avi' ? 'בשלושה תשלומים, ואם מירב שומעת את זה ממך... אולי.' : 'אם זה באמת שעתיים בשבוע, אני מוכנה לשמוע עוד.');
    return st;
  }
  if (IS.summary(text)) {
    reach('summary');
    f.summary = text;
    const hits = (CLIENT_WORDS[c.id] || []).filter((re) => re.test(text)).length;
    if (hits >= 2) {
      st.warm += 2;
      f.confirmed = true;
      if (IS.fault(text)) f.fault = text, reach('fault');
      say(c.fem ? 'נכון, בדיוק. (נפתחת) ככה בדיוק אני מרגישה.' : 'נכון. בדיוק ככה.');
    } else {
      say('לא בדיוק... זה יותר מסובך מזה.');
    }
    return st;
  }
  if (IS.fault(text)) {
    reach('fault');
    f.fault = text;
    st.warm += 1;
    say('(נושם/ת) טוב לשמוע את זה.'.replace('נושם/ת', c.fem ? 'נושמת' : 'נושם'));
    return st;
  }
  if (IS.permission(text)) {
    reach('permission');
    f.permission = text;
    say(f.summary ? `כן, ${g('ספר', 'ספרי')}.` : 'אוקיי... (קצת חשדן/ית)'.replace('חשדן/ית', c.fem ? 'חשדנית' : 'חשדן'));
    return st;
  }
  if (IS.threeQ(text)) {
    reach('threeQ');
    f.threeQ = text;
    say(c.id === 'avi' && !f.decider ? 'רגע. אני צריך לדבר עם מירב לפני כל החלטה.' : 'כן. ואם המספר הגיוני, אני יכולה להחליט.'.replace('יכולה', c.fem ? 'יכולה' : 'יכול'));
    if (c.id === 'avi' && !f.decider) f.decider = text;
    return st;
  }

  // "ספרי לי על העסק": an open invitation gets the picture, then the story.
  if (IS.about(text) && !IS.whyNow(text)) {
    reach('about');
    const seen = f.about ? 1 : 0;
    f.about = f.about || text;
    say(first ? `${pick(L.hello)} ${pick(L.about, seen)}` : pick(L.about, seen));
    return st;
  }
  if (IS.small(text) && text.length < 60) {
    reach('hello');
    say(first ? `בסדר, תודה. ${pick(L.hello).replace(/^(היי|כן, אהלן)\.\s*/, '')}` : 'בסדר, תודה.');
    return st;
  }
  if (IS.turn(text) && text.length < 40) {
    reach('turn');
    if (first) say(pick(L.hello));
    else (f.turn = (f.turn || 0) + 1), say(pick(L.turn, f.turn - 1));
    return st;
  }

  // Discovery: a good open question opens one more layer; a shallow one gets little.
  const order = ['frame', 'whyNow', 'numbers', 'tries', 'likes', 'motive', 'budget', 'decider', 'time', 'success'];
  const hit = order.find((k) => IS[k](text));
  if (hit) {
    reach(hit);
    const seen = f[hit] ? 1 : 0;
    f[hit] = f[hit] || text;
    const deep = IS.question(text) && text.length < 160;
    if (hit === 'motive' && st.level >= 3 && !f.tries) {
      say('לא יודע/ת. שיהיו עוד לקוחות.'.replace('יודע/ת', c.fem ? 'יודעת' : 'יודע'));
      f.motive = null;
      return st;
    }
    say(pick(L[hit], deep ? seen : 1));
    if (hit === 'motive') st.warm += 1;
    return st;
  }
  if (long) {
    f.pitch = f.pitch || text;
    reach('pitch');
    st.warm -= 1;
    say(st.level >= 3 ? 'אוקיי. כמה זה עולה?' : 'מעניין. (מסתכל/ת בשעון)'.replace('מסתכל/ת', c.fem ? 'מסתכלת' : 'מסתכל'));
    return st;
  }
  if (first) {
    say(pick(L.hello));
    return st;
  }
  if (st.level >= 4 && st.turns === 3 && !f.price) {
    say(`לפני הכל, כמה זה עולה? ${g('תשלח', 'תשלחי')} לי משהו במייל.`);
    return st;
  }
  // Nothing the client can hold on to: a short, in-character reply, never the same twice in a row.
  f.idle = (f.idle || 0) + 1;
  say(IS.question(text) ? (st.level >= 3 ? 'תלוי. במה בדיוק?' : 'האמת שלא חשבתי על זה. למה ' + g('אתה שואל', 'את שואלת') + '?') : pick(L.idle, (f.idle - 1) % L.idle.length));
  return st;
}

// "רמז": out of character for a line, a direction without the answer (prompt 2).
export function hintFor(call) {
  const f = call.f;
  const c = CLIENTS.find((x) => x.id === call.clientId);
  if (!call.msgs.length) return 'פותחים באדם, לא בעסק. ואחר כך אומרים מה יקרה בשיחה.';
  if (call.pending && !f.worryQ) return 'זו לא התנגדות על המוצר. יש דאגה מאחוריה. מה היא?';
  if (call.pending && !f.isolate) return 'לפני שעונים: זה הדבר היחיד שעוצר?';
  if (!f.frame) return `${c.first} לא יודע/ת מה יקרה בשיחה ושבסוף מחליטים.`.replace('יודע/ת', c.fem ? 'יודעת' : 'יודע');
  if (!f.whyNow) return 'עוד לא שמעת למה דווקא עכשיו.';
  if (!f.tries) return 'מה כבר קרה לפני השיחה הזאת? שם מסתתרת התחמושת.';
  if (!f.motive) return 'יש מספר, אין סיבה. מה ישתנה בחיים כשזה יקרה?';
  if (!f.budget && !f.decider && !f.time) return 'יש עוד מכשול שלא עלה. כסף, זמן, או מישהו נוסף?';
  if (!f.summary) return `${c.first} עוד לא שמע/ה את הבעיה שלו/ה במילים שלו/ה.`.replace('שמע/ה', c.fem ? 'שמעה' : 'שמע').replace(/שלו\/ה/g, c.fem ? 'שלה' : 'שלו');
  if (!f.permission) return 'לפני ההצגה, מבקשים רשות.';
  if (!f.price) return 'ההצגה קצרה ומחוברת למילים שלה/ו. אחר כך שלוש שאלות, ואז המספר.'.replace('שלה/ו', c.fem ? 'שלה' : 'שלו');
  if (!f.close) return 'שמעת מספיק כן. מה מבקשים עכשיו?';
  return 'אף שיחה לא נגמרת בלי מועד ביומן.';
}

// ---------- The feedback, by prompt section 8 ----------
const DIMS = ['מסגור ופתיחה', 'עומק הגילוי', 'סיכום ותיוג', 'מכשולים לפני המחיר', 'המעבר וההצגה', 'המחיר', 'טיפול בהתנגדויות', 'בקשת החלטה', 'טון ויחס דיבור'];
const DIM_STAGE = [2, 6, 7, 4, 9, 11, 12, 13, 1];

export function talkRatio(msgs) {
  const len = (w) => msgs.filter((m) => m.who === w).reduce((s, m) => s + m.text.replace(/\(.*?\)/g, '').length, 0);
  const me = len('me');
  const cl = len('client');
  return me + cl ? Math.round((cl / (me + cl)) * 100) : 0;
}

export function feedbackFor(call) {
  const f = call.f;
  const c = CLIENTS.find((x) => x.id === call.clientId);
  const ratio = talkRatio(call.msgs);
  const obst = [f.budget, f.decider, f.time].filter(Boolean).length;
  const sc = [
    f.frame ? [5, 'מסגרת ברורה, והסכמה על החלטה בסוף.'] : call.reached.includes(1) ? [3, 'פתיחה אנושית, בלי מסגרת.'] : [1, 'נכנסת ישר לעניין.'],
    f.tries && f.motive ? [5, 'הגעת למניע ולניסיונות.'] : f.tries || f.whyNow ? [3, 'שאלת למה, אבל לא ירדת למניע.'] : [1, 'שאלות שטחיות, ומעבר מהיר להצגה.'],
    f.summary && f.confirmed ? [f.fault ? 5 : 4, f.fault ? 'סיכום במילים שלה/ו, אישור, וחתיכה חסרה.' : 'סיכום מדויק ואישור בקול.'] : f.summary ? [3, 'סיכום בלי אישור, או לא במילים של הלקוח.'] : [1, 'אין סיכום.'],
    !f.price ? [null, 'לא הגיע'] : obst >= 2 ? [5, 'המכשולים עלו לפני המספר.'] : obst === 1 ? [3, 'שאלת על חלק מהמכשולים.'] : [1, 'לא שאלת על תקציב, זמן או מי מחליט.'],
    !f.pitch && !f.permission ? [null, 'לא הגיע'] : f.permission && !f.longEver ? [5, 'בקשת רשות, והצגה קצרה.'] : f.longEver ? [2, 'הסבר ארוך על המוצר.'] : [3, 'הצגה סבירה, לא מחוברת ללקוח.'],
    !f.price ? [null, 'לא הגיע'] : f.priceEarly || f.discount ? [2, f.discount ? 'הנחה מיוזמתך.' : 'המחיר נאמר מוקדם מדי.'] : f.threeQ ? [5, 'שלוש השאלות, ואז מספר בביטחון.'] : [3, 'מחיר נאמר, בלי חיבור למטרה.'],
    !call.pending && !call.resolved && !f.worryQ ? [null, 'לא הגיע'] : f.argue || f.urgency ? [1, 'ויכוח או לחץ.'] : f.worryQ && f.isolate && call.resolved ? [5, 'בידוד, הדאגה שמאחור, פירוק ולולאה.'] : f.worryQ || f.isolate ? [3, 'תשובה סבירה, בלי בידוד או בלי לולאה.'] : [2, 'ענית על המשפט, לא על הדאגה.'],
    f.close && f.nextStep ? [5, 'בקשה מפורשת וצעד הבא ביומן.'] : f.close ? [3, 'ביקשת פעם אחת, בלי מועד.'] : [1, 'לא ביקשת החלטה.'],
    ratio >= 60 && !f.leading && !f.judging ? [5, 'הלקוח דיבר הרבה יותר, ושאלות סקרניות.'] : ratio >= 45 ? [3, 'מאוזן.'] : [1, 'דיברת יותר מהלקוח.'],
  ];
  const fix = (s) => s.replace(/שלה\/ו/g, c.fem ? 'שלה' : 'שלו');
  const scores = DIMS.map((d, i) => [d, sc[i][0], fix(sc[i][1])]);
  const real = scores.filter((s) => s[1] != null);
  const avg = real.length ? real.reduce((s, x) => s + x[1], 0) / real.length : 0;
  const weakest = real.reduce((a, b) => (b[1] < a[1] ? b : a), real[0] || ['', 5, '']);
  const wi = DIMS.indexOf(weakest[0]);

  const worked = [];
  const add = (q, did) => q && worked.length < 3 && worked.push({ quote: q, did });
  add(f.frame, 'מסגרת ברורה. ההחלטה בסוף כבר מוסכמת.');
  add(f.likes || f.tries, 'פתחת את הניסיונות הקודמים: התחמושת של הסגירה.');
  add(f.motive, 'ירדת מתחת לפני השטח, למה שבאמת מניע.');
  add(f.summary && f.confirmed ? f.summary : null, 'סיכום שהלקוח אישר. מכאן הוא מקשיב אחרת.');
  add(f.isolate, 'בידדת את ההתנגדות לפני שענית.');
  add(f.worryQ, 'שאלת על הדאגה, לא ענית על המשפט.');

  const ALT = {
    0: '"לפני שנתחיל: בחצי השעה הקרובה אשאל, אספר איך אני עובד, ובסוף נחליט יחד, כן או לא. מתאים?"',
    1: '"ומה ישתנה לך כשזה יקרה? ומה יקרה אם בעוד שנה הכל יישאר אותו דבר?"',
    2: '"אז אם אני מסכם: אתה היום ב-___, רוצה להגיע ל-___, ניסית ___, וזה נתקע ב-___. הבנתי נכון?"',
    3: '"לפני שנדבר על פתרון: מי עוד מחליט איתך, וכמה מתאים לך להשקיע בזה?"',
    4: '"יש לי כמה מחשבות איך לסגור את זה, חלק מהן אפשר לעשות גם לבד. רוצה לשמוע?"',
    5: '"לפני שאני נותן מספרים, שלוש שאלות קצרות: זה פותר את ___? נוח לך לעבוד איתי? ואם המספר הגיוני, אתה בעמדה להחליט היום?"',
    6: '"חוץ מזה, יש עוד משהו שעוצר?" ואחרי הפירוק: "זה פותר לך את זה?"',
    7: '"בוא נתקדם. אני שולח קישור, ונקבע את המפגש הראשון כבר עכשיו. ראשון או רביעי?"',
    8: '"מעניין, תספר לי עוד." (ושתיקה.)',
  };
  const PRINCIPLE = {
    0: 'מסגרת בהתחלה הופכת את ההחלטה בסוף לטבעית.',
    1: 'מה שמניע קנייה נמצא מתחת: למה זה חשוב, ומה כבר נוסה.',
    2: 'לפני כל הצגה, הלקוח שומע את הבעיה שלו במילים שלו ומאשר.',
    3: 'לפני המחיר זו שאלה תמימה. אחרי המחיר זו התנגדות.',
    4: 'מבקשים רשות, ומוכרים את היעד, לא את הדרך.',
    5: 'שלוש שאלות לפני המספר, ואז שותקים.',
    6: 'מוצאים את הדאגה שמאחורי המשפט, מבודדים, ומבקשים שוב.',
    7: 'מבקשים במפורש. אף שיחה לא נגמרת בלי מועד ביומן.',
    8: 'הלקוח מדבר לפחות פי שניים. שאלות קצרות וסקרניות.',
  };
  const gm = (s) => (GENDER_F() ? s.replace('אני עובד', 'אני עובדת').replace('אני נותן', 'אני נותנת').replace('אני מסכם', 'אני מסכמת').replace('אני שולח', 'אני שולחת') : s);
  const lastMe = [...call.msgs].reverse().find((m) => m.who === 'me');
  const whatQ = { 2: f.pitch || f.price, 4: f.pitch, 5: f.priceEarly || f.price, 3: f.price, 6: f.handled || lastMe?.text, 7: lastMe?.text }[wi] || lastMe?.text || '';
  const fixBlock = weakest[0]
    ? {
        title: `${weakest[0]}: ${weakest[2]}`,
        what: whatQ.length > 140 ? `${whatQ.slice(0, 137)}...` : whatQ,
        effect: wi === 2 || wi === 4 ? `${c.first} שמע/ה פתרון לפני שהרגיש/ה מובן/ת, ולכן נסגר/ה.`.replace(/\/ה|\/ת/g, c.fem ? 'ה' : '').replace('מובןה', c.fem ? 'מובנת' : 'מובן') : `זה השאיר את ${c.first} בלי סיבה טובה להגיד כן.`,
        principle: PRINCIPLE[wi],
        stageN: DIM_STAGE[wi],
        alt: gm(ALT[wi]),
      }
    : null;
  const more = real.filter((s) => s[1] <= 2 && s[0] !== weakest[0]).slice(0, 3).map((s) => `${s[0]}: ${s[2]}`);
  const flags = [];
  if (f.priceEarly) flags.push('המחיר נאמר לפני שהלקוח אישר את הבעיה.');
  if (f.longEver) flags.push('הודעה ארוכה בלי שאלה.');
  if (f.argue) flags.push('התנגדות נענתה בוויכוח.');
  if (f.urgency) flags.push('דחיפות שלא נראית אמיתית.');
  if (f.discount) flags.push('הנחה שהוצעה לפני שהלקוח ביקש.');
  if (!f.nextStep && call.outcome !== 'buy') flags.push('השיחה נגמרה בלי צעד הבא מוגדר.');

  const map = {};
  STAGES.forEach((s) => {
    const r = call.reached.includes(s.n);
    map[s.n] = r ? 'done' : 'missing';
  });
  if (f.priceEarly) map[11] = 'early';
  if (f.pitch && !f.summary) map[9] = 'early';
  map[0] = 'partial';

  return {
    outcome: call.outcome || 'think',
    line: weakest[0] ? `${weakest[1] <= 2 ? 'הנקודה שעצרה את השיחה' : 'מה שהכי כדאי לחזק'}: ${weakest[0]}.` : 'שיחה קצרה מדי למשוב מלא.',
    worked,
    fix: fixBlock,
    more,
    flags,
    scores,
    avg,
    hiddenHits: { motive: !!f.motive, tries: !!f.tries, obstacle: c.id === 'ronit' ? !!f.tries : c.id === 'avi' ? !!f.decider : !!f.time, decider: c.id === 'avi' ? !!f.decider : null, budget: !!f.budget, condition: !!call.resolved },
    next: { stageN: DIM_STAGE[wi], text: wi === 2 ? 'תרגול שלב אחד: סיכום ותיוג, מאותו רגע בשיחה.' : `שוב אותה שיחה, עם ${c.first}. הפעם: ${PRINCIPLE[wi] || ''}` },
    map,
    ratio,
  };
}

const GENDER_F = () => g(false, true);

// ---------- Quick round: three lines of feedback per answer (prompt section 6) ----------
export function drillFeedback(item, answer, sheetRow) {
  const asked = /\?/.test(answer);
  const worryQ = IS.worryQ(answer) || /אין (לך|לכם) את הסכום|לא בטוח שזה שווה|מתי לדעתך|מה לדעתך יפריע|מה הדבר העיקרי/.test(answer);
  const disc = IS.discount(answer);
  const urg = IS.urgency(answer);
  const giveup = IS.giveup(answer) || /אין בעיה/.test(answer);
  const worked = disc || urg ? 'ענית מהר, בלי להתווכח.' : worryQ ? 'שאלת על הדאגה שמאחורי המשפט.' : asked ? 'החזרת שאלה ולא נכנסת להסבר.' : answer.length < 120 ? 'תשובה קצרה ושקטה.' : 'לא התווכחת.';
  const fix = disc
    ? 'הצעת הנחה לפני שביקשו. זה אומר ללקוח שהמחיר לא באמת המחיר.'
    : urg
      ? 'דחיפות בלי בסיס פוגעת באמון, ולא עונה על מה שעוצר.'
      : giveup
        ? 'ויתרת על ההחלטה. החלטה צריכה מידע, לא זמן.'
        : !worryQ
          ? 'ענית על המשפט. קודם מבררים מה הדאגה שמאחוריו.'
          : 'אחרי הפירוק: "זה פותר לך את זה?", ולבקש שוב.';
  return { worked, fix, sample: sheetRow?.answer || '', good: worryQ && !disc && !urg && !giveup };
}

// ---------- Single stage: one fix at a time until it comes out natural (mode ד) ----------
export function stageFeedback(spec, text) {
  const hits = spec.keys.filter((k) => k.re.test(text));
  const missing = spec.keys.filter((k) => !k.re.test(text));
  const done = missing.length === 0 || (missing.length === 1 && missing[0].id !== 'confirm' && hits.length >= 4);
  return { hits, missing, done, fix: missing[0] ? `עוד חסר: ${missing[0].label}.` : '' };
}

// ---------- Analysis of a pasted call (mode ג): a light map for text that is not the sample ----------
export function analyzeText(text) {
  const lines = text.split('\n').filter(Boolean);
  const me = lines.filter((l) => !/^[^:]{1,20}:/.test(l) || l.startsWith(USER.firstName) || l.startsWith('אני'));
  const all = me.join('\n');
  const map = {};
  STAGES.forEach((s) => (map[s.n] = 'missing'));
  if (lines.length) map[1] = 'partial';
  if (IS.frame(all)) map[2] = 'done';
  if (IS.whyNow(all)) map[3] = 'done';
  if (IS.budget(all) || IS.decider(all)) map[4] = 'done';
  if (IS.tries(all) || IS.motive(all)) map[6] = 'done';
  if (IS.summary(all)) map[7] = 'done';
  if (IS.permission(all)) map[9] = 'done';
  if (IS.price(all)) map[11] = IS.summary(all) ? 'done' : 'early';
  if (IS.close(all)) map[12] = 'done';
  if (IS.nextStep(all)) map[13] = 'done';
  const flags = [];
  if (IS.urgency(all)) flags.push('דחיפות שלא נראית אמיתית.');
  if (!IS.nextStep(all)) flags.push('השיחה נגמרה בלי צעד הבא מוגדר.');
  if (IS.price(all) && !IS.summary(all)) flags.push('המחיר נאמר לפני שהלקוח אישר את הבעיה.');
  return { map, flags, ratio: talkRatio(lines.map((l) => ({ who: me.includes(l) ? 'me' : 'client', text: l }))) };
}
