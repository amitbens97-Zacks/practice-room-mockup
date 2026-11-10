// The practice call, as a static mockup can show it. In production every turn of the
// client is written by the model with the sales-coach prompt (practice-room/
// sales-coach-prompt.md) and the hidden state of the client. Here a small rule engine
// plays the client by the same rules of prompt 5.3: a shallow question gets a shallow
// answer, a good question opens one more layer, an exact summary warms the client,
// a long explanation cools them, an early price brings the objection, pressure loses trust.
// The feedback at the end follows prompt section 8 and is built from what happened.
import { g, USER, CLIENTS, STAGES, DIMS, fixDim } from './data.js';

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
  success: R(/מה צריך לקרות (בשיחה|היום)|שיחה מוצלחת|שתרגיש|שתרגישי/),
  // Prompt v2: what the solution must hold, the fit check, a pitch in a question mark, parting well.
  need: R(/מה (צריך|חייב|חשוב) (ש)?(יהיה|יקרה|לקרות|להיות)|כדי שזה (באמת |הפעם )?יעבוד|מה לא יכול (לחזור|לקרות)|מה חייב להיות|מה (את|אתה) צריכ(ה)? (מ|ש)|מה היית רוצה שיהיה/),
  fit: R(/(זה |לא |שזה |ש)מתאים (לך|ל[א-ת]+)|לא בשבילך|זה לא מה שיפתור|לא חושב(ת)? שזה|בדיוק מה ש(את|אתה|אנחנו|אני)|המסלול (ה)?מתאים|מה שמתאים לך|VIP|יום אחד מרוכז|הסדנה (האישית )?(תתאים|מתאימה)/),
  disguised: R(/ניסית(ם)? (כבר )?(פרסום|ממומן|קמפיין|אינסטגרם|פייסבוק|גוגל|טיקטוק|סוכנות|ליווי)|לא היה עוזר לך|לא (היית רוצה|כדאי לך|עדיף)|לא חשבת על (ליווי|פרסום|קמפיין)/),
  part: R(/בהצלחה|נדבר באביב|אחרי החורף|(ת|י)חזור(י)? אליי כש|אפנה אותך|אמליץ לך על|אחבר אותך|שווה לך לנסות לבד|(תוכל|תוכלי) לעשות (את זה )?לבד/),
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
    need: ['(חושבת) שאני אבין מה קורה. כל שבוע, לא דוח פעם בחודש. ושזה יהיה שלי, לא משהו שמישהו עושה בשבילי ואני לא יודעת מה.'],
    deeper: ['ככה. היו חודשים טובים, אבל לא ידעתי למה. וגם לא ידעתי למה החודש הזה היה חלש.', 'האמת? זה מתסכל. אני טובה במה שאני עושה, ואין לי שליטה על כמה מטופלים מגיעים.'],
    fitYes: ['כן. זה בדיוק מה שהיה חסר לי עם הסוכנות. (נפתחת) איך זה עובד אצלך?'],
    fitNo: ['באמת? חשבתי שזה בדיוק מה שאני צריכה... למה?'],
    fitOther: ['יום אחד? ומי יעקוב איתי כל שבוע אחרי זה?'],
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
    need: ['עבודות. עכשיו, לא בעוד שלושה חודשים. ושלא אשים כסף שאין לי בחורף.'],
    deeper: ['בחורף? טלפון אחד ביום, אם יש. תיקונים קטנים.', 'שלושה עובדים. אני לא רוצה להגיד לאף אחד מהם ללכת הביתה.'],
    fitYes: ['שלושה חודשים? אני צריך עבודות עכשיו, לא באביב. ו-7,500 בחורף... אין מצב.'],
    fitNo: ['(מופתע) וואלה, תודה שאתה אומר את זה ישר. רוב האנשים פשוט מנסים למכור לי. אז מה כן?'.replace('שאתה', g('שאתה', 'שאת'))],
    fitOther: ['סדנה של שלוש שעות, לבנות תוכנית לחורף? את זה אני יכול לעשות. כמה?'],
    parted: ['תודה, באמת. אם יהיה משהו באביב, אני חוזר אלייך. ואני אגיד ליוסי שדיברנו.'.replace('אלייך', g('אליך', 'אלייך'))],
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
    need: ['תוכנית ביד. שאדע מה לעשות כדי להגיע ללקוחות של בית שלם. ובלי עוד משהו שבועי שאני לא אעמוד בו, כמו הקורס.'],
    deeper: ['פרויקט של בית שלם זה כמו עשרה מטבחים. ואת העבודה שאני הכי אוהבת.', 'שאני אחליט מה אני לוקחת, ולא אקח כל מטבח קטן כי אין ברירה.'],
    fitYes: ['שלושה חודשים, כל שבוע? אין לי את זה עכשיו. אולי אחרי החגים.'],
    fitNo: ['אה. (רושמת) חבל, חשבתי שיש לך משהו בשבילי.'],
    fitOther: ['יום אחד מרוכז, ויוצאים עם תוכנית? (מתיישבת) את זה אני יכולה לעשות. ספרי לי עוד.'.replace('ספרי', g('ספר', 'ספרי'))],
  },
};
// Which track a fit sentence points to, and which is right for each client (data.js hidden.fit).
const trackOf = (t) => (/לא מתאים|לא בשבילך|לא מה שיפתור|לא חושב(ת)? שזה/.test(t) ? 'none' : /VIP|יום אחד/.test(t) ? 'vip' : /סדנ/.test(t) ? 'workshop' : 'core');

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

// The stages of prompt v2 section 4 (0-15).
const STAGE_OF = { hello: 1, turn: 1, about: 3, frame: 2, whyNow: 3, numbers: 4, success: 5, tries: 6, likes: 6, motive: 6, echo: 6, need: 7, summary: 8, fault: 8, budget: 9, decider: 9, time: 9, fit: 10, permission: 12, pitch: 12, threeQ: 13, price: 14, worryQ: 14, isolate: 14, loop: 14, close: 14, nextStep: 15, part: 15 };
// The right answer of the fit check for this client: the track, or "none" when nothing fits.
const fitRight = (c, tr) => tr === c.hidden.fit.track || (c.hidden.fit.kind === 'none' && tr === 'none');
const priceTrack = (t) => (/890|סדנ/.test(t) ? 'workshop' : /3,?900|VIP|יום אחד/.test(t) ? 'vip' : 'core');

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
  // Several questions in one message: the client answers only the last one (prompt v2 5.3).
  const qs = text.split(/(?<=\?)/).filter((s) => s.includes('?'));
  const stacked = qs.length >= 2;
  f.stackedNow = stacked;
  if (stacked) (f.stacked = (f.stacked || 0) + 1), (f.stackedText = f.stackedText || text);
  const q = stacked ? qs[qs.length - 1].trim() : text;
  const fit = c.hidden.fit;

  // Pressure first: it changes how the client reads everything else.
  if (IS.giveup(text) && !(f.fitRight && IS.part(text))) {
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

  // Parting well when nothing fits: a direction or a referral, and a warm goodbye.
  if (IS.part(text) && (f.fitRight || fit.kind === 'none' || f.noFitShown)) {
    reach('part');
    if (f.fitRight && fit.kind === 'none') f.partedWell = text;
    say(pick(L.parted || [`תודה, באמת. זה עזר לי.`]));
    st.outcome = 'no';
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
    const wrongTrack = f.priceTrack && f.priceTrack !== fit.track;
    // The program does not fit אבי now: pushing it ends the call (prompt v2 5.3).
    if (c.id === 'avi' && wrongTrack) {
      f.pushedNoFit = f.pushedNoFit || text;
      say('לא. אני לא נכנס לזה עכשיו, לא בחורף. (קם) טוב, אני צריך לזוז.');
      st.outcome = 'no';
      return st;
    }
    if (st.pending && !st.resolved) {
      say(pick(L.objection, 1) || pick(L.objection));
      return st;
    }
    // A real yes only for the track that fits, after the problem was confirmed.
    if (f.fitRight && !wrongTrack && f.summary && st.warm >= 2 && st.level <= 3) {
      say(c.id === 'avi' ? `סגור. ${g('תשלח', 'תשלחי')} לי מתי, ואני מביא גם את מירב.` : c.fem ? `טוב. ${g('בוא', 'בואי')} נתחיל. ${g('תשלח', 'תשלחי')} לי את הקישור.` : `סגור. ${g('תשלח', 'תשלחי')} קישור, ונתחיל.`);
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
    if (!f.summary) f.priceEarly = f.priceEarly || text;
    if (long) f.pitch = f.pitch || text;
    const tr = priceTrack(text);
    f.priceTrack = tr;
    // The track that fits, after the seller said so: מיכל and אבי take it calmly.
    if (tr === fit.track && f.fitRight && c.id !== 'ronit') {
      say(c.id === 'avi' ? 'שמונה מאות תשעים, לבנות תוכנית לחורף? בסדר. מתי אפשר?' : '(חושבת) 3,900 ליום אחד שמסדר לי את הכיוון. זה הגיוני לי.');
      return st;
    }
    if (c.id === 'avi' && tr !== fit.track && f.noFitShown) f.pushedNoFit = f.pushedNoFit || text;
    const ready = f.summary && (f.budget || f.decider || f.time) && tr === fit.track;
    if (!ready) {
      st.pending = true;
      say(pick(L.objection));
    } else {
      st.pending = false;
      say('(חושבת) זה לא מעט. אבל זה מה שחסר לי.');
    }
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
  // The fit check (prompt v2 3.6): said aloud, with a track. Honesty warms, a track that
  // does not answer the need cools.
  if (IS.fit(text) && !IS.frame(text)) {
    reach('fit');
    const tr = trackOf(text);
    const right = fitRight(c, tr);
    f.fit = f.fit || text;
    f.fitTrack = tr;
    if (right) (f.fitRight = text), (st.warm += 2);
    else st.warm -= 1;
    if (c.id === 'avi' && tr === 'core') f.noFitShown = true;
    const other = c.id === 'ronit' && tr === 'vip' ? L.fitOther : null;
    const line = right
      ? fit.kind === 'fit' ? L.fitYes : fit.kind === 'other' ? L.fitOther : tr === 'none' ? L.fitNo : L.fitOther
      : tr === 'none' ? L.fitNo : tr === 'core' ? L.fitYes : other || [`לא ${c.fem ? 'בטוחה' : 'בטוח'} שזה מה שאני ${c.fem ? 'צריכה' : 'צריך'}.`];
    say(pick(line));
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

  // A pitch in a question mark ("ניסית פרסום ממומן?") gets a closed answer (prompt v2 3.4).
  if (IS.disguised(q)) {
    f.disguised = f.disguised || text;
    st.warm -= 1;
    say(c.id === 'ronit' ? 'כן, סוכנות. לא עבד.' : c.id === 'avi' ? 'ניסיתי. לא עבד.' : 'כן. לא ממש.');
    return st;
  }

  // Discovery: a good open question opens one more layer; a shallow one gets little.
  // With several questions in one message, only the last one counts.
  const order = ['frame', 'whyNow', 'numbers', 'tries', 'likes', 'motive', 'need', 'budget', 'decider', 'time', 'success'];
  const hit = order.find((k) => IS[k](q));
  const lastThem = [...call.msgs].reverse().find((m) => m.who === 'client')?.text || '';
  const hook = lastThem && hookOf(c, lastThem);
  const echo = !!(hook && hook.re.test(q) && IS.question(q));
  if (echo) f.echo = f.echo || text;
  if (hit) {
    reach(hit);
    const seen = f[hit] ? 1 : 0;
    f[hit] = f[hit] || text;
    const deep = IS.question(q) && q.length < 160;
    if (hit === 'motive' && st.level >= 3 && !f.tries) {
      say('לא יודע/ת. שיהיו עוד לקוחות.'.replace('יודע/ת', c.fem ? 'יודעת' : 'יודע'));
      f.motive = null;
      return st;
    }
    say(pick(L[hit], deep ? seen : 1));
    if (hit === 'motive' || hit === 'need') st.warm += 1;
    return st;
  }
  // A follow-up on the client's own word opens one more layer (prompt v2 5.3).
  if (echo && !long) {
    reach('echo');
    f.deep = (f.deep || 0) + 1;
    st.warm += 1;
    say(pick(L.deeper, f.deep - 1));
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
// It reads the conversation: what the client just said, what the user just did, and
// what is still missing. It never writes the user's next line, and never repeats itself.
const clean = (t) => t.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
const short = (t, n = 48) => (t.length <= n ? t : `${t.slice(0, t.lastIndexOf(' ', n) > 20 ? t.lastIndexOf(' ', n) : n)}...`);
// The sentence of a client line that holds the hook word.
function hookOf(c, text) {
  const t = clean(text);
  for (const re of CLIENT_WORDS[c.id] || []) {
    if (!re.test(t)) continue;
    const s = t.split(/(?<=[.?!])\s+/).find((x) => re.test(x)) || t;
    return { re, quote: short(s.replace(/[.]$/, '')) };
  }
  return null;
}

export function hintFor(call) {
  const f = call.f;
  const c = CLIENTS.find((x) => x.id === call.clientId);
  const she = (fem, masc) => (c.fem ? fem : masc);
  const msgs = call.msgs.filter((m) => m.who === 'me' || m.who === 'client');
  const mine = msgs.filter((m) => m.who === 'me').map((m) => m.text);
  const theirs = msgs.filter((m) => m.who === 'client').map((m) => m.text);
  const lastMe = mine[mine.length - 1] || '';
  const lastThem = theirs[theirs.length - 1] || '';
  const said = she('אמרה', 'אמר');
  const out = [];
  const add = (cond, text) => cond && out.push(text);

  add(!mine.length, `${c.first} ${she('מחכה', 'מחכה')}. פותחים באדם, לא בעסק, ואחר כך אומרים מה יקרה בשיחה ושבסוף מחליטים.`);
  // What the user just did.
  add(lastMe.length > 160 && !IS.question(lastMe), `ההודעה האחרונה שלך ארוכה, ו${c.first} ${she('נסגרה', 'נסגר')} קצת. ${g('עצור', 'עצרי')} כאן, ו${g('שאל', 'שאלי')} שאלה קצרה אחת על מה ש${she('היא', 'הוא')} ${said}.`);
  add(/התוכנית שלי|אני מציע|השירות שלי|מה שאני עושה|אצלי (את|אתה|בונים|עובדים)/.test(lastMe) && !f.summary, `התחלת להציג לפני ש${c.first} ${she('שמעה', 'שמע')} שהבנת ${she('אותה', 'אותו')}. קודם לשמוע ולסכם, אחר כך להציג.`);
  add(f.discount && lastMe === f.discount, 'הצעת הנחה לפני שהבנת מה מדאיג. מה קורה למחיר בעיני הלקוח כשהוא יורד כל כך מהר?');
  add(f.urgency && lastMe === f.urgency, `${c.first} ${she('הרגישה', 'הרגיש')} לחץ. מה יחזיר את השקט? שאלה, לא עוד סיבה לקנות עכשיו.`);
  add(f.argue && lastMe === f.argue, `התווכחת עם ${c.first}. מה ${she('היא', 'הוא')} באמת ${she('מנסה', 'מנסה')} להגיד? קודם להבין, אחר כך לענות.`);
  add(f.stackedNow && mine.length, `שאלת כמה שאלות באותה הודעה, ו${c.first} ${she('ענתה', 'ענה')} רק על האחרונה. שאלה אחת בכל פעם.`);
  add(f.disguised && lastMe === f.disguised, `"${short(clean(lastMe))}" זו הצעה בסימן שאלה, ולכן התשובה סגורה. שאלה פתוחה: מה ${she('היא', 'הוא')} כבר ${she('ניסתה', 'ניסה')}?`);
  add(f.fit && !f.fitRight && lastMe === f.fit, `${c.first} לא ${she('נשמעה משוכנעת', 'נשמע משוכנע')}. מה ${she('היא', 'הוא')} ${said} שחייב להיות? המסלול שהצעת עונה על זה?`);
  add(f.pushedNoFit && lastMe === f.pushedNoFit, `${c.first} כבר ${said} שזה לא בשביל${she('ה', 'ו')} עכשיו. להמשיך לדחוף רק סוגר. מה כן יעזור ל${she('ה', 'ו')}?`);
  add(f.fitRight && c.hidden.fit.kind === 'none' && !f.partedWell && lastMe === f.fitRight, `אמרת בכנות שזה לא מתאים. עכשיו: מה כן יעזור ל${c.first}? כיוון אחד, או הפניה, ופרידה יפה.`);
  // An objection on the table.
  add(call.pending && !f.worryQ, `"${short(clean(lastThem))}": זו לא התנגדות על המוצר. יש דאגה מאחוריה. מה היא?`);
  add(call.pending && f.worryQ && !f.isolate, `שמעת את הדאגה. לפני שעונים: זה הדבר היחיד שעוצר את ${c.first}?`);
  add(call.pending && f.worryQ && f.isolate, `עכשיו עונים בדיוק על הדאגה ש${c.first} ${said}, ובודקים: זה סוגר את זה?`);
  // What the client just said.
  const hook = lastThem && hookOf(c, lastThem);
  const echoed = hook && mine.slice(-1).some((t) => hook.re.test(t));
  add(hook && !echoed && !f.summary, `${c.first} ${said} "${hook?.quote}". מה עומד מאחורי זה? שאלה אחת לעומק, לפני שעוברים הלאה.`);
  // A shallow answer to a real question (not small talk, not the frame).
  const shallow = lastThem && clean(lastThem).length < 28 && mine.length > 1 && IS.question(lastMe) && !IS.small(lastMe) && !IS.frame(lastMe);
  add(shallow, `"${clean(lastThem)}" זו תשובה קצרה. ${c.first} ${she('תפתח', 'יפתח')} עוד שכבה רק לשאלה פתוחה על משהו ש${she('היא', 'הוא')} כבר ${said}.`);
  // What is still missing, in the order of the call.
  add(!f.frame, `${c.first} עוד לא ${she('יודעת', 'יודע')} מה יקרה בשיחה ושבסוף מחליטים יחד.`);
  add(!f.whyNow, `עוד לא שמעת למה דווקא עכשיו. משהו קרה, שבגללו ${c.first} ${she('השאירה', 'השאיר')} פרטים.`);
  add(!f.tries, 'מה כבר קרה לפני השיחה הזאת? מה ניסו, ומה לא עבד. שם מסתתרת התחמושת.');
  add(!f.motive, `יש בעיה, אין סיבה. מה ישתנה אצל ${c.first} כשזה ייפתר?`);
  add(!f.need, `מה הפתרון חייב לכלול הפעם, בעיני ${c.first}? ומה בשום אופן לא יכול לחזור?`);
  const heard = theirs.map((t) => hookOf(c, t)).filter(Boolean).map((h) => `"${h.quote}"`);
  add(!f.summary, heard.length >= 2 ? `שמעת: ${[...new Set(heard)].slice(0, 3).join(', ')}. ${c.first} עוד לא ${she('שמעה', 'שמע')} את זה ממך, במילים ${she('שלה', 'שלו')}.` : `${c.first} עוד לא ${she('שמעה', 'שמע')} את הבעיה ${she('שלה', 'שלו')} במילים ${she('שלה', 'שלו')}.`);
  add(!f.budget && !f.decider && !f.time, 'יש עוד מכשול שלא עלה. כסף, זמן, או מישהו נוסף שמחליט?');
  add(!f.fit, `לפני שמציגים: זה באמת מתאים ל${c.first}? ${g('תגיד', 'תגידי')} את זה בקול, ואיזה מסלול, לפי מה ש${she('היא', 'הוא')} ${said} שחייב להיות.`);
  const noFit = f.fitRight && c.hidden.fit.kind === 'none';
  add(!noFit && !f.permission, `לפני ההצגה, מבקשים רשות. ${c.first} ${she('צריכה', 'צריך')} לרצות לשמוע.`);
  add(!noFit && !f.price, `ההצגה קצרה ומחוברת למה ש${c.first} ${said}. אחר כך שלוש שאלות, ואז המספר.`);
  add(!noFit && !f.close, 'שמעת מספיק "כן". מה מבקשים עכשיו?');
  add(true, noFit ? 'אין התאמה? הצעד הבא הוא כיוון או הפניה, ופרידה יפה.' : 'כשיש התאמה, השיחה נגמרת עם מועד ביומן.');
  add(true, `${g('תן', 'תני')} ל${c.first} לדבר. מה ${she('היא', 'הוא')} ${said} שעוד לא שאלת עליו?`);

  // Never the same hint twice in a row.
  const lastHint = [...call.msgs].reverse().find((m) => m.who === 'hint')?.text;
  return out.find((h) => h !== lastHint) || out[0];
}

// ---------- The feedback, by prompt v2 section 8 ----------
export function talkRatio(msgs) {
  const len = (w) => msgs.filter((m) => m.who === w).reduce((s, m) => s + m.text.replace(/\(.*?\)/g, '').length, 0);
  const me = len('me');
  const cl = len('client');
  return me + cl ? Math.round((cl / (me + cl)) * 100) : 0;
}

// The fit-check line each client needed to hear (prompt v2 3.6).
const FIT_ALT = {
  ronit: () => '"ממה שתיארת, מה שחייב להיות הפעם זה לראות כל שבוע מה קורה, ולהבין את זה בעצמך. זה בדיוק מה שתוכנית הליווי עושה. רוצה לשמוע איך?"',
  michal: () => '"ממה שתיארת, תוכנית של מפגש כל שבוע לא תתאים לך עכשיו. מה שכן מתאים זה יום VIP: יום אחד מרוכז, ויוצאים עם תוכנית ביד. רוצה לשמוע איך הוא נראה?"',
  avi: () => '"אגיד לך בכנות: התוכנית שלי בונה מערך לשלושה חודשים, ואתה צריך עבודות החודש. היא לא בשבילך עכשיו. מה שכן: להתקשר ללקוחות של הקיץ עם חבילת תחזוקה לחורף."',
};

export function feedbackFor(call) {
  const f = call.f;
  const c = CLIENTS.find((x) => x.id === call.clientId);
  const fit = c.hidden.fit;
  const she = (fem, masc) => (c.fem ? fem : masc);
  const ratio = talkRatio(call.msgs);
  const obst = [f.budget, f.decider, f.time].filter(Boolean).length;
  const parted = !!f.partedWell;
  const offered = f.pitch || f.price || f.permission;
  const notNeeded = (s) => (s[0] == null && parted ? [null, 'לא נדרש: אין התאמה, ונפרדת נכון.'] : s);
  const sc = [
    f.frame ? [5, 'מסגרת ברורה, והסכמה על החלטה בסוף.'] : call.reached.includes(1) ? [3, 'פתיחה אנושית, בלי מסגרת.'] : [1, 'נכנסת ישר לעניין.'],
    f.tries && f.motive && f.need && !f.stacked
      ? [5, 'שאלה אחת בכל פעם, המניע, הניסיונות, ומה הפתרון חייב לכלול.']
      : f.tries && f.motive
        ? [4, f.stacked ? 'הגעת למניע ולניסיונות, אבל שאלת כמה שאלות ביחד.' : 'הגעת למניע ולניסיונות, אבל לא שאלת מה הפתרון חייב לכלול.']
        : f.tries || f.whyNow || f.echo
          ? f.disguised ? [2, 'שאלת שאלות שהן בעצם הצעה, וקיבלת תשובות סגורות.'] : [3, 'שאלת למה, אבל לא ירדת למניע ולצורך.']
          : [1, 'שאלות שטחיות, ומעבר מהיר להצגה.'],
    f.summary && f.confirmed ? [f.fault ? 5 : 4, f.fault ? 'סיכום במילים שלה/ו, אישור, ו"זה לא באשמתך".' : 'סיכום מדויק ואישור בקול.'] : f.summary ? [3, 'סיכום בלי אישור, או לא במילים של הלקוח.'] : [1, 'אין סיכום.'],
    !f.price && !f.fit ? [null, 'לא הגיע'] : obst >= 2 ? [5, 'המכשולים עלו לפני המספר.'] : obst === 1 ? [3, 'שאלת על חלק מהמכשולים.'] : [1, 'לא שאלת על תקציב, זמן או מי מחליט.'],
    !offered && !f.fit
      ? [null, 'לא הגיע']
      : f.fitRight
        ? [5, fit.kind === 'none' ? `אמרת בכנות שזה לא מתאים ל${she('ה', 'ו')} עכשיו.` : 'אמרת בקול שזה מתאים, ובחרת מסלול לפי הצורך.']
        : f.fit
          ? [2, `בדקת התאמה, אבל המסלול לא עונה על מה ש${she('היא צריכה', 'הוא צריך')}.`]
          : [1, 'הצגת פתרון בלי לבדוק אם הוא מתאים.'],
    notNeeded(!f.pitch && !f.permission ? [null, 'לא הגיע'] : f.permission && !f.longEver ? [5, 'בקשת רשות, והצגה קצרה.'] : f.longEver ? [2, 'הסבר ארוך על המוצר.'] : [3, 'הצגה סבירה, לא מחוברת ללקוח.']),
    notNeeded(!f.price ? [null, 'לא הגיע'] : f.priceEarly || f.discount ? [2, f.discount ? 'הנחה מיוזמתך.' : 'המחיר נאמר מוקדם מדי.'] : f.threeQ ? [5, 'שלוש השאלות, ואז מספר בביטחון.'] : [3, 'מחיר נאמר, בלי חיבור למטרה.']),
    notNeeded(!call.pending && !call.resolved && !f.worryQ && !f.pushedNoFit ? [null, 'לא הגיע'] : f.argue || f.urgency || f.pushedNoFit ? [1, f.pushedNoFit ? 'המשכת לדחוף אחרי שהתברר שאין התאמה.' : 'ויכוח או לחץ.'] : f.worryQ && f.isolate && call.resolved ? [5, 'בידוד, הדאגה שמאחור, פירוק ולולאה.'] : f.worryQ || f.isolate ? [3, 'תשובה סבירה, בלי בידוד או בלי לולאה.'] : [2, 'ענית על המשפט, לא על הדאגה.']),
    parted ? [5, 'נפרדת יפה, עם כיוון אמיתי.'] : f.close && f.nextStep ? [5, 'בקשה מפורשת וצעד הבא ביומן.'] : f.close ? [3, 'ביקשת פעם אחת, בלי מועד.'] : [1, 'לא ביקשת החלטה.'],
    ratio >= 60 && !f.leading && !f.judging ? [5, 'הלקוח דיבר הרבה יותר, ושאלות סקרניות.'] : ratio >= 45 ? [3, 'מאוזן.'] : [1, 'דיברת יותר מהלקוח.'],
  ];
  const fix = (s) => s.replace(/שלה\/ו/g, c.fem ? 'שלה' : 'שלו');
  const scores = DIMS.map((d, i) => [d.name, sc[i][0], fix(sc[i][1])]);
  const real = scores.filter((s) => s[1] != null);
  const avg = real.length ? real.reduce((s, x) => s + x[1], 0) / real.length : 0;
  const wi = fixDim(scores);
  const weakest = wi >= 0 ? scores[wi] : null;

  const worked = [];
  const add = (q, did) => q && worked.length < 3 && worked.push({ quote: q, did });
  add(f.fitRight, fit.kind === 'none' ? 'אמרת בכנות שזה לא מתאים. זה מה שבונה אמון והמלצות.' : 'אמרת בקול שזה מתאים, ולמה. הלקוח שמע שהמסלול נבחר בשבילו.');
  add(f.frame, 'מסגרת ברורה. ההחלטה בסוף כבר מוסכמת.');
  add(f.need, 'שאלת מה הפתרון חייב לכלול. זה הקריטריון שלפיו בודקים התאמה.');
  add(f.echo, 'שאלת המשך על המילה של הלקוח. ככה נפתחת עוד שכבה.');
  add(f.likes || f.tries, 'פתחת את הניסיונות הקודמים: מה עבד, ומה הפתרון הבא חייב לסגור.');
  add(f.motive, 'ירדת מתחת לפני השטח, למה שבאמת מניע.');
  add(f.summary && f.confirmed ? f.summary : null, 'סיכום שהלקוח אישר. מכאן הוא מקשיב אחרת.');
  add(f.isolate, 'בידדת את ההתנגדות לפני שענית.');
  add(f.worryQ, 'שאלת על הדאגה, לא ענית על המשפט.');

  const ALT = [
    '"לפני שנתחיל: בחצי השעה הקרובה אשאל, אספר איך אני עובד, ובסוף נבדוק יחד אם זה מתאים ונחליט, כן או לא. מתאים?"',
    '"ומה ישתנה לך כשזה יקרה?" ואחרי שעונה: "ומה צריך שיהיה הפעם, כדי שזה באמת יעבוד לך?" (שאלה אחת בכל פעם.)',
    '"אז אם אני מסכם: אתה היום ב-___, רוצה להגיע ל-___, ניסית ___, וזה נתקע ב-___. ומה שחייב להיות הפעם זה ___. הבנתי נכון?"',
    '"עוד שאלה לפני שנדבר על פתרון: מי עוד מחליט איתך, וכמה מתאים לך להשקיע בזה?"',
    FIT_ALT[c.id](),
    '"יש לי כמה מחשבות איך לסגור את זה, חלק מהן אפשר לעשות גם לבד. רוצה לשמוע?"',
    '"לפני שאני נותן מספרים, שלוש שאלות קצרות: זה פותר את ___? נוח לך לעבוד איתי? ואם המספר הגיוני, אתה בעמדה להחליט?"',
    '"חוץ מזה, יש עוד משהו שעוצר?" ואחרי הפירוק: "זה פותר לך את זה?"',
    fit.kind === 'none' ? '"זה לא בשבילך עכשיו, אבל ___ כן יעזור. ואם באביב תרצה לבנות את זה, אני כאן."' : '"בוא נתקדם. רוצה שנתחיל?" ואחרי "כן": "מתי נוח לך השבוע לפגישה הראשונה?"',
    '"מעניין, תספר לי עוד." (ושתיקה.)',
  ];
  const PRINCIPLE = [
    'מסגרת בהתחלה הופכת את ההחלטה בסוף לטבעית.',
    'מה שמניע קנייה נמצא מתחת: למה זה חשוב, מה כבר נוסה, ומה הפתרון חייב לכלול. שאלה אחת בכל פעם.',
    'לפני כל הצגה, הלקוח שומע את הבעיה שלו במילים שלו ומאשר.',
    'אחרי שמבינים את הבעיה ולפני המחיר: כסף, זמן ומי מחליט.',
    'לפני כל הצגה בודקים בקול אם יש התאמה, ובוחרים מסלול לפי הצורך. "לא מתאים" עם כיוון היא שיחה טובה.',
    'מבקשים רשות, ומוכרים את היעד, לא את הדרך.',
    'שלוש שאלות לפני המספר, ואז שותקים.',
    'מוצאים את הדאגה שמאחורי המשפט, מבודדים, ומבקשים שוב רק אחרי שנפתר.',
    'מבקשים במפורש. כשיש התאמה, השיחה נגמרת עם מועד ביומן. כשאין, עם כיוון.',
    'הלקוח מדבר לפחות פי שניים. שאלות קצרות וסקרניות.',
  ];
  const gm = (s) => (GENDER_F() ? s.replace('אני עובד', 'אני עובדת').replace('אני נותן', 'אני נותנת').replace('אני מסכם', 'אני מסכמת').replace('אני שולח', 'אני שולחת') : s);
  const lastMe = [...call.msgs].reverse().find((m) => m.who === 'me');
  const whatQ = { 1: f.stackedText || f.disguised, 2: f.pitch || f.price, 3: f.price, 4: f.fit || f.pitch || f.price, 5: f.pitch, 6: f.priceEarly || f.price, 7: f.pushedNoFit || f.handled || lastMe?.text, 8: lastMe?.text }[wi] || lastMe?.text || '';
  const heard = she('שמעה', 'שמע');
  const effect =
    {
      1: `${c.first} ${she('ענתה', 'ענה')} רק על חלק, ולא ${she('הגיעה', 'הגיע')} למה ${she('שהיא', 'שהוא')} באמת ${she('צריכה', 'צריך')}.`,
      2: `${c.first} ${heard} פתרון לפני ${she('שהרגישה מובנת', 'שהרגיש מובן')}, ולכן ${she('נסגרה', 'נסגר')}.`,
      4: f.fit ? `${c.first} ${heard} מסלול שלא עונה על מה ${she('שהיא צריכה', 'שהוא צריך')}, ו${she('נסגרה', 'נסגר')}.` : `${c.first} ${heard} הצעה בלי לדעת אם היא בכלל ${she('בשבילה', 'בשבילו')}.`,
      5: `${c.first} ${heard} רכיבים, לא את מה ${she('שהיא אמרה', 'שהוא אמר')} שחייב להיות.`,
    }[wi] || `זה השאיר את ${c.first} בלי סיבה טובה להגיד כן.`;
  const fixBlock = weakest
    ? {
        title: `${weakest[0]}: ${weakest[2]}`,
        what: whatQ.length > 140 ? `${whatQ.slice(0, 137)}...` : whatQ,
        effect,
        principle: PRINCIPLE[wi],
        stageN: DIMS[wi].stage ?? 1,
        alt: gm(ALT[wi]),
      }
    : null;
  const more = real.filter((s) => s[1] <= 2 && s[0] !== weakest?.[0]).slice(0, 3).map((s) => `${s[0]}: ${s[2]}`);
  const flags = [];
  if (f.priceEarly) flags.push('הצגה או מחיר לפני שהלקוח אישר את הבעיה.');
  if ((f.fit && !f.fitRight) || (f.priceTrack && f.priceTrack !== fit.track && fit.kind !== 'fit')) flags.push('הוצע מסלול שלא מחובר לבעיה ולצורך שעלו.');
  if (f.pushedNoFit) flags.push('המשיך למכור אחרי שהתברר שאין התאמה.');
  if (f.longEver) flags.push('הודעה ארוכה בלי שאלה.');
  if (f.argue) flags.push('התנגדות נענתה בוויכוח.');
  if (f.urgency) flags.push('דחיפות שלא נראית אמיתית.');
  if (f.discount) flags.push('הנחה שהוצעה לפני שהלקוח ביקש.');
  if (!f.nextStep && call.outcome !== 'buy' && !parted && fit.kind !== 'none') flags.push('הייתה התאמה, והשיחה נגמרה בלי צעד הבא מוגדר.');

  const map = {};
  STAGES.forEach((s) => (map[s.n] = call.reached.includes(s.n) ? 'done' : 'missing'));
  if (f.priceEarly) map[14] = 'early';
  if (f.pitch && !f.summary) map[12] = 'early';
  if (f.fit && !f.fitRight) map[10] = 'partial';
  map[0] = 'partial';

  const stageN = fixBlock?.stageN;
  return {
    outcome: call.outcome || 'think',
    line: parted
      ? `זיהית בכנות שהתוכנית לא מתאימה ל${c.first} עכשיו, ונפרדתם בטוב. זו שיחה מוצלחת.${weakest && weakest[1] <= 2 ? ` מה שכדאי לחזק: ${weakest[0]}.` : ''}`
      : weakest
        ? `${weakest[1] <= 2 ? 'הנקודה שעצרה את השיחה' : 'מה שהכי כדאי לחזק'}: ${weakest[0]}.`
        : 'שיחה קצרה מדי למשוב מלא.',
    worked,
    fix: fixBlock,
    more,
    flags,
    scores,
    avg,
    hiddenHits: {
      motive: !!f.motive,
      tries: !!f.tries,
      need: !!f.need,
      fit: !!f.fitRight,
      obstacle: c.id === 'ronit' ? !!f.tries : c.id === 'avi' ? !!f.decider : !!f.time,
      decider: c.id === 'avi' ? !!f.decider : null,
      budget: !!f.budget,
      condition: fit.kind === 'fit' ? !!call.resolved : !!f.fitRight,
    },
    next: {
      stageN,
      text: stageN === 8 ? 'תרגול שלב אחד: סיכום ותיוג, מאותו רגע בשיחה.' : stageN === 10 ? 'תרגול שלב אחד: בדיקת התאמה. רונית, מהרגע שאישרה את הסיכום.' : `שוב אותה שיחה, עם ${c.first}. הפעם: ${PRINCIPLE[wi] || ''}`,
    },
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
  if (IS.numbers(all)) map[4] = 'done';
  if (IS.tries(all) || IS.motive(all)) map[6] = 'done';
  if (IS.need(all)) map[7] = 'done';
  if (IS.summary(all)) map[8] = 'done';
  if (IS.budget(all) || IS.decider(all)) map[9] = 'done';
  if (IS.fit(all)) map[10] = 'done';
  if (IS.permission(all)) map[12] = 'done';
  if (IS.price(all)) map[14] = IS.summary(all) ? 'done' : 'early';
  else if (IS.close(all)) map[14] = 'done';
  if (IS.nextStep(all)) map[15] = 'done';
  const flags = [];
  if (IS.urgency(all)) flags.push('דחיפות שלא נראית אמיתית.');
  if (!IS.nextStep(all)) flags.push('השיחה נגמרה בלי צעד הבא מוגדר.');
  if (IS.price(all) && !IS.summary(all)) flags.push('הצגה או מחיר לפני שהלקוח אישר את הבעיה.');
  if ((IS.price(all) || IS.permission(all)) && !IS.fit(all)) flags.push('הוצג פתרון בלי בדיקת התאמה.');
  return { map, flags, ratio: talkRatio(lines.map((l) => ({ who: me.includes(l) ? 'me' : 'client', text: l }))) };
}
