// parse.js — dependency-free CommonMark 0.31.2 + GFM parser, written from scratch.
// parse(markdown) returns exactly the HTML marked 18.1.3 (default options) returns.
// Single-pass, stateless per call, no caching, no network, no wall clock.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escHtml(s) { let o = '', i = 0; for (; i < s.length; i++) { const c = s[i]; o += ESC[c] || c; } return o; }
function escAttr(s) { return escEntity(s, false); }
function escText(s) { return escEntity(s, true); }
// Entity-aware escape: a valid reference &name; or &#...; passes through verbatim
// in attributes; in text, named refs pass through and numeric refs decode to the
// character (then escaped if special). Anything else: '&' -> '&amp;'.
function escEntity(s, decodeNumeric) {
  let o = '', i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '&') {
      const m = /^&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([A-Za-z][A-Za-z0-9]*));/.exec(s.slice(i));
      if (m) {
        if (!decodeNumeric || m[3] !== undefined) { o += m[0]; i += m[0].length; continue; }
        let cp = m[1] !== undefined ? parseInt(m[1], 10) : parseInt(m[2], 16);
        if (cp === 0 || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) cp = 0xFFFD;
        const ch = String.fromCodePoint(cp);
        o += ESC[ch] || ch;
        i += m[0].length;
        continue;
      }
      o += '&amp;'; i++; continue;
    }
    o += ESC[c] || c; i++;
  }
  return o;
}
const PUNCT = new Set('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');
const PUNCT_RE = /^[\p{P}\p{S}]$/u;
// ASCII punctuation only: backslash escapes and link-label escapes
function isPunct(ch) { return ch !== undefined && PUNCT.has(ch); }
// Unicode punctuation/symbols: delimiter flanking (so £ € « count as punct)
function isPunctUni(ch) { return ch !== undefined && (PUNCT.has(ch) || PUNCT_RE.test(ch)); }
function isSpace(ch) { return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v' || ch === '\u00a0' || ch === '\u1680' || (ch >= '\u2000' && ch <= '\u200a') || ch === '\u202f' || ch === '\u205f' || ch === '\u3000' || ch === '\ufeff'; }
function isWs(ch) { return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'; }
function isAlnum(ch) { return ch !== undefined && /[A-Za-z0-9]/.test(ch); }
function isAlpha(ch) { return ch !== undefined && /[A-Za-z]/.test(ch); }
function isDigit(ch) { return ch >= '0' && ch <= '9'; }
// HTML5 named entities (commonly used subset; numeric/hex handled separately)
const ENT = {
  amp: '&', AMP: '&', lt: '<', LT: '<', gt: '>', GT: '>', quot: '"', QUOT: '"', apos: "'", copy: '©', COPY: '©',
  nbsp: ' ', reg: '®', REG: '®', trade: '™', TRADE: '™', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', times: '×', divide: '÷',
  plusmn: '±', deg: '°', micro: 'µ', para: '¶', middot: '·', bull: '•', dagger: '†', Dagger: '‡',
  permil: '‰', prime: '′', Prime: '″', euro: '€', pound: '£', yen: '¥', cent: '¢', curren: '¤',
  sect: '§', uml: '¨', ordf: 'ª', ordm: 'º', iexcl: '¡', iquest: '¿', szlig: 'ß', agrave: 'à',
  aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å', aelig: 'æ', ccedil: 'ç',
  egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë', igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï',
  ntilde: 'ñ', ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö', oslash: 'ø',
  ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü', yacute: 'ý', yuml: 'ÿ', eth: 'ð', ETH: 'Ð',
  thorn: 'þ', THORN: 'Þ', yacute2: 'ý', frac12: '½', frac14: '¼', frac34: '¾', sup1: '¹', sup2: '²',
  sup3: '³', frac18: '⅛', frac38: '⅜', frac58: '⅝', frac78: '⅞', alpha: 'α', beta: 'β', gamma: 'γ',
  delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ',
  mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ',
  chi: 'χ', psi: 'ψ', omega: 'ω', Alpha: 'Α', Beta: 'Β', Gamma: 'Γ', Delta: 'Δ', Epsilon: 'Ε',
  Zeta: 'Ζ', Eta: 'Η', Theta: 'Θ', Iota: 'Ι', Kappa: 'Κ', Lambda: 'Λ', Mu: 'Μ', Nu: 'Ν', Xi: 'Ξ',
  Pi: 'Π', Rho: 'Ρ', Sigma: 'Σ', Tau: 'Τ', Upsilon: 'Υ', Phi: 'Φ', Chi: 'Χ', Psi: 'Ψ', Omega: 'Ω',
  infin: '∞', ne: '≠', le: '≤', ge: '≥', plus: '+', minus: '−', lowast: '∗', radic: '√', prop: '∝',
  empty: '∅', isin: '∈', notin: '∉', ni: '∋', prod: '∏', sum: '∑', larr: '←', uarr: '↑', rarr: '→',
  darr: '↓', harr: '↔', crarr: '↵', forall: '∀', part: '∂', exist: '∃', nabla: '∇', isin2: '∈',
  and: '∧', or: '∨', cap: '∩', cup: '∪', int: '∫', there4: '∴', sim: '∼', cong: '≅', asymp: '≈',
  neq: '≠', equiv: '≡', sub: '⊂', sup: '⊃', nsub: '⊄', sube: '⊆', supe: '⊇', oplus: '⊕',
  otimes: '⊗', perp: '⊥', sdot: '⋅', lceil: '⌈', rceil: '⌉', lfloor: '⌊', rfloor: '⌋', lang: '〈',
  rang: '〉', loz: '◊', spades: '♠', clubs: '♣', hearts: '♥', diams: '♦', ensp: ' ', emsp: ' ',
  thinsp: ' ', zwnj: '‌', zwj: '‍', lrm: '‎', rlm: '‏', sbquo: '‚', bdquo: '„', fnof: 'ƒ',
  circ: 'ˆ', tilde: '˜', shy: '­', oe: 'œ', OE: 'Œ', scaron: 'š', Scaron: 'Š', yuml2: 'ÿ',
  oelig: 'œ', OElig: 'Œ', dagger2: '†', ensp2: ' ', quot2: '"', hellip2: '…', apos2: "'",
  Aacute: 'Á', Acirc: 'Â', Atilde: 'Ã', Auml: 'Ä', Aring: 'Å', AElig: 'Æ', Ccedil: 'Ç',
  Egrave: 'È', Eacute: 'É', Ecirc: 'Ê', Euml: 'Ë', Igrave: 'Ì', Iacute: 'Í', Icirc: 'Î', Iuml: 'Ï',
  Ntilde: 'Ñ', Ograve: 'Ò', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Ouml: 'Ö', Oslash: 'Ø',
  Ugrave: 'Ù', Uacute: 'Ú', Ucirc: 'Û', Uuml: 'Ü', Yacute: 'Ý', Yuml: 'Ÿ', THORN2: 'Þ',
  Agrave: 'À', aelig2: 'æ', sup2x: '²', frac12x: '½'
};
function decodeEntity(s, i) {
  // s[i] === '&'; returns [decodedString, newIndex] or null.
  // Only numeric references decode here (1-7 decimal digits, 1-6 hex digits);
  // named references are left raw and preserved verbatim by escText/escAttr.
  if (s[i + 1] === '#') {
    let j = i + 2, hex = false;
    if (s[j] === 'x' || s[j] === 'X') { hex = true; j++; }
    const start = j;
    while (j < s.length && (hex ? /[0-9A-Fa-f]/.test(s[j]) : isDigit(s[j]))) j++;
    if (j === start || j >= s.length || s[j] !== ';') return null;
    if (j - start > (hex ? 6 : 7)) return null;
    let cp = parseInt(s.slice(start, j), hex ? 16 : 10);
    if (cp === 0 || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) cp = 0xFFFD;
    return [String.fromCodePoint(cp), j + 1];
  }
  return null;
}
function normalizeLabel(s) {
  // collapse whitespace, case-fold, unescape only \[ and \], fold ß/ẞ -> ss
  let o = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && (s[i + 1] === '[' || s[i + 1] === ']')) { o += s[i + 1]; i++; }
    else if (c === 'ß' || c === 'ẞ') o += 'ss';
    else if (isSpace(c)) { if (o && !o.endsWith(' ')) o += ' '; }
    else o += c.toLowerCase();
  }
  return o.trim();
}
function encodeUri(u, encBrackets) {
  // percent-encode like marked: encodeURI plus encode ( ) ' etc. '%' is
  // never re-encoded (a valid %XX stays, a bare % stays too).
  let o = '';
  for (let i = 0; i < u.length; i++) {
    const c = u[i], code = u.charCodeAt(i);
    if (c === '%') { o += c; continue; }
    if (code < 128 && /[A-Za-z0-9\-_.!~*'();\/?:@&=+$,#]/.test(c)) o += c;
    else if (code < 128 && (c === '[' || c === ']')) o += encBrackets ? encodeURIComponent(c) : c;
    else o += encodeURIComponent(c);
  }
  return o;
}
function cleanUrl(u) {
  // marked: strip control chars, decode entities in href handled by caller; here just trim
  return u.replace(/[\u0000-\u001f\u007f]/g, '');
}

// ---- inline parsing ----
function scanCodeSpan(s, i) {
  // s[i] === '`'; returns [node, nextIndex] or null
  let n = 0; while (i + n < s.length && s[i + n] === '`') n++;
  let j = i + n, k;
  while ((k = s.indexOf('`', j)) !== -1) {
    let m = 0; while (k + m < s.length && s[k + m] === '`') m++;
    if (m === n) {
      let content = s.slice(i + n, k).replace(/\n/g, ' ');
      if (content.length >= 2 && content[0] === ' ' && content[content.length - 1] === ' ' && content.trim() !== '') content = content.slice(1, -1);
      return [{ type: 'code', text: content }, k + m];
    }
    j = k + m;
  }
  return null;
}
function scanHtmlInline(s, i) {
  // returns [html, nextIndex] or null; s[i] === '<'
  const sub = s.slice(i);
  let m;
  if (sub.startsWith('<!--')) {
    // <!--> and <!---> are complete (empty) comments that close at once
    if (sub[4] === '>') return ['<!-->', i + 5];
    if (sub[4] === '-' && sub[5] === '>') return ['<!--->', i + 6];
    const end = sub.indexOf('-->', 4);
    if (end !== -1) return [sub.slice(0, end + 3), i + end + 3];
    return null;
  }
  if (sub.startsWith('<?')) { const e = sub.indexOf('?>', 2); if (e !== -1) return [sub.slice(0, e + 2), i + e + 2]; return null; }
  if (sub.startsWith('<!')) {
    if (/^<![A-Za-z]/.test(sub)) { const e = sub.indexOf('>', 2); if (e !== -1) return [sub.slice(0, e + 1), i + e + 1]; return null; }
    if (sub.startsWith('<![CDATA[')) { const e = sub.indexOf(']]>', 9); if (e !== -1) return [sub.slice(0, e + 3), i + e + 3]; return null; }
    return null;
  }
  m = /^<\/?[A-Za-z][A-Za-z0-9-]*/.exec(sub);
  if (!m) return null;
  const isClose = m[0].startsWith('</');
  let j = i + m[0].length;
  // attributes must be preceded by whitespace; a closing tag has none
  let needWs = true;
  while (j < s.length) {
    const c = s[j];
    if (c === '>') return [s.slice(i, j + 1), j + 1];
    if (c === '/' && s[j + 1] === '>') return [s.slice(i, j + 2), j + 2];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { j++; needWs = false; continue; }
    if (needWs || isClose) return null;
    const am = /^[A-Za-z_:][A-Za-z0-9_.:-]*/.exec(s.slice(j));
    if (!am) return null;
    j += am[0].length;
    let skippedWs = false;
    while (j < s.length && (s[j] === ' ' || s[j] === '\t' || s[j] === '\n')) { j++; skippedWs = true; }
    if (skippedWs) needWs = false;
    let hadValue = false;
    if (s[j] === '=') {
      hadValue = true;
      j++;
      while (j < s.length && (s[j] === ' ' || s[j] === '\t' || s[j] === '\n')) j++;
      if (s[j] === '"' || s[j] === "'") {
        const q = s[j]; const e = s.indexOf(q, j + 1);
        if (e === -1) return null;
        j = e + 1;
      } else {
        const vm = /^[^\s"'=<>`]+/.exec(s.slice(j));
        if (!vm) return null;
        j += vm[0].length;
      }
    }
    // after a value, the next attribute still needs its own whitespace;
    // after a valueless attribute, whitespace already skipped is the separator
    needWs = hadValue || !skippedWs;
  }
  return null;
}
function scanAutolink(s, i) {
  // s[i] === '<'; returns [node, nextIndex] or null
  const m = /^<([A-Za-z][A-Za-z0-9+.-]{1,31}):([^<>\s]*)>/.exec(s.slice(i));
  if (m) {
    const url = m[1] + ':' + m[2];
    const href = encodeUri(cleanUrl(url), true);
    return [{ type: 'link', href, title: null, children: [{ type: 'text', text: url }] }, i + m[0].length];
  }
  const em = /^<([A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*)>/.exec(s.slice(i));
  if (em) {
    const addr = em[1];
    return [{ type: 'link', href: 'mailto:' + encodeUri(cleanUrl(addr), true), title: null, children: [{ type: 'text', text: addr }] }, i + em[0].length];
  }
  return null;
}
function trimUrlEnd(u) {
  // trim trailing punctuation per GFM extended autolink rules
  let end = u.length;
  // trim trailing ? ! . , : ; * _ ~ and unbalanced ')'
  while (end > 0) {
    const c = u[end - 1];
    if (c === ';') {
      // entity-like ending: &name; -> cut back to '&'
      const amp = u.lastIndexOf('&', end - 1);
      if (amp !== -1 && /^&[A-Za-z0-9]+;$/.test(u.slice(amp, end))) { end = amp; continue; }
      break;
    }
    if ('?!.,:;*_~'.includes(c)) { end--; continue; }
    if (c === ')') {
      const open = (u.slice(0, end).match(/\(/g) || []).length;
      const close = (u.slice(0, end).match(/\)/g) || []).length;
      if (close > open) { end--; continue; }
      break;
    }
    if (c === ']') break;
    break;
  }
  return u.slice(0, end);
}
function scanExtendedAutolink(s, i) {
  // www. / email / scheme autolinks starting at i; returns [node, nextIndex] or null
  const prev = i > 0 ? s[i - 1] : '';
  if (prev && (isAlnum(prev) || prev === '_' || prev === '/')) return null;
  let m;
  if (s.startsWith('www.', i)) {
    m = /^www\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+(?:[/?#][^\s<>]*)?/.exec(s.slice(i));
    if (!m) return null;
    let url = trimUrlEnd(m[0]);
    if (url.length < 5) return null;
    return [{ type: 'link', href: encodeUri('http://' + cleanUrl(url), true), title: null, children: [{ type: 'text', text: url }] }, i + url.length];
  }
  m = /^([A-Za-z][A-Za-z0-9+.-]{1,31}):\/\/[^\s<>]+/.exec(s.slice(i));
  if (m) {
    let url = trimUrlEnd(m[0]);
    return [{ type: 'link', href: encodeUri(cleanUrl(url), true), title: null, children: [{ type: 'text', text: url }] }, i + url.length];
  }
  // scheme:email[/path] for mailto: and xmpp: (lowercase schemes only);
  // the whole thing is one link, with at most one path segment
  m = /^(mailto|xmpp):([A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+)(\/[^\s<>\/]+)?/.exec(s.slice(i));
  if (m) {
    let url = trimUrlEnd(m[0]);
    const after = s[i + url.length];
    if (url.endsWith('-') || url.endsWith('_')) return null;
    if (after === '-' || after === '_') return null;
    return [{ type: 'link', href: encodeUri(cleanUrl(url), true), title: null, children: [{ type: 'text', text: url }] }, i + url.length];
  }
  m = /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+/.exec(s.slice(i));
  if (m) {
    let addr = m[0];
    // a trailing - or _ right after the match invalidates the whole autolink
    const after = s[i + addr.length];
    if (after === '-' || after === '_') return null;
    if (addr.endsWith('-')) return null;
    if (addr.endsWith('_') && !addr.endsWith('__')) {
      // a _ closing a _..._ pair is ok; approximate: trim single trailing _
      addr = addr.slice(0, -1);
    }
    addr = trimUrlEnd(addr);
    if (!addr.includes('@')) return null;
    return [{ type: 'link', href: 'mailto:' + encodeUri(cleanUrl(addr), true), title: null, children: [{ type: 'text', text: addr }] }, i + addr.length];
  }
  return null;
}

// ---- link destination / title parsing ----
function parseLinkDest(s, i) {
  // skip whitespace (incl. newlines); returns [dest, nextIndex] or null; i points after '[' ']' etc.
  let j = i;
  while (j < s.length && isWs(s[j])) j++;
  if (j >= s.length) return null;
  if (s[j] === '<') {
    let k = j + 1, dest = '';
    while (k < s.length && s[k] !== '>' && s[k] !== '\n') {
      if (s[k] === '\\' && k + 1 < s.length && isPunct(s[k + 1])) { dest += s[k + 1]; k += 2; }
      else { dest += s[k]; k++; }
    }
    if (k >= s.length || s[k] !== '>') return null;
    return [dest, k + 1];
  }
  // bare destination: balanced parens, no spaces/control
  let depth = 0, k = j, dest = '';
  while (k < s.length) {
    const c = s[k];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c.charCodeAt(0) < 32) break;
    if (c === '\\' && k + 1 < s.length && isPunct(s[k + 1])) { dest += s[k + 1]; k += 2; continue; }
    if (c === '(') { depth++; dest += c; k++; continue; }
    if (c === ')') {
      if (depth === 0) break;
      depth--; dest += c; k++; continue;
    }
    dest += c; k++;
  }
  if (k === j) return ['', k]; // empty destination, e.g. [link]()
  return [dest, k];
}
function parseLinkTitle(s, i) {
  // i: index after destination; returns [title, nextIndex] or null (null title = no title, index unchanged-ish)
  let j = i;
  while (j < s.length && isWs(s[j])) j++;
  if (j >= s.length) return [null, i];
  const q = s[j];
  if (q !== '"' && q !== "'" && q !== '(') return [null, i];
  const close = q === '(' ? ')' : q;
  let k = j + 1, title = '';
  while (k < s.length && s[k] !== close) {
    if (s[k] === '\\' && k + 1 < s.length && isPunct(s[k + 1])) { title += s[k + 1]; k += 2; continue; }
    title += s[k]; k++;
  }
  if (k >= s.length) return [null, i];
  return [title, k + 1];
}
function scanLabel(s, i) {
  // s[i] === '['; returns {end (index after matching ]), text, raw} or null.
  // text excludes the outer brackets.
  let depth = 1, j = i + 1, raw = '';
  while (j < s.length) {
    const c = s[j];
    if (c === '\\' && j + 1 < s.length) { raw += s.slice(j, j + 2); j += 2; continue; }
    if (c === '`') {
      let n = 0; while (j + n < s.length && s[j + n] === '`') n++;
      // find closing run of exact length n
      let k = j + n, found = -1, flen = 0;
      while (k < s.length) {
        if (s[k] === '`') {
          let m = 0; while (k + m < s.length && s[k + m] === '`') m++;
          if (m === n) { found = k; flen = m; break; }
          k += m;
        } else k++;
      }
      if (found === -1) { raw += s.slice(j, j + n); j += n; continue; }
      const content = s.slice(j + n, found);
      // multi-backtick span holding a backtick followed by more label text -> label scan fails
      if (content.includes('`')) {
        // find the matching ']' for this label to see if more text follows the span
        let rest = s.slice(found + flen);
        const closeIdx = rest.indexOf(']');
        if (closeIdx > 0) return null;
      }
      raw += s.slice(j, found + flen); j = found + flen; continue;
    }
    if (c === '[') { depth++; raw += c; j++; continue; }
    if (c === ']') {
      depth--;
      if (depth === 0) return { end: j + 1, text: raw, raw };
      raw += c; j++; continue;
    }
    raw += c; j++;
  }
  return null;
}
function labelText(raw) {
  // labels are compared with backslashes intact (so foo\! != foo!, but
  // ref\[ == ref\[); only the raw text is used for matching
  return raw;
}
function parseInline(src, refs) {
  const nodes = [];
  const brackets = []; // {nodeIdx, isImage, active}
  let text = '';
  function flushText() { if (text) { nodes.push({ type: 'text', text }); text = ''; } }
  function pushNode(n) { flushText(); nodes.push(n); }
  const s = src;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const next = s[i + 1];
    if (c === '\\') {
      if (next === '\n') { pushNode({ type: 'br' }); i += 2; while (i < s.length && (s[i] === ' ' || s[i] === '\t')) i++; continue; }
      // an escaped & is a literal ampersand, never an entity start
      if (next === '&') { pushNode({ type: 'amp' }); i += 2; continue; }
      if (next !== undefined && isPunct(next)) { text += next; i += 2; continue; }
      text += c; i++; continue;
    }
    if (c === '`') {
      const r = scanCodeSpan(s, i);
      if (r) { pushNode(r[0]); i = r[1]; continue; }
      // no closing run of the same length: the whole backtick run is literal
      let n = 0; while (i + n < s.length && s[i + n] === '`') n++;
      text += '`'.repeat(n); i += n; continue;
    }
    if (c === '<') {
      const a = scanAutolink(s, i);
      if (a) { pushNode(a[0]); i = a[1]; continue; }
      const h = scanHtmlInline(s, i);
      if (h) { pushNode({ type: 'html', text: h[0] }); i = h[1]; continue; }
      text += c; i++; continue;
    }
    if (c === '\n') {
      // softbreak; hard break if preceded by 2+ spaces (text ends with spaces)
      let sp = 0; for (let k = text.length - 1; k >= 0 && text[k] === ' '; k--) sp++;
      if (sp >= 2) { text = text.slice(0, text.length - sp); pushNode({ type: 'br' }); i++; while (i < s.length && (s[i] === ' ' || s[i] === '\t')) i++; continue; }
      pushNode({ type: 'softbreak' });
      i++; continue;
    }
    if (c === '!' && next === '[') {
      flushText();
      const startIdx = nodes.length;
      nodes.push({ type: 'text', text: '![' });
      brackets.push({ nodeIdx: startIdx, isImage: true, active: true, srcIdx: i });
      i += 2; continue;
    }
    if (c === '[') {
      flushText();
      const startIdx = nodes.length;
      nodes.push({ type: 'text', text: '[' });
      brackets.push({ nodeIdx: startIdx, isImage: false, active: true, srcIdx: i });
      i++; continue;
    }
    if (c === ']') {
      // try to form a link/image with nearest active opener
      let bi = -1;
      for (let b = brackets.length - 1; b >= 0; b--) if (brackets[b].active) { bi = b; break; }
      if (bi === -1) { text += c; i++; continue; }
      const br = brackets[bi];
      const openIdx = br.nodeIdx;
      // label raw text comes from the source span (backslashes intact), not
      // from the parsed nodes (which resolve escapes)
      const labelRaw = s.slice(br.srcIdx + (br.isImage ? 2 : 1), i);
      const label = labelText(labelRaw);
      const norm = normalizeLabel(label);
      let dest = null, title = null, endIdx = i + 1, ok = false, isRef = false, secondLabelSeen = false;
      {
        const after = s[i + 1];
        if (after === '(') {
          const d = parseLinkDest(s, i + 2);
          if (d) {
            const t = parseLinkTitle(s, d[1]);
            let j = t[1];
            while (j < s.length && (s[j] === ' ' || s[j] === '\t')) j++;
            if (j < s.length && s[j] === ')') {
              dest = d[0]; title = t[0]; endIdx = j + 1; ok = true;
            } else if (t[0] === null && d[1] < s.length && s[d[1]] === ')') {
              dest = d[0]; title = null; endIdx = d[1] + 1; ok = true;
            }
          }
        } else if (after === '[') {
          const l2 = scanLabel(s, i + 1);
          if (l2) {
            secondLabelSeen = true;
            const norm2 = normalizeLabel(labelText(l2.text));
            if (l2.text.trim() === '') { // collapsed: [foo][]
              const ref = refs.get(norm);
              if (ref) { dest = ref.dest; title = ref.title; endIdx = l2.end; ok = true; isRef = true; }
            } else {
              const ref = refs.get(norm2);
              if (ref) { dest = ref.dest; title = ref.title; endIdx = l2.end; ok = true; isRef = true; }
            }
          }
        }
        if (!ok && !secondLabelSeen) {
          // shortcut reference (only when no second bracket label was present)
          const ref = refs.get(norm);
          if (ref) { dest = ref.dest; title = ref.title; endIdx = i + 1; ok = true; isRef = true; }
        }
      }
      if (ok) {
        // a link may contain an image, but not another link
        let hasLink = false;
        if (!br.isImage) {
          for (let n = openIdx + 1; n < nodes.length; n++) if (nodes[n].type === 'link') { hasLink = true; break; }
        }
        if (hasLink) { br.active = false; text += c; i++; continue; }
        flushText();
        const children = nodes.splice(openIdx + 1);
        // remove the opener text node
        nodes.splice(openIdx, 1);
        const href = dest === '' ? '' : encodeUri(cleanUrl(dest));
        if (br.isImage) {
          const alt = renderAlt(children);
          nodes.push({ type: 'image', href, title, alt, children, raw: '![' + labelRaw + ']' });
        } else {
          nodes.push({ type: 'link', href, title, children, raw: '[' + labelRaw + ']' });
        }
        // deactivate brackets inside
        for (let b = bi + 1; b < brackets.length; b++) brackets[b].active = false;
        brackets.splice(bi, 1);
        i = endIdx; continue;
      }
      br.active = false;
      text += c; i++; continue;
    }
    if (c === '*' || c === '_' || c === '~') {
      // delimiter run
      let n = 0; while (i + n < s.length && s[i + n] === c) n++;
      const prev = i > 0 ? s[i - 1] : '';
      const foll = i + n < s.length ? s[i + n] : '';
      const prevWs = i === 0 || isSpace(prev);
      const follWs = i + n >= s.length || isSpace(foll);
      const prevPunct = isPunctUni(prev);
      const follPunct = isPunctUni(foll);
      const leftFlank = !follWs && (!follPunct || prevWs || prevPunct);
      const rightFlank = !prevWs && (!prevPunct || follWs || follPunct);
      let canOpen, canClose;
      if (c === '_') {
        canOpen = leftFlank && (!rightFlank || prevPunct);
        canClose = rightFlank && (!leftFlank || follPunct);
      } else {
        canOpen = leftFlank; canClose = rightFlank;
      }
      if (c === '~' && n >= 3) { text += c.repeat(n); i += n; continue; }
      flushText();
      nodes.push({ type: 'delim', char: c, len: n, canOpen, canClose });
      i += n; continue;
    }
    if (c === 'w' && s.startsWith('www.', i)) {
      const a = scanExtendedAutolink(s, i);
      if (a) { pushNode(a[0]); i = a[1]; continue; }
      text += c; i++; continue;
    }
    if (isAlpha(c) || isDigit(c)) {
      // possible extended autolink: scheme:// or email
      const a = scanExtendedAutolink(s, i);
      if (a) { pushNode(a[0]); i = a[1]; continue; }
      // plain word: consume run fast (stop before '_' — it is a delimiter)
      let j = i;
      while (j < s.length && (isAlnum(s[j]) || s[j] === '-')) j++;
      if (j === i) j = i + 1;
      text += s.slice(i, j); i = j; continue;
    }
    text += c; i++;
  }
  flushText();
  processEmphasis(nodes);
  return nodes;
}
function renderAlt(children) {
  let o = '';
  for (const n of children) {
    if (n.type === 'text') o += n.text;
    else if (n.type === 'code') o += n.text;
    else if (n.type === 'link' || n.type === 'image') o += n.children ? renderAlt(n.children) : (n.alt || '');
    else if (n.type === 'em' || n.type === 'strong' || n.type === 'del') o += renderAlt(n.children);
    else if (n.type === 'br') o += ' ';
    else if (n.type === 'softbreak') o += ' ';
    else if (n.type === 'amp') o += '&';
    else if (n.type === 'html') o += '';
    else if (n.type === 'delim') o += n.char.repeat(n.len);
  }
  return o;
}

// ---- emphasis processing (CommonMark delimiter-stack algorithm) ----
function processEmphasis(nodes) {
  // recursively process children first
  for (const n of nodes) {
    if (n.children) processEmphasis(n.children);
  }
  const openers = []; // indices into nodes of delim nodes that can open
  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i];
    if (n.type === 'delim' && n.canClose && n.len > 0) {
      let foundIdx = -1, foundPos = -1;
      for (let p = openers.length - 1; p >= 0; p--) {
        const op = nodes[openers[p]];
        if (!op || op.type !== 'delim' || op.len === 0) continue;
        if (op.char !== n.char) continue;
        if (!op.canOpen) continue;
        // rule of 3: if either delimiter can both open and close, a
        // multiple-of-3 total length forbids the match (unless both are
        // multiples of 3) — the inner pair then takes precedence
        const eitherBoth = (op.canOpen && op.canClose) || (n.canOpen && n.canClose);
        if (eitherBoth && (op.len + n.len) % 3 === 0 && !((op.len % 3 === 0) && (n.len % 3 === 0))) continue;
        foundIdx = openers[p]; foundPos = p; break;
      }
      if (foundIdx === -1) {
        if (n.canOpen) openers.push(i);
        i++; continue;
      }
      const op = nodes[foundIdx];
      let use;
      if (op.char === '~') use = (op.len >= 2 && n.len >= 2) ? 2 : 1;
      else use = (op.len >= 2 && n.len >= 2) ? 2 : 1;
      const tag = op.char === '~' ? 'del' : (use === 2 ? 'strong' : 'em');
      // wrap nodes between opener and closer
      const inner = nodes.slice(foundIdx + 1, i);
      const wrapped = { type: tag, children: inner };
      // adjust lengths
      op.len -= use; n.len -= use;
      // remove nodes between, insert wrapped
      const insertAt = foundIdx + (op.len === 0 ? 0 : 1);
      nodes.splice(foundIdx + 1, i - foundIdx - 1, wrapped);
      // fix opener stack indices after splice
      const removed = i - foundIdx - 1;
      for (let p = 0; p < openers.length; p++) {
        if (openers[p] > foundIdx && openers[p] < foundIdx + 1 + removed) openers[p] = -1;
        else if (openers[p] > foundIdx) openers[p] = openers[p] - removed;
      }
      // remove the opener entry only when it is fully consumed; a partially
      // used opener stays on the stack for the remaining closer run
      if (op.len === 0) openers.splice(foundPos, 1);
      if (op.len === 0) {
        // remove opener node
        nodes.splice(foundIdx, 1);
        for (let p = 0; p < openers.length; p++) if (openers[p] > foundIdx) openers[p]--;
        i = foundIdx; // wrapped node now at foundIdx
      } else {
        i = foundIdx + 2; // opener + wrapped
      }
      if (n.len === 0) {
        // closer consumed entirely; its node is the one after wrapped
        const closerPos = (op.len === 0 ? foundIdx + 1 : foundIdx + 2);
        nodes.splice(closerPos, 1);
        for (let p = 0; p < openers.length; p++) if (openers[p] > closerPos) openers[p]--;
        i = closerPos;
      } else {
        // closer partially used: re-examine it at its new position so the
        // remainder can match an outer opener (e.g. ___ closes __, then _)
        i = (op.len === 0 ? foundIdx + 1 : foundIdx + 2);
      }
      // clean dead opener entries
      for (let p = openers.length - 1; p >= 0; p--) if (openers[p] < 0 || !nodes[openers[p]] || nodes[openers[p]].type !== 'delim') openers.splice(p, 1);
      continue;
    }
    // opener-only delimiter: push so a later closer can find it
    if (n.type === 'delim' && n.canOpen && n.len > 0) openers.push(i);
    i++;
  }
  // leftover delimiters become literal text
  for (let k = 0; k < nodes.length; k++) {
    const n = nodes[k];
    if (n.type === 'delim') nodes[k] = { type: 'text', text: n.char.repeat(n.len) };
  }
}
function renderInline(nodes) {
  let o = '';
  for (const n of nodes) {
    switch (n.type) {
      case 'text': o += escText(n.text); break;
      case 'amp': o += '&amp;'; break;
      case 'code': o += '<code>' + escHtml(n.text) + '</code>'; break;
      case 'br': o += '<br>'; break;
      case 'softbreak': o += '\n'; break;
      case 'html': o += n.text; break;
      case 'em': o += '<em>' + renderInline(n.children) + '</em>'; break;
      case 'strong': o += '<strong>' + renderInline(n.children) + '</strong>'; break;
      case 'del': o += '<del>' + renderInline(n.children) + '</del>'; break;
      case 'link': {
        o += '<a href="' + escAttr(n.href) + '"';
        if (n.title !== null && n.title !== undefined) o += ' title="' + escAttr(n.title) + '"';
        o += '>' + renderInline(n.children) + '</a>';
        break;
      }
      case 'image': {
        // alt is rendered from the (emphasis-processed) children, not the
        // raw label text captured when the image was formed
        const alt = n.children ? renderAlt(n.children) : (n.alt || '');
        o += '<img src="' + escAttr(n.href) + '" alt="' + escAttr(alt) + '"';
        if (n.title !== null && n.title !== undefined) o += ' title="' + escAttr(n.title) + '"';
        o += '>';
        break;
      }
      case 'delim': o += escHtml(n.char.repeat(n.len)); break;
    }
  }
  return o;
}

// ---- block parsing ----
function makeLS(line) { return { s: line, i: 0, col: 0, tab: 0 }; }
function lsChar(ls) { return ls.tab > 0 ? ' ' : (ls.i < ls.s.length ? ls.s[ls.i] : undefined); }
function lsAdvance(ls) {
  if (ls.tab > 0) { ls.tab--; ls.col++; return; }
  const c = ls.s[ls.i];
  if (c === '\t') {
    const n = 4 - (ls.col % 4);
    ls.i++;
    ls.tab = n - 1; // remaining virtual spaces of this tab
    ls.col++; // consumed one column of the tab
  } else {
    ls.i++;
    ls.col++;
  }
}
function lsSkipSpaces(ls, maxCols) {
  let n = 0;
  while (n < maxCols) { const c = lsChar(ls); if (c !== ' ' && c !== '\t') break; lsAdvance(ls); n++; }
  return n;
}
function lsRest(ls) { return ' '.repeat(ls.tab) + ls.s.slice(ls.i); }
function lsIndent(ls) { // count leading spaces (columns), do not consume beyond 4
  let n = 0; const save = { i: ls.i, col: ls.col, tab: ls.tab };
  while (n < 4) { const c = lsChar(ls); if (c !== ' ' && c !== '\t') break; lsAdvance(ls); n++; }
  const got = ls.col - save.col;
  ls.i = save.i; ls.col = save.col; ls.tab = save.tab;
  return got;
}
const BLOCK_TAGS = new Set(['address', 'article', 'aside', 'base', 'basefont', 'blockquote', 'body', 'caption', 'center', 'col', 'colgroup', 'dd', 'details', 'dialog', 'dir', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'iframe', 'legend', 'li', 'link', 'main', 'menu', 'menuitem', 'nav', 'noframes', 'ol', 'optgroup', 'option', 'p', 'param', 'search', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'title', 'tr', 'track', 'ul']);
function htmlBlockType(ls) {
  // ls positioned at content start (after container prefix); returns 0-7 or 0
  const s = lsRest(ls);
  const m = /^ {0,3}</.test(s) ? s : null;
  if (!m) return 0;
  const t = s.replace(/^ {0,3}/, '');
  if (/^<(script|pre|style|textarea)(?:[\s>]|\/>|$)/i.test(t)) return 1;
  if (t.startsWith('<!--')) return 2;
  if (t.startsWith('<?')) return 3;
  if (/^<![A-Za-z]/.test(t)) return 4;
  if (t.startsWith('<![CDATA[')) return 5;
  const tagM = /^<\/?([A-Za-z][A-Za-z0-9-]*)/.exec(t);
  const isCloseTag = t.startsWith('</');
  // a closing tag may not carry attributes: not an html block at all
  if (isCloseTag && !/^<\/[A-Za-z][A-Za-z0-9-]*\s*>/.test(t)) return 0;
  if (tagM && BLOCK_TAGS.has(tagM[1].toLowerCase())) return 6;
  // type 7: complete open or close tag, nothing else on the line
  const t7 = isCloseTag
    ? /^<\/[A-Za-z][A-Za-z0-9-]*\s*>\s*$/.exec(t)
    : /^<[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>\s*$/.exec(t);
  if (t7) return 7;
  return 0;
}
function isThematicBreak(text) {
  let i = 0, col = 0;
  while (i < text.length && (text[i] === ' ' || text[i] === '\t')) {
    if (text[i] === '\t') col += 4 - (col % 4); else col++;
    i++;
    if (col >= 4) return false;
  }
  const t = text.slice(i).replace(/[ \t]+$/, '');
  if (t.length < 3) return false;
  const c = t[0];
  if (c !== '*' && c !== '-' && c !== '_') return false;
  for (let k = 0; k < t.length; k++) if (t[k] !== c && t[k] !== ' ' && t[k] !== '\t') return false;
  return true;
}
function isSetextLine(text) {
  let i = 0, col = 0;
  while (i < text.length && (text[i] === ' ' || text[i] === '\t')) {
    if (text[i] === '\t') col += 4 - (col % 4); else col++;
    i++;
    if (col >= 4) return 0;
  }
  const t = text.slice(i).replace(/[ \t]+$/, '');
  if (!t) return 0;
  const c = t[0];
  if (c !== '=' && c !== '-') return 0;
  for (let k = 0; k < t.length; k++) if (t[k] !== c) return 0;
  return c === '=' ? 1 : 2;
}
function parseTableDelim(text) {
  // returns array of alignments ('l','c','r',null) or null
  const t = text.replace(/^ {0,3}/, '').trim();
  if (!/^\|?[\s:|-]+\|?$/.test(t)) return null;
  const inner = t.replace(/^\|/, '').replace(/\|$/, '');
  const cells = inner.split('|');
  const aligns = [];
  for (const cell of cells) {
    const c = cell.trim();
    if (!/^:?-+:?$/.test(c)) return null;
    aligns.push(c.startsWith(':') && c.endsWith(':') ? 'c' : c.startsWith(':') ? 'l' : c.endsWith(':') ? 'r' : null);
  }
  if (aligns.length === 0) return null;
  return aligns;
}
function splitTableRow(text) {
  // split on unescaped |, respecting code spans
  const cells = [];
  let cur = '', i = 0;
  const t = text.trim();
  let start = 0, end = t.length;
  if (t.startsWith('|')) start = 1;
  if (t.endsWith('|') && end > start) end--;
  i = start;
  while (i < end) {
    const c = t[i];
    if (c === '\\' && i + 1 < end && t[i + 1] === '|') { cur += '|'; i += 2; continue; }
    if (c === '`') {
      let n = 0; while (i + n < end && t[i + n] === '`') n++;
      let k = i + n, found = -1;
      while (k < end) {
        if (t[k] === '`') { let m = 0; while (k + m < end && t[k + m] === '`') m++; if (m === n) { found = k; break; } k += m; }
        else k++;
      }
      if (found !== -1) { cur += t.slice(i, found + n).replace(/\\\|/g, '|'); i = found + n; continue; }
      cur += c; i++; continue;
    }
    if (c === '|') { cells.push(cur); cur = ''; i++; continue; }
    cur += c; i++;
  }
  cells.push(cur);
  return cells.map(x => x.trim());
}
function tryParseRefDef(lines, idx, refs) {
  // lines: array of raw content strings (already container-stripped); returns lines consumed or 0
  const first = lines[idx];
  if (first === undefined) return 0;
  if (!/^ {0,3}\[/.test(first)) return 0;
  // join a window of following non-blank lines: a label or title may span
  // lines, but a ref def can never span a blank line
  let win = first;
  for (let k = 1; k <= 4 && idx + k < lines.length; k++) {
    if (/^[ \t]*$/.test(lines[idx + k])) break;
    win += '\n' + lines[idx + k];
  }
  const lab = scanLabel(win, win.indexOf('['));
  if (!lab) return 0;
  const labelRaw = lab.text;
  // a label may not contain an unescaped '[' (an escaped \[ is fine)
  if (labelRaw.trim() === '' || /(?<!\\)\[/.test(labelRaw)) return 0;
  let rest = win.slice(lab.end);
  if (!/^:/.test(rest)) return 0;
  rest = rest.slice(1);
  // destination: skip spaces/tabs, at most one newline (dest may be next line)
  let j = 0, nl = 0;
  while (j < rest.length && (rest[j] === ' ' || rest[j] === '\t' || rest[j] === '\n')) {
    if (rest[j] === '\n') { nl++; if (nl > 1) return 0; }
    j++;
  }
  if (j >= rest.length) return 0;
  let dest = null, pos;
  if (rest[j] === '<') {
    const e = rest.indexOf('>', j + 1);
    if (e === -1 || rest.slice(j + 1, e).includes('\n')) return 0;
    dest = rest.slice(j + 1, e).replace(/\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~])/g, '$1');
    pos = e + 1;
  } else {
    const d = parseLinkDest(rest, j);
    if (!d) return 0;
    dest = d[0]; pos = d[1];
  }
  // title: optional, same line (needs preceding whitespace) or next line; may span lines
  let title = null, endPos = pos;
  let k = pos;
  while (k < rest.length && (rest[k] === ' ' || rest[k] === '\t')) k++;
  if (k < rest.length && rest[k] !== '\n') {
    if (k === pos) return 0; // title needs whitespace after the destination
    const t = parseLinkTitle(rest, k);
    if (t[0] === null) return 0;
    let e = t[1];
    while (e < rest.length && (rest[e] === ' ' || rest[e] === '\t')) e++;
    if (e < rest.length && rest[e] !== '\n') return 0;
    title = t[0]; endPos = e;
  } else if (k < rest.length && rest[k] === '\n') {
    let p = k + 1;
    while (p < rest.length && (rest[p] === ' ' || rest[p] === '\t')) p++;
    if (p < rest.length && rest[p] !== '\n') {
      const t = parseLinkTitle(rest, p);
      if (t[0] !== null) {
        let e = t[1];
        while (e < rest.length && (rest[e] === ' ' || rest[e] === '\t')) e++;
        if (e >= rest.length || rest[e] === '\n') { title = t[0]; endPos = e; }
      }
    }
  }
  const norm = normalizeLabel(labelText(labelRaw));
  if (norm === '') return 0;
  // lines consumed: newlines in the window up to the end of the parsed part
  const upto = lab.end + 1 + endPos;
  const consumed = 1 + ((win.slice(0, upto).match(/\n/g) || []).length);
  if (!refs.has(norm)) refs.set(norm, { dest, title });
  return consumed;
}

// ---- main document parser ----
function splitLines(src) {
  const lines = [];
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '\n') { lines.push({ text: src.slice(start, i), nl: true }); start = i + 1; }
    else if (src[i] === '\r') {
      if (src[i + 1] === '\n') { lines.push({ text: src.slice(start, i), nl: true }); start = i + 2; i++; }
      else { lines.push({ text: src.slice(start, i), nl: true }); start = i + 1; }
    }
  }
  if (start < src.length) lines.push({ text: src.slice(start), nl: false });
  return lines;
}
function isBlankLS(ls) {
  const save = { i: ls.i, col: ls.col, tab: ls.tab };
  while (true) { const c = lsChar(ls); if (c === ' ' || c === '\t') { lsAdvance(ls); continue; } break; }
  const blank = ls.i >= ls.s.length && ls.tab === 0;
  ls.i = save.i; ls.col = save.col; ls.tab = save.tab;
  return blank;
}
function matchContainers(line, stack, lastBlank) {
  const ls = makeLS(line);
  let depth = 1;
  const cols = [0];
  for (let d = 1; d < stack.length; d++) {
    const c = stack[d];
    if (c.type === 'blockquote') {
      const save = { i: ls.i, col: ls.col, tab: ls.tab };
      lsSkipSpaces(ls, 3);
      if (lsChar(ls) === '>') {
        lsAdvance(ls);
        if (lsChar(ls) === ' ' || lsChar(ls) === '\t') lsAdvance(ls);
        depth++; cols.push(ls.col); continue;
      }
      ls.i = save.i; ls.col = save.col; ls.tab = save.tab;
      break;
    }
    if (c.type === 'item') {
      if (isBlankLS(ls)) { depth++; cols.push(ls.col); continue; }
      if (lastBlank && c.children.length === 0) break;
      const save = { i: ls.i, col: ls.col, tab: ls.tab };
      const base = ls.col;
      lsSkipSpaces(ls, c.rel);
      if (ls.col - base >= c.rel) { depth++; cols.push(ls.col); continue; }
      ls.i = save.i; ls.col = save.col; ls.tab = save.tab;
      break;
    }
    if (c.type === 'list') { depth++; cols.push(ls.col); continue; }
    break;
  }
  return { depth, ls, cols, allMatched: depth === stack.length };
}
function strip4IfIndented(s) {
  // if s starts with >= 4 columns of whitespace, remove exactly 4 columns; else return s
  let col = 0, i = 0;
  while (i < s.length && (s[i] === ' ' || s[i] === '\t')) {
    if (s[i] === '\t') col += 4 - (col % 4); else col++;
    i++;
    if (col >= 4) break;
  }
  if (col < 4) return s;
  let out = '', c = 0, j = 0;
  while (j < s.length && c < 4) {
    if (s[j] === '\t') { const w = 4 - (c % 4); if (c + w > 4) out += ' '.repeat(c + w - 4); c += w; j++; }
    else { c++; j++; }
  }
  return out + s.slice(j);
}
function toSetext(para, level) {
  para.type = 'heading'; para.level = level;
  para.lines = para.lines.map(l => l.replace(/^[ \t]+/, '').replace(/[ \t]+$/, ''));
}
function parse(src) {
  if (!src) return '';
  const refs = new Map();
  const lines = splitLines(src);
  const root = { type: 'doc', children: [] };
  const stack = [root];
  let para = null; // open paragraph node
  let paraParent = null;
  let lastLineBlank = false;
  function deepest() { return stack[stack.length - 1]; }
  function closePara() {
    if (para) { para = null; paraParent = null; }
  }
  function addChild(node) { deepest().children.push(node); return node; }
  function contentOf(idx) {
    if (idx < 0 || idx >= lines.length) return null;
    const m = matchContainers(lines[idx].text, stack);
    if (!m.allMatched) return null;
    return lsRest(m.ls);
  }
  function finalizeStackTo(depth) {
    while (stack.length > depth) {
      const top = stack[stack.length - 1];
      if (para && paraParent === top) closePara();
      stack.pop();
    }
  }
  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i].text;
    const rawBlank = /^[ \t]*$/.test(rawLine);
    const m = matchContainers(rawLine, stack, lastLineBlank);
    const depth = m.depth, ls = m.ls, cols = m.cols, allMatched = m.allMatched;
    const remainderEmpty = ls.i >= ls.s.length && ls.tab === 0;
    const blank = rawBlank || remainderEmpty;
    // whether the line before this one was blank (captured before it is reset)
    const prevBlank = lastLineBlank;
    if (blank) {
      closePara();
      // mark looseness: a blank line marks every item on the matched chain,
      // walking up from the deepest container, until a non-list block
      // (e.g. a blockquote) is reached — a blank inside such a block does
      // not loosen the enclosing list
      for (let d = depth - 1; d >= 0; d--) {
        const node = stack[d];
        if (node.type === 'item') { node.sawBlank = true; continue; }
        if (node.type === 'list') continue;
        break;
      }
      finalizeStackTo(depth);
      lastLineBlank = true;
      i++; continue;
    }
    // lazy paragraph continuation: matched containers must be a prefix of the
    // paragraph's container chain (the paragraph's parent at or below the match)
    if (para && !allMatched && stack.indexOf(paraParent) >= depth - 1) {
      const lc = lsRest(ls);
      const atxL = /^ {0,3}#{1,6}(?:[ \t]+|$)/.test(lc);
      const fenceL = /^ {0,3}(`{3,}|~{3,})/.exec(lc);
      const hbL = htmlBlockType(ls);
      const tbL = isThematicBreak(lc);
      const listL = listMarker(lc);
      const bqL = /^ {0,3}>/.test(lc);
      let interruptsL = false;
      if (atxL || bqL || tbL) interruptsL = true;
      if (fenceL && !(fenceL[1][0] === '`' && /`/.test(lc.slice(lc.indexOf(fenceL[1]) + fenceL[1].length)))) interruptsL = true;
      if (hbL >= 1 && hbL <= 6) interruptsL = true;
      // any list marker at this level starts a new item/list: it is never a
      // lazy continuation (the item it would join is already closed)
      if (listL) interruptsL = true;
      if (!interruptsL) {
        const lst = isSetextLine(lc);
        if (lst && para.lines.length > 0 && paraParent.type === 'blockquote') {
          // a setext underline cannot be a lazy continuation: keep it as text, indented
          para.lines.push('    ' + lc.replace(/^[ \t]+/, ''));
        } else if (!para.lazyDone) {
          para.lines.push(strip4IfIndented(lc));
        } else {
          para.lines.push(lc);
        }
        para.lazyDone = true;
        lastLineBlank = false;
        i++; continue;
      }
      // else fall through: close para, close containers, treat as new block
    }
    // close unmatched containers, finalize paragraph if needed
    if (para && !allMatched) closePara();
    finalizeStackTo(depth);
    if (para && paraParent !== deepest()) closePara();
    lastLineBlank = false;
    // paragraph open in this container? check setext / interrupters / continuation
    if (para && paraParent === deepest()) {
      const content = lsRest(ls);
      const st = isSetextLine(content);
      if (st) {
        // setext heading (only if paragraph has real content lines)
        if (para.lines.length > 0) {
          toSetext(para, st);
          closePara();
          i++; continue;
        }
      }
      // interrupters
      const ind = lsIndent(ls);
      const c2 = lsRest(ls);
      const atx = /^ {0,3}#{1,6}(?:[ \t]+|$)/.test(c2);
      const fenceM = /^ {0,3}(`{3,}|~{3,})/.exec(c2);
      const hb = htmlBlockType(ls);
      const tb = isThematicBreak(c2);
      const listM = listMarker(c2);
      const bq = /^ {0,3}>/.test(c2);
      let interrupts = false;
      if (atx || bq || tb) interrupts = true;
      if (fenceM && !(fenceM[1][0] === '`' && /`/.test(c2.slice(c2.indexOf(fenceM[1]) + fenceM[1].length)))) interrupts = true;
      if (hb >= 1 && hb <= 6) interrupts = true;
      if (listM && listCanInterrupt(listM, lines, i, stack)) interrupts = true;
      if (interrupts) { closePara(); /* fall through to new-block handling */ }
      else {
        para.lines.push(c2);
        i++; continue;
      }
    }
    // a non-item line at a list's level closes the list, unless it is a
    // list marker that reuses the list
    while (deepest().type === 'list') {
      const c3 = lsRest(ls);
      const lm0 = listMarker(c3);
      if (lm0) {
        const k = stack.length - 1;
        const base = cols[k - 1];
        const relMarker = (ls.col + /^ {0,3}/.exec(c3)[0].length) - base;
        const lst = deepest();
        const lastItem = lst.children[lst.children.length - 1];
        if (lastItem && lst.bullet === lm0.bullet && lst.delim === lm0.delim && lst.ordered === lm0.ordered && relMarker < lastItem.rel) break;
      }
      if (para && paraParent === deepest()) closePara();
      stack.pop();
    }
    // ---- new block handling at ls ----
    {
      const dd = deepest();
      if (dd.type === 'item' && dd.sawBlank && dd.children.length > 0) { dd.list.loose = true; dd.sawBlank = false; }
    }
    let handled = false;
    let curBase = null;
    // blockquote / list containers loop
    while (true) {
      const c3 = lsRest(ls);
      if (/^ {0,3}>/.test(c3)) {
        const bq = { type: 'blockquote', children: [] };
        addChild(bq); stack.push(bq);
        lsSkipSpaces(ls, 3);
        lsAdvance(ls); // '>'
        if (lsChar(ls) === ' ' || lsChar(ls) === '\t') lsAdvance(ls);
        curBase = null;
        continue;
      }
      // thematic break beats a list item on the same line (CommonMark)
      if (isThematicBreak(c3)) {
        // a break is not a list item: close an open list so the break
        // lands at the list's parent level (inside an item it stays put)
        if (deepest().type === 'list') {
          if (para && paraParent === deepest()) closePara();
          stack.pop();
        }
        break;
      }
      const lm = listMarker(c3);
      if (lm) {
        const baseCol = ls.col;
        const contentCol = baseCol + lm.markerCol + lm.contentIndent;
        const leadLen = /^ {0,3}/.exec(c3)[0].length;
        let p = leadLen + lm.markerLen;
        while (p < c3.length && (c3[p] === ' ' || c3[p] === '\t')) p++;
        const afterMarker = c3.slice(p);
        const empty = isEmptyItem(afterMarker, contentOf(i + 1), contentCol - baseCol);
        // reuse the enclosing list when the marker is of the same type and
        // its indent is below the current item's content indent
        const top = deepest();
        let candList = null, candItem = null, base = 0;
        if (top.type === 'item') {
          candList = top.list; candItem = top;
          base = curBase !== null ? curBase : cols[stack.length - 2];
        } else if (top.type === 'list') {
          candList = top; candItem = top.children[top.children.length - 1];
          base = cols[stack.length - 2];
        }
        const relMarker = (ls.col + leadLen) - base;
        let list = null;
        if (candList && candItem && candList.bullet === lm.bullet && candList.delim === lm.delim && candList.ordered === lm.ordered && relMarker < candItem.rel) {
          list = candList;
          // pop the current item so the new item is a sibling
          while (stack.length > 0 && stack[stack.length - 1] !== list) {
            const t = stack[stack.length - 1];
            if (para && paraParent === t) closePara();
            stack.pop();
          }
          if (list.children.length > 0 && prevBlank && list.children[list.children.length - 1].sawBlank) list.loose = true;
        } else {
          // not reusing: step out of a list (or an item the marker precedes)
          if (top.type === 'list') {
            if (para && paraParent === top) closePara();
            stack.pop();
          } else if (top.type === 'item' && relMarker < top.rel) {
            const lst = top.list;
            while (stack.length > 0 && stack[stack.length - 1] !== lst) {
              const t = stack[stack.length - 1];
              if (para && paraParent === t) closePara();
              stack.pop();
            }
            if (para && paraParent === lst) closePara();
            stack.pop();
          }
          list = { type: 'list', ordered: lm.ordered, bullet: lm.bullet, delim: lm.delim, start: lm.start, children: [], loose: false };
          addChild(list);
          stack.push(list);
        }
        curBase = ls.col;
        const item = { type: 'item', contentCol, rel: lm.markerCol + lm.contentIndent, children: [], sawBlank: false, list };
        list.children.push(item);
        stack.push(item);
        // consume marker + following spaces (up to contentIndent columns)
        lsSkipSpaces(ls, 3);
        for (let k = 0; k < lm.markerLen; k++) lsAdvance(ls);
        lsSkipSpaces(ls, lm.contentIndent - lm.markerLen);
        if (empty) { handled = true; break; }
        continue;
      }
      break;
    }
    if (handled) { i++; continue; }
    // leaf blocks
    const content = lsRest(ls);
    if (/^[ \t]*$/.test(content)) { i++; continue; }
    const indent = lsIndent(ls);
    // ATX heading
    const atxM = /^ {0,3}(#{1,6})(?:[ \t]+(.*?)|[ \t]*)$/.exec(content);
    if (atxM && (atxM[2] !== undefined || /^ {0,3}#{1,6}[ \t]*$/.test(content))) {
      let text = atxM[2] !== undefined ? atxM[2] : '';
      text = text.replace(/[ \t]+$/, '');
      // a closing sequence may be the whole content (e.g. `### ###`)
      if (/^#+$/.test(text)) text = '';
      else text = text.replace(/[ \t]+#+$/, '');
      text = text.replace(/^[ \t]+/, '');
      addChild({ type: 'heading', level: atxM[1].length, lines: [text] });
      i++; continue;
    }
    // fenced code
    const fenceM = /^ {0,3}(`{3,}|~{3,})/.exec(content);
    if (fenceM) {
      const fenceChar = fenceM[1][0];
      const fenceLen = fenceM[1].length;
      const infoRaw = content.slice(content.indexOf(fenceM[1]) + fenceLen);
      if (fenceChar === '`' && infoRaw.includes('`')) { /* not a fence */ }
      else {
        const info = infoRaw.replace(/\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~])/g, '$1').trim();
        const fenceIndentChars = content.indexOf(fenceM[1]); // chars before fence
        const fenceCol = ls.col + fenceIndentChars;
        const codeLines = [];
        let closed = false, j = i + 1;
        while (j < lines.length) {
          const lm2 = matchContainers(lines[j].text, stack);
          if (!lm2.allMatched) break;
          const l2 = lsRest(lm2.ls);
          const closeM = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(l2);
          if (closeM && closeM[1][0] === fenceChar && closeM[1].length >= fenceLen) { closed = true; j++; break; }
          codeLines.push(stripFenceIndent(l2, fenceIndentChars, lm2.ls.col));
          j++;
        }
        let codeText = codeLines.join('\n');
        // a trailing blank line contributes no extra newline
        if (codeLines.length > 0 && codeLines[codeLines.length - 1] !== '' && (closed || lines[j - 1].nl)) codeText += '\n';
        addChild({ type: 'fence', info, content: codeText });
        i = j; continue;
      }
    }
    // HTML block
    const hbType = htmlBlockType(ls);
    if (hbType > 0) {
      const htmlLines = [content];
      let j = i + 1;
      const endRe = hbType === 1 ? /<\/(script|pre|style|textarea)>/i : hbType === 2 ? /-->/ : hbType === 3 ? /\?>/ : hbType === 4 ? />/ : hbType === 5 ? /\]\]>/ : null;
      // types 1-5 may already end on the first line
      if (endRe && endRe.test(content)) {
        j = i + 1;
      } else {
        while (j < lines.length) {
          const lm2 = matchContainers(lines[j].text, stack);
          if (!lm2.allMatched) break;
          if (hbType >= 6 && isBlankLS(lm2.ls)) break;
          const l2 = lsRest(lm2.ls);
          htmlLines.push(l2);
          j++;
          if (endRe && endRe.test(l2)) break;
        }
      }
      let htmlText = htmlLines.join('\n');
      const atEof = j >= lines.length;
      // keep the trailing newline only when the next line is not blank and
      // still inside this container (or at EOF when the last line had one)
      let keepNl = false;
      if (atEof) keepNl = lines.length > 0 && lines[lines.length - 1].nl;
      else if (!/^[ \t]*$/.test(lines[j].text)) {
        const nm = matchContainers(lines[j].text, stack);
        keepNl = nm.allMatched;
      }
      if (keepNl) htmlText += '\n';
      addChild({ type: 'htmlblock', text: htmlText });
      i = j; continue;
    }
    // thematic break
    if (isThematicBreak(content)) { addChild({ type: 'hr' }); i++; continue; }
    // indented code (not in paragraph; indent >= 4)
    if (indent >= 4) {
      const codeLines = [];
      // first line: current ls content (already container/marker-consumed), strip 4 columns
      const firstLS = makeLS(lsRest(ls));
      firstLS.col = ls.col;
      lsSkipSpaces(firstLS, 4);
      codeLines.push(lsRest(firstLS));
      let j = i + 1;
      while (j < lines.length) {
        const lm2 = matchContainers(lines[j].text, stack);
        if (!lm2.allMatched) break;
        if (isBlankLS(lm2.ls)) {
          // blank line: include only if followed by indented line; a
          // whitespace-only line keeps its indent minus 4 columns
          let k = j + 1;
          let found = false;
          while (k < lines.length) {
            const lm3 = matchContainers(lines[k].text, stack);
            if (!lm3.allMatched || isBlankLS(lm3.ls)) { if (!lm3.allMatched) break; k++; continue; }
            if (lsIndent(lm3.ls) >= 4) found = true;
            break;
          }
          if (!found) break;
          const blankRest = lsRest(lm2.ls);
          let bc = 0, bi = 0;
          while (bi < blankRest.length && bc < 4 && (blankRest[bi] === ' ' || blankRest[bi] === '\t')) {
            if (blankRest[bi] === '\t') bc += 4 - (bc % 4); else bc++;
            bi++;
          }
          codeLines.push(blankRest.slice(bi));
          j++; continue;
        }
        if (lsIndent(lm2.ls) < 4) break;
        lsSkipSpaces(lm2.ls, 4);
        codeLines.push(lsRest(lm2.ls));
        j++;
      }
      let codeText = codeLines.join('\n');
      if (codeLines.length > 0 && lines[j - 1].nl) codeText += '\n';
      addChild({ type: 'code', content: codeText });
      i = j; continue;
    }
    // paragraph start (with ref defs + table check)
    {
      // ref defs
      let consumedDefs = 0;
      while (true) {
        const cand = [contentOf(i + consumedDefs)];
        cand.push(contentOf(i + consumedDefs + 1));
        cand.push(contentOf(i + consumedDefs + 2));
        cand.push(contentOf(i + consumedDefs + 3));
        cand.push(contentOf(i + consumedDefs + 4));
        if (cand[0] === null) break;
        const c = tryParseRefDef(cand, 0, refs);
        if (!c) break;
        consumedDefs += c;
      }
      if (consumedDefs > 0) {
        i += consumedDefs;
        continue;
      }
      // table check: next line is delimiter row
      const nextC = contentOf(i + 1);
      if (nextC !== null) {
        const aligns = parseTableDelim(nextC);
        const headerCells0 = splitTableRow(content);
        if (aligns && aligns.length === headerCells0.length && (nextC.includes('|') || (content.includes('|') && aligns.length > 1))) {
          const headerCells = headerCells0;
          const cols = aligns.length;
          const header = headerCells.slice(0, cols);
          while (header.length < cols) header.push('');
          const rows = [];
          let j = i + 2;
          while (j < lines.length) {
            const rc = contentOf(j);
            if (rc === null || /^[ \t]*$/.test(rc)) break;
            // a row cannot start a new block (blockquote, heading, fence, list)
            if (/^ {0,3}>/.test(rc) || /^ {0,3}#{1,6}(?:[ \t]+|$)/.test(rc) || /^ {0,3}(`{3,}|~{3,})/.test(rc) || listMarker(rc)) break;
            const cells = splitTableRow(rc).slice(0, cols);
            while (cells.length < cols) cells.push('');
            rows.push(cells);
            j++;
          }
          addChild({ type: 'table', aligns, header, rows });
          i = j; continue;
        }
      }
      // plain paragraph
      const p = { type: 'paragraph', lines: [content], lazyDone: false };
      addChild(p);
      para = p; paraParent = deepest();
      i++; continue;
    }
  }
  closePara();
  return renderNode(root, refs, null);
}
function stripFenceIndent(line, nChars, baseCol) {
  if (nChars <= 0) return line;
  // expand leading tabs to spaces using absolute columns starting at baseCol,
  // then remove up to nChars columns of leading whitespace only (never content)
  let out = '', col = baseCol, idx = 0;
  while (idx < line.length && (line[idx] === ' ' || line[idx] === '\t')) {
    if (line[idx] === '\t') { const sp = 4 - (col % 4); out += ' '.repeat(sp); col += sp; }
    else { out += ' '; col++; }
    idx++;
  }
  out += line.slice(idx);
  return out.slice(Math.min(nChars, out.length - line.slice(idx).length));
}
function listMarker(text) {
  const lead = /^ */.exec(text)[0].length;
  let m = /^ {0,3}([*+-])([ \t]+|$)/.exec(text);
  if (m) {
    const w = 1;
    let p = lead + w, col = lead + w, wsCols = 0;
    while (p < text.length && (text[p] === ' ' || text[p] === '\t')) {
      if (text[p] === '\t') { const n = 4 - (col % 4); col += n; wsCols += n; } else { col++; wsCols++; }
      p++;
    }
    const hasContent = p < text.length;
    const contentIndent = (!hasContent || wsCols >= 5) ? w + 1 : w + wsCols;
    return { ordered: false, bullet: m[1], delim: null, start: null, markerLen: w, markerCol: lead, contentIndent };
  }
  m = /^ {0,3}(\d{1,9})([.)])([ \t]+|$)/.exec(text);
  if (m) {
    const w = m[1].length + 1;
    let p = lead + w, col = lead + w, wsCols = 0;
    while (p < text.length && (text[p] === ' ' || text[p] === '\t')) {
      if (text[p] === '\t') { const n = 4 - (col % 4); col += n; wsCols += n; } else { col++; wsCols++; }
      p++;
    }
    const hasContent = p < text.length;
    const contentIndent = (!hasContent || wsCols >= 5) ? w + 1 : w + wsCols;
    return { ordered: true, bullet: null, delim: m[2], start: parseInt(m[1], 10), markerLen: w, markerCol: lead, contentIndent };
  }
  return null;
}
function isEmptyItem(afterMarker, nextContent, contentCol) {
  if (afterMarker.trim() !== '') return false;
  if (nextContent === null) return true;
  if (/^[ \t]*$/.test(nextContent)) return true;
  let col = 0, idx = 0;
  while (idx < nextContent.length && (nextContent[idx] === ' ' || nextContent[idx] === '\t')) {
    if (nextContent[idx] === '\t') col += 4 - (col % 4); else col++;
    idx++;
  }
  return col < contentCol;
}
function listCanInterrupt(lm, lines, idx, stack) {
  // a list interrupts a paragraph if its first item is non-empty; ordered only if starts with 1
  if (lm.ordered && lm.start !== 1) return false;
  // check item content on this line
  const line = lines[idx].text;
  const m = matchContainers(line, stack);
  if (!m.allMatched) return false;
  const c = lsRest(m.ls);
  const after = c.replace(/^ {0,3}(?:[*+-]|\d{1,9}[.)])[ \t]*/, '');
  return after.trim() !== '';
}

// ---- rendering ----
function renderNode(node, refs, tight) {
  switch (node.type) {
    case 'doc': {
      let o = '';
      for (const ch of node.children) o += renderNode(ch, refs, false);
      return o;
    }
    case 'blockquote': {
      let o = '<blockquote>\n';
      for (const ch of node.children) o += renderNode(ch, refs, false);
      return o + '</blockquote>\n';
    }
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      let o = node.ordered && node.start !== 1 ? '<ol start="' + node.start + '">\n' : '<' + tag + '>\n';
      for (const ch of node.children) o += renderNode(ch, refs, !node.loose);
      return o + '</' + tag + '>\n';
    }
    case 'item': {
      let o = '<li>';
      const ch0 = node.children[0];
      if (ch0 && ch0.type === 'paragraph' && ch0.lines.length > 0) {
        // GFM task list: [ ] / [x] / [X] followed by a space
        const tm = /^\[( |x|X)\] /.exec(ch0.lines[0]);
        if (tm) {
          const checked = tm[1] === 'x' || tm[1] === 'X';
          const input = '<input' + (checked ? ' checked=""' : '') + ' disabled="" type="checkbox">';
          // marker is [ ]/[x]/[X]; leading spaces after it collapse to one
          const lines = [ch0.lines[0].slice(3).replace(/^ +/, ' ')].concat(ch0.lines.slice(1));
          const inner = input + renderInline(parseInline(lines.join('\n'), refs));
          o += tight ? inner : '<p>' + inner + '</p>\n';
          for (let k = 1; k < node.children.length; k++) o += renderNode(node.children[k], refs, tight);
          return o + '</li>\n';
        }
      }
      for (const ch of node.children) o += renderNode(ch, refs, tight);
      return o + '</li>\n';
    }
    case 'paragraph': {
      const text = node.lines.join('\n');
      const inner = renderInline(parseInline(text, refs));
      if (tight) return inner;
      return '<p>' + inner + '</p>\n';
    }
    case 'heading': {
      const text = node.lines.join('\n');
      return '<h' + node.level + '>' + renderInline(parseInline(text, refs)) + '</h' + node.level + '>\n';
    }
    case 'code': return '<pre><code>' + escHtml(node.content) + '</code></pre>\n';
    case 'fence': {
      const lang = node.info ? node.info.split(/\s+/)[0] : '';
      const cls = lang ? ' class="language-' + escAttr(lang) + '"' : '';
      return '<pre><code' + cls + '>' + escHtml(node.content) + '</code></pre>\n';
    }
    case 'htmlblock': return node.text;
    case 'hr': return '<hr>\n';
    case 'table': {
      let o = '<table>\n<thead>\n<tr>\n';
      for (let c = 0; c < node.header.length; c++) {
        const a = node.aligns[c];
        o += '<th' + (a ? ' align="' + (a === 'l' ? 'left' : a === 'c' ? 'center' : 'right') + '"' : '') + '>' + renderInline(parseInline(node.header[c], refs)) + '</th>\n';
      }
      o += '</tr>\n</thead>\n';
      if (node.rows.length === 0) return o + '</table>\n';
      o += '<tbody>';
      for (const row of node.rows) {
        o += '<tr>\n';
        for (let c = 0; c < row.length; c++) {
          const a = node.aligns[c];
          o += '<td' + (a ? ' align="' + (a === 'l' ? 'left' : a === 'c' ? 'center' : 'right') + '"' : '') + '>' + renderInline(parseInline(row[c], refs)) + '</td>\n';
        }
        o += '</tr>\n';
      }
      return o + '</tbody></table>\n';
    }
  }
  return '';
}
export { parse };

