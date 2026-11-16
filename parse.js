// parse.js — a fast, dependency-free drop-in replacement for marked 18.1.3
// (default options: gfm, breaks off). Written from scratch against the
// CommonMark 0.31.2 / GFM 0.29 specs; marked's HTML wins where it departs.

// Compact HTML5 named-entity table: "name=char;name=char;..." (semicolon
// terminated names only; entities without a semicolon are not recognised).
const ENT_SRC =
  "AElig=\u00c6;AMP=&;Aacute=\u00c1;Acirc=\u00c2;Agrave=\u00c0;Alpha=\u0391;Aring=\u00c5;Atilde=\u00c3;Auml=\u00c4;Beta=\u0392;Ccedil=\u00c7;Chi=\u03a7;Dagger=\u2021;Delta=\u0394;ETH=\u00d0;Eacute=\u00c9;Ecirc=\u00ca;Egrave=\u00c8;Epsilon=\u0395;Eta=\u0397;Euml=\u00cb;Gamma=\u0393;Iacute=\u00cd;Icirc=\u00ce;Igrave=\u00cc;Iota=\u0399;Iuml=\u00cf;Kappa=\u039a;Lambda=\u039b;Mu=\u039c;Ntilde=\u00d1;Nu=\u039d;Oacute=\u00d3;Ocirc=\u00d4;Ograve=\u00d2;Omega=\u03a9;Omicron=\u039f;Oslash=\u00d8;Otilde=\u00d5;Ouml=\u00d6;Phi=\u03a6;Pi=\u03a0;Prime=\u2033;Psi=\u03a8;Rho=\u03a1;Sigma=\u03a3;THORN=\u00de;Tau=\u03a4;Theta=\u0398;Uacute=\u00da;Ucirc=\u00db;Ugrave=\u00d9;Upsilon=\u03a5;Uuml=\u00dc;Xi=\u039e;Yacute=\u00dd;Zeta=\u0396;aacute=\u00e1;acirc=\u00e2;acute=\u00b4;aelig=\u00e6;agrave=\u00e0;alefsym=\u2135;alpha=\u03b1;amp=&;and=\u2227;ang=\u2220;aring=\u00e5;asymp=\u2248;atilde=\u00e3;auml=\u00e4;bdquo=\u201e;beta=\u03b2;brvbar=\u00a6;bull=\u2022;cap=\u2229;ccedil=\u00e7;cedil=\u00b8;cent=\u00a2;chi=\u03c7;circ=\u02c6;clubs=\u2663;cong=\u2245;copy=\u00a9;crarr=\u21b5;cup=\u222a;curren=\u00a4;dArr=\u21d3;dagger=\u2020;darr=\u2193;deg=\u00b0;delta=\u03b4;diams=\u2666;divide=\u00f7;eacute=\u00e9;ecirc=\u00ea;egrave=\u00e8;empty=\u2205;emsp=\u2003;ensp=\u2002;epsilon=\u03b5;equiv=\u2261;eta=\u03b7;eth=\u00f0;euml=\u00eb;euro=\u20ac;exist=\u2203;fnof=\u0192;forall=\u2200;frac12=\u00bd;frac14=\u00bc;frac34=\u00be;frasl=\u2044;gamma=\u03b3;ge=\u2265;gt=>;hArr=\u21d4;harr=\u2194;hearts=\u2665;hellip=\u2026;iacute=\u00ed;icirc=\u00ee;iexcl=\u00a1;igrave=\u00ec;image=\u2111;infin=\u221e;int=\u222b;iota=\u03b9;iquest=\u00bf;isin=\u2208;iuml=\u00ef;kappa=\u03ba;lArr=\u21d0;lambda=\u03bb;lang=\u27e8;laquo=\u00ab;larr=\u2190;lceil=\u2308;ldquo=\u201c;le=\u2264;lfloor=\u230a;lowast=\u2217;loz=\u25ca;lrm=\u200e;lsaquo=\u2039;lsquo=\u2018;lt=<;macr=\u00af;mdash=\u2014;micro=\u00b5;middot=\u00b7;minus=\u2212;mu=\u03bc;nabla=\u2207;nbsp=\u00a0;ndash=\u2013;ne=\u2260;ni=\u220b;not=\u00ac;notin=\u2209;nsub=\u2284;ntilde=\u00f1;nu=\u03bd;oacute=\u00f3;ocirc=\u00f4;ograve=\u00f2;oline=\u203e;omega=\u03c9;omicron=\u03bf;oplus=\u2295;or=\u2228;ordf=\u00aa;ordm=\u00ba;oslash=\u00f8;otilde=\u00f5;ouml=\u00f6;para=\u00b6;part=\u2202;permil=\u2030;perp=\u22a5;phi=\u03c6;pi=\u03c0;piv=\u03d6;plusmn=\u00b1;pound=\u00a3;prime=\u2032;prod=\u220f;prop=\u221d;psi=\u03c8;quot=\";rArr=\u21d2;radic=\u221a;rang=\u27e9;raquo=\u00bb;rarr=\u2192;rceil=\u2309;rdquo=\u201d;real=\u211c;reg=\u00ae;rfloor=\u230b;rho=\u03c1;rlm=\u200f;rsaquo=\u203a;rsquo=\u2019;sbquo=\u201a;scaron=\u0161;sect=\u00a7;shy=\u00ad;sigma=\u03c3;sigmaf=\u03c2;sim=\u223c;spades=\u2660;sub=\u2282;sube=\u2286;sum=\u2211;sup=\u2283;sup1=\u00b9;sup2=\u00b2;sup3=\u00b3;supe=\u2287;szlig=\u00df;tau=\u03c4;there4=\u2234;theta=\u03b8;thetasym=\u03d1;thinsp=\u2009;thorn=\u00fe;tilde=\u02dc;times=\u00d7;trade=\u2122;uArr=\u21d1;uacute=\u00fa;uarr=\u2191;ucirc=\u00fb;ugrave=\u00f9;uml=\u00a8;upsih=\u03d2;upsilon=\u03c5;uuml=\u00fc;weierp=\u2118;xi=\u03be;yacute=\u00fd;yen=\u00a5;yuml=\u00ff;zeta=\u03b6;zwj=\u200d;zwnj=\u200c;apos=\u0027;check=\u2713;star=\u2605;clubsuit=\u2663;diamond=\u2666;heartsuit=\u2665;spadesuit=\u2660;larrhk=\u21a9;rarrhk=\u21aa;nearr=\u2197;searr=\u2198;nwarr=\u2196;swarr=\u2199;harr=\u2194;varr=\u2195;crarr=\u21b5;olarr=\u21ba;orarr=\u21bb;lhard=\u21bd;rhard=\u21c1;uharr=\u21bf;uharl=\u21bf;dharr=\u21c2;dharl=\u21c3;rarrw=\u219d;nharr=\u21ae;nlarr=\u219a;nrarr=\u219b;rarrtl=\u21a2;larrtl=\u21a3;rarrb=\u21a5;larrb=\u21a4;dtri=\u25bf;rtri=\u25b8;utri=\u25b5;ltri=\u25c2;uarr=\u2191;darr=\u2193;bull=\u2022;sdot=\u22c5;odot=\u2299;oplus=\u2295;ominus=\u2296;otimes=\u2297;oslash=\u2298;odot=\u2299;circledast=\u229b;circledcirc=\u229a;circleddash=\u229d;boxh=\u2500;boxv=\u2502;boxdr=\u250c;boxdl=\u2510;boxur=\u2514;boxul=\u2518;boxvr=\u251c;boxvl=\u2524;boxhd=\u252c;boxhu=\u2534;boxvh=\u253c;boxH=\u2550;boxV=\u2551;boxDR=\u2554;boxDL=\u2557;boxUR=\u255a;boxUL=\u255d;boxVR=\u2560;boxVL=\u2563;boxHD=\u2566;boxHU=\u2569;boxVH=\u256c;uhblk=\u2580;lhblk=\u2584;block=\u2588;blk14=\u2591;blk12=\u2592;blk34=\u2593;square=\u25a1;squ=\u25a1;blacksquare=\u25a0;rect=\u25ad;marker=\u25ae;loz=\u25ca;cir=\u25cb;tridot=\u25ec;xcirc=\u25ef;ultri=\u25f8;urtri=\u25f9;lltri=\u25fa;lrtri=\u25ff;utrif=\u25b2;rtrif=\u25b6;dtrif=\u25bc;ltrif=\u25c0;utri=\u25b5;rtri=\u25b9;dtri=\u25bf;ltri=\u25c3;starf=\u2605;phone=\u260e;female=\u2640;male=\u2642;check=\u2713;cross=\u2717;malt=\u2720;sext=\u2736;vert=\u007c;par=\u2225;fjlig=\u0066\u006a;opf=\u{1d55c};opfA=\u{1d538};";
const ENT = new Map();
for (const part of ENT_SRC.split(";")) {
  if (!part) continue;
  const eq = part.indexOf("=");
  ENT.set(part.slice(0, eq), part.slice(eq + 1));
}

// ---- character helpers ----
function isSpace(c) { return c === 32 || c === 9 || c === 10 || c === 13; }
function isDigit(c) { return c >= 48 && c <= 57; }
function isAlpha(c) {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
}
function isAlnum(c) { return isAlpha(c) || isDigit(c); }
function isPunctCode(c) {
  // ASCII punctuation, fast path
  if (c < 128) {
    return (c >= 33 && c <= 47) || (c >= 58 && c <= 64) ||
      (c >= 91 && c <= 96) || (c >= 123 && c <= 126);
  }
  // non-ASCII: Unicode punctuation / symbol
  return /[\p{P}\p{S}]/u.test(String.fromCodePoint(c));
}
function isWhitespaceCode(c) {
  return c === 32 || c === 9 || c === 10 || c === 11 || c === 12 || c === 13 ||
    c === 0x85 || c === 0xa0 || (c >= 0x2000 && c <= 0x200a) || c === 0x2028 ||
    c === 0x2029 || c === 0x202f || c === 0x205f || c === 0x3000;
}
const ESCAPABLE = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

// Escape text content: & < > " '  (marked escapes all five in text)
function escText(s) {
  let out = "";
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    let rep = null;
    if (c === 38) rep = "&amp;";
    else if (c === 60) rep = "&lt;";
    else if (c === 62) rep = "&gt;";
    else if (c === 34) rep = "&quot;";
    else if (c === 39) rep = "&#39;";
    if (rep) { out += s.slice(start, i) + rep; start = i + 1; }
  }
  return start === 0 ? s : out + s.slice(start);
}
// Escape attribute values (href/title/alt): & and " mainly; marked also
// escapes < > in attributes via the same routine.
function escAttr(s) {
  return escText(s);
}

// Attribute escaping for hrefs/titles: like escAttr, except an "&" that
// starts a valid entity reference (&name; / &#digits; / &#xhex;, with the
// same digit limits as tryEntity) is left verbatim.
function escAttrEnt(s) {
  let out = "", i = 0, n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === "&") {
      let j = i + 1, ok = false;
      if (s[j] === "#") {
        j++;
        if (s[j] === "x" || s[j] === "X") {
          j++; const st = j;
          while (j < n) { const cc = s.charCodeAt(j); if ((cc >= 48 && cc <= 57) || (cc >= 97 && cc <= 102) || (cc >= 65 && cc <= 70)) j++; else break; }
          ok = j > st && j - st <= 6 && s[j] === ";";
        } else {
          const st = j;
          while (j < n && s.charCodeAt(j) >= 48 && s.charCodeAt(j) <= 57) j++;
          ok = j > st && j - st <= 7 && s[j] === ";";
        }
      } else {
        const st = j;
        while (j < n && (isAlnum(s.charCodeAt(j)) || s[j] === "_")) j++;
        ok = j > st && s[j] === ";";
      }
      if (ok) { out += s.slice(i, j + 1); i = j + 1; continue; }
      out += "&amp;"; i++; continue;
    }
    if (c === "<") out += "&lt;";
    else if (c === ">") out += "&gt;";
    else if (c === '"') out += "&quot;";
    else if (c === "'") out += "&#39;";
    else out += c;
    i++;
  }
  return out;
}

// Decode a numeric / named entity starting at s[i] === '&'.
// Returns [decodedString, lengthConsumed] or null.
function tryEntity(s, i) {
  const n = s.length;
  if (i + 1 >= n) return null;
  if (s[i + 1] === "#") {
    let j = i + 2;
    let hex = false;
    if (j < n && (s[j] === "x" || s[j] === "X")) { hex = true; j++; }
    const start = j;
    while (j < n) {
      const c = s.charCodeAt(j);
      if (hex ? (isDigit(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102)) : isDigit(c)) j++;
      else break;
    }
    const digits = j - start;
    // CommonMark: at most 7 decimal / 6 hex digits, else not an entity.
    if (digits === 0 || (hex && digits > 6) || (!hex && digits > 7)) return null;
    if (j >= n || s[j] !== ";") return null;
    let cp = parseInt(s.slice(start, j), hex ? 16 : 10);
    if (!isFinite(cp)) return null;
    if (cp === 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) cp = 0xfffd;
    return [String.fromCodePoint(cp), j - i + 1];
  }
  // named: scan alphanumerics
  let j = i + 1;
  while (j < n && isAlnum(s.charCodeAt(j))) j++;
  if (j < n && s[j] === ";" && j > i + 1) {
    const name = s.slice(i + 1, j);
    const v = ENT.get(name);
    if (v !== undefined) return [v, j - i + 1];
  }
  return null;
}

// Encode a link destination the way marked does: percent-encode spaces,
// a few unsafe characters and non-ASCII characters (as UTF-8), leave the
// rest (already-encoded sequences pass through untouched).
function cleanUrl(href) {
  let out = "";
  for (let i = 0; i < href.length; i++) {
    const ch = href[i];
    const c = href.charCodeAt(i);
    if (ch === " ") out += "%20";
    else if (ch === '"') out += "%22";
    else if (ch === "<") out += "%3C";
    else if (ch === ">") out += "%3E";
    else if (ch === "`") out += "%60";
    else if (ch === "\\") out += "%5C";
    else if (ch === "{") out += "%7B";
    else if (ch === "}") out += "%7D";
    else if (ch === "|") out += "%7C";
    else if (ch === "^") out += "%5E";
    else if (ch === "[") out += "%5B";
    else if (ch === "]") out += "%5D";
    else if (c < 32) out += "%" + c.toString(16).toUpperCase().padStart(2, "0");
    else if (c >= 128) {
      const cp = href.codePointAt(i);
      out += encodeURIComponent(String.fromCodePoint(cp));
      if (cp > 0xffff) i++;
    }
    else out += ch;
  }
  return out;
}

// ============================ INLINE PARSER ============================
// Nodes: {t:'text',s} {t:'code',s} {t:'br'} {t:'html',s} {t:'delim',ch,len,canOpen,canClose}
// Link/image nodes are emitted directly as {t:'html', s} after recursively
// rendering their label (delimiters never cross a link boundary).

function leftFlanking(s, i, j) {
  // run is s[i..j); char before = s[i-1], char after = s[j]
  const after = j < s.length ? s.charCodeAt(j) : -1;
  const before = i > 0 ? s.charCodeAt(i - 1) : -1;
  if (after === -1) return false;
  if (isWhitespaceCode(after)) return false;
  if (isPunctCode(after)) return before === -1 || isWhitespaceCode(before) || isPunctCode(before);
  return true;
}
function rightFlanking(s, i, j) {
  const after = j < s.length ? s.charCodeAt(j) : -1;
  const before = i > 0 ? s.charCodeAt(i - 1) : -1;
  if (before === -1) return false;
  if (isWhitespaceCode(before)) return false;
  if (isPunctCode(before)) return after === -1 || isWhitespaceCode(after) || isPunctCode(after);
  return true;
}

// Find the index of the ']' matching the '[' at start (label scanning:
// nested brackets count, backslash escapes and code spans are skipped).
// Returns index of ']' or -1.
function findLinkEnd(s, start) {
  let depth = 0;
  let i = start;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === "\\") { i += 2; continue; }
    if (c === "`") {
      let j = i;
      while (j < n && s[j] === "`") j++;
      const len = j - i;
      // Skip a code span: find the next run of exactly the same length.
      // If there is none, the run is literal text and scanning continues
      // after it (an unterminated code span does not by itself fail the
      // label scan). A code span whose content itself holds a backtick
      // (only possible when the delimiter is 2+ backticks) followed by
      // more label text does fail the scan: marked leaves such a label
      // unlinked, while the same span at the very end of the label links.
      let k = j;
      let found = -1;
      let closeStart = -1;
      while (k < n) {
        if (s[k] === "`") {
          let m = k;
          while (m < n && s[m] === "`") m++;
          if (m - k === len) { found = m; closeStart = k; break; }
          k = m;
        } else k++;
      }
      if (found === -1) { i = j; continue; }
      if (len >= 2 && s.slice(j, closeStart).indexOf("`") !== -1 && s[found] !== "]") return -1;
      i = found;
      continue;
    }
    // A '<' skips ahead to the next '>' (an autolink or tag inside the
    // label may contain ']' without ending the label). If there is no '>'
    // ahead, the '<' is just a character.
    if (c === "<") {
      let k = i + 1;
      while (k < n && s[k] !== ">") k++;
      if (k < n) { i = k + 1; continue; }
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

// Normalise a reference label: collapse internal whitespace, trim, and
// case-fold (Unicode fold: ß/ẞ -> ss, as marked does for label matching).
function normLabel(s) {
  return s.replace(/ß|ẞ/g, "ss").replace(/\s+/g, " ").trim().toLowerCase();
}

// Parse an inline link destination/title starting at s[i] === '('.
// Returns {dest, title, end} (end = index just past ')') or null.
// dest/title are raw (entities decoded later by caller where needed).
function parseInlineLink(s, i) {
  const n = s.length;
  let j = i + 1;
  while (j < n && (s[j] === " " || s[j] === "\t" || s[j] === "\n")) j++;
  let dest = "";
  if (j < n && s[j] === "<") {
    let k = j + 1;
    while (k < n && s[k] !== ">" && s[k] !== "\n") {
      if (s[k] === "\\") k++;
      k++;
    }
    if (k >= n || s[k] !== ">") return null;
    dest = s.slice(j + 1, k);
    j = k + 1;
  } else {
    let depth = 0;
    const start = j;
    while (j < n) {
      const c = s[j];
      if (c === "\\") { j += 2; continue; }
      if (c === " " || c === "\t" || c === "\n") break;
      if (c === "(") { depth++; j++; continue; }
      if (c === ")") {
        if (depth === 0) break;
        depth--; j++; continue;
      }
      if (s.charCodeAt(j) < 32) return null;
      j++;
    }
    dest = s.slice(start, j);
  }
  // optional title (must be separated from the destination by whitespace)
  let title = null;
  let k = j;
  let hadWs = false;
  while (k < n && (s[k] === " " || s[k] === "\t" || s[k] === "\n")) { k++; hadWs = true; }
  if (k < n && s[k] !== ")") {
    if (!hadWs) return null; // no whitespace before the title: not a link
    const q = s[k];
    if (q === '"' || q === "'") {
      let m = k + 1;
      while (m < n && s[m] !== q) { if (s[m] === "\\") m++; m++; }
      if (m >= n) return null;
      title = s.slice(k + 1, m);
      k = m + 1;
    } else if (q === "(") {
      let m = k + 1;
      let depth = 0;
      while (m < n) {
        if (s[m] === "\\") { m += 2; continue; }
        if (s[m] === "(") depth++;
        else if (s[m] === ")") { if (depth === 0) break; depth--; }
        m++;
      }
      if (m >= n) return null;
      title = s.slice(k + 1, m);
      k = m + 1;
    } else return null;
    while (k < n && (s[k] === " " || s[k] === "\t" || s[k] === "\n")) k++;
  }
  if (k >= n || s[k] !== ")") return null;
  return { dest, title, end: k + 1 };
}

// Decode backslash escapes inside a link destination/title. Entities are
// NOT decoded here: marked keeps them verbatim in destinations and titles.
function decodeInlineRaw(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length && ESCAPABLE.indexOf(s[i + 1]) >= 0) {
      out += s[i + 1]; i++; continue;
    }
    out += c;
  }
  return out;
}

// Does a label contain an unescaped [ or ]? Reference labels may not.
function hasUnescapedBracket(label) {
  for (let i = 0; i < label.length; i++) {
    const c = label[i];
    if (c === "[" || c === "]") {
      let bs = 0;
      for (let k = i - 1; k >= 0 && label[k] === "\\"; k--) bs++;
      if (bs % 2 === 0) return true;
    }
  }
  return false;
}

// Parse a link/image starting at s[i] === '[' (image: s[i]==='!' and
// s[i+1]==='['). Returns {label, dest, title, end} or null.
function parseLinkAt(s, i, refs, isImage) {
  const open = isImage ? i + 1 : i;
  const close = findLinkEnd(s, open);
  if (close === -1) return null;
  const label = s.slice(open + 1, close);
  let dest = null, title = null, end = close + 1;
  const n = s.length;
  if (end < n && s[end] === "(") {
    const r = parseInlineLink(s, end);
    if (r) { dest = r.dest; title = r.title; end = r.end; }
    // if the inline form fails, fall through to the reference forms below
  }
  if (dest === null) {
    if (end < n && s[end] === "[") {
      const c2 = findLinkEnd(s, end);
      if (c2 === -1) return null;
      // The link text (first label) may contain brackets; only the
      // reference label (second label, or the first when collapsed) may not.
      const lab = c2 === end + 1 ? label : s.slice(end + 1, c2);
      if (hasUnescapedBracket(lab)) return null;
      const ref = refs.get(normLabel(lab));
      if (!ref) return null;
      dest = ref.dest; title = ref.title; end = c2 + 1;
    } else {
      if (hasUnescapedBracket(label)) return null;
      const ref = refs.get(normLabel(label));
      if (!ref) return null;
      dest = ref.dest; title = ref.title;
    }
  }
  return { label, dest: decodeInlineRaw(dest), title: title !== null && title !== undefined ? decodeInlineRaw(title) : null, end };
}

// State for the nested-link rule: while a link/image label is being
// rendered, links parsed inside it are counted; a link whose label
// contains a link does not form.
let labelDepth = 0;
let linksInLabel = 0;

// Try to parse a link/image starting at s[i] === '[' (image: s[i]==='!' and
// s[i+1]==='['). Returns {html, end} or null. `refs` is the link-ref map.
// In plain mode (used for image alt text) links and images contribute
// only their label's plain text, with no tags.
function tryLink(s, i, refs, isImage, plain) {
  const r = parseLinkAt(s, i, refs, isImage);
  if (!r) return null;
  if (isImage && !plain) {
    // Alt text is the label's plain text; parsing it also drives the
    // nested-link counters for any enclosing link label.
    const savedInLink = inLink;
    inLink = true;
    const alt = inlineParse(r.label, refs, true);
    inLink = savedInLink;
    let html = '<img src="' + escAttrEnt(cleanUrl(r.dest)) + '" alt="' + alt + '"';
    if (r.title) html += ' title="' + escAttrEnt(r.title) + '"';
    html += ">";
    return { html, end: r.end };
  }
  const saved = linksInLabel;
  linksInLabel = 0;
  labelDepth++;
  // A link's children are inside a link, so extended autolinks in the
  // label text are suppressed (marked's inLink state).
  const savedInLink = inLink;
  inLink = true;
  const inner = inlineParse(r.label, refs, plain);
  inLink = savedInLink;
  labelDepth--;
  const nested = linksInLabel;
  linksInLabel = saved + nested;
  if (!isImage && nested > 0) return null; // a link may not contain a link
  if (labelDepth > 0 && !isImage) linksInLabel++;
  if (plain) return { html: inner, end: r.end };
  let html = '<a href="' + escAttrEnt(cleanUrl(r.dest)) + '"';
  if (r.title) html += ' title="' + escAttrEnt(r.title) + '"';
  html += ">" + inner + "</a>";
  return { html, end: r.end };
}


const HTML_TAG_RE = /^<\/?[a-zA-Z][a-zA-Z0-9-]*(\s[^>]*)?\/?>/;

// Scan a CommonMark inline HTML tag starting at s[i] === '<'.
// Returns the index just past the tag, or -1 if not a valid tag.
// Validates attribute names/values (quoted values may contain '>'),
// closing tags (no attributes), and that '/' is immediately before '>'.
function scanHtmlTag(s, i) {
  const n = s.length;
  let j = i + 1, closing = false;
  if (s[j] === "/") { closing = true; j++; }
  if (j >= n || !isAlpha(s.charCodeAt(j))) return -1;
  while (j < n && (isAlnum(s.charCodeAt(j)) || s[j] === "-")) j++;
  if (closing) {
    while (j < n && (s[j] === " " || s[j] === "\t" || s[j] === "\n")) j++;
    return (j < n && s[j] === ">") ? j + 1 : -1;
  }
  // An attribute must be preceded by whitespace, including the first one
  // (a tag name directly followed by an attribute is not a valid tag).
  while (true) {
    const ws = j;
    while (j < n && (s[j] === " " || s[j] === "\t" || s[j] === "\n")) j++;
    const hadWs = j > ws;
    if (j >= n) return -1;
    if (s[j] === ">") return j + 1;
    if (s[j] === "/") return (j + 1 < n && s[j + 1] === ">") ? j + 2 : -1;
    if (!hadWs) return -1;
    if (!isAlpha(s.charCodeAt(j)) && s[j] !== "_" && s[j] !== ":") return -1;
    j++;
    while (j < n && (isAlnum(s.charCodeAt(j)) || s[j] === "_" || s[j] === ":" || s[j] === "." || s[j] === "-")) j++;
    let m = j;
    while (m < n && (s[m] === " " || s[m] === "\t" || s[m] === "\n")) m++;
    if (m < n && s[m] === "=") {
      m++;
      while (m < n && (s[m] === " " || s[m] === "\t" || s[m] === "\n")) m++;
      if (m >= n) return -1;
      const q = s[m];
      if (q === '"' || q === "'") {
        m++;
        while (m < n && s[m] !== q) m++;
        if (m >= n) return -1;
        j = m + 1;
      } else {
        if (s[m] === " " || s[m] === "\t" || s[m] === "\n" || s[m] === '"' || s[m] === "'" || s[m] === "=" || s[m] === "<" || s[m] === ">" || s[m] === "`") return -1;
        while (m < n && s[m] !== " " && s[m] !== "\t" && s[m] !== "\n" && s[m] !== '"' && s[m] !== "'" && s[m] !== "=" && s[m] !== "<" && s[m] !== ">" && s[m] !== "`") m++;
        j = m;
      }
    }
    // else: valueless attribute; j stays after the name, loop re-skips ws
  }
}

const URL_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~:/?#@!$&'()*+,;=%\\";

const EMAIL_LOCAL = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!#$%&'*+/=?^_`{|}~-";

// Scan an email address starting at s[i]. Returns {text, end} or null.
// The domain must contain a dot, must not contain "..", and must end with
// an alphanumeric; the local part must not start/end with "." or contain
// "..". Trailing punctuation (., etc.) is trimmed before validation.
function scanEmail(s, i) {
  const n = s.length;
  let k = i;
  while (k < n && EMAIL_LOCAL.indexOf(s[k]) >= 0) k++;
  if (k === i || k >= n || s[k] !== "@") return null;
  let m = k + 1;
  while (m < n && (isAlnum(s.charCodeAt(m)) || s[m] === "-" || s[m] === "." || s[m] === "_")) m++;
  let text = s.slice(i, m);
  while (text.length && "?!.,:;".indexOf(text[text.length - 1]) >= 0) text = text.slice(0, -1);
  const at = text.indexOf("@");
  if (at <= 0) return null;
  const local = text.slice(0, at);
  const domain = text.slice(at + 1);
  if (!domain || domain.indexOf(".") <= 0) return null;
  if (domain.indexOf("..") >= 0 || local.indexOf("..") >= 0) return null;
  if (local[0] === "." || local[local.length - 1] === ".") return null;
  if (!isAlnum(domain.charCodeAt(domain.length - 1))) return null;
  return { text, end: i + text.length };
}

// Trim trailing punctuation / unbalanced closers / a trailing &name;
// entity-like sequence from an extended-autolink URL.
function trimAutolinkUrl(text) {
  while (text.length) {
    const last = text[text.length - 1];
    if (last === ";") {
      // a trailing &name; entity-like sequence is trimmed whole; a bare
      // trailing ';' is trimmed as punctuation
      const amp = text.lastIndexOf("&");
      if (amp >= 0) {
        const inner = text.slice(amp + 1, -1);
        if (/^(#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z0-9_]+)$/.test(inner)) {
          text = text.slice(0, amp); continue;
        }
      }
      text = text.slice(0, -1); continue;
    }
    if ("?!.,:*_~".indexOf(last) >= 0) { text = text.slice(0, -1); continue; }
    if (last === ")") {
      let open = 0, close = 0;
      for (const ch of text) { if (ch === "(") open++; if (ch === ")") close++; }
      if (close > open) { text = text.slice(0, -1); continue; }
    }
    if (last === "'") { text = text.slice(0, -1); continue; }
    break;
  }
  return text;
}

function tryExtendedAutolink(s, i, prev) {
  // marked keeps a per-document "inside an <a> tag" state: an opening
  // `<a ` tag in inline content suppresses GFM extended autolinks
  // (email / www. / scheme://) until a `</a>` tag clears it. Core
  // `<...>` autolinks and regular links are unaffected.
  if (inLink) return null;
  // prev: char code before i, or -1. GFM extended autolinks only start at a
  // word boundary (start, whitespace or punctuation before).
  if (prev !== -1 && !isWhitespaceCode(prev) && !isPunctCode(prev)) return null;
  const n = s.length;
  // scheme:email form: only mailto: (no path) and xmpp: (one path segment)
  const lower = s.slice(i, i + 7).toLowerCase();
  if (lower.startsWith("mailto:") || lower.startsWith("xmpp:")) {
    const isMailto = lower[0] === "m";
    const after = i + (isMailto ? 7 : 5);
    const em = scanEmail(s, after);
    if (em) {
      let text = s.slice(i, em.end);
      if (!isMailto && em.end < n && s[em.end] === "/") {
        // one path segment (URL chars, no further '/')
        let m = em.end + 1;
        while (m < n && URL_CHARS.indexOf(s[m]) >= 0 && s[m] !== "/") m++;
        if (m > em.end + 1) {
          const seg = trimAutolinkUrl(s.slice(em.end, m));
          if (seg.length > 1) text = s.slice(i, em.end) + seg;
        }
      }
      return { html: '<a href="' + escAttrEnt(cleanUrl(text)) + '">' + escText(text) + "</a>", text, end: i + text.length };
    }
    // not a scheme:email link: fall through so only the email part links
  }
  let kind = null; // 'www' | 'scheme'
  let j = i;
  if (s.startsWith("www.", i)) { kind = "www"; j = i + 4; }
  else {
    // scheme://
    let k = i;
    if (k < n && isAlpha(s.charCodeAt(k))) {
      k++;
      while (k < n && (isAlnum(s.charCodeAt(k)) || s[k] === "+" || s[k] === "-" || s[k] === ".")) k++;
      if (k - i >= 2 && k + 2 < n && s[k] === ":" && s[k + 1] === "/" && s[k + 2] === "/") {
        kind = "scheme"; j = k + 3;
      }
    }
  }
  if (kind) {
    let k = j;
    while (k < n && URL_CHARS.indexOf(s[k]) >= 0) k++;
    if (k === j) return null;
    let text = trimAutolinkUrl(s.slice(i, k));
    // require a dot in the domain part for www/scheme
    const hostEnd = text.indexOf("/", kind === "www" ? 4 : text.indexOf("://") + 3);
    const host = hostEnd === -1 ? text : text.slice(0, hostEnd);
    if (host.indexOf(".") === -1) return null;
    const href = kind === "www" ? "http://" + text : text;
    return { html: '<a href="' + escAttrEnt(cleanUrl(href)) + '">' + escText(text) + "</a>", text, end: i + text.length };
  }
  // email: local@domain.tld
  const em = scanEmail(s, i);
  if (em) {
    return { html: '<a href="mailto:' + escAttrEnt(em.text) + '">' + escText(em.text) + "</a>", text: em.text, end: em.end };
  }
  return null;
}

// During the reference-collection pass, inline rendering is stubbed out.
let collecting = false;

// Per-document "inside an <a> tag" state for the GFM extended-autolink
// suppression (see tryExtendedAutolink). Reset at the start of parse().
let inLink = false;

// Main inline renderer. `refs`: Map<label, {dest,title}> for this document.
// In plain mode the output is the label's plain text (for image alt text):
// no tags, emphasis markers dropped, raw HTML kept as literal text.
function inlineParse(s, refs, plain) {
  if (collecting) return "";
  const n = s.length;
  const nodes = [];
  let i = 0;
  let textStart = 0;
  const flushText = (end) => {
    if (end > textStart) nodes.push({ t: "text", s: s.slice(textStart, end) });
  };
  while (i < n) {
    const c = s[i];
    // --- backslash escape / hard break ---
    if (c === "\\") {
      if (i + 1 < n && s[i + 1] === "\n") {
        // backslash hard break: the following line's leading spaces/tabs
        // are stripped
        flushText(i); nodes.push(plain ? { t: "text", s: "\n" } : { t: "br" });
        i += 2;
        while (i < n && (s[i] === " " || s[i] === "\t")) i++;
        textStart = i; continue;
      }
      if (i + 1 < n && ESCAPABLE.indexOf(s[i + 1]) >= 0) {
        flushText(i);
        nodes.push({ t: "text", s: s[i + 1] });
        i += 2; textStart = i; continue;
      }
      i++; continue;
    }
    // --- code span ---
    if (c === "`") {
      let j = i;
      while (j < n && s[j] === "`") j++;
      const len = j - i;
      let k = j, found = -1;
      while (k < n) {
        if (s[k] === "`") {
          let m = k;
          while (m < n && s[m] === "`") m++;
          if (m - k === len) { found = k; break; }
          k = m;
        } else k++;
      }
      if (found !== -1) {
        flushText(i);
        let content = s.slice(j, found).replace(/\r\n|\r|\n/g, " ");
        if (content.length >= 2 && content[0] === " " && content[content.length - 1] === " " && content.trim() !== "") {
          content = content.slice(1, -1);
        }
        nodes.push(plain ? { t: "text", s: content } : { t: "code", s: content });
        i = found + len; textStart = i; continue;
      }
      i = j; continue;
    }
    // --- emphasis / strikethrough delimiter runs ---
    if (c === "*" || c === "_" || c === "~") {
      let j = i;
      while (j < n && s[j] === c) j++;
      const len = j - i;
      // A tilde run of 3+ is never a delimiter in marked.
      if (c === "~" && len >= 3) { i = j; continue; }
      flushText(i);
      const lf = leftFlanking(s, i, j), rf = rightFlanking(s, i, j);
      let canOpen, canClose;
      if (c === "_") {
        canOpen = lf && (!rf || isPunctCode(i > 0 ? s.charCodeAt(i - 1) : 32));
        canClose = rf && (!lf || isPunctCode(j < n ? s.charCodeAt(j) : 32));
      } else {
        canOpen = lf; canClose = rf;
      }
      if (canOpen || canClose) nodes.push({ t: "delim", ch: c, len, olen: len, canOpen, canClose });
      else nodes.push({ t: "text", s: s.slice(i, j) });
      i = j; textStart = i; continue;
    }
    // --- links / images ---
    if (c === "[" || (c === "!" && i + 1 < n && s[i + 1] === "[")) {
      const isImage = c === "!";
      const r = tryLink(s, i, refs, isImage, plain);
      if (r) {
        flushText(i);
        nodes.push({ t: "html", s: r.html });
        i = r.end; textStart = i; continue;
      }
      i += isImage ? 1 : 1; continue;
    }
    // --- autolink / raw HTML ---
    if (c === "<") {
      // autolink <scheme:...> or <email>
      let m = i + 1;
      let isAuto = false, autoHref = null, autoText = null;
      if (m < n) {
        // scheme
        let k = m;
        if (isAlpha(s.charCodeAt(k))) {
          k++;
          while (k < n && (isAlnum(s.charCodeAt(k)) || s[k] === "+" || s[k] === "-" || s[k] === ".")) k++;
          if (k - m >= 2 && k < n && s[k] === ":" ) {
            let e = k + 1;
            while (e < n && s[e] !== ">" && s[e] !== " " && s[e] !== "\n" && s.charCodeAt(e) >= 32) e++;
            if (e < n && s[e] === ">" && e > k + 1) {
              isAuto = true; autoHref = s.slice(m, e); autoText = autoHref;
            }
          }
        }
        if (!isAuto) {
          // email: [..]@ [..] >
          let e = m;
          while (e < n && s[e] !== ">" && s[e] !== " " && s[e] !== "\n") e++;
          if (e < n && s[e] === ">") {
            const cand = s.slice(m, e);
            if (/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(cand)) {
              isAuto = true; autoHref = "mailto:" + cand; autoText = cand;
            }
          }
        }
      }
      if (isAuto) {
        flushText(i);
        if (plain) nodes.push({ t: "text", s: autoText });
        else nodes.push({ t: "html", s: '<a href="' + escAttrEnt(cleanUrl(autoHref)) + '">' + escText(autoText) + "</a>" });
        i = s.indexOf(">", i) + 1; textStart = i; continue;
      }
      // raw HTML: comment, processing instruction, declaration, CDATA, tag
      let htmlEnd = -1;
      if (s.startsWith("<!--", i)) {
        if (s.startsWith("<!-->", i)) htmlEnd = i + 5;
        else if (s.startsWith("<!--->", i)) htmlEnd = i + 6;
        else {
          const e = s.indexOf("-->", i + 4);
          if (e !== -1) htmlEnd = e + 3;
        }
      } else if (s.startsWith("<?", i)) {
        const e = s.indexOf("?>", i + 2);
        if (e !== -1) htmlEnd = e + 2;
      } else if (s.startsWith("<!", i)) {
        if (s.startsWith("<![CDATA[", i)) {
          const e = s.indexOf("]]>", i + 9);
          if (e !== -1) htmlEnd = e + 3;
        } else {
          const e = s.indexOf(">", i + 2);
          if (e !== -1) htmlEnd = e + 1;
        }
      } else {
        const te = scanHtmlTag(s, i);
        if (te !== -1) htmlEnd = te;
      }
      if (htmlEnd !== -1) {
        // Opening `<a ` (literal space after the "a") sets the inLink
        // state; exactly `</a>` clears it. Other tags, comments, PIs,
        // declarations and CDATA do not touch it.
        if (s[i] === "<" && (s[i + 1] === "a" || s[i + 1] === "A") && s[i + 2] === " ") inLink = true;
        else if (s[i] === "<" && s[i + 1] === "/" && (s[i + 2] === "a" || s[i + 2] === "A") && s[i + 3] === ">") inLink = false;
        flushText(i);
        nodes.push(plain ? { t: "text", s: s.slice(i, htmlEnd) } : { t: "html", s: s.slice(i, htmlEnd) });
        i = htmlEnd; textStart = i; continue;
      }
      i++; continue;
    }
    // --- entity ---
    if (c === "&") {
      if (s[i + 1] === "#") {
        const e = tryEntity(s, i);
        if (e) { flushText(i); nodes.push({ t: "text", s: e[0] }); i += e[1]; textStart = i; continue; }
      } else {
        // Named entity: marked passes any &name; through verbatim.
        let j = i + 1;
        while (j < n && (isAlnum(s.charCodeAt(j)) || s[j] === "_")) j++;
        if (j < n && s[j] === ";" && j > i + 1) {
          flushText(i);
          nodes.push({ t: "html", s: s.slice(i, j + 1) });
          i = j + 1; textStart = i; continue;
        }
      }
      i++; continue;
    }
    // --- hard / soft break ---
    if (c === "\n") {
      // two trailing spaces before newline = hard break
      let k = i - 1, spaces = 0;
      while (k >= textStart && s[k] === " ") { spaces++; k--; }
      if (spaces >= 2) {
        flushText(i - spaces);
        nodes.push(plain ? { t: "text", s: "\n" } : { t: "br" });
        i++;
        // the following line's leading spaces/tabs are stripped
        while (i < n && (s[i] === " " || s[i] === "\t")) i++;
        textStart = i; continue;
      }
      i++; continue; // soft break: newline stays in text
    }
    // --- extended autolink (www. / scheme:// / email) ---
    if (c === "w" || isAlpha(s.charCodeAt(i)) ) {
      const prev = i > 0 ? s.charCodeAt(i - 1) : -1;
      const a = tryExtendedAutolink(s, i, prev);
      if (a) {
        flushText(i);
        nodes.push(plain ? { t: "text", s: a.text } : { t: "html", s: a.html });
        i = a.end; textStart = i; continue;
      }
      i++; continue;
    }
    i++;
  }
  flushText(n);
  return renderNodes(nodes, plain);
}

function renderNodes(nodes, plain) {
  // Resolve emphasis / strikethrough delimiters (CommonMark algorithm):
  // scan closers in document order; each looks back for the nearest
  // matching opener. A partially-used run keeps its leftover characters
  // (before the open tag for openers, after the close tag for closers).
  const delims = [];
  for (const nd of nodes) if (nd.t === "delim") delims.push(nd);
  let di = 0;
  while (di < delims.length) {
    const closer = delims[di];
    if (!closer || closer.len === 0 || closer.gone || !closer.canClose) { di++; continue; }
    let oi = -1;
    for (let j = di - 1; j >= 0; j--) {
      const o = delims[j];
      if (!o || o.len === 0 || o.gone || !o.canOpen || o.ch !== closer.ch) continue;
      // Tilde runs only match runs of the same length (1 or 2).
      if (closer.ch === "~" && o.len !== closer.len) continue;
      // Odd-match rule, on the ORIGINAL run lengths: if either delimiter
      // can both open and close, the sum of the runs must not be a
      // multiple of 3 (unless both are).
      if ((o.canOpen && o.canClose) || (closer.canOpen && closer.canClose)) {
        const sum = o.olen + closer.olen;
        if (sum % 3 === 0 && o.olen % 3 !== 0 && closer.olen % 3 !== 0) continue;
      }
      oi = j; break;
    }
    if (oi === -1) { di++; continue; }
    const opener = delims[oi];
    const use = (opener.len >= 2 && closer.len >= 2) ? 2 : 1;
    const tag = opener.ch === "~" ? "del" : (use === 2 ? "strong" : "em");
    opener.len -= use;
    closer.len -= use;
    // Delimiters strictly between the opener and closer can no longer
    // match anything (they are inside the new emphasis node).
    for (let j = oi + 1; j < di; j++) delims[j].gone = true;
    // opener: leftover delim (if any) stays, then the open tag
    let oiPos = nodes.indexOf(opener);
    if (opener.len > 0) {
      nodes.splice(oiPos + 1, 0, { t: "tag", s: "<" + tag + ">" });
    } else {
      nodes[oiPos] = { t: "tag", s: "<" + tag + ">" };
    }
    // closer: the close tag first, then any leftover delim
    let ciPos = nodes.indexOf(closer);
    if (closer.len > 0) {
      nodes.splice(ciPos, 0, { t: "tag", s: "</" + tag + ">" });
    } else {
      nodes[ciPos] = { t: "tag", s: "</" + tag + ">" };
    }
    // If the closer still has characters left, it may match again.
    if (closer.len === 0) di++;
  }
  // Render: leftover delimiters become literal characters.
  let out = "";
  for (const nd of nodes) {
    if (nd.t === "text") out += escText(nd.s);
    else if (nd.t === "code") out += plain ? escText(nd.s) : "<code>" + escText(nd.s) + "</code>";
    else if (nd.t === "br") out += "<br>";
    else if (nd.t === "html") out += nd.s;
    else if (nd.t === "tag") out += plain ? "" : nd.s;
    else if (nd.t === "delim") out += escText(nd.ch.repeat(nd.len));
  }
  return out;
}

// ============================ BLOCK PARSER ============================
let curEndsNL = true; // does the current document end with a newline?

// Indent of a line in columns (tab stops of 4). Returns {indent, idx}
// where idx is the index of the first non-space/tab character.
function lineInfo(line) {
  let indent = 0, idx = 0;
  const n = line.length;
  while (idx < n) {
    const c = line.charCodeAt(idx);
    if (c === 32) { indent++; idx++; }
    else if (c === 9) { indent += 4 - (indent % 4); idx++; }
    else break;
  }
  return { indent, idx };
}
function isBlank(line) {
  for (let i = 0; i < line.length; i++) {
    const c = line.charCodeAt(i);
    if (c !== 32 && c !== 9) return false;
  }
  return true;
}
// Remove `cols` columns of leading indentation from a line; a tab that
// straddles the boundary becomes spaces. Tabs that survive in the leading
// whitespace run are expanded to spaces using their ORIGINAL column, so a
// later strip sees the same widths marked does. `baseCol` is the column at
// which `line` starts in the source line (0 for a fresh line).
function stripCols(line, cols, baseCol, keepTabs) {
  if (!cols) return line;
  let col = baseCol || 0;
  let indent = 0, idx = 0;
  const n = line.length;
  const target = col + cols;
  while (idx < n && col < target) {
    const c = line.charCodeAt(idx);
    if (c === 32) { col++; indent++; idx++; }
    else if (c === 9) {
      const w = 4 - (col % 4);
      if (col + w > target) return " ".repeat(col + w - target) + expandLeadTabs(line.slice(idx + 1), col + w);
      col += w; indent += w; idx++;
    } else break;
  }
  let rest = line.slice(idx);
  // Code blocks keep a surviving leading tab verbatim (marked preserves it
  // in the code text); list/quote content expands it to spaces so the
  // inner parse sees the same columns.
  if (!keepTabs) rest = expandLeadTabs(rest, col);
  return rest;
}
// Expand tabs in the leading whitespace run of `s` to spaces, using the
// columns they occupy starting at `col`.
function expandLeadTabs(s, col) {
  let i = 0;
  while (i < s.length && (s[i] === " " || s[i] === "\t")) i++;
  if (i === 0) return s;
  let out = "", c = col;
  for (let j = 0; j < i; j++) {
    if (s[j] === " ") { out += " "; c++; }
    else { const w = 4 - (c % 4); out += " ".repeat(w); c += w; }
  }
  return out + s.slice(i);
}

const BLOCK_TAGS = new Set(("address article aside base basefont blockquote body caption center col colgroup dd details dialog dir div dl dt fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 h6 head header hr html iframe legend li link main menu menuitem nav noframes ol optgroup option p param section source summary table tbody td tfoot th thead title tr track ul").split(" "));

// Parse a link reference definition starting at lines[idx].
// The label, destination and title may each span lines, so the text is
// joined from up to 10 following lines.
// Returns {label, dest, title, consumed} (consumed = lines used) or null.
function parseRefDef(lines, idx, end) {
  const line = lines[idx];
  const info = lineInfo(line);
  if (info.indent > 3) return null;
  const s = line.slice(info.idx);
  if (s[0] !== "[") return null;
  // Join this line with up to 10 following lines: the label, destination
  // and title may each span lines.
  let text = s;
  const joinN = Math.min(10, end - idx - 1);
  for (let q = 0; q < joinN; q++) text += "\n" + lines[idx + 1 + q];
  const close = findLinkEnd(text, 0);
  if (close === -1 || close === 1) return null;
  const label = text.slice(1, close);
  if (label.length > 999) return null;
  if (normLabel(label) === "") return null; // a label of only whitespace
  if (hasUnescapedBracket(label)) return null;
  let j = close + 1;
  if (j >= text.length || text[j] !== ":") return null;
  j++;
  const rest = text.slice(j);
  let p = 0;
  const skipSp = () => { while (p < rest.length && (rest[p] === " " || rest[p] === "\t")) p++; };
  skipSp();
  if (rest[p] === "\n") { p++; skipSp(); } // destination on the next line
  let dest = "";
  if (p < rest.length && rest[p] === "<") {
    let k = p + 1;
    while (k < rest.length && rest[k] !== ">" && rest[k] !== "\n") { if (rest[k] === "\\") k++; k++; }
    if (k >= rest.length || rest[k] !== ">") return null;
    dest = rest.slice(p + 1, k);
    p = k + 1;
  } else {
    const start = p;
    while (p < rest.length && rest[p] !== " " && rest[p] !== "\t" && rest[p] !== "\n") {
      if (rest[p] === "\\") p++;
      p++;
    }
    dest = rest.slice(start, p);
    if (dest === "") return null;
  }
  // end of the destination's line
  let destLineEnd = p;
  while (destLineEnd < rest.length && rest[destLineEnd] !== "\n") destLineEnd++;
  // Is there a title? It may sit on the same line (after whitespace) or on
  // the next line. A title on the same line must be valid with nothing
  // after it, or the whole definition is invalid; a title on the next line
  // that is invalid just leaves a destination-only definition.
  let title = null;
  let endPos = destLineEnd;
  let titleOnSameLine = false;
  let titlePos = -1;
  const pBeforeWs = p;
  skipSp();
  const hadWs = p > pBeforeWs;
  if (p < destLineEnd && (rest[p] === '"' || rest[p] === "'" || rest[p] === "(")) {
    if (!hadWs) return null; // no whitespace between dest and title
    titleOnSameLine = true;
    titlePos = p;
  } else if (p < rest.length && rest[p] === "\n") {
    // title may be on the next line; if the next line is not a title, the
    // definition is destination-only and the line stays a paragraph line
    let q = p + 1;
    while (q < rest.length && (rest[q] === " " || rest[q] === "\t")) q++;
    if (q < rest.length && (rest[q] === '"' || rest[q] === "'" || rest[q] === "(")) {
      titlePos = q;
    }
  } else if (p < destLineEnd) {
    return null; // junk after the destination on its line
  }
  if (titlePos >= 0) {
    const q0 = titlePos;
    const q = rest[q0];
    const closeQ = q === "(" ? ")" : q;
    let k = q0 + 1, depth = 0, ok = false;
    while (k < rest.length) {
      if (rest[k] === "\\") { k += 2; continue; }
      if (q === "(" && rest[k] === "(") { depth++; k++; continue; }
      if (rest[k] === closeQ) {
        if (q === "(" && depth > 0) { depth--; k++; continue; }
        ok = true; break;
      }
      // a blank line ends the title
      if (rest[k] === "\n" && rest[k + 1] === "\n") break;
      k++;
    }
    if (!ok) {
      if (titleOnSameLine) return null;
      // next-line title invalid: destination-only definition
      endPos = destLineEnd;
    } else {
      title = rest.slice(q0 + 1, k);
      k++;
      while (k < rest.length && (rest[k] === " " || rest[k] === "\t")) k++;
      if (k < rest.length && rest[k] !== "\n") {
        if (titleOnSameLine) return null;
        // next-line title with junk after it: destination-only
        endPos = destLineEnd;
        title = null;
      } else {
        endPos = k;
      }
    }
  }
  let consumed = 1;
  const upto = j + endPos;
  for (let c = 0; c < upto; c++) if (text[c] === "\n") consumed++;
  dest = decodeInlineRaw(dest);
  if (title !== null) title = decodeInlineRaw(title);
  return { label, dest, title, consumed };
}

// Split a table row line into cells (unescaped pipes separate cells).
function splitTableRow(line) {
  const info = lineInfo(line);
  let s = line.slice(info.idx);
  // strip one leading and one trailing pipe (with surrounding spaces)
  s = s.replace(/^\s*\|/, "").replace(/\|\s*$/, "");
  const cells = [];
  let cur = "", i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length && s[i + 1] === "|") { cur += "|"; i += 2; continue; }
    if (c === "|") { cells.push(cur); cur = ""; i++; continue; }
    cur += c; i++;
  }
  cells.push(cur);
  return cells.map((x) => x.trim());
}
function isTableDelimiter(line) {
  const cells = splitTableRow(line);
  if (cells.length === 0) return null;
  const aligns = [];
  for (const cell of cells) {
    const m = /^:?-+:?$/.exec(cell);
    if (!m) return null;
    aligns.push(cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : cell.startsWith(":") ? "left" : null);
  }
  return aligns;
}

// Render a paragraph's lines (after ref-def extraction) as a block.
// Returns HTML (may be "" if the paragraph was only definitions).
function renderParagraph(paraLines, refs, bare, paraLazy) {
  let lines = paraLines;
  // extract leading link reference definitions
  let idx = 0;
  while (idx < lines.length) {
    const d = parseRefDef(lines, idx, lines.length);
    if (!d) break;
    const key = normLabel(d.label);
    if (!refs.has(key)) refs.set(key, { dest: d.dest, title: d.title });
    idx += d.consumed;
  }
  lines = lines.slice(idx);
  if (lines.length === 0) return "";
  // setext heading: last line is === or ---
  const last = lines[lines.length - 1];
  const li = lineInfo(last);
  const lt = last.slice(li.idx);
  if (lines.length >= 2 && lines[lines.length - 2] !== "" && li.indent <= 3 && !(paraLazy && paraLazy[lines.length - 1]) && (/^=+\s*$/.test(lt) || /^-+\s*$/.test(lt))) {
    const level = lt[0] === "=" ? 1 : 2;
    const content = lines.slice(0, -1).map((x) => x.replace(/^[ \t]+/, "").replace(/[ \t]+$/, ""));
    return "<h" + level + ">" + inlineParse(content.join("\n"), refs) + "</h" + level + ">\n";
  }
  // table: second line is a delimiter row (same cell count as the header)
  if (lines.length >= 2 && lineInfo(lines[1]).indent <= 3) {
    const aligns = isTableDelimiter(lines[1]);
    const headerCells = aligns ? splitTableRow(lines[0]) : null;
    if (aligns && headerCells.length === aligns.length) {
      const ncols = headerCells.length;
      let out = "<table>\n<thead>\n<tr>\n";
      for (let ci = 0; ci < ncols; ci++) {
        const a = aligns[ci];
        out += a ? '<th align="' + a + '">' : "<th>";
        out += inlineParse(headerCells[ci], refs) + "</th>\n";
      }
      out += "</tr>\n</thead>\n<tbody>";
      let hasRows = false;
      for (let r = 2; r < lines.length; r++) {
        if (isBlank(lines[r]) && !isTabTableRow(lines[r])) continue;
        hasRows = true;
        const cells = splitTableRow(lines[r]);
        out += "<tr>\n";
        for (let ci = 0; ci < ncols; ci++) {
          const a = aligns[ci];
          const cell = ci < cells.length ? cells[ci] : "";
          out += a ? '<td align="' + a + '">' : "<td>";
          out += inlineParse(cell, refs) + "</td>\n";
        }
        out += "</tr>\n";
      }
      // with no body rows the <tbody>...</tbody> is omitted entirely
      if (!hasRows) out = out.slice(0, -"<tbody>".length);
      else out += "</tbody>";
      out += "</table>\n";
      return out;
    }
  }
  const text = lines.join("\n");
  const inner = inlineParse(text, refs);
  if (bare) return inner;
  return "<p>" + inner + "</p>\n";
}

function atxHeading(line, info) {
  const s = line.slice(info.idx);
  if (s[0] !== "#") return null;
  let n = 0;
  while (n < s.length && s[n] === "#") n++;
  if (n > 6) return null;
  if (n < s.length && s[n] !== " " && s[n] !== "\t") return null;
  let content = s.slice(n).replace(/[ \t]+$/, "");
  content = content.replace(/[ \t]+#+$/, "");
  content = content.replace(/^[ \t]+/, "");
  return { level: n, content };
}
function hrLine(line, info) {
  const s = line.slice(info.idx);
  const m = /^([*_-])(?:[ \t]*\1){2,}[ \t]*$/.exec(s);
  return !!m;
}
function fenceStart(line, info) {
  const s = line.slice(info.idx);
  const c = s[0];
  if (c !== "`" && c !== "~") return null;
  let n = 0;
  while (n < s.length && s[n] === c) n++;
  if (n < 3) return null;
  const rest = s.slice(n);
  if (c === "`" && rest.indexOf("`") !== -1) return null;
  return { ch: c, len: n, info: rest.trim(), indent: info.indent };
}
// HTML block type for a line (0 = none). Type 1: script/pre/style/textarea
// (ends at the matching closing tag). Types 2-5: comment, PI, declaration,
// CDATA (end at their terminator). Type 6: a block tag start. Type 7: a
// complete open/close tag alone on the line.
function htmlBlockType(line, info) {
  const s = line.slice(info.idx);
  if (s[0] !== "<") return 0;
  if (/^<(script|pre|style|textarea)(\s|>|$)/i.test(s)) return 1;
  if (s.startsWith("<!--")) return 2;
  if (s.startsWith("<?")) return 3;
  if (/^<![a-zA-Z]/.test(s)) return 4;
  if (s.startsWith("<![CDATA[")) return 5;
  const m = /^<\/?([a-zA-Z][a-zA-Z0-9-]*)(\s|\/?>|$)/.exec(s);
  if (m && BLOCK_TAGS.has(m[1].toLowerCase())) return 6;
  // Type 7: a complete open or closing tag alone on the line. The tag
  // must be valid per the inline tag rules (attributes well-formed).
  const te = scanHtmlTag(s, 0);
  if (te !== -1) {
    let k = te;
    while (k < s.length && (s[k] === " " || s[k] === "\t")) k++;
    if (k === s.length) return 7;
  }
  return 0;
}
function htmlBlockEnds(line, type, closeTag) {
  if (type === 1) return line.toLowerCase().indexOf("</" + closeTag) !== -1;
  if (type === 2) return line.indexOf("-->") !== -1;
  if (type === 3) return line.indexOf("?>") !== -1;
  if (type === 4) return line.indexOf(">") !== -1;
  if (type === 5) return line.indexOf("]]>") !== -1;
  return false; // types 6,7 end at blank line
}

function listMarker(line, info) {
  const s = line.slice(info.idx);
  if (info.indent > 3) return null;
  const c = s[0];
  if (c === "-" || c === "+" || c === "*") {
    if (s.length > 1 && s[1] !== " " && s[1] !== "\t") return null;
    return { type: "bullet", marker: c, start: null, markerLen: 1 };
  }
  if (isDigit(s.charCodeAt(0))) {
    let j = 0;
    while (j < s.length && isDigit(s.charCodeAt(j))) j++;
    if (j > 9 || j === 0) return null;
    const d = s[j];
    if (d !== "." && d !== ")") return null;
    if (j + 1 < s.length && s[j + 1] !== " " && s[j + 1] !== "\t") return null;
    return { type: "ordered", marker: d, start: parseInt(s.slice(0, j), 10), markerLen: j + 1 };
  }
  return null;
}

// Does this line start a block that can interrupt a paragraph (and so can
// never be a lazy continuation line)? Setext underlines are excluded: they
// belong to the paragraph.
function startsBlock(line, info) {
  if (info.indent > 3) return false;
  const s = line.slice(info.idx);
  if (atxHeading(line, info) || fenceStart(line, info) || hrLine(line, info)) return true;
  const htype = htmlBlockType(line, info);
  if (htype >= 1 && htype <= 6) return true;
  if (s[0] === ">") return true;
  if (listMarker(line, info)) return true;
  return false;
}

// Is this line a setext heading underline (=== or ---, indent <= 3)?
function isSetextLine(line) {
  const info = lineInfo(line);
  if (info.indent > 3) return false;
  const s = line.slice(info.idx);
  return /^=+\s*$/.test(s) || /^-+\s*$/.test(s);
}

// Can a lazy continuation line follow `line` inside a container? The last
// open block must be a paragraph (or a list whose item holds a paragraph).
// A fence, heading, hr, HTML block, indented code, setext underline or
// table delimiter closes that possibility.
function canLazyContinue(line) {
  let s = line;
  for (let d = 0; d < 8; d++) {
    const info = lineInfo(s);
    if (info.indent <= 3 && s.slice(info.idx)[0] === ">") {
      s = s.slice(info.idx + 1);
      if (s[0] === " " || s[0] === "\t") s = stripCols(s, 1, info.indent + 1);
      continue;
    }
    break;
  }
  const info = lineInfo(s);
  if (info.indent > 3) return false;
  const t = s.slice(info.idx);
  if (t === "") return false;
  if (atxHeading(s, info) || fenceStart(s, info) || hrLine(s, info)) return false;
  const ht = htmlBlockType(s, info);
  if (ht >= 1 && ht <= 6) return false;
  if (isSetextLine(s) || isTableDelimiter(s)) return false;
  return true;
}

// Collect a blockquote starting at lines[i].
// Returns {inner, innerLazy, innerSoft, next}. innerLazy[i] marks lines
// that were lazy continuations (never a setext underline). innerSoft[i]
// marks blank lines inserted by marked's quote quirk (they stay inside a
// paragraph's text instead of splitting it).
//
// Marked's lazy-line quirks (measured against the oracle):
//  - a lazy line may follow only a paragraph-like line, and never inside a
//    fenced code block;
//  - a lazy line with indent >= 4 has 4 columns stripped;
//  - a lazy setext-underline line gets its indent raised to 4, unless the
//    previous line was stripped, in which case 4 columns are stripped;
//  - after a stripped lazy line, a blank line is inserted before the next
//    line, unless that line is a lazy line with indent >= 4 or a setext
//    underline line.
function collectQuote(lines, i, end, lazy) {
  const inner = [];
  const innerLazy = [];
  const innerSoft = [];
  const innerAppend = [];
  let j = i;
  let prevStripped = false; // previous collected line was a stripped lazy line
  let prevIsGT = false; // previous collected line came from a '>' line
  let inList = false; // the quote is currently inside a list item
  let inFence = false, fenceCh = "", fenceLen = 0;
  const pushInner = (text, isLazy, isSoft, isAppend) => {
    inner.push(text); innerLazy.push(isLazy); innerSoft.push(isSoft); innerAppend.push(!!isAppend);
  };
  const maybeSoftBlank = (nextIsStrippable, nextIsSetext) => {
    if (prevStripped && !nextIsStrippable && !nextIsSetext) {
      pushInner("", false, true, false);
    }
  };
  while (j < end) {
    const line = lines[j];
    const info = lineInfo(line);
    if (info.indent <= 3 && line.slice(info.idx)[0] === ">") {
      let rest = line.slice(info.idx + 1);
      if (rest[0] === " " || rest[0] === "\t") rest = stripCols(rest, 1, info.indent + 1);
      const restInfo = lineInfo(rest);
      // a blank '>' line never gets a soft blank before it; it is appended
      // to the paragraph when last if it carries whitespace or the previous
      // line was stripped
      if (rest.trim() !== "") maybeSoftBlank(false, false);
      pushInner(rest, !!(lazy && lazy[j]), false, rest !== "" || prevStripped);
      // track fenced code blocks inside the quote
      if (!inFence) {
        const fs = restInfo.indent <= 3 ? fenceStart(rest, restInfo) : null;
        if (fs) { inFence = true; fenceCh = fs.ch; fenceLen = fs.len; }
      } else {
        const rs = rest.slice(restInfo.idx);
        let n2 = 0;
        while (n2 < rs.length && rs[n2] === fenceCh) n2++;
        if (restInfo.indent <= 3 && n2 >= fenceLen && rs.slice(n2).trim() === "") inFence = false;
      }
      // a '>' line that is a list marker enters a list; a '>' line that
      // starts another block leaves it; other lines leave the state alone
      if (rest.trim() !== "") {
        const lm = listMarker(rest, restInfo);
        if (lm) inList = true;
        else if (restInfo.indent <= 3 && (atxHeading(rest, restInfo) || fenceStart(rest, restInfo) || hrLine(rest, restInfo) || (htmlBlockType(rest, restInfo) >= 1 && htmlBlockType(rest, restInfo) <= 6) || rest.slice(restInfo.idx)[0] === ">")) inList = false;
      }
      prevStripped = false;
      prevIsGT = true;
      j++;
    } else if (inner.length > 0 && inner[inner.length - 1] !== "" && !inFence &&
               canLazyContinue(inner[inner.length - 1]) && !isBlank(line) && !startsBlock(line, info)) {
      // lazy continuation line
      if (inList) {
        // inside a list item a lazy line is kept verbatim (no strip, no
        // soft blank, no setext transformation)
        pushInner(line, true, false, false);
        prevStripped = false;
        prevIsGT = false;
        j++;
        continue;
      }
      const setext = isSetextLine(line);
      const strippable = info.indent >= 4 && (prevIsGT || prevStripped);
      maybeSoftBlank(strippable, setext);
      let text;
      if (setext) {
        // a lazy setext line: stripped when the previous line was stripped
        // or a '>' line with indent >= 4; kept when it follows a '>' line;
        // otherwise padded out to indent 4
        if (prevStripped) { text = stripCols(line, 4); prevStripped = true; }
        else if (prevIsGT && info.indent >= 4) { text = stripCols(line, 4); prevStripped = true; }
        else if (prevIsGT) { text = line; prevStripped = false; }
        else if (info.indent < 4) { text = " ".repeat(4 - info.indent) + line.slice(info.idx); prevStripped = false; }
        else { text = line; prevStripped = false; }
      } else if (strippable) {
        text = stripCols(line, 4);
        prevStripped = true;
      } else {
        text = line;
        prevStripped = false;
      }
      pushInner(text, true, false, false);
      prevIsGT = false;
      j++;
    } else break;
  }
  return { inner, innerLazy, innerSoft, innerAppend, next: j };
}

// Count columns of spaces/tabs at the start of s, starting at column baseCol.
function spaceCols(s, baseCol) {
  let cols = 0, i = 0;
  const base = baseCol || 0;
  while (i < s.length) {
    if (s[i] === " ") { cols++; i++; }
    else if (s[i] === "\t") { cols += 4 - ((base + cols) % 4); i++; }
    else break;
  }
  return { cols, idx: i };
}

// Collect a list starting at lines[i]. Returns {items, next, ordered, start, loose}
// where items is an array of line arrays. `loose` here only covers blank
// lines between items; looseness inside an item is reported by
// parseBlockLines when the item is rendered.
function collectList(lines, i, end, lazy) {
  const first = lines[i];
  const finfo = lineInfo(first);
  const m0 = listMarker(first, finfo);
  const listIndent = finfo.indent;
  // content indent of an item: marker width + following spaces (5+ spaces
  // count as 1), or marker width + 1 for an empty item
  const itemContentIndent = (line, info, marker) => {
    const after = line.slice(info.idx + marker.markerLen);
    const sp = spaceCols(after, info.indent + marker.markerLen);
    if (sp.idx >= after.length) return info.indent + marker.markerLen + 1;
    if (sp.cols >= 5) return info.indent + marker.markerLen + 1;
    return info.indent + marker.markerLen + sp.cols;
  };
  let contentIndent = itemContentIndent(first, finfo, m0);
  let curContentIndent = contentIndent;
  // spaces after the current item's marker (4+ spaces suppress lazy lines)
  let curSpaces = spaceCols(first.slice(finfo.idx + m0.markerLen), listIndent + m0.markerLen).cols;
  const items = [];
  const itemLazy = [];
  let cur = [];
  let curLazy = [];
  let loose = false;
  let inFence = false, fenceCh = "", fenceLen = 0;
  // dedent a lazy continuation line: by contentIndent + 4 when it would
  // otherwise be an indented code block, by contentIndent, by 4, by
  // listIndent + 2, or not at all
  const lazyStrip = (line, info) => {
    const ind = info.indent;
    if (ind >= curContentIndent + 4) return stripCols(line, curContentIndent + 4);
    if (ind >= curContentIndent) return stripCols(line, curContentIndent);
    if (ind >= 4) return stripCols(line, 4);
    if (ind >= listIndent + 2) return stripCols(line, listIndent + 2);
    return line;
  };
  const trackFence = (text) => {
    const fi = lineInfo(text);
    if (!inFence) {
      const fs = fi.indent <= 3 ? fenceStart(text, fi) : null;
      if (fs) { inFence = true; fenceCh = fs.ch; fenceLen = fs.len; }
    } else {
      const rs = text.slice(fi.idx);
      let n2 = 0;
      while (n2 < rs.length && rs[n2] === fenceCh) n2++;
      if (fi.indent <= 3 && n2 >= fenceLen && rs.slice(n2).trim() === "") inFence = false;
    }
  };
  let j = i;
  const flushItem = () => {
    // drop trailing blank lines of the item
    while (cur.length && cur[cur.length - 1] === "") { cur.pop(); curLazy.pop(); }
    items.push(cur);
    itemLazy.push(curLazy);
    cur = [];
    curLazy = [];
  };
  const hasContent = () => cur.some((x) => x !== "");
  // a subsequent item is a sibling iff its indent is below the current
  // item's content indent and at most listIndent + 3
  const isSibling = (info, nm) => nm && info.indent < curContentIndent && info.indent <= listIndent + 3 &&
    ((m0.type === "bullet" && nm.type === "bullet" && nm.marker === m0.marker) ||
     (m0.type === "ordered" && nm.type === "ordered" && nm.marker === m0.marker));
  while (j < end) {
    const line = lines[j];
    if (isBlank(line)) {
      // look ahead for the next non-blank line
      let k = j;
      while (k < end && isBlank(lines[k])) k++;
      if (k >= end) break; // trailing blanks end the list
      const ninfo = lineInfo(lines[k]);
      const nm = listMarker(lines[k], ninfo);
      const isNextItem = isSibling(ninfo, nm);
      if (isNextItem && hrLine(lines[k], ninfo)) break; // hr ends the list
      // After a blank line, an indented line joins the item only if the
      // item already has content (an empty item stays empty).
      if (isNextItem || (ninfo.indent >= curContentIndent && hasContent())) {
        if (isNextItem) loose = true;
        for (let b = 0; b < k - j; b++) { cur.push(""); curLazy.push(false); }
        j = k;
        continue;
      }
      break;
    }
    const info = lineInfo(line);
    const nm = listMarker(line, info);
    const isItem = isSibling(info, nm);
    // Inside a fenced code block, a low-indent line is fence content (even
    // one that looks like a list marker) until the closing fence.
    if (inFence && info.indent < curContentIndent) {
      cur.push(line);
      curLazy.push(!!(lazy && lazy[j]));
      trackFence(line);
      j++;
      continue;
    }
    // A line that is both an item and a thematic break ends the list.
    if (isItem && (items.length || cur.length) && hrLine(line, info)) break;
    if (isItem) {
      if (cur.length || items.length) flushItem();
      curContentIndent = itemContentIndent(line, info, nm);
      const s = line.slice(info.idx);
      const aft = s.slice(nm.markerLen);
      const sp2 = spaceCols(aft, info.indent + nm.markerLen);
      curSpaces = sp2.cols;
      let firstContent;
      if (sp2.idx >= aft.length) firstContent = "";
      else firstContent = stripCols(aft, sp2.cols >= 5 ? 1 : sp2.cols, info.indent + nm.markerLen);
      cur.push(firstContent);
      curLazy.push(!!(lazy && lazy[j]));
      trackFence(firstContent);
      j++;
      continue;
    }
    if (info.indent >= curContentIndent) {
      // a line at or beyond the content indent: a content line, unless it
      // follows a paragraph-like line and (once dedented) starts no new
      // block, in which case it is a lazy continuation
      const stripped = stripCols(line, curContentIndent);
      const sInfo = lineInfo(stripped);
      if (!inFence && sInfo.indent <= 3 && !startsBlock(stripped, sInfo) && cur.length && cur[cur.length - 1] !== "" && canLazyContinue(cur[cur.length - 1])) {
        cur.push(lazyStrip(line, info));
        curLazy.push(true);
        j++;
        continue;
      }
      cur.push(stripped);
      curLazy.push(!!(lazy && lazy[j]));
      trackFence(stripped);
      j++;
      continue;
    }
    // lazy paragraph continuation inside the current item: only after a
    // paragraph-like line, never inside a fenced code block, and never
    // when the item has 4+ spaces after its marker
    if (curSpaces < 4 && !inFence && cur.length && cur[cur.length - 1] !== "" && canLazyContinue(cur[cur.length - 1]) && !isBlank(line) && !startsBlock(line, info)) {
      cur.push(lazyStrip(line, info));
      curLazy.push(true);
      j++;
      continue;
    }
    break;
  }
  if (cur.length || items.length === 0) flushItem();
  return { items, itemLazy, next: j, ordered: m0.type === "ordered", start: m0.start, loose, marker: m0.marker };
}

// Index of the first line of a paragraph that is not a link reference
// definition (definitions are skipped, as renderParagraph does).
function paraContentStart(para) {
  let idx = 0;
  while (idx < para.length) {
    const d = parseRefDef(para, idx, para.length);
    if (!d) break;
    idx += d.consumed;
  }
  return idx;
}

// A whitespace-only line that is a table row, not a blank line: it must
// contain a tab and its total indent must be exactly 4 columns (a lone
// `\t`, ` \t`, `  \t` or `   \t`). Lines of only spaces, or tabs
// totalling any other indent, are blank and end the table.
function isTabTableRow(line) {
  if (!isBlank(line)) return false;
  if (line.indexOf("\t") === -1) return false;
  return lineInfo(line).indent === 4;
}
function parseBlockLines(lines, start, end, refs, bare, tailNL, lazy, soft, append, forcePara, inList) {
  const isLazy = (idx) => !!(lazy && lazy[idx]);
  const isSoft = (idx) => !!(soft && soft[idx]);
  // A blank line is appended to an open paragraph when it is the last line
  // and the text does not end with a newline; when an append array is
  // given (blockquote inner lines) only flagged lines are appended.
  const isAppend = (idx) => append ? !!append[idx] : true;
  let out = "";
  let i = start;
  let para = null;
  let paraLazy = null;
  let paraIsTable = false;
  // looseness: true if two blocks at this level are separated by a blank
  // line (blank lines inside nested lists/fences do not reach this level)
  let loose = false, hasBlock = false, blankPending = false;
  const startBlock = () => {
    if (blankPending) loose = true;
    blankPending = false;
    hasBlock = true;
  };
  const flushPara = () => {
    if (para) { out += renderParagraph(para, refs, bare, paraLazy); para = null; paraLazy = null; paraIsTable = false; }
  };
  while (i < end) {
    const line = lines[i];
    const info = lineInfo(line);
    // A blank line inserted by the blockquote quirk stays inside the
    // paragraph's text instead of splitting it.
    if (isBlank(line) && isSoft(i)) {
      if (para) { para.push(line); paraLazy.push(isLazy(i)); }
      i++; continue;
    }
    // A whitespace-only line that is the last line (and the text does not
    // end with a newline) is a paragraph continuation line, not a blank.
    if (isBlank(line)) {
      if (para && i === end - 1 && !tailNL && isAppend(i)) { para.push(line); paraLazy.push(isLazy(i)); i++; continue; }
      // A tab-indented whitespace-only line is a table row, not a blank
      // line, when the open paragraph is a table.
      if (para && isTabTableRow(line) && paraIsTable) { para.push(line); paraLazy.push(isLazy(i)); i++; continue; }
      if (hasBlock) blankPending = true;
      flushPara(); i++; continue;
    }
    const s = line.slice(info.idx);
    // a forced first line (task list item) is a paragraph line, never a
    // block start
    if (forcePara && i === start && !isBlank(line)) {
      startBlock();
      para = [line]; paraLazy = [isLazy(i)];
      i++; continue;
    }
    if (para) {
      // A lazy continuation line never interrupts the paragraph (it is a
      // paragraph continuation even if it looks like a list marker, a
      // setext underline, or a table delimiter).
      if (isLazy(i)) { para.push(line); paraLazy.push(true); i++; continue; }
      // setext heading line? A line following a blank line can never be
      // one, nor a line whose paragraph is only link reference definitions.
      if (info.indent <= 3 && para[para.length - 1] !== "" && paraContentStart(para) < para.length && (/^=+\s*$/.test(s) || /^-+\s*$/.test(s))) {
        para.push(line); paraLazy.push(isLazy(i)); flushPara(); i++; continue;
      }
      // table delimiter line (turns the paragraph into a table). If the
      // paragraph already has 2+ lines, only its last line is the header:
      // the earlier lines are flushed as a paragraph first.
      if (!paraIsTable && info.indent <= 3 && isTableDelimiter(line)) {
        if (para.length >= 2) {
          const lastLine = para.pop(); const lastFlag = paraLazy.pop();
          flushPara();
          para = [lastLine, line]; paraLazy = [lastFlag, isLazy(i)];
        } else {
          para.push(line); paraLazy.push(isLazy(i));
        }
        paraIsTable = true; i++; continue;
      }
      // A table row line that starts a new block (heading, fence, hr, HTML
      // block, quote, list marker, indented code) ends the table; a
      // setext-looking line (===) is just another row.
      if (paraIsTable) {
        const atx2 = info.indent <= 3 ? atxHeading(line, info) : null;
        const fence2 = info.indent <= 3 ? fenceStart(line, info) : null;
        const htype2 = info.indent <= 3 ? htmlBlockType(line, info) : 0;
        const lm2 = listMarker(line, info);
        const endsTable = info.indent >= 4 || atx2 || fence2 ||
          (info.indent <= 3 && hrLine(line, info)) || (htype2 >= 1 && htype2 <= 6) ||
          (info.indent <= 3 && s[0] === ">") || !!lm2;
        if (endsTable) { flushPara(); continue; }
        para.push(line); paraLazy.push(isLazy(i)); i++; continue;
      }
      // interrupting block starts
      const atx = info.indent <= 3 ? atxHeading(line, info) : null;
      const fence = info.indent <= 3 ? fenceStart(line, info) : null;
      const htype = info.indent <= 3 ? htmlBlockType(line, info) : 0;
      const lm = listMarker(line, info);
      let interrupts = false;
      if (atx || fence || (info.indent <= 3 && hrLine(line, info))) interrupts = true;
      else if (htype >= 1 && htype <= 6) interrupts = true;
      else if (info.indent <= 3 && s[0] === ">") interrupts = true;
      else if (lm) {
        // A list interrupts a paragraph only if its first item is
        // non-empty (and, for ordered lists, starts at 1) — except
        // inside a list item, where an ordered list interrupts
        // regardless of its start number.
        const aft = s.slice(lm.markerLen);
        interrupts = aft.trim() !== "" && (lm.type === "bullet" || lm.start === 1 || inList);
      }
      if (interrupts) { flushPara(); continue; }
      para.push(line); paraLazy.push(isLazy(i)); i++; continue;
    }
    // no paragraph open: dispatch on block start
    if (info.indent <= 3) {
      const atx = atxHeading(line, info);
      if (atx) {
        startBlock();
        out += "<h" + atx.level + ">" + inlineParse(atx.content, refs) + "</h" + atx.level + ">\n";
        i++; continue;
      }
      const fence = fenceStart(line, info);
      if (fence) {
        startBlock();
        const content = [];
        let j = i + 1;
        while (j < end) {
          const l2 = lines[j];
          const i2 = lineInfo(l2);
          const s2 = l2.slice(i2.idx);
          if (i2.indent <= 3 && s2[0] === fence.ch) {
            let n2 = 0;
            while (n2 < s2.length && s2[n2] === fence.ch) n2++;
            if (n2 >= fence.len && s2.slice(n2).trim() === "") break;
          }
          content.push(stripCols(l2, fence.indent, 0, true));
          j++;
        }
        const lang = decodeInlineRaw(fence.info.split(/\s+/)[0]);
        // a fenced code block drops exactly one trailing blank line
        if (content.length && content[content.length - 1] === "") content.pop();
        const text = content.length ? content.join("\n") + "\n" : "";
        out += "<pre><code" + (lang ? ' class="language-' + escAttrEnt(lang) + '"' : "") + ">" +
          escText(text) + "</code></pre>\n";
        i = j + (j < end ? 1 : 0);
        continue;
      }
      if (hrLine(line, info)) { startBlock(); out += "<hr>\n"; i++; continue; }
      const htype = htmlBlockType(line, info);
      if (htype) {
        startBlock();
        const closeTag = htype === 1 ? s.slice(1).match(/^(script|pre|style|textarea)/i)[1].toLowerCase() : null;
        const hlines = [line];
        let j = i + 1;
        let done = htype >= 1 && htype <= 5 && htmlBlockEnds(line, htype, closeTag);
        while (!done && j < end) {
          const l2 = lines[j];
          if ((htype === 6 || htype === 7) && isBlank(l2)) break;
          hlines.push(l2);
          j++;
          if (htype >= 1 && htype <= 5 && htmlBlockEnds(l2, htype, closeTag)) done = true;
        }
        out += hlines.join("\n");
        if ((j < end && !isBlank(lines[j])) || (j >= end && tailNL)) out += "\n";
        i = j;
        continue;
      }
      if (s[0] === ">") {
        startBlock();
        const q = collectQuote(lines, i, end, lazy);
        const inner = parseBlockLines(q.inner, 0, q.inner.length, refs, false, false, q.innerLazy, q.innerSoft, q.innerAppend)[0];
        out += "<blockquote>\n" + inner + "</blockquote>\n";
        i = q.next;
        continue;
      }
      const lm = listMarker(line, info);
      if (lm) {
        startBlock();
        const lst = collectList(lines, i, end, lazy);
        const tag = lst.ordered ? "ol" : "ul";
        out += "<" + tag + (lst.ordered && lst.start !== 1 ? ' start="' + lst.start + '"' : "") + ">\n";
        // task list items: a first line "[ ]" / "[x]" / "[X]" followed by a
        // space/tab and content becomes a checkbox; the first line is then
        // forced to be a paragraph line (no block start after the marker)
        const tasks = [];
        const itemLines = [];
        for (let it = 0; it < lst.items.length; it++) {
          const item = lst.items[it];
          let task = null;
          let lines2 = item;
          if (item.length) {
            const m = item[0].match(/^\[( |x|X)\][ \t]/);
            if (m) {
              const rest = item[0].slice(m[0].length).replace(/^[ \t]+/, "");
              if (rest !== "") {
                task = m[1] !== " ";
                lines2 = [" " + rest].concat(item.slice(1));
              }
            }
          }
          tasks.push(task);
          itemLines.push(lines2);
        }
        // parse items tight first; a loose item (or inter-item blanks)
        // makes the whole list loose, so re-render with <p> wrappers.
        // The tight pass is discarded when loose, so its inLink changes
        // must not leak into the loose pass: restore the saved state.
        const bodies = [];
        let listLoose = lst.loose;
        const savedInLink = inLink;
        for (let it = 0; it < lst.items.length; it++) {
          const [body, itemLoose] = parseBlockLines(itemLines[it], 0, itemLines[it].length, refs, true, false, lst.itemLazy[it], undefined, undefined, tasks[it] !== null, true);
          bodies.push(body);
          if (itemLoose) listLoose = true;
        }
        if (listLoose) {
          inLink = savedInLink;
          for (let it = 0; it < lst.items.length; it++) {
            bodies[it] = parseBlockLines(itemLines[it], 0, itemLines[it].length, refs, false, false, lst.itemLazy[it], undefined, undefined, tasks[it] !== null, true)[0];
          }
        }
        for (let it = 0; it < lst.items.length; it++) {
          let body = bodies[it];
          if (tasks[it] !== null) {
            const cb = tasks[it] ? '<input checked="" disabled="" type="checkbox">' : '<input disabled="" type="checkbox">';
            body = body.startsWith("<p>") ? "<p>" + cb + body.slice(3) : cb + body;
          }
          out += "<li>" + body + "</li>\n";
        }
        out += "</" + tag + ">\n";
        i = lst.next;
        continue;
      }
    }
    if (info.indent >= 4) {
      // indented code block
      startBlock();
      const content = [];
      let j = i;
      while (j < end) {
        const l2 = lines[j];
        const i2 = lineInfo(l2);
        if (i2.indent >= 4) { content.push(stripCols(l2, 4, 0, true)); j++; continue; }
        if (isBlank(l2)) {
          let k = j;
          while (k < end && isBlank(lines[k])) k++;
          if (k < end && lineInfo(lines[k]).indent >= 4) {
            for (let b = 0; b < k - j; b++) content.push("");
            j = k; continue;
          }
        }
        break;
      }
      while (content.length && content[content.length - 1] === "") content.pop();
      const text = content.length ? content.join("\n") + "\n" : "";
      out += "<pre><code>" + escText(text) + "</code></pre>\n";
      i = j;
      continue;
    }
    // otherwise: start a paragraph
    startBlock();
    para = [line];
    paraLazy = [isLazy(i)];
    i++;
  }
  flushPara();
  return [out, loose];
}

export function parse(markdown) {
  curEndsNL = markdown.endsWith("\n");
  inLink = false;
  const src = markdown.replace(/\r\n?/g, "\n");
  const refs = new Map();
  let lines = src.split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  // Pass 1: collect link reference definitions from the whole document
  // (they may be defined after the paragraph that uses them).
  collecting = true;
  parseBlockLines(lines, 0, lines.length, refs, false, curEndsNL);
  collecting = false;
  return parseBlockLines(lines, 0, lines.length, refs, false, curEndsNL)[0];
}
