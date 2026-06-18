// ===================================================================
// constants.js — static data + runtime config object.
// Zero imports, no DOM, side-effect-free.
// ===================================================================

export const INITIAL_STATE = {
    currentWeek: "שבוע 1: מנקים באהבה",
    score: 0, maxScore: 245, selectedCharacter: null, selectedRoomId: 1, selectedReward100: null,
    personalScores: { "הורים": 0, "בכורה": 0, "ילד": 0, "פעוטה": 0 },
    rooms: [
        {
            id: 1, name: "🌌 מצפה הכוכבים", subtitle: "חדר שקד (בת 10)", icon: "🌌", specialRules: "🛏️ מיטה אישית | 📚 שולחן לימוד | 👗 ארון בגדים",
            prompt: "A whimsical fairytale astronomy tower bedroom with large windows showing a night sky full of glowing stars, magical hanging star mobiles dangling from the ceiling casting a soft golden glow, a cozy bed with fluffy colorful pillows, soft lavender and indigo watercolor palette.",
            tasks: [
                { id: 101, title: "סידור מיטה בכל בוקר ☀️", desc: "מתיחת סדינים וסידור כריות — כל יום לפני בית ספר", char: "בכורה", points: 10, isFamily: false, completed: false },
                { id: 102, title: "איסוף בגדים מלוכלכים לכביסה 🧺", desc: "כל בגד מלוכלך ישר לסל הכביסה, לא לרצפה", char: "בכורה", points: 10, isFamily: false, completed: false },
                { id: 103, title: "הורדת אבק ומגבון משטחים 🧹", desc: "ניגוב שולחן, מדפים ושידה — פעם בשבוע", char: "בכורה", points: 15, isFamily: false, completed: false },
                { id: 104, title: "ארגון ארון בגדים ומיון 👗", desc: "קיפול ותלייה — כל פריט במקומו, פעם בשבוע", char: "בכורה", points: 15, isFamily: false, completed: false },
                { id: 105, title: "סידור שולחן הלימוד 📚", desc: "ספרים, מחברות וציוד — סדר מלכותי לפני שינה", char: "בכורה", points: 10, isFamily: false, completed: false },
                { id: 106, title: "שאיבת אבק / טאטוא רצפה 🧹", desc: "ניקוי מלא של רצפת החדר, פעם בשבוע", char: "בכורה", points: 15, isFamily: false, completed: false }
            ]
        },
        {
            id: 2, name: "🧸 מאורת הקסמים המשותפת", subtitle: "חדר נווה דוד וארבל", icon: "🧸", specialRules: "🛏️ 2 מיטות | 🧸 פינת צעצועים | 📚 שולחן עבודה",
            prompt: "A bright cheerful children's shared bedroom with two cozy beds, soft green and yellow walls, turquoise accents, jungle-themed plush toys, leafy plant decorations, sunlight streaming in, fresh mint and lime watercolor palette.",
            tasks: [
                { id: 201, title: "סידור המיטות בכל בוקר ☀️", desc: "נווה דוד מסדר את שתי המיטות — כל יום", char: "ילד", points: 10, isFamily: false, completed: false },
                { id: 202, title: "איסוף צעצועים וסדר 🧸", desc: "כל צעצוע חוזר לתיבה או למדף שלו", char: "ילד", points: 10, isFamily: false, completed: false },
                { id: 203, title: "סידור ספרים וקיפול שולחן עבודה 📖", desc: "ספרים לאורכם, שולחן נקי ומסודר", char: "ילד", points: 10, isFamily: false, completed: false },
                { id: 204, title: "שאיבת אבק / טאטוא רצפה 🧹", desc: "ניקוי מלא של רצפת החדר, פעם בשבוע", char: "ילד", points: 15, isFamily: false, completed: false },
                { id: 205, title: "איסוף כביסה מלוכלכת לסל 🧺", desc: "כל הבגדים המלוכלכים לסל — לא לרצפה", char: "ילד", points: 10, isFamily: false, completed: false }
            ]
        },
        {
            id: 3, name: "👑 היכל ההורים", subtitle: "חדר השינה של שימי ונעמי", icon: "👑", specialRules: "🛏️ מיטה זוגית | 💼 פינת עבודה | 👔 ארון מלכותי",
            prompt: "An elegant serene parents' bedroom with cool slate-blue and soft grey tones, a neatly made king-sized bed with white linens and grey pillows, subtle silver accents, calm morning light, watercolor style with blue-grey and silver palette.",
            tasks: [
                { id: 301, title: "סידור מיטה זוגית בכל בוקר ☀️", desc: "מתיחת כיסוי מלכותי וסידור כריות — כל יום", char: "הורים", points: 15, isFamily: false, completed: false },
                { id: 302, title: "ניקוי שידות לילה 🌙", desc: "ניגוב אבק עדין וסידור — פעם בשבוע", char: "הורים", points: 10, isFamily: false, completed: false },
                { id: 303, title: "שאיבת אבק / טאטוא רצפה 🧹", desc: "ניקוי מלא של רצפת החדר, פעם בשבוע", char: "הורים", points: 15, isFamily: false, completed: false },
                { id: 304, title: "סידור פינת עבודה 💼", desc: "שולחן נקי, מסמכים במקום — פעם בשבוע", char: "הורים", points: 10, isFamily: false, completed: false },
                { id: 305, title: "ארגון ארון בגדים 👔", desc: "מיון ותלייה — כל פריט במקומו, פעם בשבוע", char: "הורים", points: 15, isFamily: false, completed: false }
            ]
        },
        {
            id: 4, name: "🍽️ מטבח ופינת אוכל (משותף)", subtitle: "מטבח הארמון ושולחן המשפחה", icon: "🍽️", specialRules: "🪑 שולחן משפחתי | 🧼 מדיח וכיור | ♻️ מחזור",
            prompt: "A warm family dining room and kitchen, watercolor pastel style.",
            tasks: [
                { id: 401, title: "ניקוי שולחן האוכל 🍽️", desc: "ניגוב שולחן וכיסאות לאחר כל ארוחה", char: "כולם", points: 10, isFamily: true, completed: false },
                { id: 402, title: "ניקוי משטחי מטבח ✨", desc: "ניגוב כל משטחי המטבח — שימי ונעמי", char: "הורים", points: 15, isFamily: true, completed: false },
                { id: 403, title: "ריקון מדיח + סידור כלים 🧽", desc: "פריקת המדיח והחזרת כלים לארונות — שימי ונעמי", char: "הורים", points: 20, isFamily: true, completed: false },
                { id: 404, title: "ריקון פח אשפה 🗑️", desc: "הוצאת שקית האשפה והחלפתה בשקית חדשה", char: "כולם", points: 15, isFamily: true, completed: false },
                { id: 405, title: "ריקון מחזור פלסטיק ♻️", desc: "איסוף פלסטיק לשקית ייעודית והורדה לפח — נווה דוד", char: "ילד", points: 15, isFamily: true, completed: false },
                { id: 406, title: "ריקון מחזור נייר ♻️", desc: "קיפול קרטונים ואיסוף נייר לשקית ייעודית — שקד", char: "בכורה", points: 15, isFamily: true, completed: false },
                { id: 407, title: "ריקון מיכל קומפוסט 🌱", desc: "העברת הקומפוסט לפח החיצוני — שימי ונעמי", char: "הורים", points: 10, isFamily: true, completed: false }
            ]
        },
        {
            id: 5, name: "🧺 מרחב שירות, מדרגות וגינה (משותף)", subtitle: "כביסה, גינה, מדרגות ופינת נעליים", icon: "🧺", specialRules: "🧼 מכונה ומייבש | 🌿 גינה | 🪜 מדרגות",
            prompt: "A beautiful cozy cottage laundry area and garden, watercolor format.",
            tasks: [
                { id: 501, title: "מסע הכביסה המלכותי 🫧", desc: "איסוף סלי הבגדים מהחדרים והפעלת מכונה — שימי ונעמי", char: "הורים", points: 15, isFamily: true, completed: false },
                { id: 502, title: "מסיבת קיפול בגדים משפחתית 🎉", desc: "קיפול ומיון ערימות של בגדים נקיים — כולם יחד", char: "כולם", points: 25, isFamily: true, completed: false },
                { id: 503, title: "השקיית עציצים וצמחים 🌿", desc: "השקיית כל עציצי הגינה והמרפסת", char: "כולם", points: 10, isFamily: true, completed: false },
                { id: 504, title: "טאטוא ושטיפת מדרגות 🧹", desc: "שקד מטאטאת ושוטפת את המדרגות מלמעלה למטה, פעם בשבוע", char: "בכורה", points: 15, isFamily: true, completed: false },
                { id: 505, title: "סידור פינת נעליים 👟", desc: "נווה דוד מסדר כל הנעליים בשורות מסודרות, פעם בשבוע", char: "ילד", points: 15, isFamily: true, completed: false },
                { id: 506, title: "ארגון ארון ציוד ניקיון 🧹", desc: "סדר בסגל — מגבים, סמרטוטים וחומרים במקומם", char: "הורים", points: 10, isFamily: true, completed: false },
                { id: 507, title: "סידור ארון הכניסה 🧥", desc: "תלייה וקיפול מעילים, כובעים וצעיפים — כולם במקומם", char: "כולם", points: 10, isFamily: true, completed: false }
            ]
        },
        {
            id: 6, name: "🛋️ סלון מרחב הנוחות (משותף)", subtitle: "ספה, ספרייה ומשחקים משפחתיים", icon: "🛋️", specialRules: "🛋️ ספה וכריות | 📚 ספרייה | 🎲 משחקי לוח",
            prompt: "A cozy warm family living room with a plush sofa, colorful throw pillows, wooden bookshelf filled with books and board games, watercolor style.",
            tasks: [
{ id: 602, title: "ארגון ספריית משחקי הלוח 🎲", desc: "החזרת משחקים לקופסאות וסדר על המדפים — נווה דוד", char: "ילד", points: 15, isFamily: true, completed: false },
                { id: 603, title: "ניגוב ספרייה וסידור ספרים 📚", desc: "ניגוב מדפי הספרייה וסידור ספרים בשורה — שקד", char: "בכורה", points: 15, isFamily: true, completed: false },
                { id: 604, title: "שאיבת אבק וניקוי הסלון 🧹", desc: "שאיבת ספה, שטיח ורצפת הסלון — נווה דוד", char: "ילד", points: 15, isFamily: true, completed: false }
            ]
        },
        {
            id: 7, name: "🚿 חדר האמבטיה", subtitle: "חדר הרחצה המשפחתי", icon: "🚿", specialRules: "🪥 כיור ומראה | 🚿 מקלחת ואסלה",
            prompt: "A clean bright family bathroom with bathtub, sink, mirror, fluffy towels, watercolor style pastel blue and white tones.",
            tasks: [
                { id: 701, title: "ניקוי כיור ומראה ✨", desc: "שפשוף הכיור וניגוב המראה עד שמבריקים", char: "הורים", points: 15, isFamily: false, completed: false },
                { id: 702, title: "שטיפת האסלה 🪣", desc: "חיטוי ושטיפה יסודית של האסלה מבפנים ומבחוץ", char: "הורים", points: 15, isFamily: false, completed: false },
                { id: 703, title: "שטיפת רצפה ומקלחת 🚿", desc: "שטיפת רצפת האמבטיה ותא המקלחת", char: "הורים", points: 20, isFamily: false, completed: false },
                { id: 704, title: "החלפת מגבות ושטיחון 🛁", desc: "איסוף מגבות ישנות לכביסה והנחת מגבות ושטיחון רענן", char: "הורים", points: 10, isFamily: false, completed: false }
            ]
        }
    ],
    goodDeeds: []
};

export const DEFAULT_REWARDS_100 = [
    { id: "cinema", title: "🎬 קולנוע ביתי מלכותי", desc: "הסלון הופך לאולם קולנוע עם פופקורן ביתי וסרט אהוב על כולם." },
    { id: "icecream", title: "🍦 שיירת הגלידה המתוקה", desc: "נסיעה מיוחדת עם פיג'מות בערב שבת לגלידריה האהובה!" }
];

// CHARACTERS is an exported-const object whose PROPERTIES are mutated at runtime
// (applyCharacterOverrides / saveCharacterEditor). The shared reference is visible
// to every importer; only rebinding CHARACTERS itself is forbidden, which never happens.
export const CHARACTERS = {
    "הורים": { name: "שימי ונעמי", role: "מדריכי הארמון 👑", emoji: "👑", color: "from-amber-100 to-amber-200", text: "text-amber-800" },
    "בכורה": { name: "שקד (בת 10)", role: "אבירת הסדר 🛡️", emoji: "🛡️", color: "from-sky-100 to-sky-200", text: "text-sky-800" },
    "ילד": { name: "נווה דוד (בן 7)", role: "קוסם הארגון 🪄", emoji: "🪄", color: "from-purple-100 to-purple-200", text: "text-purple-800" },
    "פעוטה": { name: "ארבל (בת 1.5)", role: "פיית החסד 🧚", emoji: "🧚", color: "from-pink-100 to-pink-200", text: "text-pink-800" },
    "כולם": { name: "כל המשפחה 🎉", role: "כוח משותף", color: "from-rose-100 to-rose-200", text: "text-rose-800", emoji: "🏰" }
};

export const GRADIENT_FALLBACKS = { 1: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)", 2: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)", 3: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", 4: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)", 5: "linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)", 6: "linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)", 7: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)" };

// משימות יומיות (ברירת מחדל היסטורית) — משימות חדשות נושאות שדה freq משלהן
export const DAILY_TASK_IDS = new Set([101, 102, 201, 202, 205, 301, 401, 402, 403, 404, 503]);
export const DAY_MS  = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

// חדרים אישיים ובעליהם — לבונוס השבועי
export const PERSONAL_ROOMS = { 1: "בכורה", 2: "ילד", 3: "הורים" };
export const WEEKLY_BONUS_PTS = 20;

export const DEFAULT_PRIZE_OPTIONS = [
    { id: "dj",     emoji: "🎵", label: "DJ הבית",           desc: "בוחרים מוזיקה ומנהלים את פלייליסט הבית — 30 דקות שלמות" },
    { id: "game",   emoji: "🎲", label: "מנהל/ת המשחקים",    desc: "בוחרים משחק משפחתי ומחליטים את הכללים" },
    { id: "outing", emoji: "🍦", label: "יציאה מיוחדת",      desc: "יציאה לשתייה או גלידה עם אמא או אבא לבד" },
    { id: "points", emoji: "⭐", label: "20 נקודות לשבוע הבא", desc: "מעבירים את הזכייה לנקודות בונוס — שימושי לשבוע עמוס" },
];
// הפרס "points" מיוחד — מעביר נקודות לשבוע הבא; לא ניתן למחיקה כדי לשמור על המנגנון
export const PROTECTED_PRIZE_ID = "points";

// ערכי התחלה לרשימת ארוחות הערב (ניתנת לעריכה במסך הלו״ז)
export const DEFAULT_DINNER_OPTIONS = ["פיצה", "פסטה", "סושי", "אורז עם שעועית", "ארוחת שאריות"];

// ===== מצב עריכה גלובלי (מוגן בסיסמת הורים) =====
export const EDIT_PW_KEY = "kingdom_edit_password";

// ===== עריכת דמויות (אווטאר ושם) =====
export const EDITABLE_CHARS = ["הורים", "בכורה", "ילד", "פעוטה"];
// דמויות בסבב משימות שבועי (ללא הפעוטה, שלא מבצעת מטלות)
export const ROTATION_CHARS = ["הורים", "בכורה", "ילד"];
export const AVATAR_CHOICES = ["👑","🛡️","🪄","🧚","🦸","🦸‍♀️","🧜‍♀️","🦄","🐉","🦁","🐯","🐼","🦊","🐱","🐶","🐰","🌟","⚡","🌈","🚀","🦖","🦋","🐢","🦉","🍭","🎨","⚽","🎮"];

// ===== תמונות החדרים (סטטיות מ-GitHub Pages) =====
export const BASE_URL = "https://shimi777.github.io/order-kingdom/";
export const STATIC_ROOM_IMAGES = {
    1: BASE_URL + "room_1.jpg", 2: BASE_URL + "room_2.jpg", 3: BASE_URL + "room_3.jpg",
    4: BASE_URL + "room_4.jpg", 5: BASE_URL + "room_5.jpg", 6: BASE_URL + "room_6.jpg",
    7: BASE_URL + "room_7.jpg"
};

// ===== לו״ז משפחתי =====
export const DAY_NAMES  = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const HEB_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

// ===== הגדרות ריצה משותפות (מוחלף את GOOGLE_SCRIPT_URL / GEMINI_API_KEY הגלובליים) =====
// אובייקט משותף: כתיבה לשדה גלויה לכל המודולים המייבאים, ללא בעיית live-binding.
export const config = {
    scriptUrl: "", geminiKey: "",
    // ===== סנכרון ענן (Supabase) — מפתחות ציבוריים, בטוחים לשמירה בקוד =====
    // ההגנה היא ב-Row Level Security + סיסמת המשפחה, לא בהסתרת המפתח.
    cloudUrl: "https://wtsslpwpuqosxkgqyhpr.supabase.co",
    cloudKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0c3NscHdwdXFvc3hrZ3F5aHByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDYwNzEsImV4cCI6MjA5NzM4MjA3MX0.iDT9sf_RwEjpIQ2eYPicreSoULL_jijDlDlAu1aG7PI",
    // מפתח VAPID ציבורי לדחיפת התראות (אופציונלי) — ראו supabase/push/README.md.
    // ריק = התראות דחיפה כבויות (התזכורות בתוך האפליקציה עדיין עובדות).
    vapidPublicKey: "",
};
