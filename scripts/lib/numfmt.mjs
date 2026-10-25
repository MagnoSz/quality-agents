// Shows a spreadsheet number the way Excel/LibreOffice do, from the cell's number
// format code: General, decimals, thousands, %, scientific, fractions, leading
// zeros, currency and other literals, sections (positive;negative;zero), dates,
// times and durations (1900 and 1904 date systems). Separators and month names
// come from the locale, like the spreadsheet programs. No dependencies.
// ponytail: conditional sections ([>=100]) and colors are ignored; "?" alignment spaces are dropped.

// Built-in formats (ECMA-376 18.8.30); 14 and 22 follow the locale's short date.
export const BUILTIN_FORMATS = {
  0: 'General', 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 9: '0%', 10: '0.00%', 11: '0.00E+00', 12: '# ?/?', 13: '# ??/??',
  14: 'SHORT_DATE', 15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy', 18: 'h:mm AM/PM', 19: 'h:mm:ss AM/PM', 20: 'h:mm', 21: 'h:mm:ss', 22: 'SHORT_DATE h:mm',
  37: '#,##0 ;(#,##0)', 38: '#,##0 ;(#,##0)', 39: '#,##0.00;(#,##0.00)', 40: '#,##0.00;(#,##0.00)', 45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mm:ss.0', 48: '##0.0E+0', 49: '@',
};

// Literal pieces of a format code, in order; everything else is kept as format characters.
function tokenize(code) {
  const out = [];
  for (let s = code; s;) {
    let m;
    if ((m = s.match(/^"([^"]*)"?/))) out.push({ lit: m[1] });
    else if ((m = s.match(/^\\(.)/s))) out.push({ lit: m[1] });
    else if ((m = s.match(/^_.?/s))) out.push({ lit: ' ' });
    else if ((m = s.match(/^\*.?/s))) { /* fill character: nothing to fill in a grid cell */ }
    else if ((m = s.match(/^\[\$([^\]-]*)[^\]]*\]/))) out.push({ lit: m[1] });
    else if ((m = s.match(/^\[(h+|m+|s+)\]/i))) out.push({ fmt: m[0].toLowerCase() });
    else if ((m = s.match(/^\[[^\]]*\]/))) { /* color or condition */ }
    else { m = [s[0]]; out.push({ fmt: s[0] }); }
    s = s.slice(m[0].length);
  }
  return out;
}

const isDateCode = (tokens) => /[dmyhs]/i.test(tokens.filter((t) => t.fmt).map((t) => t.fmt).join('').replace(/AM\/PM|A\/P|General/gi, ''));

function splitSections(code) {
  const sections = [];
  let cur = '';
  for (let i = 0, quoted = false; i < code.length; i++) {
    const c = code[i];
    if (c === '"') quoted = !quoted;
    if (c === '\\' && !quoted) { cur += c + (code[++i] ?? ''); continue; }
    if (c === ';' && !quoted) { sections.push(cur); cur = ''; } else cur += c;
  }
  return [...sections, cur];
}

const parts = (locale) => {
  const p = new Intl.NumberFormat(locale).formatToParts(1234.5);
  return { decimal: p.find((x) => x.type === 'decimal')?.value ?? '.', group: p.find((x) => x.type === 'group')?.value ?? ',' };
};

function general(v, locale) {
  const abs = Math.abs(v);
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) {
    const [m, e] = v.toExponential(5).split('e');
    return `${String(Number(m)).replace('.', parts(locale).decimal)}E${e[0] === '-' ? '-' : '+'}${e.replace(/^[-+]/, '').padStart(2, '0')}`;
  }
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 15, useGrouping: false }).format(v);
}

function fraction(v, intPart, den) {
  const whole = intPart ? Math.floor(v) : 0;
  const rest = v - whole;
  let best = [Math.round(rest), 1];
  if (/^\d+$/.test(den)) best = [Math.round(rest * Number(den)), Number(den)];
  else {
    const max = 10 ** den.length - 1;
    let err = Infinity;
    for (let d = 1; d <= max; d++) {
      const n = Math.round(rest * d);
      if (Math.abs(rest - n / d) < err - 1e-12) { err = Math.abs(rest - n / d); best = [n, d]; }
    }
  }
  if (best[0] === best[1] && intPart) return String(whole + 1);
  if (best[0] === 0) return String(whole);
  return `${whole ? `${whole} ` : ''}${best[0]}/${best[1]}`;
}

function formatNumberPart(v, fmt, locale) {
  const sci = fmt.match(/^([#0?,]*)\.?([#0?]*)[Ee]([+-])([#0?]+)$/);
  if (sci) {
    const decimals = sci[2].length;
    const [m, e] = v.toExponential(decimals).split('e');
    const exp = Number(e);
    const mant = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: false }).format(Number(m));
    return `${mant}E${exp < 0 ? '-' : sci[3] === '+' ? '+' : ''}${String(Math.abs(exp)).padStart(sci[4].length, '0')}`;
  }
  const [int, dec = ''] = fmt.split('.');
  const minimumIntegerDigits = Math.max(1, (int.match(/0/g) || []).length);
  const text = new Intl.NumberFormat(locale, {
    minimumIntegerDigits: Math.min(minimumIntegerDigits, 21),
    minimumFractionDigits: Math.min((dec.match(/0/g) || []).length, 20),
    maximumFractionDigits: Math.min(dec.replace(/[^#0?]/g, '').length, 20),
    useGrouping: int.includes(','),
  }).format(v);
  // "#" and "?" show no insignificant zero: 0.5 with "#.00" is ".50", 0 with "??" is blank.
  return int.includes('0') ? text : text.replace(/^0(?=\D|$)/, '');
}

function formatDate(serial, tokens, locale, date1904) {
  const hasFraction = tokens.some((t) => t.fmt === '.');
  let days = date1904 ? serial + 1462 : serial;
  if (!date1904 && days < 60) days += 1; // Excel counts 29 Feb 1900, which never existed
  let ms = (days - 25569) * 86400000;
  ms = hasFraction ? Math.round(ms) : Math.round(ms / 1000) * 1000;
  const d = new Date(ms);
  const name = (opts) => new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }).format(d).replace(/\.$/, '');
  // Group consecutive format letters into date parts (yy, mmm, hh, ...).
  const groups = [];
  for (const t of tokens) {
    const last = groups[groups.length - 1];
    if (t.fmt && /^[ymdhs]$/i.test(t.fmt) && last?.part && last.part[0] === t.fmt.toLowerCase()) last.part += t.fmt.toLowerCase();
    else if (t.fmt && /^[ymdhs]$/i.test(t.fmt)) groups.push({ part: t.fmt.toLowerCase() });
    else if (t.fmt?.startsWith('[')) groups.push({ elapsed: t.fmt.slice(1, -1) });
    else groups.push(t);
  }
  // Merge A/P and AM/PM, and fractional seconds (.0, .00).
  const flat = [];
  for (let i = 0; i < groups.length; i++) {
    const p = groups[i];
    const ahead = groups.slice(i, i + 5).map((x) => x.fmt ?? x.part ?? '').join('');
    if (/^am\/pm/i.test(ahead)) { flat.push({ ampm: 'long' }); i += 4; continue; }
    if (/^a\/p/i.test(ahead)) { flat.push({ ampm: 'short' }); i += 2; continue; }
    if (p.fmt === '.' && groups[i + 1]?.fmt === '0') { let n = 0; while (groups[i + 1]?.fmt === '0') { n++; i++; } flat.push({ frac: n }); continue; }
    flat.push(p);
  }
  const ampm = flat.some((p) => p.ampm);
  const dateParts = flat.filter((p) => p.part || p.elapsed);
  const total = Math.round(serial * 86400 * (hasFraction ? 1000 : 1)) / (hasFraction ? 1000 : 1);
  const pad = (n, len) => String(n).padStart(len, '0');
  return flat.map((p) => {
    if (p.lit !== undefined) return p.lit;
    if (p.fmt !== undefined) return p.fmt;
    if (p.ampm) return d.getUTCHours() < 12 ? (p.ampm === 'long' ? 'AM' : 'A') : (p.ampm === 'long' ? 'PM' : 'P');
    if (p.frac) return `${parts(locale).decimal}${pad(Math.floor((d.getUTCMilliseconds() / 1000) * 10 ** p.frac), p.frac)}`;
    if (p.elapsed) {
      const unit = p.elapsed[0];
      const n = Math.floor(unit === 'h' ? total / 3600 : unit === 'm' ? total / 60 : total);
      return pad(n, p.elapsed.length);
    }
    const k = p.part;
    const i = dateParts.indexOf(p);
    const minutes = k[0] === 'm' && k.length <= 2
      && (/^h|^\[h/.test(dateParts[i - 1]?.part ?? dateParts[i - 1]?.elapsed ?? '') || /^s/.test(dateParts[i + 1]?.part ?? ''));
    if (minutes) return pad(d.getUTCMinutes(), k.length);
    switch (k[0]) {
      case 'y': return k.length <= 2 ? pad(d.getUTCFullYear() % 100, 2) : String(d.getUTCFullYear());
      case 'm': return k.length === 1 ? String(d.getUTCMonth() + 1) : k.length === 2 ? pad(d.getUTCMonth() + 1, 2)
        : k.length === 3 ? name({ month: 'short' }) : k.length === 5 ? name({ month: 'narrow' }) : name({ month: 'long' });
      case 'd': return k.length <= 2 ? pad(d.getUTCDate(), k.length) : name({ weekday: k.length === 3 ? 'short' : 'long' });
      case 'h': { const h = d.getUTCHours(); return pad(ampm ? h % 12 || 12 : h, Math.min(k.length, 2)); }
      case 's': return pad(d.getUTCSeconds(), Math.min(k.length, 2));
      default: return k;
    }
  }).join('');
}

/** @param {number} value @param {string} [code] @param {{ locale?: string, date1904?: boolean }} [options] */
export function formatNumber(value, code = 'General', { locale, date1904 = false } = {}) {
  try {
    const shortDate = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
      .formatToParts(new Date(Date.UTC(2001, 10, 22))).map((p) => (p.type === 'day' ? 'dd' : p.type === 'month' ? 'mm' : p.type === 'year' ? 'yyyy' : `"${p.value}"`)).join('');
    const sections = splitSections(String(code).replace(/SHORT_DATE/g, shortDate));
    let section = sections[0];
    let v = value;
    let sign = '';
    if (value < 0 && sections.length > 1 && sections[1] !== '') { section = sections[1]; v = -value; }
    else if (value === 0 && sections.length > 2 && sections[2] !== '') section = sections[2];
    const tokens = tokenize(section);
    if (isDateCode(tokens)) return value < 0 ? general(value, locale) : formatDate(value, tokens, locale, date1904);
    const skeleton = tokens.map((t) => t.fmt ?? '').join('');
    if (!/[#0?]/.test(skeleton)) return tokens.map((t) => t.lit ?? t.fmt).join('').replace(/General|@/i, () => general(section === sections[0] ? value : v, locale));
    if (value < 0 && section === sections[0]) { sign = '-'; v = -value; }
    // Masks like 00000-000 (postal code) or (00) 0000-0000: the digits fill the placeholders right to left around the literals.
    const ph = tokens.map((t) => /^[#0?]$/.test(t.fmt ?? ''));
    const first = ph.indexOf(true);
    const last = ph.lastIndexOf(true);
    if (!/[.Ee/%]/.test(skeleton) && tokens.slice(first, last + 1).some((t, k) => !ph[first + k] && t.fmt !== ',')) {
      let digits = String(Math.round(v));
      const out = [];
      for (let k = tokens.length - 1; k >= 0; k--) {
        if (!ph[k]) { out.unshift(tokens[k].lit ?? (tokens[k].fmt === ',' ? '' : tokens[k].fmt)); continue; }
        out.unshift(digits ? digits.slice(-1) : tokens[k].fmt === '0' ? '0' : '');
        digits = digits.slice(0, -1);
        if (k === first && digits) out.unshift(digits);
      }
      return sign + out.join('');
    }
    v *= 100 ** (skeleton.match(/%/g) || []).length;
    // The number block: the first run of digit placeholders (with separators, decimals, exponent or fraction).
    const block = skeleton.match(/(?:[#0?]+ +)?[#0?]+\/(?:[#0?]+|\d+)|[#0?,]*\.?[#0?]*(?:[Ee][+-][#0?]+)?,*/g).find((m) => /[#0?]/.test(m));
    const start = skeleton.indexOf(block);
    let text;
    const frac = block.match(/^(?:([#0?]+) +)?[#0?]+\/([#0?]+|\d+)$/);
    if (frac) text = fraction(v, Boolean(frac[1]), frac[2]);
    else {
      const scale = (block.match(/,+$/) || [''])[0].length;
      text = formatNumberPart(v / 1000 ** scale, block.replace(/,+$/, ''), locale);
    }
    // Rebuild: literals and format characters before/after the block, around the formatted number.
    let out = '';
    let pos = 0;
    let placed = false;
    for (const t of tokens) {
      if (t.lit !== undefined) { out += t.lit; continue; }
      if (pos >= start && pos < start + block.length) { if (!placed) { out += text; placed = true; } }
      else if (!/[#0?]/.test(t.fmt)) out += t.fmt;
      pos += t.fmt.length;
    }
    return sign + out;
  } catch {
    return general(value, locale);
  }
}
