'use strict';

/* Gregorian <-> Jalali (Solar Hijri) conversion + Persian calendar helpers.
   Iranian and Afghan variants share the same arithmetic; only month names differ. */
const Jalali = (() => {
  const IRAN_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const AFGHAN_MONTHS = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'];

  // Persian weekday names indexed by JS getDay() (0 = Sunday).
  const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  // Single-letter column headers, Saturday-first.
  const DOW_MIN = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  function div(a, b) { return parseInt(a / b, 10); }

  // [gy, gm, gd] -> [jy, jm, jd]
  function d2j(gy, gm, gd) {
    const g_dm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    const gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + div(gy2 + 3, 4) - div(gy2 + 99, 100) +
      div(gy2 + 399, 400) - 80 + gd + g_dm[gm - 1];
    jy += 33 * div(days, 12053);
    days %= 12053;
    jy += 4 * div(days, 1461);
    days %= 1461;
    if (days > 365) {
      jy += div(days - 1, 365);
      days = (days - 1) % 365;
    }
    const jm = (days < 186) ? 1 + div(days, 31) : 7 + div(days - 186, 30);
    const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
  }

  // [jy, jm, jd] -> [gy, gm, gd]
  function j2d(jy, jm, jd) {
    let gy = (jy <= 979) ? 621 : 1600;
    jy -= (jy <= 979) ? 0 : 979;
    let days = (365 * jy) + (div(jy, 33) * 8) + div(((jy % 33) + 3), 4) +
      78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy += 400 * div(days, 146097);
    days %= 146097;
    if (days > 36524) {
      days--;
      gy += 100 * div(days, 36524);
      days %= 36524;
      if (days >= 365) days++;
    }
    gy += 4 * div(days, 1461);
    days %= 1461;
    if (days > 365) {
      gy += div(days - 1, 365);
      days = (days - 1) % 365;
    }
    let gd = days + 1;
    const md = [31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 0;
    while (gm < 12 && gd > md[gm]) { gd -= md[gm]; gm++; }
    return [gy, gm + 1, gd];
  }

  function toJalali(date) {
    return d2j(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  function fromJalali(jy, jm, jd) {
    const g = j2d(jy, jm, jd);
    return new Date(g[0], g[1] - 1, g[2]);
  }

  function monthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    // Esfand: detect leap years by round-tripping day 30.
    const g = j2d(jy, 12, 30);
    const back = d2j(g[0], g[1], g[2]);
    return (back[0] === jy && back[1] === 12 && back[2] === 30) ? 30 : 29;
  }

  function monthNames(kind) {
    return (kind === 'afghan') ? AFGHAN_MONTHS : IRAN_MONTHS;
  }

  return { toJalali, fromJalali, monthLength, monthNames, WEEKDAYS, DOW_MIN };
})();
