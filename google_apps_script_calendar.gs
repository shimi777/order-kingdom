/***********************************************************************
 * סנכרון לו״ז → יומן גוגל ("ממלכת הסדר 📅")
 * -------------------------------------------------------------------
 * הוסיפו את הקוד הזה ל-Apps Script הקיים שמסנכרן את הניקוד ל-CSV.
 *
 * שלב 1 — בתחילת doPost הקיים שלכם, הוסיפו את שתי השורות המסומנות:
 *
 *   function doPost(e) {
 *     var data = JSON.parse(e.postData.contents);
 *     if (data.type === 'calendar') return syncCalendar(data);   // <== הוסיפו
 *     // ... כאן נשאר כל הקוד הקיים שכותב שורת CSV ...
 *   }
 *
 *   (אם ה-doPost שלכם לא עושה JSON.parse — הוסיפו גם את שורת ה-var data.)
 *
 * שלב 2 — הדביקו את כל שאר הקוד שמתחת לכאן.
 * שלב 3 — Deploy → Manage deployments → עריכה → New version → Deploy.
 *         בפעם הראשונה גוגל יבקש הרשאה ליומן — אשרו.
 * שלב 4 — באפליקציה: מסך "לו״ז" → "🔄 סנכרן ליומן גוגל".
 *         האירועים יופיעו ביומן בשם "ממלכת הסדר 📅".
 *         (כדי לראות אותו בנייד: פתחו את היומן בגוגל קלנדר פעם אחת.)
 *
 * הערות:
 * - כיוון אחד בלבד: אפליקציה → יומן. עריכה ביומן עצמו לא חוזרת לאפליקציה.
 * - כל סנכרון מוחק את מה שהאפליקציה יצרה קודם ובונה מחדש (היומן ייעודי,
 *   אז זה בטוח — אל תוסיפו אירועים אישיים ליומן הזה ידנית).
 * - אם הטקסט מתחיל בשעה (למשל "16:00") — נוצר אירוע בשעה הזו לשעה.
 *   אחרת — אירוע "כל היום".
 * - לו״ז שבועי נוצר כאירוע *חוזר* כל שבוע. אירוע חודשי = חד-פעמי בתאריך.
 ***********************************************************************/

var KINGDOM_CAL_NAME = 'ממלכת הסדר 📅';

function syncCalendar(data) {
  var cals = CalendarApp.getCalendarsByName(KINGDOM_CAL_NAME);
  var cal = cals.length ? cals[0] : CalendarApp.createCalendar(KINGDOM_CAL_NAME);

  clearKingdomEvents(cal);

  // ----- אירועים חד-פעמיים (התצוגה החודשית) -----
  var dated = data.datedEvents || {};
  Object.keys(dated).forEach(function (key) {
    var text = (dated[key] || '').trim();
    if (!text) return;
    var p = key.split('-');                 // YYYY-MM-DD
    var y = +p[0], mo = +p[1] - 1, da = +p[2];
    var lines = text.split('\n').filter(function (l) { return l.trim(); });
    var title = lines[0] || 'אירוע';
    var tm = title.match(/(\d{1,2}):(\d{2})/);
    if (tm) {
      var s = new Date(y, mo, da, +tm[1], +tm[2]);
      cal.createEvent(title, s, new Date(s.getTime() + 3600000), { description: text });
    } else {
      cal.createAllDayEvent(title, new Date(y, mo, da), { description: text });
    }
  });

  // ----- לו״ז שבועי חוזר -----
  (data.weekly || []).forEach(function (it) {
    var title = it.label + ': ' + it.text;
    var first = nextWeekday(it.day);        // התאריך הקרוב שנופל על אותו יום-בשבוע
    var rec = CalendarApp.newRecurrence().addWeeklyRule();
    var tm = ('' + it.text).match(/(\d{1,2}):(\d{2})/);
    if (tm) {
      var s = new Date(first.getFullYear(), first.getMonth(), first.getDate(), +tm[1], +tm[2]);
      cal.createEventSeries(title, s, new Date(s.getTime() + 3600000), rec);
    } else {
      cal.createAllDayEventSeries(title, first, rec);
    }
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// מוחק את כל מה שהאפליקציה יצרה קודם ביומן הייעודי
function clearKingdomEvents(cal) {
  var now = new Date();

  // סדרות שבועיות — סריקת שבועיים מספיקה כדי לפגוש כל יום בשבוע פעם אחת
  var seriesEnd = new Date(now.getTime() + 15 * 86400000);
  var seen = {};
  cal.getEvents(now, seriesEnd).forEach(function (ev) {
    if (ev.isRecurringEvent()) {
      var s = ev.getEventSeries(), id = s.getId();
      if (!seen[id]) { seen[id] = true; s.deleteEventSeries(); }
    }
  });

  // אירועים חד-פעמיים בטווח רחב (שבוע אחורה עד ~13 חודשים קדימה)
  var start = new Date(now.getTime() - 7 * 86400000);
  var end = new Date(now.getTime() + 400 * 86400000);
  cal.getEvents(start, end).forEach(function (ev) {
    if (!ev.isRecurringEvent()) ev.deleteEvent();
  });
}

function nextWeekday(dow) {                  // 0 = ראשון ... 6 = שבת
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  return d;
}
