// parse.js — a fast, dependency-free CommonMark 0.31.2 + GFM 0.29 parser
// matching marked 18.1.3's marked.parse with default options.
// Written from scratch for the make.fun markdown-render-speed-02 bounty.

// Set when an unclosed multi-line <a ...> tag is seen: marked suppresses
// extended autolinks (bare email, www., scheme://) for the rest of the
// document. Reset per parse() call; <...> autolinks and explicit links
// are NOT suppressed.
let suppressExtAutolink = false;
export function parse(src) {
  suppressExtAutolink = false;
  src = src.replace(/\r\n?/g, '\n');
  const refs = new Map();
  const endsWithNewline = src.endsWith('\n');
  const lines = src.split('\n');
  if (endsWithNewline) lines.pop();
  const doc = parseBlocks(lines, refs, endsWithNewline);
  return renderBlocks(doc, refs);
}

// ================================================================ escaping
const ESC_HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// Text/attribute escaping: '&' is NOT escaped when it starts something that
// looks like a named entity reference (&name;), so named entities pass through.
function escapeHtml(s) {
  let out = '', start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    let r;
    if (ch === '&') {
      // named-entity-like? & followed by [A-Za-z][A-Za-z0-9]*;
      let j = i + 1;
      if (j < s.length && /[A-Za-z]/.test(s[j])) {
        j++;
        while (j < s.length && /[A-Za-z0-9]/.test(s[j])) j++;
        if (j < s.length && s[j] === ';') continue; // leave the '&' alone
      }
      r = '&amp;';
    } else {
      r = ESC_HTML[ch];
    }
    if (r !== undefined) { out += s.slice(start, i) + r; start = i + 1; }
  }
  return start === 0 ? s : out + s.slice(start);
}
// Strict escaping for code spans/blocks: '&' is always escaped.
function escapeHtmlStrict(s) {
  let out = '', start = 0;
  for (let i = 0; i < s.length; i++) {
    const r = ESC_HTML[s[i]];
    if (r !== undefined) { out += s.slice(start, i) + r; start = i + 1; }
  }
  return start === 0 ? s : out + s.slice(start);
}
function escapeAttr(s) { return escapeHtml(s); }

// encodeURI-equivalent for href/src attributes. Keeps the characters that
// encodeURI keeps; percent-encodes the rest as UTF-8; lone surrogates become
// U+FFFD (encoded as %EF%BF%BD).
const KEEP_HREF = new Set();
for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*\'();/?:@&=+$,#%') KEEP_HREF.add(c);
function encodeHref(s) {
  let out = '', start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (KEEP_HREF.has(ch)) continue;
    out += s.slice(start, i);
    const code = s.charCodeAt(i);
    if (code >= 0xD800 && code <= 0xDBFF) {
      // high surrogate: needs a following low surrogate
      if (i + 1 < s.length) {
        const lo = s.charCodeAt(i + 1);
        if (lo >= 0xDC00 && lo <= 0xDFFF) {
          const cp = 0x10000 + ((code - 0xD800) << 10) + (lo - 0xDC00);
          out += '%' + ((cp >> 18) | 0xF0).toString(16).toUpperCase() + '%' + (((cp >> 12) & 0x3F) | 0x80).toString(16).toUpperCase() + '%' + (((cp >> 6) & 0x3F) | 0x80).toString(16).toUpperCase() + '%' + ((cp & 0x3F) | 0x80).toString(16).toUpperCase();
          i++;
          start = i + 1;
          continue;
        }
      }
      out += '%EF%BF%BD';
      start = i + 1;
    } else if (code >= 0xDC00 && code <= 0xDFFF) {
      out += '%EF%BF%BD';
      start = i + 1;
    } else if (code < 0x80) {
      out += '%' + code.toString(16).toUpperCase().padStart(2, '0');
      start = i + 1;
    } else if (code < 0x800) {
      out += '%' + ((code >> 6) | 0xC0).toString(16).toUpperCase() + '%' + ((code & 0x3F) | 0x80).toString(16).toUpperCase();
      start = i + 1;
    } else {
      out += '%' + ((code >> 12) | 0xE0).toString(16).toUpperCase() + '%' + (((code >> 6) & 0x3F) | 0x80).toString(16).toUpperCase() + '%' + ((code & 0x3F) | 0x80).toString(16).toUpperCase();
      start = i + 1;
    }
  }
  return start === 0 ? s : out + s.slice(start);
}

// ================================================================ entities
// A compact table of the named HTML entities that occur in practice.
// (name -> codepoint). Covers the HTML4/Greek/symbol set plus the names
// used in the practice set.
const ENT_NAMES =
  'AElig:198 AMP:38 Aacute:193 Acirc:194 Agrave:192 Alpha:913 Aring:197 Atilde:195 Auml:196 Beta:914 COPY:169 Ccedil:199 Chi:935 Dagger:8225 Delta:916 ETH:208 Eacute:201 Ecirc:202 Egrave:200 Epsilon:917 Eta:919 Euml:203 Gamma:915 Iacute:205 Icirc:206 Igrave:204 Iota:921 Iuml:207 Kappa:922 Lambda:923 Mu:924 Ntilde:209 Nu:925 Oacute:211 Ocirc:212 Ograve:210 Omega:937 Omicron:927 Oslash:216 Otilde:213 Ouml:214 Phi:934 Pi:928 Prime:8243 Psi:936 REG:174 Rho:929 Sigma:931 THORN:222 Tau:932 Theta:920 Uacute:218 Ucirc:219 Ugrave:217 Upsilon:933 Uuml:220 Xi:926 Yacute:221 Zeta:918 aacute:225 acirc:226 acute:180 aelig:230 agrave:224 alefsym:8501 alpha:945 amp:38 and:8743 ang:8736 aring:229 asymp:8776 atilde:227 auml:228 bdquo:8222 beta:946 brvbar:166 bull:8226 cap:8745 ccedil:231 cedil:184 cent:162 chi:967 circ:710 clubs:9827 cong:8773 copy:169 crarr:8629 cup:8746 curren:164 dArr:8659 dagger:8224 darr:8595 deg:176 delta:948 diams:9830 divide:247 eacute:233 ecirc:234 egrave:232 empty:8709 emsp:8195 ensp:8194 epsilon:949 equiv:8801 eta:951 eth:240 euml:235 euro:8364 exist:8707 fnof:402 forall:8704 frac12:189 frac14:188 frac34:190 frasl:8260 gamma:947 ge:8805 gt:62 hArr:8660 harr:8596 hearts:9829 hellip:8230 iacute:237 icirc:238 iexcl:161 igrave:236 image:8465 infin:8734 int:8747 iota:953 iquest:191 isin:8712 iuml:239 kappa:954 lArr:8656 lambda:955 lang:10216 laquo:171 larr:8592 lceil:8968 ldquo:8220 le:8804 lfloor:8970 lowast:8727 loz:9674 lrm:8206 lsaquo:8249 lsquo:8216 lt:60 macr:175 mdash:8212 micro:181 middot:183 minus:8722 mu:956 nabla:8711 nbsp:160 ndash:8211 ne:8800 ni:8715 not:172 notin:8713 nsub:8836 ntilde:241 nu:957 oacute:243 ocirc:244 ograve:242 ohm:937 omega:969 omicron:959 oplus:8853 or:8744 ordf:186 ordm:170 oslash:248 otilde:245 otimes:8855 ouml:246 para:182 part:8706 permil:8240 perp:8869 phi:966 pi:960 piv:982 plusmn:177 pound:163 prime:8242 prod:8719 prop:8733 psi:968 quot:34 rArr:8658 radic:8730 raquo:187 rarr:8594 rceil:8969 rdquo:8221 real:8476 reg:174 rfloor:8971 rho:961 rlm:8207 rsaquo:8250 rsquo:8217 sbquo:8218 scaron:353 Scaron:352 sect:167 shy:173 sigma:963 sigmaf:962 sim:8764 spades:9824 sub:8834 sube:8838 sum:8721 sup:8835 sup1:185 sup2:178 sup3:179 supe:8839 szlig:223 tau:964 there4:8756 theta:952 thetasym:977 thinsp:8201 THORN:254 tilde:732 times:215 trade:8482 TRADE:8482 uArr:8657 uacute:250 uarr:8593 ucirc:251 ugrave:249 uml:168 upsih:978 upsilon:965 uuml:252 weierp:8472 xi:958 yacute:253 yen:165 yuml:255 Yuml:376 zeta:950 zwj:8205 zwnj:8204';
const ENT = new Map();
for (const part of ENT_NAMES.split(' ')) {
  const idx = part.indexOf(':');
  if (idx > 0) {
    const name = part.slice(0, idx);
    const cp = part.slice(idx + 1);
    const code = parseInt(cp, 10);
    if (!isNaN(code)) ENT.set(name, code);
  }
}
ENT.set('ngE', 8819);
ENT.set('ngeq', 8819);
ENT.set('nge', 8819);
ENT.set('NotEqualTilde', 8770);
ENT.set('nGt', 8811);
ENT.set('nLt', 8810);

function parseEntity(src, i) {
  // src[i] === '&'. Only NUMERIC entities decode; named entities are left as
  // literal text (the escape step passes &name; through unchanged).
  // Returns {text, end} or null.
  if (src[i] !== '&' || src[i + 1] !== '#') return null;
  let j = i + 2, hex = false;
  if (src[j] === 'x' || src[j] === 'X') { hex = true; j++; }
  let k = j;
  while (k < src.length && (hex ? /[0-9A-Fa-f]/.test(src[k]) : /[0-9]/.test(src[k]))) k++;
  if (k === j) return null;
  if (k < src.length && src[k] === ';') {
    let cp = parseInt(src.slice(j, k), hex ? 16 : 10);
    if (isNaN(cp) || cp > 0x10FFFF) return null;
    if (cp === 0 || (cp >= 0xD800 && cp <= 0xDFFF)) cp = 0xFFFD;
    return { text: String.fromCodePoint(cp), end: k + 1 };
  }
  return null;
}

// ================================================================ char classes
function isPunct(ch) {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code < 128) return /[!-\/:-@\[-`{-~]/.test(ch);
  // Unicode punctuation (general categories P* plus symbols S*)
  return /[\p{P}\p{S}]/u.test(ch);
}
function isAsciiPunct(ch) {
  return !!ch && /[!-\/:-@\[-`{-~]/.test(ch);
}
function isSpace(ch) {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\f' || ch === '\r') return true;
  // Unicode space separators (Zs) plus U+2028/U+2029
  return (code >= 0x2000 && code <= 0x200A) || code === 0x00A0 || code === 0x1680 || code === 0x2028 || code === 0x2029 || code === 0x202F || code === 0x205F || code === 0x3000;
}

// ================================================================ inline nodes
// An inline node is a small object with a doubly-linked sibling list
// (prev/next), a parent pointer, and a child list (first/last).
// Types: text, code, html, softbreak, linebreak, emph, strong, del, link, image.
function newNode(t) {
  return { t, lit: '', first: null, last: null, prev: null, next: null, parent: null, dest: null, title: null };
}
function appendChild(parent, child) {
  child.parent = parent;
  child.prev = parent.last;
  child.next = null;
  if (parent.last) parent.last.next = child; else parent.first = child;
  parent.last = child;
  return child;
}
function detach(node) {
  const p = node.parent;
  if (!p) return;
  if (node.prev) node.prev.next = node.next; else p.first = node.next;
  if (node.next) node.next.prev = node.prev; else p.last = node.prev;
  node.prev = node.next = node.parent = null;
}
function insertAfter(node, newNode_) {
  const p = node.parent;
  newNode_.parent = p;
  newNode_.prev = node;
  newNode_.next = node.next;
  if (node.next) node.next.prev = newNode_; else if (p) p.last = newNode_;
  node.next = newNode_;
}

function normalizeLabel(label) {
  // Unescape only bracket escapes (\[ \]) — other escaped punctuation
  // (e.g. \!) does NOT match its unescaped form. Unicode case fold:
  // ß and ẞ fold to 'ss'. Then collapse whitespace, trim, lowercase.
  return label.replace(/\\([\[\]])/g, '$1').replace(/[ßẞ]/g, 'ss').replace(/[ \t\r\n]+/g, ' ').trim().toLowerCase();
}
function nodesText(first, last) {
  let out = '', cur = first;
  while (cur) {
    if (cur.t === 'text' || cur.t === 'code' || cur.t === 'html' || cur.t === 'delim') out += cur.lit;
    else if (cur.t === 'softbreak' || cur.t === 'linebreak') out += '\n';
    else if (cur.first) out += nodesText(cur.first, cur.last);
    if (cur === last) break;
    cur = cur.next;
  }
  return out;
}

// Scan a link label starting at src[i] === '['. Returns {label, end} where
// end is the index just past the closing ']', or null if there is none.
// Handles nested brackets, backslash escapes, and code spans (which must be
// closed with an exact-length run of backticks).
function scanLabel(src, i) {
  let depth = 0, j = i + 1;
  const n = src.length;
  while (j < n) {
    const ch = src[j];
    if (ch === '\\' && j + 1 < n && isAsciiPunct(src[j + 1])) { j += 2; continue; }
    if (ch === '`') {
      // code span: find a closing run of the same length
      let run = 0;
      while (j + run < n && src[j + run] === '`') run++;
      const close = src.indexOf('`'.repeat(run), j + run);
      if (close === -1) { j += run; continue; }
      j = close + run;
      continue;
    }
    if (ch === '[') {
      // a link label (ref def or second label of a full reference) may
      // not contain an unescaped '[' — the oracle rejects such labels
      return null;
    }
    if (ch === ']') {
      return { label: src.slice(i + 1, j), end: j + 1 };
    }
    j++;
  }
  return null;
}

// Parse an inline link destination + optional title starting at src[i] === '('.
// Returns {dest, title, end} or null. `end` is just past the closing ')'.
function parseInlineLink(src, i) {
  let j = i + 1, n = src.length;
  // skip whitespace (including newlines)
  while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\n')) j++;
  if (j >= n) return null;
  let dest = null;
  if (src[j] === '<') {
    let e = j + 1;
    while (e < n && src[e] !== '>' && src[e] !== '\n') {
      if (src[e] === '\\' && e + 1 < n) e += 2; else e++;
    }
    if (e >= n || src[e] !== '>') return null;
    dest = src.slice(j + 1, e).replace(/\\([!-/:-@\[-`{-~])/g, '$1');
    j = e + 1;
  } else {
    let e = j, depth = 0;
    while (e < n) {
      const c = src[e];
      if (c === ' ' || c === '\t' || c === '\n') break;
      if (c === '\\' && e + 1 < n) { e += 2; continue; }
      if (c === '(') depth++;
      else if (c === ')') { if (depth === 0) break; depth--; }
      e++;
    }
    // an empty destination is allowed: [link]() -> href=""
    dest = e === j ? '' : src.slice(j, e).replace(/\\([!-/:-@\[-`{-~])/g, '$1');
    j = e;
  }
  // skip whitespace
  while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\n')) j++;
  let title = null;
  if (j < n && (src[j] === '"' || src[j] === "'" || src[j] === '(')) {
    const open = src[j];
    const close = open === '(' ? ')' : open;
    let e = j + 1;
    while (e < n) {
      const c = src[e];
      if (c === '\\' && e + 1 < n) { e += 2; continue; }
      if (c === close) break;
      e++;
    }
    if (e >= n || src[e] !== close) return null;
    title = src.slice(j + 1, e).replace(/\\([!-/:-@\[-`{-~])/g, '$1');
    j = e + 1;
    while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\n')) j++;
  }
  if (j >= n || src[j] !== ')') return null;
  return { dest, title, end: j + 1 };
}

// Trailing punctuation trimmed from extended autolinks
const TRIM_END = new Set(['?', '!', '.', ',', ':', ';', '*', '_', '~', "'", '"']);
function trimUrlEnd(url) {
  // a '(' with no matching ')' later truncates the URL at that '('
  const parenIdx = url.indexOf('(');
  if (parenIdx !== -1) {
    const closeIdx = url.indexOf(')', parenIdx);
    if (closeIdx === -1) url = url.slice(0, parenIdx);
  }
  // Loop: trailing punctuation and unbalanced ')' are removed in either
  // order (e.g. 'foo..)' must lose the ')' AND the '..').
  for (;;) {
    while (url.length > 0 && TRIM_END.has(url[url.length - 1])) url = url.slice(0, -1);
    if (url.length > 0 && url[url.length - 1] === ')') {
      let depth = 0;
      for (let k = 0; k < url.length; k++) {
        if (url[k] === '(') depth++;
        else if (url[k] === ')') depth--;
      }
      if (depth < 0) { url = url.slice(0, -1); continue; }
    }
    break;
  }
  return url;
}

// Scan an extended autolink (www. or scheme://) starting at src[i].
// Returns {dest, text, end} or null.
function scanExtAutolink(src, i) {
  let j = i;
  // find the end of the URL (any chars except whitespace and '<'); an
  // entity-like '&name;' ends the URL (it is rendered as an entity, not
  // part of the link)
  let e = j;
  while (e < src.length && !isSpace(src[e]) && src[e] !== '<') {
    if (src[e] === '&' && /^[A-Za-z][A-Za-z0-9]*;/.test(src.slice(e + 1))) break;
    e++;
  }
  let url = src.slice(j, e);
  // a '(' with no matching ')' later truncates the URL at that '('
  const parenIdx = url.indexOf('(');
  if (parenIdx !== -1) {
    const closeIdx = url.indexOf(')', parenIdx);
    if (closeIdx === -1) url = url.slice(0, parenIdx);
  }
  url = trimUrlEnd(url);
  if (url.length === 0) return null;
  return { dest: url, text: url, end: j + url.length };
}

// Is there a '_' before `start` in src that could open emphasis (a
// left-flanking '_' not itself inside an intraword run)? Used to tell a
// trailing '_' that closes emphasis from a literal trailing '_'.
function hasUnderscoreOpener(src, start) {
  for (let i = start - 1; i >= 0; i--) {
    if (src[i] !== '_') continue;
    const before = i === 0 ? ' ' : src[i - 1];
    const after = i + 1 < src.length ? src[i + 1] : ' ';
    const leftFlank = !isSpace(after) && !isPunct(after);
    const rightFlank = !isSpace(before) && !isPunct(before);
    // '_' can open iff left-flanking and (not right-flanking or preceded by punct)
    if (leftFlank && (!rightFlank || isPunct(before))) return true;
  }
  return false;
}

// Scan a bare email autolink whose local part starts at `start`.
// Returns {dest, text, end, start} or null.
function scanExtEmailFrom(src, start) {
  const LOCAL = /[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]/;
  let e = start;
  while (e < src.length && !isSpace(src[e]) && src[e] !== '<') e++;
  let raw = src.slice(start, e);
  // a '/' after the '@' ends the email (a path is not part of it)
  const atIdx = raw.indexOf('@');
  if (atIdx !== -1) {
    const slash = raw.indexOf('/', atIdx);
    if (slash !== -1) raw = raw.slice(0, slash);
  }
  const cand = trimUrlEnd(raw);
  if (!/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(cand)) return null;
  // If the char right after the maximal email is '-' or a single '_',
  // there is no link at all (trimUrlEnd must not hide it). A '__' does
  // not invalidate it, nor does a '_' that closes a '_' emphasis pair
  // opened earlier in this inline text.
  const nextCh = raw[cand.length];
  if (nextCh === '-') return null;
  if (nextCh === '_' && raw[cand.length + 1] !== '_' && !hasUnderscoreOpener(src, start)) return null;
  return { dest: 'mailto:' + cand, text: cand, end: start + cand.length, start };
}

// Scan a scheme autolink (http://, https://, ftp://, or an email scheme like
// mailto:/xmpp:) starting at src[i]. Returns {dest, text, end} or null.
function scanSchemeAutolink(src, i) {
  const m = src.slice(i).match(/^(?:https?|ftp):\/\/[^\s<]+/i);
  if (m) {
    let url = m[0];
    const amp = url.search(/&[A-Za-z][A-Za-z0-9]*;/);
    if (amp !== -1) url = url.slice(0, amp);
    url = trimUrlEnd(url);
    if (url.length === 0) return null;
    return { dest: url, text: url, end: i + url.length };
  }
  // mailto: / xmpp: followed by an email
  const m2 = src.slice(i).match(/^(?:mailto|xmpp):/i);
  if (m2) {
    const em = scanExtEmailFrom(src, i + m2[0].length);
    if (!em) return null;
    let text = m2[0] + em.text, end = em.end;
    // xmpp: includes one path segment after the email (up to the next '/')
    if (/^xmpp:/i.test(m2[0]) && src[end] === '/') {
      let p = end + 1;
      while (p < src.length && !isSpace(src[p]) && src[p] !== '<' && src[p] !== '/') p++;
      text = src.slice(i, p);
      end = p;
    }
    return { dest: text, text, end };
  }
  return null;
}

// ================================================================ inline parsing
const RE_AUTOLINK_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]{1,31}:/;
const RE_EMAIL = /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

// Parse the inline content of a block. Returns the root node's first child.
function inlineParse(src, refs) {
  const root = newNode('root');
  // delimiter list (doubly linked, separate from the node tree)
  let dFirst = null, dLast = null, dSeq = 0;
  function dAppend(d) {
    d.prev = dLast; d.next = null;
    if (dLast) dLast.next = d; else dFirst = d;
    dLast = d;
  }
  function dRemove(d) {
    if (d.prev) d.prev.next = d.next; else dFirst = d.next;
    if (d.next) d.next.prev = d.prev; else dLast = d.prev;
    d.prev = d.next = null;
  }
  // bracket stack (for [ and ![)
  let bracketStack = null;
  function lookupRef(label) {
    const key = normalizeLabel(label);
    return refs.get(key) || null;
  }

  // --- helpers that add nodes ---
  function addText(s, spos) {
    if (s.length === 0) return null;
    const last = root.last;
    if (last && last.t === 'text' && last.spos + last.lit.length === spos) {
      last.lit += s;
      return last;
    }
    const node = newNode('text');
    node.lit = s; node.spos = spos;
    appendChild(root, node);
    return node;
  }
  function addNode(node, spos) {
    node.spos = spos;
    appendChild(root, node);
    return node;
  }
  // Rewind the text/delimiter nodes back to source position `spos`:
  // removes any nodes (or parts of nodes) that start at or after `spos`.
  function rewindTo(spos) {
    let cur = root.last;
    while (cur) {
      const prev = cur.prev;
      const start = cur.spos;
      const len = cur.t === 'text' ? cur.lit.length : (cur.t === 'delim' ? cur.lit.length : 0);
      if (cur.t === 'text' || cur.t === 'delim') {
        if (start >= spos) {
          // remove this node entirely (and its delimiter entry, if any)
          if (cur.t === 'delim' && cur.delim) { dRemove(cur.delim); cur.delim.used = true; }
          detach(cur);
        } else if (start + len > spos) {
          // truncate the node
          cur.lit = cur.lit.slice(0, spos - start);
          if (cur.t === 'delim' && cur.delim) cur.delim.num = cur.lit.length;
        }
      }
      cur = prev;
      if (cur && (cur.t !== 'text' && cur.t !== 'delim')) break;
      if (cur && cur.spos + (cur.t === 'text' ? cur.lit.length : cur.lit.length) <= spos) break;
    }
  }

  // Is src[p] a '_' belonging to an inert '_' delimiter node?
  function isInertUnderscoreAt(p) {
    if (src[p] !== '_') return false;
    let cur = root.last;
    while (cur) {
      if (cur.t === 'delim') {
        if (cur.spos <= p && p < cur.spos + cur.lit.length) {
          return !!(cur.delim && !cur.delim.canOpen && !cur.delim.canClose);
        }
        if (cur.spos + cur.lit.length <= p) return false;
      } else if (cur.t === 'text') {
        if (cur.spos <= p && p < cur.spos + cur.lit.length) return false;
        if (cur.spos + cur.lit.length <= p) return false;
      } else {
        return false;
      }
      cur = cur.prev;
    }
    return false;
  }
  // Scan the email local part backwards from absAt (the '@' position).
  // A '_' only counts if it is part of an inert '_' delimiter.
  function scanLocalStart(absAt) {
    let s = absAt;
    // NOTE: '/' is NOT in the local-part set: an email's local part starts
    // after the last '/' (a/b@c.d links only b@c.d).
    const LOCAL = /[A-Za-z0-9.!#$%&'*+\=?^_`{|}~-]/;
    while (s > 0) {
      const c = src[s - 1];
      if (!LOCAL.test(c)) break;
      if (c === '_') {
        if (!isInertUnderscoreAt(s - 1)) break;
        let rs = s - 1;
        while (rs > 0 && src[rs - 1] === '_') rs--;
        s = rs;
        continue;
      }
      s--;
    }
    return s;
  }

  // Add a plain-text chunk, scanning it for extended autolinks (www., scheme,
  // and bare emails). `chunk` is the text and `base` its source index.
  // Returns the source position consumed (an autolink may extend past the
  // chunk end — e.g. a URL containing '&', where the chunk breaks at '&' but
  // the URL continues past it — so the caller must skip that far).
  function addPlain(chunk, base) {
    // Extended autolinks (www., scheme://, bare email) are NOT formed inside
    // link/image text — the text stays plain. (<...> autolinks are handled
    // separately and DO form inside link text.) Only an *active* bracket
    // suppresses them (a deactivated '[' can never form a link). They are
    // also suppressed document-wide after an unclosed multi-line <a> tag.
    {
      let br = bracketStack, active = false;
      while (br) { if (br.active) { active = true; break; } br = br.prev; }
      if (active || suppressExtAutolink) {
        addText(chunk, base);
        return base + chunk.length;
      }
    }
    let i = 0;
    const n = chunk.length;
    while (i < n) {
      // find the next candidate: 'www.', a scheme, or '@'
      let j = i;
      let found = -1, kind = '';
      while (j < n) {
        const c = chunk[j];
        if (c === '@') { found = j; kind = 'email'; break; }
        if (c === 'w' && chunk.startsWith('www.', j)) { found = j; kind = 'www'; break; }
        if (c === 'h' || c === 'H' || c === 'f' || c === 'F' || c === 'm' || c === 'M' || c === 'x' || c === 'X') {
          const m = chunk.slice(j).match(/^(?:https?|ftp):\/\//i);
          if (m) { found = j; kind = 'scheme'; break; }
          const m2 = chunk.slice(j).match(/^(?:mailto|xmpp):/i);
          if (m2) { found = j; kind = 'scheme'; break; }
        }
        j++;
      }
      if (found === -1) {
        addText(chunk.slice(i), base + i);
        break;
      }
      if (kind === 'email') {
        const absAt = base + found;
        const localStart = scanLocalStart(absAt);
        const em = scanExtEmailFrom(src, localStart);
        if (!em) {
          addText(chunk.slice(i, found + 1), base + i);
          i = found + 1;
          continue;
        }
        // rewind any already-emitted text/delims that are part of the email
        if (localStart < base + i) rewindTo(localStart);
        // emit the text before the email (within the chunk, from i to localStart-base)
        if (localStart > base + i) addText(chunk.slice(i, localStart - base), base + i);
        const node = newNode('link');
        node.dest = em.dest; node.title = null;
        const t = newNode('text'); t.lit = em.text; t.spos = localStart;
        appendChild(node, t);
        addNode(node, localStart);
        i = em.end - base;
        continue;
      }
      // www. or scheme: check the preceding character
      const absPos = base + found;
      const prevCh = absPos > 0 ? src[absPos - 1] : '';
      let allowed = true;
      if (kind === 'www') {
        allowed = prevCh === '' || isSpace(prevCh) || prevCh === '_' || prevCh === '(' || prevCh === '*' || prevCh === '~';
      } else if (/^(?:mailto|xmpp):/i.test(chunk.slice(found))) {
        allowed = prevCh === '' || isSpace(prevCh) || prevCh === '_' || prevCh === '(' || prevCh === '*' || prevCh === '~';
      }
      if (!allowed) {
        addText(chunk.slice(i, found + 1), base + i);
        i = found + 1;
        continue;
      }
      // scan the URL
      let res;
      if (kind === 'www') {
        res = scanExtAutolink(src, absPos);
        if (res) res.dest = 'http://' + res.dest;
      } else {
        res = scanSchemeAutolink(src, absPos);
      }
      if (!res) {
        addText(chunk.slice(i, found + 1), base + i);
        i = found + 1;
        continue;
      }
      if (found > i) addText(chunk.slice(i, found), base + i);
      const node = newNode('link');
      node.dest = res.dest; node.title = null;
      const t = newNode('text'); t.lit = res.text; t.spos = absPos;
      appendChild(node, t);
      addNode(node, absPos);
      i = res.end - base;
    }
    return base + Math.max(n, i);
  }

  // --- main scan ---
  let pos = 0;
  const n = src.length;
  while (pos < n) {
    const ch = src[pos];
    // newline: softbreak, or hard break on >=2 trailing spaces or a backslash
    if (ch === '\n') {
      // count trailing spaces on the last text node
      const last = root.last;
      let hard = false;
      if (last && last.t === 'text') {
        const m = last.lit.match(/ {2,}$/);
        if (m) { last.lit = last.lit.slice(0, last.lit.length - m[0].length); hard = true; }
        else if (last.lit.endsWith('\\')) { last.lit = last.lit.slice(0, -1); hard = true; }
      }
      const node = newNode(hard ? 'linebreak' : 'softbreak');
      addNode(node, pos);
      pos++;
      // after a hard break, leading spaces/tabs of the next line are dropped
      // (a soft break preserves them)
      if (hard) while (pos < n && (src[pos] === ' ' || src[pos] === '\t')) pos++;
      continue;
    }
    // backslash escape
    if (ch === '\\') {
      if (pos + 1 < n && src[pos + 1] === '\n') {
        // backslash + newline = hard break (handled by the newline branch via the text node)
        addText('\\', pos);
        pos++;
        continue;
      }
      if (pos + 1 < n && isAsciiPunct(src[pos + 1])) {
        addText(src[pos + 1], pos);
        pos += 2;
        continue;
      }
      addText('\\', pos);
      pos++;
      continue;
    }
    // code span: the closing run must be exactly `run` backticks long
    // (a longer run does not close it)
    if (ch === '`') {
      let run = 0;
      while (pos + run < n && src[pos + run] === '`') run++;
      let close = -1;
      let k = pos + run;
      while (k < n) {
        if (src[k] !== '`') { k++; continue; }
        let r2 = 0;
        while (k + r2 < n && src[k + r2] === '`') r2++;
        if (r2 === run) { close = k; break; }
        k += r2;
      }
      if (close === -1) {
        addText('`'.repeat(run), pos);
        pos += run;
        continue;
      }
      let content = src.slice(pos + run, close);
      content = content.replace(/\n/g, ' ');
      if (content.length > 0 && content[0] === ' ' && content[content.length - 1] === ' ' && content.trim().length > 0) {
        content = content.slice(1, -1);
      }
      const node = newNode('code');
      node.lit = content;
      addNode(node, pos);
      pos = close + run;
      continue;
    }
    // entity
    if (ch === '&') {
      const ent = parseEntity(src, pos);
      if (ent) {
        addText(ent.text, pos);
        pos = ent.end;
        continue;
      }
      addText('&', pos);
      pos++;
      continue;
    }
    // '<': autolink, email autolink, or raw HTML tag
    if (ch === '<') {
      // autolink <scheme:...>
      // an autolink <scheme:...> cannot contain whitespace (a space inside
      // the brackets makes it literal text, not an autolink)
      const m = src.slice(pos).match(/^<([A-Za-z][A-Za-z0-9+.-]{1,31}):([^\s<>]*)>/);
      if (m) {
        const node = newNode('link');
        node.dest = m[1] + ':' + m[2]; node.title = null; node.auto = true;
        const t = newNode('text'); t.lit = m[1] + ':' + m[2]; t.spos = pos + 1;
        appendChild(node, t);
        addNode(node, pos);
        pos += m[0].length;
        continue;
      }
      // email autolink <foo@bar.baz>
      const m2 = src.slice(pos).match(/^<([A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+)>/);
      if (m2) {
        const node = newNode('link');
        node.dest = 'mailto:' + m2[1]; node.title = null; node.auto = true;
        const t = newNode('text'); t.lit = m2[1]; t.spos = pos + 1;
        appendChild(node, t);
        addNode(node, pos);
        pos += m2[0].length;
        continue;
      }
      // HTML comment / PI / declaration / CDATA / tag
      const rest = src.slice(pos);
      let htmlLen = 0;
      if (rest.startsWith('<!--')) {
        const e = rest.indexOf('-->', 2);
        if (e !== -1) htmlLen = e + 3;
      } else if (rest.startsWith('<?')) {
        const e = rest.indexOf('?>');
        if (e !== -1) htmlLen = e + 2;
      } else if (rest.startsWith('<!')) {
        if (/^<![A-Za-z]/.test(rest)) {
          const e = rest.indexOf('>');
          if (e !== -1) htmlLen = e + 1;
        } else if (rest.startsWith('<![CDATA[')) {
          const e = rest.indexOf(']]>');
          if (e !== -1) htmlLen = e + 3;
        }
      } else {
        const tm = rest.match(/^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>/);
        if (tm) htmlLen = tm[0].length;
      }
      if (htmlLen > 0) {
        const tagText = rest.slice(0, htmlLen);
        // A multi-line <a ...> tag whose attribute section contains a newline
        // (not just leading/trailing whitespace), left unclosed by any </a>
        // later in this inline text, suppresses extended autolinks for the
        // rest of the document.
        if (/^<a(?=[\s/>])/i.test(tagText) && !tagText.endsWith('/>')) {
          // An inline <a> tag with at least one attribute, left unclosed by
          // any </a> later in this inline text, suppresses extended
          // autolinks for the rest of the document. (A bare <a> with no
          // attributes does not suppress; a self-closing <a/> does not
          // either; a tag whose only newline is the whitespace right after
          // <a is also exempt — its attribute starts on a later line.)
          const inner = tagText.slice(2, -1);
          const hasAttr = /\S/.test(inner) && !/^\s*\n/.test(inner);
          if (hasAttr && !/<\/a(?=[\s>])/i.test(src.slice(pos + htmlLen))) {
            suppressExtAutolink = true;
          }
        } else if (/^<\/a(?=[\s>])/i.test(tagText)) {
          // an inline </a> closes the link and re-enables extended autolinks
          suppressExtAutolink = false;
        }
        const node = newNode('html');
        node.lit = tagText;
        addNode(node, pos);
        pos += htmlLen;
        continue;
      }
      addText('<', pos);
      pos++;
      continue;
    }
    // '[' or '![': push a bracket
    if (ch === '[' || (ch === '!' && pos + 1 < n && src[pos + 1] === '[')) {
      const isImage = ch === '!';
      const j = isImage ? pos + 1 : pos;
      const node = addDelimNode(isImage ? '![' : '[', isImage ? pos : j);
      bracketStack = { node, image: isImage, active: true, prev: bracketStack };
      pos = j + 1;
      continue;
    }
    // ']': try to form a link or image
    if (ch === ']') {
      let br = bracketStack;
      // find the nearest active bracket
      while (br && !br.active) br = br.prev;
      if (!br) {
        addText(']', pos);
        pos++;
        continue;
      }
      const openNode = br.node;
      // the link text is the nodes between openNode and the end
      let labelText = nodesText(openNode.next, root.last);
      // If the raw label contains a backslash escape, look it up by the
      // raw source text instead: an escape like \! does not match its
      // unescaped form, while \[ / \] do (handled in normalizeLabel).
      const rawLabel = src.slice(br.node.spos + (br.image ? 2 : 1), pos);
      if (rawLabel.includes('\\')) labelText = rawLabel;
      // try an inline link first
      let dest = null, title = null, end = pos + 1;
      let ref = null;
      if (pos + 1 < n && src[pos + 1] === '(') {
        const parsed = parseInlineLink(src, pos + 1);
        if (parsed) { dest = parsed.dest; title = parsed.title; end = parsed.end; }
      }
      if (dest === null) {
        // full reference [label], collapsed [] (label is the link text),
        // or shortcut (label is the link text)
        if (pos + 1 < n && src[pos + 1] === '[') {
          const lab = scanLabel(src, pos + 1);
          if (lab) {
            // an empty second label means a collapsed reference
            ref = lookupRef(lab.label === '' ? labelText : lab.label);
            if (ref) { dest = ref.dest; title = ref.title; end = lab.end; }
          }
        } else {
          ref = lookupRef(labelText);
          if (ref) { dest = ref.dest; title = ref.title; end = pos + 1; }
        }
      }
      if (dest === null) {
        // no link: deactivate this bracket and emit the ']' as text
        br.active = false;
        addText(']', pos);
        pos++;
        continue;
      }
      // A link's text cannot contain another link: if any node between the
      // '[' and this ']' is already a link, a LINK does not form. (An IMAGE
      // may still form — its alt text is the plain text of the link's text.)
      if (!br.image) {
        let hasLink = false;
        let cur = openNode.next;
        while (cur) {
          if (cur.t === 'link' && !cur.auto) { hasLink = true; break; }
          if (cur === root.last) break;
          cur = cur.next;
        }
        if (hasLink) {
          br.active = false;
          addText(']', pos);
          pos++;
          continue;
        }
      }
      // form the link: move the nodes between openNode and root.last into it
      const node = newNode(br.image ? 'image' : 'link');
      node.dest = dest; node.title = title;
      const before = openNode.prev;
      const child = openNode.next;
      const oldLast = root.last;
      node.first = child;
      node.last = child ? oldLast : null;
      if (child) child.prev = null;
      let cur = child;
      while (cur) { cur.parent = node; if (cur === oldLast) break; cur = cur.next; }
      if (before) { before.next = node; node.prev = before; } else { root.first = node; node.prev = null; }
      node.next = null; node.parent = root;
      root.last = node;
      // deactivate all brackets inside the link text
      let b2 = bracketStack;
      while (b2 && b2 !== br) { b2.active = false; b2 = b2.prev; }
      bracketStack = br.prev;
      // remove the bracket's delimiter node from the delimiter list (it is not a delimiter)
      pos = end;
      continue;
    }
    // '*' / '_' / '~' delimiter runs
    if (ch === '*' || ch === '_' || ch === '~') {
      let run = 0;
      while (pos + run < n && src[pos + run] === ch) run++;
      // '~' runs of length 1 or 2 are strikethrough delimiters; a run of
      // 3+ is literal text (marked treats single '~' as <del> too).
      if (ch === '~' && run > 2) {
        addText('~'.repeat(run), pos);
        pos += run;
        continue;
      }
      // flanking
      const before = pos > 0 ? src[pos - 1] : '';
      const after = pos + run < n ? src[pos + run] : '';
      const beforeWS = before === '' || isSpace(before);
      const afterWS = after === '' || isSpace(after);
      const beforePunct = before !== '' && isPunct(before);
      const afterPunct = after !== '' && isPunct(after);
      const leftFlanking = !afterWS && (!afterPunct || beforeWS || beforePunct);
      const rightFlanking = !beforeWS && (!beforePunct || afterWS || afterPunct);
      let canOpen, canClose;
      if (ch === '_') {
        canOpen = leftFlanking && (!rightFlanking || beforePunct);
        canClose = rightFlanking && (!leftFlanking || afterPunct);
      } else {
        canOpen = leftFlanking;
        canClose = rightFlanking;
      }
      const node = addDelimNode(ch.repeat(run), pos);
      const d = { cc: ch, num: run, canOpen, canClose, node, prev: null, next: null, used: false, seq: dSeq++ };
      node.delim = d;
      dAppend(d);
      pos += run;
      continue;
    }
    // plain text: scan to the next special character
    let j = pos;
    while (j < n) {
      const c = src[j];
      if (c === '\n' || c === '\\' || c === '`' || c === '&' || c === '<' || c === '[' || c === ']' || c === '*' || c === '_' || c === '~') break;
      if (c === '!' && j + 1 < n && src[j + 1] === '[') break;
      j++;
    }
    if (j > pos) {
      pos = addPlain(src.slice(pos, j), pos);
    } else {
      addText(src[pos], pos);
      pos++;
    }
  }

  // helper: add a delimiter text node (for '[' / '![' / '*' / '_' / '~')
  function addDelimNode(lit, spos) {
    const node = newNode('delim');
    node.lit = lit; node.spos = spos;
    appendChild(root, node);
    return node;
  }

  // process emphasis / strikethrough
  processEmphasis(dFirst, dLast, dRemove);
  // convert any remaining delimiter nodes to plain text (recursively, so
  // delimiters left inside emphasis/link nodes are rendered too)
  (function convertDelims(node) {
    let cur = node.first;
    while (cur) {
      if (cur.t === 'delim') cur.t = 'text';
      if (cur.first) convertDelims(cur);
      cur = cur.next;
    }
  })(root);
  return root.first;
}

// ================================================================ emphasis
// CommonMark delimiter-stack algorithm, with the stack_bottom per container
// (a delimiter may only match an opener in the same container as itself).
function processEmphasis(dFirst, dLast, dRemove) {
  const openersBottom = new Map(); // cc -> delimiter
  // Blockers: closers of matched inner pairs whose opener could not close
  // and whose closer can open. Such a pair blocks an outer opener from
  // matching a later closer (marked's nested-emphasis rule, probed):
  //  - the FIRST closer after the inner pair matches the outer opener
  //    unless (inner-len + opener-len) % 3 == 0 and closer-len % 3 != 0;
  //  - a LATER closer matches only when (inner-len + closer-len) % 3 == 0.
  const blockers = []; // {seq, len} of the inner closer
  let closer = dFirst;
  while (closer && !closer.canClose) closer = closer.next;
  while (closer) {
    const cc = closer.cc;
    let opener = closer.prev;
    let openerFound = false;
    let oddMatch = false;
    let blockedAny = false; // a candidate opener existed but was blocked
    const bottom = openersBottom.get(cc) || null;
    // The bottom delimiter itself is still a candidate opener (a delimiter
    // that can both open and close, e.g. intraword '*', may fail as a closer
    // yet open for a later closer); the search only stops *after* checking it.
    while (opener) {
      if (opener.cc === cc && opener.node.parent === closer.node.parent &&
          (cc !== '~' || opener.num === closer.num)) {
        oddMatch = (opener.canClose || closer.canOpen) &&
          ((opener.num + closer.num) % 3 === 0) &&
          !(opener.num % 3 === 0 && closer.num % 3 === 0);
        if (opener.canOpen && !oddMatch) {
          // Blocking check: is there a blocking inner pair between this
          // opener and the closer? Find the nearest blocker (largest seq).
          let blk = null;
          for (let bi = 0; bi < blockers.length; bi++) {
            const b = blockers[bi];
            if (b.cc === cc && b.seq > opener.seq && b.seq < closer.seq && (!blk || b.seq > blk.seq)) blk = b;
          }
          if (blk) {
            // Is this closer the FIRST closer after the inner pair? Walk
            // back from the closer; if a canClose delimiter with seq >
            // blk.seq appears before reaching blk.seq, it is not first.
            let first = true;
            let dd = closer.prev;
            while (dd && dd.seq > blk.seq) {
              if (dd.canClose) { first = false; break; }
              dd = dd.prev;
            }
            let allowed;
            if (first) allowed = ((blk.len + opener.num) % 3 !== 0) || (closer.num % 3 === 0);
            else allowed = ((blk.len + closer.num) % 3 === 0);
            if (allowed) { openerFound = true; break; }
            // blocked from this opener; keep looking further back
            blockedAny = true;
          } else {
            openerFound = true; break;
          }
        }
      }
      if (opener === bottom) break;
      opener = opener.prev;
    }
    if (!openerFound) {
      // Only set the bottom when no candidate opener existed at all; a
      // blocking failure is specific to this closer, so a later closer may
      // still match the opener.
      if (!blockedAny) openersBottom.set(cc, closer);
      closer = closer.next;
      while (closer && !closer.canClose) closer = closer.next;
      continue;
    }
    // match opener..closer
    // useDelims: a 2-delimiter (strong) match is taken first whenever both
    // runs have >= 2 left; a 1-delimiter (em) match is taken only for the
    // odd remainder. (The first node created here becomes the innermost, so
    // strongs are built first and the em wraps them last — matching marked's
    // <em><strong>foo</strong></em> for ***foo***.)
    let useDelims;
    if (closer.num < 3 || opener.num < 3) useDelims = Math.min(closer.num, opener.num);
    else useDelims = 2;
    // Record a blocker: this pair's closer can open while its opener
    // cannot close, so it blocks an outer match (see scan-back above).
    // Capture the closer's length before it is decremented.
    if (!opener.canClose && closer.canOpen) blockers.push({ seq: closer.seq, len: closer.num, cc });
    const emNode = newNode(cc === '~' ? 'del' : (useDelims === 2 ? 'strong' : 'emph'));
    const oNode = opener.node, cNode = closer.node;
    // opener keeps its leading delimiters; closer keeps its trailing ones
    oNode.lit = oNode.lit.slice(0, oNode.lit.length - useDelims);
    cNode.lit = cNode.lit.slice(useDelims);
    // move the nodes between opener and closer into the new node
    let cur = oNode.next;
    while (cur && cur !== cNode) {
      const nx = cur.next;
      detach(cur);
      appendChild(emNode, cur);
      cur = nx;
    }
    // A closer with leftover delimiters stays in place, after the new node
    // (it may still match an outer opener). Only a fully-used closer is removed.
    if (cNode.lit.length === 0) detach(cNode);
    // place the new node after the opener (or in its place if it is empty)
    if (oNode.lit.length === 0) {
      insertAfter(oNode, emNode);
      detach(oNode);
    } else {
      insertAfter(oNode, emNode);
    }
    opener.num -= useDelims;
    closer.num -= useDelims;
    // continue with the first closer at or after the opener's position
    let next = opener.next;
    if (opener.num === 0) { dRemove(opener); opener.used = true; }
    if (closer.num === 0) {
      if (next === closer) next = closer.next;
      dRemove(closer); closer.used = true;
    }
    closer = next;
    while (closer && !closer.canClose) closer = closer.next;
  }
}

// plain text of an image's alt text (after emphasis processing)
function altText(node) {
  let out = '';
  let cur = node.first;
  while (cur) {
    if (cur.t === 'text' || cur.t === 'code' || cur.t === 'html') out += cur.lit;
    else if (cur.t === 'softbreak' || cur.t === 'linebreak') out += '\n';
    else if (cur.first) out += altText(cur);
    cur = cur.next;
  }
  return out;
}

function renderInline(first) {
  let out = '';
  let cur = first;
  while (cur) {
    switch (cur.t) {
      case 'text': out += escapeHtml(cur.lit); break;
      case 'code': out += '<code>' + escapeHtmlStrict(cur.lit) + '</code>'; break;
      case 'html': out += cur.lit; break;
      case 'softbreak': out += '\n'; break;
      case 'linebreak': out += '<br>'; break;
      case 'emph': out += '<em>' + renderInline(cur.first) + '</em>'; break;
      case 'strong': out += '<strong>' + renderInline(cur.first) + '</strong>'; break;
      case 'del': out += '<del>' + renderInline(cur.first) + '</del>'; break;
      case 'link':
        out += '<a href="' + escapeAttr(encodeHref(cur.dest)) + '"';
        if (cur.title !== null && cur.title !== undefined) out += ' title="' + escapeAttr(cur.title) + '"';
        out += '>' + renderInline(cur.first) + '</a>';
        break;
      case 'image':
        out += '<img src="' + escapeAttr(encodeHref(cur.dest)) + '" alt="' + escapeAttr(altText(cur)) + '"';
        if (cur.title !== null && cur.title !== undefined) out += ' title="' + escapeAttr(cur.title) + '"';
        out += '>';
        break;
    }
    cur = cur.next;
  }
  return out;
}

// ================================================================ blocks
function newBlock(t) { return { t, children: [], parent: null }; }
function addChild(parent, child) { child.parent = parent; parent.children.push(child); return child; }
function isBlankStr(s) { return /^[ \t]*$/.test(s); }

function parseBlocks(lines, refs, endsWithNewline) {
  const doc = newBlock('document');
  let tip = doc;
  let lastLineBlank = false;
  let wasBlank = false;
  const n = lines.length;

  let line = '', offset = 0, column = 0;
  function blank() { return /^[ \t]*$/.test(line); }
  function ind() {
    let col = column, j = offset;
    while (j < line.length) {
      const ch = line[j];
      if (ch === ' ') { col++; j++; }
      else if (ch === '\t') { col += 4 - (col % 4); j++; }
      else break;
    }
    return { indent: col - column, next: j };
  }
  function advance(cols) {
    let count = cols;
    while (count > 0 && offset < line.length) {
      const ch = line[offset];
      if (ch === '\t') {
        const toNext = 4 - (column % 4);
        if (count >= toNext) { column += toNext; offset++; count -= toNext; }
        else {
          line = line.slice(0, offset) + ' '.repeat(toNext) + line.slice(offset + 1);
          column += count; offset += count; count = 0;
        }
      } else { column++; offset++; count--; }
    }
  }
  function stripIndent(maxCols) {
    // advance up to maxCols columns, but only over spaces/tabs
    let count = maxCols;
    while (count > 0 && offset < line.length && (line[offset] === ' ' || line[offset] === '\t')) {
      const ch = line[offset];
      if (ch === '\t') {
        const toNext = 4 - (column % 4);
        if (count >= toNext) { column += toNext; offset++; count -= toNext; }
        else {
          line = line.slice(0, offset) + ' '.repeat(toNext) + line.slice(offset + 1);
          column += count; offset += count; count = 0;
        }
      } else { column++; offset++; count--; }
    }
  }
  // Is `block` nested inside a list item or blockquote?
  function inContainer(block) {
    let b = block.parent;
    while (b) {
      if (b.t === 'item' || b.t === 'blockquote') return true;
      b = b.parent;
    }
    return false;
  }
  // Expand leading tabs in `s` to spaces, starting at column `startCol`
  // (a tab goes to the next multiple of 4). Only the leading whitespace is
  // touched; tabs after the first non-whitespace char stay literal.
  function expandLeadingTabs(s, startCol) {
    let i = 0, col = startCol, out = '';
    while (i < s.length && (s[i] === ' ' || s[i] === '\t')) {
      if (s[i] === '\t') {
        const n = 4 - (col % 4);
        out += ' '.repeat(n);
        col += n;
      } else {
        out += ' ';
        col++;
      }
      i++;
    }
    return i === 0 ? s : out + s.slice(i);
  }
  // A code content line: expand leading tabs iff the code block is inside a
  // container (in a top-level code block tabs stay literal).
  function codeLine(block) {
    const r = rest();
    return inContainer(block) ? expandLeadingTabs(r, column) : r;
  }
  // A fenced-code content line. In a container, leading tabs are expanded
  // using the column after container markers are removed (BEFORE the fence
  // indent is stripped), and the fence indent is then stripped from the
  // expanded line. (Stripping first and expanding after gives the wrong
  // column for the tab.) Top-level keeps the old stripIndent behaviour.
  function fencedCodeLine(block) {
    const r = rest();
    let col = column;
    const fi = block.fenceIndent || 0;
    if (!inContainer(block)) {
      stripIndent(fi);
      return rest();
    }
    // Tab expansion is relative to the code block's grandparent
    // container: subtract the blockquote marker widths so the column is
    // measured from there. This applies only when the code block's direct
    // parent is a blockquote; with a list-item ancestor, all blockquote
    // widths are subtracted, otherwise the outermost one's width is kept
    // (each marker is ~2 columns: '>' plus one space).
    if (block.parent && block.parent.t === 'blockquote') {
      let bqCount = 0, hasItem = false;
      let b = block.parent;
      while (b) { if (b.t === 'blockquote') bqCount++; if (b.t === 'item') hasItem = true; b = b.parent; }
      if (bqCount > 0) col -= 2 * (hasItem ? bqCount : bqCount - 1);
    }
    const expanded = expandLeadingTabs(r, col);
    let n = 0;
    while (n < expanded.length && n < fi && expanded[n] === ' ') n++;
    return expanded.slice(n);
  }
  function advanceChars(count) {
    while (count > 0 && offset < line.length) {
      const ch = line[offset];
      if (ch === '\t') column += 4 - (column % 4); else column++;
      offset++; count--;
    }
  }
  function peek() { return offset < line.length ? line[offset] : ''; }
  function rest() { return line.slice(offset); }

  // ---- block-start detectors (use the current offset/column) ----
  function atxHeading() {
    // returns level (1-6) or 0; allows up to 3 spaces of indent
    let j = offset, spaces = 0;
    while (j < line.length && line[j] === ' ' && spaces < 3) { j++; spaces++; }
    if (j < line.length && line[j] === '\t') return 0;
    let level = 0;
    while (j < line.length && line[j] === '#' && level < 7) { level++; j++; }
    if (level === 0 || level > 6) return 0;
    if (j < line.length && line[j] !== ' ' && line[j] !== '\t') return 0;
    return level;
  }
  function fencedCode() {
    // returns {fence, len} or null; allows up to 3 spaces of indent
    let j = offset, spaces = 0;
    while (j < line.length && line[j] === ' ' && spaces < 3) { j++; spaces++; }
    if (j < line.length && line[j] === '\t') return null;
    const ch = line[j];
    if (ch !== '`' && ch !== '~') return null;
    let len = 0;
    while (j < line.length && line[j] === ch) { len++; j++; }
    if (len < 3) return null;
    // A backtick fence whose info string contains a backtick is not a
    // fenced code block at all (the line is paragraph content instead).
    if (ch === '`' && line.indexOf('`', j) !== -1) return null;
    return { fence: ch, len, start: j - len };
  }
  function thematicBreak() {
    let j = offset, spaces = 0;
    while (j < line.length && line[j] === ' ' && spaces < 3) { j++; spaces++; }
    if (j < line.length && line[j] === '\t') return false;
    const ch = line[j];
    if (ch !== '*' && ch !== '-' && ch !== '_') return false;
    let count = 0;
    while (j < line.length) {
      const c = line[j];
      if (c === ch) count++;
      else if (c === ' ' || c === '\t') { /* skip */ }
      else return false;
      j++;
    }
    return count >= 3;
  }
  function setextLevel() {
    // returns 1 (=), 2 (-), or 0; allows up to 3 spaces of indent.
    // The markers must be contiguous (spaces only before/after, not between).
    let j = offset, spaces = 0;
    while (j < line.length && line[j] === ' ' && spaces < 3) { j++; spaces++; }
    if (j < line.length && line[j] === '\t') return 0;
    const ch = line[j];
    if (ch !== '=' && ch !== '-') return 0;
    let k = j;
    while (k < line.length && line[k] === ch) k++;
    while (k < line.length && (line[k] === ' ' || line[k] === '\t')) k++;
    if (k < line.length) return 0;
    return ch === '=' ? 1 : 2;
  }
  function htmlBlockType() {
    // returns 1-7 or 0. Assumes the line (from offset) starts a block.
    // Allows up to 3 spaces of indent.
    let j = offset, spaces = 0;
    while (j < line.length && line[j] === ' ' && spaces < 3) { j++; spaces++; }
    if (j < line.length && line[j] === '\t') return 0;
    if (line[j] !== '<') return 0;
    const s = line.slice(j);
    const m = s.match(/^<(script|pre|style|textarea)(?=[\s>]|$)/i);
    if (m) return 1;
    if (/^<!--/.test(s)) return 2;
    if (/^<\?/.test(s)) return 3;
    if (/^<![A-Za-z]/.test(s)) return 4;
    if (/^<!\[CDATA\[/.test(s)) return 5;
    const blockTags = /^<\/?(address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?=[\s/>]|$)/i;
    if (blockTags.test(s)) return 6;
    // type 7: a complete open or close tag (not one of the block tags above),
    // alone on the line (only whitespace may follow it)
    {
      const m7 = s.match(/^<\/[A-Za-z][A-Za-z0-9-]*\s*>/) || s.match(/^<[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>/);
      if (m7 && /^\s*$/.test(s.slice(m7[0].length))) return 7;
    }
    return 0;
  }
  function htmlBlockEnd(type, text) {
    if (type === 1) return /<\/(script|pre|style|textarea)>/i.test(text);
    if (type === 2) return /-->/.test(text);
    if (type === 3) return /\?>/.test(text);
    if (type === 4) return />/.test(text);
    if (type === 5) return /\]\]>/.test(text);
    return false; // types 6, 7 end at the first blank line
  }
  function listItem() {
    // returns {marker, ordered, start, contentIndent, markerLen} or null
    const indInfo = ind();
    if (indInfo.indent > 3) return null;
    const j = indInfo.next;
    const ch = line[j];
    let marker = null, ordered = false, start = null, markerLen = 0;
    if (ch === '-' || ch === '+' || ch === '*') {
      marker = ch; markerLen = 1;
    } else if (ch >= '0' && ch <= '9') {
      let k = j, num = 0, digits = 0;
      while (k < line.length && line[k] >= '0' && line[k] <= '9' && digits < 10) { num = num * 10 + (line.charCodeAt(k) - 48); k++; digits++; }
      if (digits === 0 || digits > 9) return null;
      if (line[k] !== '.' && line[k] !== ')') return null;
      marker = line[k]; ordered = true; start = num; markerLen = k + 1 - j;
    } else return null;
    // after the marker: 1-4 spaces, or end of line (a non-space char means no list)
    let k = j + markerLen;
    if (k < line.length && line[k] !== ' ' && line[k] !== '\t') return null;
    let spaces = 0;
    while (k < line.length && (line[k] === ' ' || line[k] === '\t')) {
      if (line[k] === ' ') spaces++;
      else spaces += 4 - ((column + indInfo.indent + markerLen + spaces) % 4);
      k++;
      if (spaces >= 5) break;
    }
    let contentIndent;
    if (k >= line.length || spaces === 0) {
      // empty item (or marker alone): content indent is marker + 1 space
      contentIndent = indInfo.indent + markerLen + 1;
    } else if (spaces >= 5) {
      contentIndent = indInfo.indent + markerLen + 1;
    } else {
      contentIndent = indInfo.indent + markerLen + spaces;
    }
    // the content indent is measured from the start of the line (in columns)
    // markerAfterGt: the marker immediately follows a '>' (no space); the
    // blockquote's content position is one column later, so continuation
    // lines match against contentIndent + 1.
    const markerAfterGt = j > 0 && line[j - 1] === '>';
    return { marker, ordered, start, contentIndent: column + contentIndent, markerEnd: k, indent: indInfo.indent, markerLen, markerAfterGt };
  }
  function blockquoteStart() {
    const indInfo = ind();
    if (indInfo.indent > 3) return false;
    return line[indInfo.next] === '>';
  }

  // ---- table helpers ----
  function splitTableRow(s) {
    // split on unescaped '|', trim cells, drop leading/trailing empty cells
    const cells = [];
    let cur = '', i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === '\\' && i + 1 < s.length && s[i + 1] === '|') { cur += '|'; i += 2; }
      else if (ch === '|') { cells.push(cur.trim()); cur = ''; i++; }
      else { cur += ch; i++; }
    }
    cells.push(cur.trim());
    if (cells.length > 0 && cells[0] === '') cells.shift();
    if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
    return cells;
  }
  function tableDelimiter(s) {
    // returns an array of alignments (null|'left'|'center'|'right') or null
    const cells = splitTableRow(s);
    if (cells.length === 0) return null;
    const aligns = [];
    for (const c of cells) {
      const m = c.match(/^(:?)-+(:?)$/);
      if (!m) return null;
      if (m[1] && m[2]) aligns.push('center');
      else if (m[2]) aligns.push('right');
      else if (m[1]) aligns.push('left');
      else aligns.push(null);
    }
    return aligns;
  }

  // ---- finalization ----
  function finalize(block) {
    if (block.t === 'paragraph') {
      // parse link reference definitions from the start of the paragraph
      let text = block.lines.join('\n');
      text = parseRefDefs(text, refs);
      block.content = text;
      block.lines = null;
      if (text.trim() === '') block.dropped = true;
    } else if (block.t === 'code' && !block.fenced) {
      // strip trailing blank lines from indented code
      while (block.lines.length > 0 && isBlankStr(block.lines[block.lines.length - 1])) block.lines.pop();
      block.content = block.lines.length > 0 ? block.lines.join('\n') + '\n' : '';
      block.lines = null;
    } else if (block.t === 'code' && block.fenced) {
      // drop exactly one trailing blank line (a blank line right before the
      // closing fence is not part of the content)
      if (block.lines.length > 0 && block.lines[block.lines.length - 1] === '') block.lines.pop();
      block.content = block.lines.length > 0 ? block.lines.join('\n') + '\n' : '';
      block.lines = null;
    } else if (block.t === 'html') {
      // A trailing newline is kept iff the block's last line is followed by
      // a non-blank line in the SAME container (a new block starts
      // immediately inside it), or it is the input's last line and the
      // input ends with a newline. A blank line after the block absorbs
      // the newline, as does a following line outside the block's
      // container (a sibling list item, a line without the blockquote
      // marker, ...).
      let trailing = '';
      if (block.lastLine === n - 1) {
        if (endsWithNewline) trailing = '\n';
      } else if (!isBlankStr(lines[block.lastLine + 1])) {
        const nx = lines[block.lastLine + 1];
        let outside = false;
        let anc = block.parent;
        while (anc) {
          if (anc.t === 'blockquote') {
            let j = 0; while (j < nx.length && nx[j] === ' ' && j < 3) j++;
            if (nx[j] !== '>') { outside = true; break; }
          } else if (anc.t === 'item') {
            // a new list item marker at low indent is a sibling, not a
            // continuation of this item
            let j = 0; while (j < nx.length && nx[j] === ' ' && j < 3) j++;
            const c = nx[j];
            if (c === '-' || c === '*' || c === '+' || (c >= '0' && c <= '9')) {
              // a marker is a sibling item iff it is followed by space/EOL
              // (for ordered, a run of digits + '.' or ')')
              let k = j;
              if (c >= '0' && c <= '9') { while (k < nx.length && nx[k] >= '0' && nx[k] <= '9') k++; if (nx[k] !== '.' && nx[k] !== ')') k = -1; }
              if (k >= 0 && (k + 1 >= nx.length || nx[k + 1] === ' ' || nx[k + 1] === '\t')) { outside = true; break; }
            }
          }
          anc = anc.parent;
        }
        if (!outside) trailing = '\n';
      }
      block.content = block.lines.join('\n') + trailing;
      block.lines = null;
    }
    block.closed = true;
  }
  function closeBlocksAbove(container) {
    // finalize and pop all blocks above `container` (the tip's ancestors)
    while (tip !== container) {
      const b = tip;
      tip = b.parent;
      finalize(b);
      // remove from the parent's children? No — finalized blocks stay in the tree.
    }
  }
  function markListLoose(container) {
    // find the nearest enclosing list and mark it loose
    let b = container;
    while (b) {
      if (b.t === 'list') { b.tight = false; return; }
      b = b.parent;
    }
  }
  function maybeLoose() {
    if (!wasBlank) return;
    // a blank line makes a list loose only if it separates two blocks within
    // the same container (the container already has a child block)
    if (tip.children.length > 0) markListLoose(tip);
    wasBlank = false;
  }

  // ---- main loop ----
  for (let ln = 0; ln < n; ln++) {
    line = lines[ln];
    offset = 0; column = 0;
    const isBlank = blank();

    // --- container matching ---
    let container = doc;
    let lastMatched = doc;
    while (true) {
      const kids = container.children;
      const last = kids.length > 0 ? kids[kids.length - 1] : null;
      if (!last || last.closed) break;
      if (last.t !== 'blockquote' && last.t !== 'list' && last.t !== 'item') break;
      if (last.t === 'list') { container = last; lastMatched = last; continue; }
      // A truly blank line (no container marker) is not inside a blockquote:
      // it closes the blockquote (a new '>' starts a fresh one). It IS inside
      // a list item, so it descends there (and makes the list loose).
      if (isBlank) {
        if (last.t === 'blockquote') break;
        container = last; lastMatched = last; continue;
      }
      if (last.t === 'blockquote') {
        const saveO = offset, saveC = column;
        const indInfo = ind();
        if (indInfo.indent <= 3 && line[indInfo.next] === '>') {
          advance(indInfo.indent + 1);
          if (peek() === ' ' || peek() === '\t') advance(1);
          container = last; lastMatched = last;
        } else { offset = saveO; column = saveC; break; }
      } else { // item
        const indInfo = ind();
        if (column + indInfo.indent >= last.contentIndent) {
          advance(last.contentIndent - column);
          container = last; lastMatched = last;
        } else break;
      }
    }
    // If the deepest matched container is a list, the line only belongs to it
    // if it starts a new item of that same list (and is not a thematic break,
    // which takes precedence over a list item). Otherwise the list closes.
    while (lastMatched.t === 'list' && !isBlank) {
      const li = listItem();
      if (li && !thematicBreak() && li.ordered === lastMatched.ordered &&
          (li.ordered || li.marker === lastMatched.marker)) break;
      lastMatched = lastMatched.parent;
    }
    const allMatched = (container === tip);
    // Is the current line inside the tip's container?
    // - Fenced code: only a missing '>' for a blockquote ancestor ends it
    //   (list indent does not matter — it consumes lines to its closing fence).
    // - Indented code / HTML blocks: the line must be inside the tip's parent
    //   container (a new list item or a line outside the item ends the block).
    let lineInTip = true;
    if (tip.t === 'code' && tip.fenced) {
      for (let b = tip.parent; b; b = b.parent) {
        if (b.t !== 'blockquote') continue;
        let found = false;
        for (let cur = lastMatched; cur; cur = cur.parent) {
          if (cur === b) { found = true; break; }
        }
        if (!found) { lineInTip = false; break; }
      }
    } else if (tip.t === 'code' || tip.t === 'html') {
      lineInTip = false;
      for (let cur = lastMatched; cur; cur = cur.parent) {
        if (cur === tip.parent) { lineInTip = true; break; }
      }
    }

    // A whitespace-only line of up to 3 spaces + exactly one tab is a table
    // body row (an empty-cell row), NOT a blank line ending the table.
    const isTableTabRow = tip.t === 'table' && /^ {0,3}\t$/.test(line);
    if (isBlank && !isTableTabRow) {
      // a blank line: ends paragraphs/tables, is content for code/html blocks,
      // and may make a list loose.
      // A blank line inside a blockquote's code/html block is not content:
      // the blank line has no '>' so it is not inside the blockquote.
      if ((tip.t === 'code' || tip.t === 'html') && (function () {
        let b = tip.parent;
        while (b) { if (b.t === 'blockquote') return true; b = b.parent; }
        return false;
      })()) {
        closeBlocksAbove(container);
        tip = container;
      } else if (tip.t === 'html' && (tip.htmlType === 6 || tip.htmlType === 7)) {
        // types 6 and 7 end at the first blank line
        closeBlocksAbove(container);
        tip = container;
      } else if (tip.t === 'code' || tip.t === 'html') {
        // blank line is content for fenced code / html blocks
        if (tip.t === 'code' && tip.fenced) { tip.lines.push(fencedCodeLine(tip)); }
        else if (tip.t === 'html') { tip.lines.push(''); tip.lastLine = ln; }
        else if (tip.t === 'code' && !tip.fenced) {
          // indented code: strip 4 columns, keep the remainder (may be spaces)
          const indInfo = ind();
          if (indInfo.indent >= 4) { advance(4); tip.lines.push(codeLine(tip)); }
          else tip.lines.push('');
        }
      } else if (tip.t === 'paragraph' || tip.t === 'table') {
        closeBlocksAbove(container);
        tip = container;
      }
      // if the tip is a container, nothing to close; the blank line is just a separator
      lastLineBlank = true;
      continue;
    }
    // The line had only container markers (e.g. a lone '>'): the remaining
    // content is blank. It ends a paragraph/table, but is content for
    // code/html blocks inside the container. Only a truly empty remainder
    // counts as blank — a line like '>  ' leaves a space, which is a
    // paragraph line containing that space.
    if (!isBlank && rest() === '') {
      if (tip.t === 'paragraph' || tip.t === 'table') {
        // A blank line carrying only container markers (e.g. '>') ends the
        // paragraph but NOT the enclosing list item / blockquote — the next
        // line continues the item. Close just the paragraph (closeBlocksAbove
        // leaves tip at the paragraph's parent).
        closeBlocksAbove(tip.parent);
      } else if (tip.t === 'code' && tip.fenced) {
        tip.lines.push('');
      } else if (tip.t === 'code' && !tip.fenced) {
        tip.lines.push('');
      } else if (tip.t === 'html') {
        tip.lines.push('');
        tip.lastLine = ln;
      }
      // if the tip is a container, nothing to close; the blank line is a separator
      lastLineBlank = true;
      continue;
    }
    wasBlank = lastLineBlank;
    lastLineBlank = false;

    // --- leaf blocks that consume lines ---
    // A line outside the tip's container (no '>' for a blockquote, or outside
    // a list item's indent) ends a code/html leaf block.
    if ((tip.t === 'code' || tip.t === 'html') && !lineInTip) {
      closeBlocksAbove(lastMatched);
      tip = lastMatched;
    }
    if (tip.t === 'code' && tip.fenced) {
      // check for the closing fence
      const indInfo = ind();
      if (indInfo.indent <= 3) {
        const fc = fencedCodeAt(indInfo.next);
        if (fc && fc.fence === tip.fence && fc.len >= tip.fenceLen) {
          closeBlocksAbove(tip.parent);
          // fall through to block-start processing for the rest of the line? No —
          // the closing fence line is consumed entirely.
          continue;
        }
      }
      tip.lines.push(fencedCodeLine(tip));
      continue;
    }
    if (tip.t === 'code' && !tip.fenced) {
      const indInfo = ind();
      if (indInfo.indent >= 4) {
        advance(4);
        tip.lines.push(codeLine(tip));
        continue;
      }
      // not indented enough: close the code block and fall through
      closeBlocksAbove(tip.parent);
    }
    if (tip.t === 'html') {
      if (tip.htmlType === 6 || tip.htmlType === 7) {
        // types 6 and 7 end at the first blank line (handled above)
        tip.lines.push(rest());
        tip.lastLine = ln;
        continue;
      }
      tip.lines.push(rest());
      tip.lastLine = ln;
      if (htmlBlockEnd(tip.htmlType, line)) {
        closeBlocksAbove(tip.parent);
      }
      continue;
    }
    if (tip.t === 'table') {
      if (isTableRow()) {
        tip.rows.push(splitTableRow(rest()));
        continue;
      }
      closeBlocksAbove(tip.parent);
    }

    // --- lazy paragraph continuation ---
    if (tip.t === 'paragraph' && !allMatched) {
      // A setext underline or table delimiter is part of the paragraph only
      // when the line is in the SAME container as the paragraph (the container
      // matching must have reached the paragraph's parent). A '---' outside a
      // blockquote/list is a thematic break, not a setext underline.
      if (container === tip.parent) {
        const indInfo = ind();
        if (indInfo.indent <= 3 && setextLevel() > 0) {
          addParaLine();
          continue;
        }
        if (indInfo.indent <= 3 && tip.lines.length === 1) {
          const aligns = tableDelimiter(rest());
          if (aligns) {
            const header = splitTableRow(tip.lines[0]);
            if (header.length === aligns.length && /[:|]/.test(rest())) {
              addParaLine();
              continue;
            }
          }
        }
      }
      // A line that starts a new item of the list the paragraph's item belongs
      // to (the list-pop loop already established this) always ends the paragraph,
      // even for an ordered list whose start number is not 1 — the "start === 1"
      // rule only governs a list interrupting a paragraph from outside.
      if (lastMatched.t === 'list') {
        closeBlocksAbove(lastMatched);
        tip = lastMatched;
      } else if (!startsNewBlock(true)) {
        // lazy continuation: add the line to the paragraph (no setext).
        // A lazy line outside the paragraph's container has 4 columns
        // of leading whitespace stripped — but only if it has at least 4
        // (a line with fewer keeps them all).
        if (container !== tip.parent && ind().indent >= 4) stripIndent(4);
        addParaLine(false);
        continue;
      } else {
        // otherwise close the paragraph (and any blocks above lastMatched) and proceed
        closeBlocksAbove(lastMatched);
        tip = lastMatched;
      }
    }

    // Close any unmatched containers above lastMatched (a line outside a
    // blockquote/list must not be added inside it). Paragraphs are handled
    // by the lazy check / addParaLine below, so they are excluded here.
    if (tip !== lastMatched && tip.t !== 'paragraph') {
      closeBlocksAbove(lastMatched);
      tip = lastMatched;
    }

    // --- start new blocks ---
    let started = false;
    while (true) {
      const indInfo = ind();
      if (indInfo.indent > 3) {
        // only indented code can start (handled below)
        break;
      }
      // thematic break (a setext underline after a paragraph wins over it)
      if (thematicBreak() && !(tip.t === 'paragraph' && setextLevel() > 0)) {
        closeParaIfAny();
        maybeLoose();
        addChild(tip, newBlock('hr'));
        started = true;
        break;
      }
      // ATX heading
      const atx = atxHeading();
      if (atx > 0) {
        closeParaIfAny();
        maybeLoose();
        const h = newBlock('heading');
        h.level = atx;
        let j = offset;
        while (j < line.length && line[j] === ' ') j++;
        j += atx;
        while (j < line.length && (line[j] === ' ' || line[j] === '\t')) j++;
        let content = line.slice(j);
        // strip the closing sequence of #'s (it must be preceded by a space;
        // if the whole content is #'s, the space we skipped after the opening
        // counts as that preceding space)
        const cm = content.match(/^(.*?)[ \t]+#+[ \t]*$/);
        if (cm) content = cm[1];
        else if (/^#+[ \t]*$/.test(content)) content = '';
        content = content.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
        h.content = content;
        addChild(tip, h);
        finalize(h);
        started = true;
        break;
      }
      // fenced code (a backtick fence whose info string contains a backtick
      // is not a fenced code block at all)
      const fc = fencedCode();
      if (fc) {
        let j0 = fc.start + fc.len;
        let info0 = line.slice(j0).trim();
        if (fc.fence === '`' && info0.includes('`')) break;
        closeParaIfAny();
        maybeLoose();
        const c = newBlock('code');
        c.fenced = true; c.fence = fc.fence; c.fenceLen = fc.len;
        c.fenceIndent = fc.start - offset;
        let j = fc.start + fc.len;
        let info = line.slice(j).trim();
        info = info.replace(/\\([!-/:-@\[-`{-~])/g, '$1');
        c.info = info;
        c.lines = [];
        addChild(tip, c);
        tip = c;
        started = true;
        break;
      }
      // HTML block
      const hb = htmlBlockType();
      if (hb > 0) {
        closeParaIfAny();
        maybeLoose();
        const h = newBlock('html');
        h.htmlType = hb;
        h.lines = [rest()];
        h.lastLine = ln;
        addChild(tip, h);
        tip = h;
        if (hb === 1 || hb === 2 || hb === 3 || hb === 4 || hb === 5) {
          if (htmlBlockEnd(hb, line)) { finalize(h); tip = h.parent; }
        }
        started = true;
        break;
      }
      // blockquote
      if (blockquoteStart()) {
        closeParaIfAny();
        maybeLoose();
        const ind2 = ind();
        advance(ind2.indent + 1);
        if (peek() === ' ' || peek() === '\t') advance(1);
        const bq = newBlock('blockquote');
        addChild(tip, bq);
        tip = bq;
        // continue the loop to start blocks inside the blockquote
        continue;
      }
      // list item
      const li = listItem();
      if (li) {
        // a list can interrupt a paragraph only if the item is non-empty
        // (and for ordered lists, the start number is 1)
        const itemEmpty = li.markerEnd >= line.length;
        if (tip.t === 'paragraph' && (itemEmpty || (li.ordered && li.start !== 1))) {
          break; // cannot interrupt the paragraph
        }
        closeParaIfAny();
        startListItem(li);
        // continue the loop to start blocks inside the item
        continue;
      }
      break;
    }

    // a block that consumed the whole line: move to the next line
    if (started) continue;

    // --- indented code (only if no other block started and the tip is not a paragraph) ---
    if (!started && tip.t !== 'paragraph') {
      const indInfo = ind();
      if (indInfo.indent >= 4) {
        maybeLoose();
        advance(4);
        const c = newBlock('code');
        c.fenced = false;
        c.lines = [rest()];
        addChild(tip, c);
        tip = c;
        continue;
      }
    }

    // --- paragraph ---
    if (tip.t === 'paragraph') {
      addParaLine();
      continue;
    }
    // start a new paragraph — but not if the rest of the line is blank
    // (e.g. an empty list-item marker line '-': the paragraph starts on
    // the next content line, not with an empty first line)
    if (isBlankStr(rest())) continue;
    maybeLoose();
    const p = newBlock('paragraph');
    p.lines = [rest()];
    addChild(tip, p);
    tip = p;
  }

  // close all remaining blocks
  closeBlocksAbove(doc);
  return doc;

  // ---- helpers (closures) ----
  function closeParaIfAny() {
    if (tip.t === 'paragraph') {
      closeBlocksAbove(tip.parent);
    }
  }
  function fencedCodeAt(j) {
    const ch = line[j];
    if (ch !== '`' && ch !== '~') return null;
    let k = j, len = 0;
    while (k < line.length && line[k] === ch) { len++; k++; }
    if (len < 3) return null;
    // a closing fence may have only spaces/tabs after it (no info string)
    while (k < line.length && (line[k] === ' ' || line[k] === '\t')) k++;
    if (k < line.length) return null;
    return { fence: ch, len };
  }
  function isTableRow() {
    // a table body row: a non-blank line that does not start another block,
    // or a whitespace-only line matching /^ {0,3}\t$/
    if (/^ {0,3}\t$/.test(line)) return true;
    if (blank()) return false;
    // check if the line starts another block (at the current offset)
    const indInfo = ind();
    if (indInfo.indent > 3) return false; // indented code
    if (thematicBreak() || atxHeading() > 0 || fencedCode() || htmlBlockType() > 0 || blockquoteStart() || listItem()) return false;
    return true;
  }
  function startsNewBlock(forLazy) {
    // does the line (at the current offset) start a block that interrupts a paragraph?
    const indInfo = ind();
    if (indInfo.indent > 3) return false;
    if (thematicBreak() || atxHeading() > 0 || fencedCode()) return true;
    const hb = htmlBlockType();
    if (hb >= 1 && hb <= 6) return true;
    if (blockquoteStart()) return true;
    const li = listItem();
    if (li) {
      const itemEmpty = li.markerEnd >= line.length;
      // An ordered list interrupts a paragraph only if it starts at 1, UNLESS
      // the paragraph is inside a list item — then the new list is nested
      // inside that item and any start number interrupts (marked behaviour).
      let inItem = false;
      for (let b = tip.parent; b; b = b.parent) {
        if (b.t === 'item') { inItem = true; break; }
      }
      if (!itemEmpty && (!li.ordered || li.start === 1 || inItem)) return true;
    }
    return false;
  }
  function addParaLine(allowSetext) {
    // add the current line to the paragraph `tip`, handling setext headings and tables
    // (allowSetext=false for lazy continuations, which cannot be a setext underline)
    if (allowSetext === undefined) allowSetext = true;
    const p = tip;
    const text = rest();
    const indInfo = ind();
    if (allowSetext && indInfo.indent <= 3 && p.lines.length >= 1) {
      const lvl = setextLevel();
      if (lvl > 0) {
        // convert the paragraph to a heading (content is trimmed) — but
        // only if there is real text before the underline; a paragraph
        // consisting only of link reference definitions has no text, so
        // the underline is literal paragraph text.
        let content = parseRefDefs(p.lines.join('\n'), refs);
        if (content.trim() === '') { p.lines.push(text); return; }
        const h = newBlock('heading');
        h.level = lvl;
        h.content = content.trim();
        // replace the paragraph with the heading in the parent's children
        const parent = p.parent;
        const idx = parent.children.indexOf(p);
        parent.children[idx] = h;
        h.parent = parent;
        finalize(h);
        tip = parent;
        return;
      }
      // table delimiter?
      if (allowSetext && p.lines.length === 1) {
        const aligns = tableDelimiter(text);
        if (aligns) {
          const header = splitTableRow(p.lines[0]);
          const hasColonOrPipe = /[:|]/.test(text);
          if (header.length === aligns.length && hasColonOrPipe) {
            const t = newBlock('table');
            t.align = aligns;
            t.header = header;
            t.rows = [];
            const parent = p.parent;
            const idx = parent.children.indexOf(p);
            parent.children[idx] = t;
            t.parent = parent;
            tip = t;
            return;
          }
        }
      }
    }
    p.lines.push(text);
  }
  function startListItem(li) {
    // find or create the list, then add an item
    let list = null;
    let existing = false;
    // the tip itself may be a matching list (after closing blocks above it)
    if (tip.t === 'list' && !tip.closed && tip.ordered === li.ordered &&
        (li.ordered ? true : tip.marker === li.marker)) {
      list = tip;
      existing = true;
    }
    const kids = tip.children;
    const last = kids.length > 0 ? kids[kids.length - 1] : null;
    if (!list && last && last.t === 'list' && !last.closed && last.ordered === li.ordered &&
        (li.ordered ? true : last.marker === li.marker)) {
      list = last;
      existing = true;
    } else if (!list) {
      list = newBlock('list');
      list.ordered = li.ordered;
      list.marker = li.marker;
      list.start = li.ordered ? li.start : null;
      list.tight = true;
      addChild(tip, list);
    }
    // a blank line before this item makes the enclosing list loose, but
    // only if the container already has content (handled by maybeLoose)
    maybeLoose();
    const item = newBlock('item');
    item.contentIndent = li.contentIndent;
    if (li.markerAfterGt) item.contentIndent += 1;
    // NOTE: the item-creation advance below still uses li.contentIndent
    // (the true content start); only continuation matching uses the +1.
    addChild(list, item);
    tip = item;
    // advance past the marker and the following whitespace
    advance(li.indent + li.markerLen);
    // skip the spaces after the marker (up to the content indent)
    const indInfo = ind();
    const need = li.contentIndent - column;
    if (need > 0) advance(need);
    // if the item is empty, the content indent is where the next line's content goes
    // (already handled by contentIndent)
  }
}

// Parse link reference definitions from the start of `text`.
// Returns the remaining text. Adds definitions to `refs` (first definition wins).
function parseRefDefs(text, refs) {
  let pos = 0;
  const n = text.length;
  // skip spaces/tabs (not newlines) from k; returns the new index
  function skipSpaces(k) {
    while (k < n && (text[k] === ' ' || text[k] === '\t')) k++;
    return k;
  }
  // try to parse a title starting at k (k points at ", ', or (). Returns the
  // index just past the title, or -1 if there is none / it is malformed.
  function parseTitle(k) {
    const open = text[k];
    const close = open === '(' ? ')' : open;
    let e = k + 1;
    while (e < n) {
      const c = text[e];
      if (c === '\\' && e + 1 < n) { e += 2; continue; }
      if (c === close) break;
      e++;
    }
    if (e >= n || text[e] !== close) return -1;
    return e + 1;
  }
  while (pos < n) {
    // skip up to 3 spaces at the start of the line
    let j = pos, spaces = 0;
    while (j < n && text[j] === ' ' && spaces < 3) { j++; spaces++; }
    if (j >= n || text[j] !== '[') break;
    const lab = scanLabel(text, j);
    if (!lab) break;
    let k = lab.end;
    if (k >= n || text[k] !== ':') break;
    k++;
    // skip whitespace (spaces, tabs, newlines) to the destination
    while (k < n && (text[k] === ' ' || text[k] === '\t' || text[k] === '\n')) k++;
    if (k >= n) break;
    // destination
    let dest = null;
    if (text[k] === '<') {
      let e = k + 1;
      while (e < n && text[e] !== '>' && text[e] !== '\n') {
        if (text[e] === '\\' && e + 1 < n) e += 2; else e++;
      }
      if (e >= n || text[e] !== '>') break;
      dest = text.slice(k + 1, e).replace(/\\([!-/:-@\[-`{-~])/g, '$1');
      k = e + 1;
    } else {
      let e = k, depth = 0;
      while (e < n) {
        const c = text[e];
        if (c === ' ' || c === '\t' || c === '\n') break;
        if (c === '\\' && e + 1 < n) { e += 2; continue; }
        if (c === '(') depth++;
        else if (c === ')') { if (depth === 0) break; depth--; }
        e++;
      }
      if (e === k) break;
      dest = text.slice(k, e).replace(/\\([!-/:-@\[-`{-~])/g, '$1');
      k = e;
    }
    // optional title: same line (needs whitespace before it), or the
    // next line (must be alone on that line)
    let title = null;
    let k2 = skipSpaces(k);
    if (k2 < n && k2 > k && (text[k2] === '"' || text[k2] === "'" || text[k2] === '(')) {
      const after = parseTitle(k2);
      if (after === -1) break;
      title = text.slice(k2 + 1, after - 1).replace(/\\([!-/:-@\[-`{-~])/g, '$1');
      k = skipSpaces(after);
      if (k < n && text[k] !== '\n') break;
    } else if (k2 < n && text[k2] === '\n') {
      // no title on this line; check the next line for one. A malformed
      // title or junk after it just means no title (the def still stands).
      let k3 = k2 + 1;
      k3 = skipSpaces(k3);
      if (k3 < n && (text[k3] === '"' || text[k3] === "'" || text[k3] === '(')) {
        const after = parseTitle(k3);
        if (after !== -1) {
          const k4 = skipSpaces(after);
          if (k4 >= n || text[k4] === '\n') {
            title = text.slice(k3 + 1, after - 1).replace(/\\([!-/:-@\[-`{-~])/g, '$1');
            k = k4;
          } else {
            k = k2; // junk after the title: no title, def ends at first line
          }
        } else {
          k = k2; // malformed title: no title
        }
      } else {
        k = k2; // the definition ends at this newline
      }
    } else if (k2 >= n) {
      k = k2; // end of text, no title
    } else {
      break; // junk after the destination on the same line
    }
    // success: record it (first definition wins). An empty label
    // (or one that is only whitespace) is not a valid reference.
    const key = normalizeLabel(lab.label);
    if (key === '') break;
    if (!refs.has(key)) refs.set(key, { dest, title });
    // advance past the newline (or to the end)
    pos = k < n ? k + 1 : n;
  }
  return text.slice(pos);
}

// ================================================================ block rendering
function renderBlocks(doc, refs) {
  let out = '';
  function renderBlock(block) {
    switch (block.t) {
      case 'document':
        for (const child of block.children) renderBlock(child);
        break;
      case 'paragraph': {
        if (block.dropped) break;
        const first = inlineParse(block.content, refs);
        out += '<p>' + renderInline(first) + '</p>\n';
        break;
      }
      case 'heading': {
        const first = inlineParse(block.content, refs);
        out += '<h' + block.level + '>' + renderInline(first) + '</h' + block.level + '>\n';
        break;
      }
      case 'code': {
        out += '<pre><code';
        if (block.fenced && block.info) out += ' class="language-' + escapeAttr(block.info.split(/\s+/)[0]) + '"';
        out += '>' + escapeHtmlStrict(block.content) + '</code></pre>\n';
        break;
      }
      case 'html':
        out += block.content;
        break;
      case 'hr':
        out += '<hr>\n';
        break;
      case 'blockquote': {
        out += '<blockquote>\n';
        for (const child of block.children) renderBlock(child);
        out += '</blockquote>\n';
        break;
      }
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        out += '<' + tag;
        if (block.ordered && block.start !== null && block.start !== 1) out += ' start="' + block.start + '"';
        out += '>\n';
        for (const child of block.children) renderBlock(child);
        out += '</' + tag + '>\n';
        break;
      }
      case 'item': {
        const tight = block.parent.tight;
        // GFM task list item: the first paragraph starts with '[ ] ' (unchecked)
        // or '[x] '/'[X] ' (checked). The marker is replaced by a checkbox.
        let taskHtml = '';
        if (block.children.length > 0 && block.children[0].t === 'paragraph') {
          const c = block.children[0].content;
          if (c.startsWith('[ ] ')) {
            taskHtml = '<input disabled="" type="checkbox"> ';
            block.children[0].content = c.slice(4);
          } else if (c.startsWith('[x] ') || c.startsWith('[X] ')) {
            taskHtml = '<input checked="" disabled="" type="checkbox"> ';
            block.children[0].content = c.slice(4);
          }
        }
        out += '<li>';
        if (tight) {
          // tight list: render children without <p> wrappers, paragraphs inline
          out += taskHtml;
          for (let k = 0; k < block.children.length; k++) {
            const child = block.children[k];
            if (child.t === 'paragraph') {
              const first = inlineParse(child.content, refs);
              out += renderInline(first);
            } else {
              renderBlock(child);
            }
          }
        } else {
          // loose list: the checkbox goes inside the first <p>
          for (let k = 0; k < block.children.length; k++) {
            const child = block.children[k];
            if (k === 0 && child.t === 'paragraph' && taskHtml) {
              out += '<p>' + taskHtml;
              const first = inlineParse(child.content, refs);
              out += renderInline(first);
              out += '</p>\n';
            } else {
              renderBlock(child);
            }
          }
        }
        out += '</li>\n';
        break;
      }
      case 'table': {
        out += '<table>\n<thead>\n<tr>\n';
        for (let k = 0; k < block.header.length; k++) {
          const align = block.align[k];
          out += '<th' + (align ? ' align="' + align + '"' : '') + '>';
          const first = inlineParse(block.header[k], refs);
          out += renderInline(first);
          out += '</th>\n';
        }
        out += '</tr>\n</thead>\n';
        if (block.rows.length > 0) {
          out += '<tbody>';
          for (const row of block.rows) {
            out += '<tr>\n';
            for (let k = 0; k < block.header.length; k++) {
              const cell = k < row.length ? row[k] : '';
              const align = block.align[k];
              out += '<td' + (align ? ' align="' + align + '"' : '') + '>';
              const first = inlineParse(cell, refs);
              out += renderInline(first);
              out += '</td>\n';
            }
            out += '</tr>\n';
          }
          out += '</tbody>';
        }
        out += '</table>\n';
        break;
      }
    }
  }
  renderBlock(doc);
  return out;
}
