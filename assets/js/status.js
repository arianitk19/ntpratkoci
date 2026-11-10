/* ==========================================================================
   status.js — a është hapur marketi tani (sipas orës së Kosovës)
   ========================================================================== */
(function (NTP) {
  'use strict';

  const DAYS = ['E diel', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë'];
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

  /** Ora dhe dita aktuale në zonën kohore të dyqanit. */
  function storeNow(date = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: NTP.STORE.timeZone, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit',
      }).formatToParts(date);
      const get = (t) => parts.find((p) => p.type === t)?.value;
      const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      const h = Number(get('hour')) % 24;
      return { day: wd, minutes: h * 60 + Number(get('minute')) };
    } catch (e) {
      return { day: date.getDay(), minutes: date.getHours() * 60 + date.getMinutes() };
    }
  }

  const fmtDuration = (mins) => {
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} orë`;
    return `${h} orë e ${m} min`;
  };

  /** Statusi i plotë: hapur/mbyllur, kur ndryshon, përqindja e ditës. */
  function status(date) {
    const { day, minutes } = storeNow(date);
    const today = NTP.STORE.hours[day];
    if (today) {
      const open = toMin(today[0]), close = toMin(today[1]);
      if (minutes >= open && minutes < close) {
        return {
          open: true, day,
          label: 'Hapur tani',
          detail: `Mbyllet në ${today[1]}, pas ${fmtDuration(close - minutes)}`,
          short: `mbyllet në ${today[1]}`,
          progress: (minutes - open) / (close - open),
          from: today[0], to: today[1],
        };
      }
      if (minutes < open) {
        return {
          open: false, day, label: 'Mbyllur tani',
          detail: `Hapet sot në ${today[0]}, pas ${fmtDuration(open - minutes)}`,
          short: `hapet në ${today[0]}`, progress: 0, from: today[0], to: today[1],
        };
      }
    }
    // gjej ditën e radhës që hapet
    for (let i = 1; i <= 7; i++) {
      const d = (day + i) % 7;
      const h = NTP.STORE.hours[d];
      if (!h) continue;
      const wait = (24 * 60 - minutes) + (i - 1) * 24 * 60 + toMin(h[0]);
      const when = i === 1 ? 'nesër' : DAYS[d].toLowerCase();
      return {
        open: false, day, label: 'Mbyllur tani',
        detail: `Hapet ${when} në ${h[0]}, pas ${fmtDuration(wait)}`,
        short: `hapet ${when} në ${h[0]}`, progress: 1,
        from: today ? today[0] : h[0], to: today ? today[1] : h[1],
      };
    }
    return { open: false, day, label: 'Mbyllur', detail: '', short: '', progress: 0 };
  }

  /** Përditëso çdo element me [data-status] në faqe. */
  function paint() {
    const s = status();
    NTP.$$('[data-status]').forEach((el) => {
      el.classList.toggle('is-open', s.open);
      el.classList.toggle('is-closed', !s.open);
      const mode = el.dataset.status;
      el.textContent = mode === 'short' ? `${s.open ? 'Hapur' : 'Mbyllur'}, ${s.short}` : s.label;
    });
    NTP.$$('[data-status-detail]').forEach((el) => { el.textContent = s.detail; });
    NTP.$$('[data-status-meter]').forEach((el) => { el.style.width = `${Math.round(s.progress * 100)}%`; });
    return s;
  }

  setInterval(paint, 30 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) paint(); });

  Object.assign(NTP, { status, paintStatus: paint, DAYS });
})(window.NTP);
