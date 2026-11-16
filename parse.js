// parse.js — a fast, dependency-free drop-in for marked 18.1.3 (default options).
// Written from scratch against the CommonMark 0.31.2 / GFM 0.29 specs and the
// practice set; marked itself is used only as a black-box oracle for diffing.
export function parse(markdown) {
  return new Parser(markdown).run();
}

// ---------- character helpers ----------
const SPACE = 32, TAB = 9, LF = 10, CR = 13;
function isSpace(c) { return c === SPACE || c === TAB || c === LF || c === CR || c === 11 || c === 12; }
function isBlankStr(s) { for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c !== SPACE && c !== TAB) return false; } return true; }
function isAlnum(c) {
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) ||
    (c > 127 && /\p{L}|\p{N}/u.test(String.fromCodePoint(c)));
}
function isPunct(c) {
  // ASCII punctuation only (CommonMark backslash escapes are ASCII-only).
  return (c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126);
}
// Unicode punctuation for emphasis flanking: ASCII punctuation plus any
// character in the Unicode P (punctuation) or S (symbol) categories.
function isFlankPunct(c) {
  if (c < 128) return isPunct(c);
  return /[\p{P}\p{S}]/u.test(String.fromCharCode(c));
}
function isDigit(c) { return c >= 48 && c <= 57; }
function isHex(c) { return (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102); }
function isWordChar(c) { return isAlnum(c) || c === 95; } // alnum or _

// HTML escaping
const ESC = { 34: '&quot;', 38: '&amp;', 39: '&#39;', 60: '&lt;', 62: '&gt;' };
// Escape a value for an HTML attribute, preserving entity references
// (&name; / &#num; / &#xhex;) verbatim and escaping other & as &amp;.
function escapeAttr(s) {
  let out = '', last = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 38) {
      const e = decodeEntity(s, i);
      if (e) { out += s.slice(last, i) + s.slice(i, e[1]); last = e[1]; i = e[1] - 1; continue; }
      out += s.slice(last, i) + '&amp;'; last = i + 1; continue;
    }
    const esc = ESC[c];
    if (esc) { out += s.slice(last, i) + esc; last = i + 1; }
  }
  return last === 0 ? s : out + s.slice(last);
}

function escapeHtml(s) {
  let out = '', last = 0;
  for (let i = 0; i < s.length; i++) {
    const e = ESC[s.charCodeAt(i)];
    if (e) { out += s.slice(last, i) + e; last = i + 1; }
  }
  return last === 0 ? s : out + s.slice(last);
}

// ---------- HTML entities ----------
// Named entities used by the spec examples and the generator's pool, plus a
// broad set of common ones. Numeric references are handled separately.
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '\u00a9',
  reg: '\u00ae', hellip: '\u2026', mdash: '\u2014', ndash: '\u2013', lsquo: '\u2018',
  rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d', laquo: '\u00ab', raquo: '\u00bb',
  frac34: '\u00be', frac12: '\u00bd', frac14: '\u00bc', auml: '\u00e4', ouml: '\u00f6',
  uuml: '\u00fc', AElig: '\u00c6', aelig: '\u00e6', Dcaron: '\u010e', dcaron: '\u010f',
  DifferentialD: '\u2146', HilbertSpace: '\u210b', ClockwiseContourIntegral: '\u2232',
  ngE: '\u2267\u0338', not: '\u00ac', micro: '\u00b5', para: '\u00b6', sect: '\u00a7',
  deg: '\u00b0', plusmn: '\u00b1', times: '\u00d7', divide: '\u00f7', minus: '\u2212',
  middot: '\u00b7', bull: '\u2022', dagger: '\u2020', Dagger: '\u2021', permil: '\u2030',
  prime: '\u2032', Prime: '\u2033', oline: '\u203e', frasl: '\u2044', euro: '\u20ac',
  pound: '\u00a3', yen: '\u00a5', cent: '\u00a2', curren: '\u00a4', brvbar: '\u00a6',
  uml: '\u00a8', ordf: '\u00aa', ordm: '\u00ba', iexcl: '\u00a1', iquest: '\u00bf',
  szlig: '\u00df', agrave: '\u00e0', aacute: '\u00e1', acirc: '\u00e2', atilde: '\u00e3',
  aring: '\u00e5', aogon: '\u0105', aelig2: '\u00e6', ccedil: '\u00e7', egrave: '\u00e8',
  eacute: '\u00e9', ecirc: '\u00ea', euml: '\u00eb', igrave: '\u00ec', iacute: '\u00ed',
  icirc: '\u00ee', iuml: '\u00ef', eth: '\u00f0', ntilde: '\u00f1', ograve: '\u00f2',
  oacute: '\u00f3', ocirc: '\u00f4', otilde: '\u00f5', oslash: '\u00f8', ugrave: '\u00f9',
  uacute: '\u00fa', ucirc: '\u00fb', yacute: '\u00fd', thorn: '\u00fe', yuml: '\u00ff',
  Agrave: '\u00c0', Aacute: '\u00c1', Acirc: '\u00c2', Atilde: '\u00c3', Aring: '\u00c5',
  Auml: '\u00c4', Ccedil: '\u00c7', Egrave: '\u00c8', Eacute: '\u00c9', Ecirc: '\u00ca',
  Euml: '\u00cb', Igrave: '\u00cc', Iacute: '\u00cd', Icirc: '\u00ce', Iuml: '\u00cf',
  Ntilde: '\u00d1', Ograve: '\u00d2', Oacute: '\u00d3', Ocirc: '\u00d4', Otilde: '\u00d5',
  Ouml: '\u00d6', Oslash: '\u00d8', Ugrave: '\u00d9', Uacute: '\u00da', Ucirc: '\u00db',
  Uuml: '\u00dc', Yacute: '\u00dd', THORN: '\u00de', Yuml: '\u0178', OElig: '\u0152',
  oelig: '\u0153', Scaron: '\u0160', scaron: '\u0161', Yuml2: '\u0178', fnof: '\u0192',
  Alpha: '\u0391', Beta: '\u0392', Gamma: '\u0393', Delta: '\u0394', Epsilon: '\u0395',
  Zeta: '\u0396', Eta: '\u0397', Theta: '\u0398', Iota: '\u0399', Kappa: '\u039a',
  Lambda: '\u039b', Mu: '\u039c', Nu: '\u039d', Xi: '\u039e', Omicron: '\u039f',
  Pi: '\u03a0', Rho: '\u03a1', Sigma: '\u03a3', Tau: '\u03a4', Upsilon: '\u03a5',
  Phi: '\u03a6', Chi: '\u03a7', Psi: '\u03a8', Omega: '\u03a9', alpha: '\u03b1',
  beta: '\u03b2', gamma: '\u03b3', delta: '\u03b4', epsilon: '\u03b5', zeta: '\u03b6',
  eta: '\u03b7', theta: '\u03b8', iota: '\u03b9', kappa: '\u03ba', lambda: '\u03bb',
  mu: '\u03bc', nu: '\u03bd', xi: '\u03be', omicron: '\u03bf', pi: '\u03c0',
  rho: '\u03c1', sigmaf: '\u03c2', sigma: '\u03c3', tau: '\u03c4', upsilon: '\u03c5',
  phi: '\u03c6', chi: '\u03c7', psi: '\u03c8', omega: '\u03c9', thetasym: '\u03d1',
  upsih: '\u03d2', piv: '\u03d6', ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009',
  zwnj: '\u200c', zwj: '\u200d', lrm: '\u200e', rlm: '\u200f', sbquo: '\u201a',
  bdquo: '\u201e', dagger2: '\u2020', circ: '\u02c6', tilde: '\u02dc', lsaquo: '\u2039',
  rsaquo: '\u203a', trade: '\u2122', hearts: '\u2665', diams: '\u2666', clubs: '\u2663',
  spades: '\u2660', loz: '\u25ca',larr: '\u2190', uarr: '\u2191', rarr: '\u2192',
  darr: '\u2193', harr: '\u2194', crarr: '\u21b5', lArr: '\u21d0', uArr: '\u21d1',
  rArr: '\u21d2', dArr: '\u21d3', hArr: '\u21d4', forall: '\u2200', part: '\u2202',
  exist: '\u2203', empty: '\u2205', nabla: '\u2207', isin: '\u2208', notin: '\u2209',
  ni: '\u220b', prod: '\u220f', sum: '\u2211', lowast: '\u2217', radic: '\u221a',
  prop: '\u221d', infin: '\u221e', ang: '\u2220', and: '\u2227', or: '\u2228',
  cap: '\u2229', cup: '\u222a', int: '\u222b', there4: '\u2234', sim: '\u223c',
  cong: '\u2245', asymp: '\u2248', ne: '\u2260', equiv: '\u2261', le: '\u2264',
  ge: '\u2265', sub: '\u2282', sup: '\u2283', nsub: '\u2284', sube: '\u2286',
  supe: '\u2287', oplus: '\u2295', otimes: '\u2297', perp: '\u22a5', sdot: '\u22c5',
  lceil: '\u2308', rceil: '\u2309', lfloor: '\u230a', rfloor: '\u230b', lang: '\u2329',
  rang: '\u232a', amp2: '&', hellip2: '\u2026',
};

// Decode an entity starting at s[i] === '&'. Returns [decodedString, nextIndex]
// or null if there is no valid entity here.
function decodeEntity(s, i) {
  const n = s.length;
  if (i + 1 >= n) return null;
  const c1 = s.charCodeAt(i + 1);
  if (c1 === 35) { // #
    let j = i + 2, hex = false, num = 0, digits = 0;
    if (j < n && (s.charCodeAt(j) === 120 || s.charCodeAt(j) === 88)) { hex = true; j++; }
    const start = j;
    while (j < n) {
      const c = s.charCodeAt(j);
      if (hex ? isHex(c) : isDigit(c)) { num = num * (hex ? 16 : 10) + (c >= 48 && c <= 57 ? c - 48 : (c | 32) - 87); digits++; j++; }
      else break;
    }
    if (digits === 0 || j >= n || s.charCodeAt(j) !== 59) return null;
    // Code point 0 and surrogates decode to U+FFFD; above 0x10FFFF the
    // reference is literal text.
    if (num > 0x10FFFF) return null;
    if (num === 0 || (num >= 0xD800 && num <= 0xDFFF)) return ['\uFFFD', j + 1];
    return [String.fromCodePoint(num), j + 1];
  }
  // Named entity: marked passes through any &<alphanumerics>; verbatim,
  // whether or not it is a defined entity.
  if (!((c1 >= 65 && c1 <= 90) || (c1 >= 97 && c1 <= 122) || (c1 >= 48 && c1 <= 57))) return null;
  let j = i + 1;
  while (j < n && j < i + 33) {
    const c = s.charCodeAt(j);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57)) j++;
    else break;
  }
  if (j >= n || s.charCodeAt(j) !== 59) return null;
  return [s.slice(i, j + 1), j + 1];
}

// ---------- line helpers ----------
// A line is processed with a column cursor: { s: remaining text, col: column of s[0] }.
// indentColsOf returns the width (in columns) of the leading whitespace; a tab
// advances to the next multiple of 4 from the absolute starting column.
function indentColsOf(s, startCol) {
  let cols = 0, i = 0, col = startCol || 0;
  while (i < s.length) {
    const c = s.charCodeAt(i);
    if (c === 32) { cols++; col++; i++; }
    else if (c === 9) { const w = 4 - (col % 4); cols += w; col += w; i++; }
    else break;
  }
  return { cols, chars: i };
}
// Remove n columns from the start of the line object; a straddling tab becomes
// spaces. Any character counts as one column (tabs advance to the next stop).
function stripCols(line, n) {
  let s = line.s, col = line.col;
  while (n > 0 && s.length) {
    const c = s.charCodeAt(0);
    if (c === 9) {
      const w = 4 - (col % 4);
      if (w <= n) { s = s.slice(1); col += w; n -= w; }
      else { s = ' '.repeat(w - n) + s.slice(1); col += n; n = 0; }
    } else { s = s.slice(1); col++; n--; }
  }
  line.s = s; line.col = col;
}
// Expand tabs in a string to spaces, given the starting column of s[0].
function expandTabs(s, startCol) {
  if (!s.includes('\t')) return s;
  let out = '', col = startCol;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\t') { const w = 4 - (col % 4); out += ' '.repeat(w); col += w; }
    else { out += ch; col++; }
  }
  return out;
}
// Expand tabs in the leading whitespace of a string only (content tabs kept).
function expandLeadingTabs(s) {
  let i = 0, col = 0, out = '';
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ') { out += ' '; col++; i++; }
    else if (ch === '\t') { const w = 4 - (col % 4); out += ' '.repeat(w); col += w; i++; }
    else break;
  }
  return out + s.slice(i);
}
// Same, but the string starts at the given absolute column.
function expandLeadingTabsAt(s, startCol) {
  let i = 0, col = startCol || 0, out = '';
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ') { out += ' '; col++; i++; }
    else if (ch === '\t') { const w = 4 - (col % 4); out += ' '.repeat(w); col += w; i++; }
    else break;
  }
  return out + s.slice(i);
}

// ---------- block parser ----------
class Parser {
  constructor(src) {
    this.lines = src.replace(/\r\n?/g, '\n').split('\n');
    // A trailing newline produces a final empty element that is not a line.
    if (this.lines.length > 1 && this.lines[this.lines.length - 1] === '') this.lines.pop();
    this.refs = new Map();
    this.root = { t: 'document', children: [] };
    this.pendingBlank = false;
  }

  run() {
    this.parseBlocks();
    return renderDoc(this.root, this.refs);
  }

  // Current open container stack (root first). The last element is the deepest
  // open container; the leaf (paragraph etc.) is stored separately as this.leaf.
  parseBlocks() {
    const lines = this.lines;
    const root = this.root;
    let stack = [root]; // containers: document, blockquote, list, item
    let leaf = null;    // current leaf block (paragraph, code, html, heading...) or null
    let leafContainer = null; // the container that holds the leaf (deepest container)
    let lastLineBlank = false;
    let i = 0;
    while (i < lines.length) {
      const raw = lines[i];
      // ---- Phase 1: match open containers ----
      const line = { s: raw, col: 0 };
      let matched = 0; // stack levels matched (index into stack; stack[0]=root always matches)
      let strippedCols = 0;
      let failedAt = -1;
      for (let k = 1; k < stack.length; k++) {
        const b = stack[k];
        if (b.t === 'blockquote') {
          const ind = indentColsOf(line.s, line.col);
          if (ind.cols <= 3 && line.s.charAt(ind.chars) === '>') {
            const before = line.col;
            stripCols(line, ind.cols + 1);
            if (line.s.charAt(0) === ' ' || line.s.charAt(0) === '\t') stripCols(line, 1);
            strippedCols += line.col - before;
            matched = k;
          } else { failedAt = k; break; }
        } else if (b.t === 'item') {
          if (isBlankStr(line.s)) { matched = k; }
          else {
            const ind = indentColsOf(line.s, line.col);
            if (ind.cols >= b.contentIndent) {
              const before = line.col;
              stripCols(line, b.contentIndent);
              strippedCols += line.col - before;
              matched = k;
            } else { failedAt = k; break; }
          }
        } else { matched = k; } // list always matches
      }
      const allMatched = failedAt === -1;
      // A line is blank if it is empty after container stripping, or if it
      // is whitespace-only and the raw line was also whitespace-only
      // (a ">  " line leaves a space of paragraph content, not a blank).
      const blank = line.s === '' || (isBlankStr(line.s) && isBlankStr(raw));
      // A blank line matches every container (it ends paragraphs but keeps containers open).
      const container = allMatched ? stack[stack.length - 1] : stack[matched];

      // ---- Phase 2: close unmatched containers / leaves ----
      if (!allMatched && !blank) {
        // If the current leaf is a paragraph and the line does not start a block
        // that can interrupt a paragraph, this line is a lazy continuation.
        // A list marker line inside a list always ends the item's paragraph
        // (it starts a new item or a new list), even if it is empty or an
        // ordered list not starting with 1.
        const inList = stack.some((b) => b.t === 'list');
        const isListMarker = inList && parseListMarker(line.s, indentColsOf(line.s, line.col)) !== null;
        const isLazyPara = leaf && leaf.t === 'paragraph' && !startsInterruptBlock(line.s) && !isListMarker;
        if (!isLazyPara) {
          // Close the leaf and any containers deeper than `matched`.
          if (leaf) {
            // An HTML block closed because the next line left its container
            // does not get a trailing newline.
            if (leaf.t === 'html') leaf.noTrail = true;
            this.finalizeLeaf(leaf, stack); leaf = null;
          }
          while (stack.length > matched + 1) stack.pop();
        }
      }
      if (blank) {
        if (leaf && leaf.t === 'paragraph') { this.finalizeLeaf(leaf, stack); leaf = null; }
        else if (leaf && leaf.t === 'html') {
          if (leaf.htmlType === 6 || leaf.htmlType === 7) {
            // An HTML block ending at a blank line has no trailing newline.
            leaf.noTrail = true; this.finalizeLeaf(leaf, stack); leaf = null;
          }
          else if (matched === stack.length - 1) leaf.lines.push('');
          else { leaf.noTrail = true; this.finalizeLeaf(leaf, stack); leaf = null; }
        } else if (leaf && leaf.t === 'code') {
          // A blank line inside the code block's container continues it;
          // outside the container it ends the block.
          if (matched === stack.length - 1) {
            if (!leaf.fenced) {
              // Indented code: a whitespace-only line keeps its indent minus 4.
              const ind = indentColsOf(line.s, line.col);
              if (ind.cols >= 4) {
                const l2 = { s: line.s, col: line.col };
                stripCols(l2, 4);
                leaf.lines.push(l2.s);
              } else leaf.lines.push('');
            } else {
              // Fenced code: preserve the line, minus the fence indent.
              let content = line.s;
              if (leaf.fenceIndent > 0) {
                const ind = indentColsOf(content, line.col);
                if (ind.cols > 0) {
                  const l2 = { s: content, col: line.col };
                  stripCols(l2, Math.min(leaf.fenceIndent, ind.cols));
                  content = l2.s;
                }
              }
              leaf.lines.push(content);
            }
          } else { this.finalizeLeaf(leaf, stack); leaf = null; }
        }
        // A blank line between blocks makes the enclosing list loose.
        this.pendingBlank = true;
        lastLineBlank = true;
        // A truly blank line (no container marker) closes any blockquote it
        // fails to match; a following ">" line starts a new blockquote.
        if (failedAt !== -1 && stack[failedAt] && stack[failedAt].t === 'blockquote') {
          while (stack.length > failedAt) stack.pop();
        }
        // An empty list item (marker only, no content yet) is closed by a
        // blank line; later indented lines are not part of it.
        {
          const top = stack[stack.length - 1];
          if (top && top.t === 'item' && top.children.length === 0) stack.pop();
        }
        i++;
        continue;
      }
      lastLineBlank = false;

      // ---- Phase 3: leaf continuation or new block start ----
      // If a leaf is open and the line continues it, handle it.
      if (leaf) {
        this.pendingBlank = false;
        if (leaf.t === 'paragraph') {
          // Setext heading check (only if the paragraph has non-def content).
          const se = setextLevel(line.s);
          if (se && !allMatched) { /* lazy setext not allowed; treat as text */ }
          if (se && allMatched) {
            const { defs, rest } = extractDefs(leaf.lines, this.refs);
            if (rest.length > 0) {
              leaf.t = 'heading'; leaf.level = se; leaf.text = rest.join('\n').trim();
              this.finalizeLeaf(leaf, stack); leaf = null; i++; continue;
            }
            // Only ref defs: the underline is not a setext; fall through to new block.
            this.finalizeLeaf(leaf, stack); leaf = null;
            // fall through: process this line as a new block start
          } else {
            // Table check: if this line is a table delimiter row, convert paragraph.
            const tbl = tryTableDelimiter(line.s);
            if (tbl && allMatched) {
              const { defs, rest } = extractDefs(leaf.lines, this.refs);
              if (rest.length > 0) {
                const headerLine = rest[rest.length - 1];
                const headerCells = splitTableRow(headerLine);
                if (headerCells !== null && headerCells.length === tbl.cells) {
                  const parent = stack[stack.length - 1];
                  if (rest.length > 1) {
                    // Earlier lines stay a paragraph; the table follows it.
                    leaf.lines = rest.slice(0, -1);
                    const table = { t: 'table', header: headerCells, align: tbl.align, rows: [] };
                    parent.children.splice(parent.children.indexOf(leaf) + 1, 0, table);
                    leaf = table;
                  } else {
                    leaf.t = 'table';
                    leaf.header = headerCells;
                    leaf.align = tbl.align;
                    leaf.rows = [];
                  }
                  i++; continue;
                }
              }
            }
            // A line that starts a block which can interrupt a paragraph
            // (nested list, heading, fence, blockquote, hr, html) ends the
            // paragraph instead of continuing it. Inside a list, any list
            // marker ends the item's paragraph.
            const inList3 = stack.some((b) => b.t === 'list');
            const isListMarker3 = inList3 && parseListMarker(line.s, indentColsOf(line.s, line.col)) !== null;
            if (allMatched && (startsInterruptBlock(line.s) || isListMarker3)) {
              this.finalizeLeaf(leaf, stack); leaf = null;
              // fall through: process this line as a new block start
            } else {
              // Regular paragraph continuation (possibly lazy).
              let content = this.paragraphLineContent(raw, line, stack, matched, failedAt, strippedCols);
              // Lazy setext underline after a lazy line inside a blockquote
              // gains 4 spaces (it must not become a setext heading).
              if (failedAt !== -1 && leaf._prevLazy && stack[failedAt] && stack[failedAt].t === 'blockquote' && setextLevel(line.s)) {
                content = '    ' + line.s.trim();
              }
              leaf._prevLazy = failedAt !== -1;
              leaf.lines.push(content);
              i++; continue;
            }
          }
        } else if (leaf.t === 'code' && leaf.fenced) {
          const close = fenceClose(line.s, leaf.fenceChar, leaf.fenceLen);
          if (close !== -1) { this.finalizeLeaf(leaf, stack); leaf = null; i++; continue; }
          // Strip up to the fence's indent from content lines.
          let content = line.s;
          if (leaf.fenceIndent > 0) {
            const ind = indentColsOf(content, line.col);
            if (ind.cols > 0) {
              const l2 = { s: content, col: line.col };
              stripCols(l2, Math.min(leaf.fenceIndent, ind.cols));
              content = l2.s;
            }
          }
          leaf.lines.push(content);
          i++; continue;
        } else if (leaf.t === 'code' && !leaf.fenced) {
          const ind = indentColsOf(line.s, line.col);
          if (ind.cols >= 4) {
            const l2 = { s: line.s, col: line.col };
            stripCols(l2, 4);
            leaf.lines.push(l2.s);
            i++; continue;
          }
          // Less indented: end the code block, reprocess the line.
          this.finalizeLeaf(leaf, stack); leaf = null;
          // fall through to new block start (do not advance i)
        } else if (leaf.t === 'html') {
          leaf.lines.push(line.s);
          if (leaf.htmlType >= 1 && leaf.htmlType <= 5 && htmlBlockEnd(line.s, leaf.htmlType)) {
            this.finalizeLeaf(leaf, stack); leaf = null;
          }
          i++; continue;
        } else if (leaf.t === 'table') {
          leaf.rows.push(line.s);
          i++; continue;
        }
      }

      // ---- Phase 4: new block start ----
      // (leaf is null here, or was just finalized)
      // A whitespace-only line cannot start a block (a ">  " line only adds
      // content to an already-open paragraph, handled in Phase 3).
      if (isBlankStr(line.s)) {
        this.pendingBlank = true;
        i++;
        continue;
      }
      this.noteNewBlock(stack);
      const started = this.startBlock(line, stack, i);
      // The blank line (if any) is consumed by this new block.
      this.pendingBlank = false;
      if (started && started.kind === 'paragraph') {
        leaf = { t: 'paragraph', lines: [this.paragraphLineContent(raw, line, stack, matched, failedAt, strippedCols, started.extra)], _prevLazy: failedAt !== -1 };
        stack[stack.length - 1].children.push(leaf);
      } else if (started && typeof started === 'object') {
        leaf = started.leaf || null;
      } else if (started === 'none') {
        leaf = { t: 'paragraph', lines: [this.paragraphLineContent(raw, line, stack, matched, failedAt, strippedCols, 0)], _prevLazy: failedAt !== -1 };
        stack[stack.length - 1].children.push(leaf);
      }
      i++;
    }
    if (leaf) this.finalizeLeaf(leaf, stack);
    // A trailing blank line after an HTML block suppresses its newline.
    if (this.pendingBlank) {
      let node = root;
      while (node.children && node.children.length > 0) {
        const last = node.children[node.children.length - 1];
        if (last.t === 'html') { last.noTrail = true; break; }
        if (last.children) { node = last; continue; }
        break;
      }
    }
    // finalize containers (mark lists tight/loose)
    this.finalizeContainers(root);
  }

  // Compute the paragraph-line content for a line, applying the marked rules:
  // - lines through an item: tabs expanded (original columns), content indent
  //   stripped, then 4 more columns stripped if the remainder starts with 4 spaces.
  // - lazy lines with no item: 4 columns stripped if indent >= 4.
  // - other lines: content as-is after container stripping.
  paragraphLineContent(raw, line, stack, matched, failedAt, strippedCols, extra) {
    // Determine whether an item container is involved in this line's processing.
    let hasItem = false;
    let lazyItemStrip = 0;
    if (failedAt !== -1) {
      // Lazy: items below the failure point may still strip their content indent.
      // Compute the remaining indent after the matched containers.
      const rem = line.s;
      let ind = indentColsOf(rem, line.col).cols;
      for (let k = failedAt; k < stack.length; k++) {
        const b = stack[k];
        if (b.t === 'item') {
          hasItem = true;
          if (ind >= b.contentIndent) { lazyItemStrip += b.contentIndent; ind -= b.contentIndent; }
          else break;
        }
      }
    } else {
      for (let k = 1; k < stack.length; k++) if (stack[k].t === 'item') { hasItem = true; break; }
    }
    if (hasItem) {
      const totalStrip = strippedCols + lazyItemStrip + (extra || 0);
      // Strip by columns (not characters): a tab counts as multiple columns.
      const l2 = { s: raw, col: 0 };
      stripCols(l2, totalStrip);
      let s = l2.s;
      // After the item indent, 4 more columns are stripped if the remainder
      // is indented by 4 or more columns.
      if (indentColsOf(s, l2.col).cols >= 4) { stripCols(l2, 4); s = l2.s; }
      return s;
    }
    // No item involved.
    let s = line.s;
    if (extra) {
      // A new blockquote was just created; strip its marker from the line.
      const l2 = { s, col: line.col };
      stripCols(l2, extra);
      s = l2.s;
    }
    if (strippedCols > 0 || extra) {
      // The line passed through a container strip: expand its leading tabs
      // to spaces based on the resulting column.
      s = expandLeadingTabsAt(s, line.col + (extra || 0));
    }
    if (failedAt !== -1) {
      // Lazy line: strip 4 columns if indent >= 4.
      const ind = indentColsOf(s, line.col);
      if (ind.cols >= 4) {
        const l2 = { s, col: line.col };
        stripCols(l2, 4);
        s = l2.s;
      }
    }
    return s;
  }

  finalizeLeaf(leaf, stack) {
    if (leaf.t === 'paragraph') {
      const { defs, rest } = extractDefs(leaf.lines, this.refs);
      leaf.defs = defs; leaf.lines = rest;
      if (rest.length === 0) {
        // Paragraph of only ref defs: remove it from its parent.
        const parent = stack[stack.length - 1];
        const idx = parent.children.indexOf(leaf);
        if (idx !== -1) parent.children.splice(idx, 1);
        leaf.dead = true;
      }
    } else if (leaf.t === 'code' && !leaf.fenced) {
      // Trailing blank lines are stripped from indented code blocks.
      while (leaf.lines.length > 0 && leaf.lines[leaf.lines.length - 1] === '') leaf.lines.pop();
    } else if (leaf.t === 'code' && leaf.fenced) {
      // One trailing blank line is stripped from a fenced code block (the
      // newline before the closing fence); further blank lines are content.
      if (leaf.lines.length > 0 && leaf.lines[leaf.lines.length - 1] === '') leaf.lines.pop();
    }
  }

  finalizeContainers(node) {
    if (node.t === 'list') {
      node.tight = !node.loose;
      for (const item of node.children) this.finalizeContainers(item);
    } else if (node.children) {
      for (const c of node.children) this.finalizeContainers(c);
    }
  }

  // Mark the enclosing list loose if a blank line separated blocks, and clear
  // the pending-blank flag. Called when a new block starts.
  noteNewBlock(stack) {
    if (!this.pendingBlank) return;
    // An HTML block followed by a blank line has no trailing newline.
    const parent = stack[stack.length - 1];
    if (parent && parent.children.length > 0) {
      const last = parent.children[parent.children.length - 1];
      if (last.t === 'html') last.noTrail = true;
    }
    // A blank line before a new block inside an item makes the list loose.
    // (A new list item marks looseness itself in startListItem, using the
    // still-set pendingBlank flag; do not clear it here.)
    for (let k = stack.length - 1; k >= 1; k--) {
      const b = stack[k];
      if (b.t === 'item') {
        if (b.children.length > 0) {
          const list = stack[k - 1];
          if (list && list.t === 'list') list.loose = true;
        }
        return;
      }
    }
  }

  // Try to start a new block at the current line. Returns 'leaf-paragraph',
  // { leaf, container }, or 'none'. May push containers onto the stack.
  startBlock(line, stack, lineIndex) {
    const parent0 = stack[stack.length - 1];
    const s0 = line.s;
    const ind0 = indentColsOf(s0, line.col);
    // A block that is not a continuing list item cannot live directly in a list.
    if (parent0.t === 'list') {
      const li = parseListMarker(s0, ind0);
      if (!(li && li.ordered === parent0.ordered &&
          (li.ordered ? li.delim === parent0.delim : li.bullet === parent0.bullet))) {
        stack.pop();
      }
    }
    const parent = stack[stack.length - 1];
    const s = line.s;
    const ind = indentColsOf(s, line.col);
    const indent = ind.cols;
    if (indent >= 4) {
      // Indented code block (cannot interrupt a paragraph — leaf is null here).
      const l2 = { s, col: line.col };
      stripCols(l2, 4);
      const leaf = { t: 'code', fenced: false, lines: [l2.s] };
      parent.children.push(leaf);
      return { leaf };
    }
    const c0 = s.charAt(ind.chars);
    // Thematic break (ends any open list: a line like "* * *" is a list marker
    // to the list-pop check above but is a thematic break per marked).
    if (isThematicBreak(s, ind)) {
      let p = parent;
      if (p.t === 'list') { stack.pop(); p = stack[stack.length - 1]; }
      p.children.push({ t: 'hr' });
      return { leaf: null };
    }
    // ATX heading
    if (c0 === '#') {
      let j = ind.chars, level = 0;
      while (s.charAt(j) === '#') { level++; j++; }
      if (level <= 6 && (j >= s.length || s.charAt(j) === ' ' || s.charAt(j) === '\t')) {
        let text = s.slice(j).replace(/[\t ]+$/, '');
        // Remove closing sequence of #s preceded by space.
        text = text.replace(/[\t ]+#+$/, '').replace(/^[\t ]+/, '');
        const leaf = { t: 'heading', level, text };
        parent.children.push(leaf);
        return { leaf: null };
      }
    }
    // Fenced code
    if (c0 === '`' || c0 === '~') {
      let j = ind.chars, len = 0;
      while (s.charAt(j) === c0) { len++; j++; }
      if (len >= 3) {
        const infoRaw = s.slice(j).trim();
        // The info string is the first word, with backslash escapes unescaped.
        const infoWord = infoRaw.split(/\s+/)[0] || '';
        const info = unescapeStr(infoWord);
        if (c0 === '`' && infoRaw.includes('`')) {
          // Not a fence; fall through to paragraph.
        } else {
          const leaf = { t: 'code', fenced: true, fenceChar: c0, fenceLen: len, fenceIndent: indent, info, lines: [] };
          parent.children.push(leaf);
          return { leaf };
        }
      }
    }
    // HTML block
    const htmlType = htmlBlockType(s, ind);
    if (htmlType > 0) {
      const leaf = { t: 'html', htmlType, lines: [s] };
      parent.children.push(leaf);
      // Types 1-5 may end on their opening line.
      if (htmlType >= 1 && htmlType <= 5 && htmlBlockEnd(s, htmlType)) return { leaf: null };
      return { leaf };
    }
    // Blockquote
    if (c0 === '>') {
      const bq = { t: 'blockquote', children: [] };
      parent.children.push(bq);
      stack.push(bq);
      // Reprocess this line inside the blockquote.
      return this.startBlockInContainer(line, stack);
    }
    // List
    const listInfo = parseListMarker(s, ind);
    if (listInfo) {
      // A list marker continues the open list if it is of the same kind.
      const top = stack[stack.length - 1];
      if (top.t === 'list' && top.ordered === listInfo.ordered &&
          (listInfo.ordered ? top.delim === listInfo.delim : top.bullet === listInfo.bullet)) {
        return this.startListItem(line, stack, listInfo);
      }
      // Otherwise the old list (if any) is closed; start a new one.
      if (top.t === 'list') stack.pop();
      const list = {
        t: 'list', ordered: listInfo.ordered, start: listInfo.start,
        delim: listInfo.delim, bullet: listInfo.bullet, children: [], loose: false,
      };
      stack[stack.length - 1].children.push(list);
      stack.push(list);
      return this.startListItem(line, stack, listInfo);
    }
    // Otherwise: paragraph.
    return { kind: 'paragraph', extra: 0 };
  }

  // After pushing a blockquote, reprocess the current line within it.
  // Returns the inner startBlock result, with `extra` increased by the
  // columns stripped for the '>' marker.
  startBlockInContainer(line, stack) {
    // Strip the '>' marker (+ one optional space) and start a block inside.
    const ind = indentColsOf(line.s, line.col);
    const l2 = { s: line.s, col: line.col };
    stripCols(l2, ind.cols + 1);
    let extra = ind.cols + 1;
    if (l2.s.charAt(0) === ' ' || l2.s.charAt(0) === '\t') { stripCols(l2, 1); extra++; }
    if (isBlankStr(l2.s)) {
      // Empty blockquote line: no leaf; the blockquote stays open.
      return { leaf: null };
    }
    const r = this.startBlock(l2, stack, -1);
    if (r && r.kind === 'paragraph') return { kind: 'paragraph', extra: extra + r.extra };
    return r;
  }

  // After pushing a list, start its first item.
  startListItem(line, stack, info) {
    const list = stack[stack.length - 1];
    // A blank line between items makes the list loose.
    if (this.pendingBlank && list.children.length > 0) list.loose = true;
    const item = { t: 'item', contentIndent: info.contentIndent, children: [] };
    list.children.push(item);
    stack.push(item);
    // Strip the marker + following spaces from the line, then start a block.
    // contentIndent is the total columns from the line start to the content.
    const l2 = { s: line.s, col: line.col };
    stripCols(l2, info.contentIndent);
    if (isBlankStr(l2.s)) {
      // Empty item: no leaf yet.
      return { leaf: null };
    }
    const r = this.startBlock(l2, stack, -1);
    if (r && r.kind === 'paragraph') return { kind: 'paragraph', extra: info.contentIndent + r.extra };
    return r;
  }
}

// ---------- link reference definitions ----------
// Try to parse a link reference definition starting at lines[0] (and possibly
// consuming more lines). Returns { def, used } or null.
// A definition: [label]: <dest> or dest, optionally followed by a title on the
// same line or the next line. The label and the title may span lines; the
// destination is on a single line. Trailing junk after the destination/title
// invalidates the definition.
function parseRefDef(lines) {
  // Cursor over (line, pos).
  let li = 0, pos = 0;
  const lineAt = (i) => (i < lines.length ? lines[i] : null);
  const chAt = (l, p) => {
    const s = lineAt(l);
    return s === null || p >= s.length ? -1 : s.charCodeAt(p);
  };
  // First line: up to 3 spaces of indent, then '['.
  let s0 = lines[0];
  let i = 0;
  while (i < s0.length && s0.charCodeAt(i) === 32) i++;
  if (i > 3 || i >= s0.length || s0.charCodeAt(i) !== 91) return null; // [
  li = 0; pos = i + 1;
  // Parse the label: [ ... ] (may span lines), no nested '[', backslash
  // escapes, up to 999 chars, non-empty after normalization.
  let label = '';
  let closed = false;
  while (li < lines.length) {
    const s = lines[li];
    while (pos < s.length) {
      const c = s.charCodeAt(pos);
      if (c === 92 && pos + 1 < s.length) {
        // Only \[ and \] resolve in a label; other escapes are preserved.
        const nx = s.charCodeAt(pos + 1);
        if (nx === 91 || nx === 93) { label += s[pos + 1]; pos += 2; continue; }
        label += s[pos] + s[pos + 1]; pos += 2; continue;
      }
      if (c === 91) return null; // nested [ not allowed
      if (c === 93) { closed = true; pos++; break; }
      label += s[pos]; pos++;
    }
    if (closed) break;
    if (label.length > 999) return null;
    // Continue on the next line (the newline becomes part of the label).
    li++; pos = 0;
    if (li < lines.length) label += '\n';
  }
  if (!closed) return null;
  if (label.length > 999) return null;
  if (normalizeLabel(label) === '') return null;
  // ':' must follow the ']' on the same line.
  if (chAt(li, pos) !== 58) return null; // :
  pos++;
  // Skip whitespace (spaces, tabs, newlines) to the destination.
  const skipWs = () => {
    while (li < lines.length) {
      const s = lines[li];
      while (pos < s.length && (s.charCodeAt(pos) === 32 || s.charCodeAt(pos) === 9)) pos++;
      if (pos < s.length) return true;
      li++; pos = 0;
    }
    return false;
  };
  if (!skipWs()) return null;
  // Destination: <...> or bare, on a single line.
  let dest = '';
  let s = lines[li];
  if (s.charCodeAt(pos) === 60) { // <
    let k = pos + 1, ok = false;
    while (k < s.length) {
      const c = s.charCodeAt(k);
      if (c === 62) { ok = true; break; }
      if (c === 60) return null;
      if (c === 92 && k + 1 < s.length && isPunct(s.charCodeAt(k + 1))) { dest += s[k + 1]; k += 2; continue; }
      dest += s[k]; k++;
    }
    if (!ok) return null;
    pos = k + 1;
  } else {
    let depth = 0, k = pos;
    while (k < s.length) {
      const c = s.charCodeAt(k);
      if (c === 32 || c === 9) break;
      if (c === 92 && k + 1 < s.length && isPunct(s.charCodeAt(k + 1))) { dest += s[k + 1]; k += 2; continue; }
      if (c === 40) depth++;
      else if (c === 41) { if (depth === 0) break; depth--; }
      dest += s[k]; k++;
    }
    if (dest === '') return null;
    pos = k;
  }
  dest = unescapeStr(dest);
  // Optional title. First try the same line (needs preceding whitespace).
  let title = null, titleEndLi = li;
  // Parse a title starting at (li, pos). The title may span lines (no blank
  // line inside). Returns { title, endLi, endPos } or null.
  const parseTitle = (startLi, startPos) => {
    const s2 = lines[startLi];
    if (startPos >= s2.length) return null;
    const c = s2.charCodeAt(startPos);
    let open = -1, close = -1;
    if (c === 34 || c === 39) { open = c; close = c; }
    else if (c === 40) { open = 40; close = 41; }
    else return null;
    let t = '', l = startLi, p = startPos + 1, depth = 0;
    while (l < lines.length) {
      const s3 = lines[l];
      // A blank line inside a title invalidates it.
      if (l > startLi && s3.trim() === '') return null;
      while (p < s3.length) {
        const cc = s3.charCodeAt(p);
        if (open === 40 && cc === 40) depth++;
        if (cc === close && (open !== 40 || depth === 0)) {
          // Must be followed only by whitespace to end of line.
          let m = p + 1;
          while (m < s3.length && (s3.charCodeAt(m) === 32 || s3.charCodeAt(m) === 9)) m++;
          if (m !== s3.length) return null;
          return { title: unescapeStr(t), endLi: l, endPos: p + 1 };
        }
        if (open === 40 && cc === 41) depth--;
        if (cc === 92 && p + 1 < s3.length && isPunct(s3.charCodeAt(p + 1))) { t += s3[p + 1]; p += 2; continue; }
        t += s3[p]; p++;
      }
      // End of line: the title continues on the next line.
      l++; p = 0;
      if (l < lines.length) t += '\n';
    }
    return null;
  };
  // Same-line title: only if there was whitespace after the destination.
  {
    const s2 = lines[li];
    let p = pos, hadWs = false;
    while (p < s2.length && (s2.charCodeAt(p) === 32 || s2.charCodeAt(p) === 9)) { hadWs = true; p++; }
    if (p < s2.length) {
      // There is non-whitespace after the destination: it must be a title.
      if (!hadWs) return null;
      const r = parseTitle(li, p);
      if (!r) return null;
      title = r.title; titleEndLi = r.endLi;
    } else if (li + 1 < lines.length) {
      // Next-line title (optional): skip leading whitespace; if the line
      // holds a valid title, use it.
      const s2b = lines[li + 1];
      let p2 = 0;
      while (p2 < s2b.length && (s2b.charCodeAt(p2) === 32 || s2b.charCodeAt(p2) === 9)) p2++;
      if (p2 < s2b.length) {
        const r = parseTitle(li + 1, p2);
        if (r) { title = r.title; titleEndLi = r.endLi; }
      }
    }
  }
  return { def: { label: normalizeLabel(label), dest, title }, used: titleEndLi + 1 };
}

// Extract leading link reference definitions from a paragraph's lines.
// Returns { defs, rest } where defs are added to the shared refs map.
function extractDefs(lines, refs) {
  const defs = [];
  let idx = 0;
  while (idx < lines.length) {
    const r = parseRefDef(lines.slice(idx));
    if (!r) break;
    defs.push(r.def);
    if (!refs.has(r.def.label)) refs.set(r.def.label, r.def);
    idx += r.used;
  }
  return { defs, rest: lines.slice(idx) };
}

// ---------- tables ----------
function splitTableRow(s) {
  // Split a table row on unescaped |, handling a leading/trailing pipe.
  let cells = [];
  let cur = '', i = 0;
  const n = s.length;
  // Skip leading whitespace and an optional leading pipe.
  while (i < n && (s.charCodeAt(i) === 32 || s.charCodeAt(i) === 9)) i++;
  if (i < n && s.charCodeAt(i) === 124) i++;
  while (i < n) {
    const c = s.charCodeAt(i);
    if (c === 92 && i + 1 < n && s.charCodeAt(i + 1) === 124) { cur += '|'; i += 2; continue; }
    if (c === 124) { cells.push(cur.trim()); cur = ''; i++; continue; }
    cur += s[i]; i++;
  }
  // Trailing pipe produces an empty final cell which is dropped.
  const tail = cur.trim();
  if (tail !== '' || cells.length === 0) cells.push(tail);
  // If the row ended with a pipe, the last cell is the empty one after it;
  // splitTableRow drops a trailing empty cell only when a pipe preceded it.
  return cells;
}

function tryTableDelimiter(s) {
  const ind = indentColsOf(s);
  if (ind.cols > 3) return null;
  let cells = [];
  let i = ind.chars;
  const n = s.length;
  // Optional leading pipe.
  if (i < n && s.charCodeAt(i) === 124) i++;
  while (i < n) {
    // Skip whitespace.
    while (i < n && (s.charCodeAt(i) === 32 || s.charCodeAt(i) === 9)) i++;
    if (i >= n) break;
    if (s.charCodeAt(i) === 124) { i++; continue; }
    // One cell: optional :, then 1+ -, then optional :.
    let align = null, dashes = 0;
    if (s.charCodeAt(i) === 58) { align = 'left'; i++; }
    while (i < n && s.charCodeAt(i) === 45) { dashes++; i++; }
    if (dashes === 0) return null;
    if (i < n && s.charCodeAt(i) === 58) {
      align = align === 'left' ? 'center' : 'right';
      i++;
    }
    cells.push(align);
    while (i < n && (s.charCodeAt(i) === 32 || s.charCodeAt(i) === 9)) i++;
    if (i < n && s.charCodeAt(i) === 124) { i++; continue; }
    if (i < n) return null; // junk after the cell
  }
  if (cells.length === 0) return null;
  return { cells: cells.length, align: cells };
}

// ---------- HTML blocks ----------
const HTML_BLOCK_OPEN = [
  /^ {0,3}<(script|pre|style|textarea)([\s>]|$)/i,
  /^ {0,3}<!--/,
  /^ {0,3}<\?/,
  /^ {0,3}<![A-Za-z]/,
  /^ {0,3}<!\[CDATA\[/,
  /^ {0,3}<\/?(address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)([\s>\/]|$)/i,
];
const HTML_BLOCK_CLOSE = [
  /<\/(script|pre|style|textarea)>/i,
  /-->/,
  /\?>/,
  />/,
  />/,
  /^$/,
  /^$/,
];
function htmlBlockType(s, ind) {
  if (ind.cols > 3) return 0;
  // Type 7: a complete open tag or closing tag on its own line (any tag name).
  // Check types 1-6 first (type 6's regex must include the '<').
  for (let t = 0; t < 6; t++) {
    if (HTML_BLOCK_OPEN[t].test(s)) return t + 1;
  }
  // Type 7: line starts with <tag or </tag (tag name = letter, then alnum/-),
  // and the tag must be COMPLETE on this line (a closing '>' present,
  // respecting quoted attribute values), followed only by whitespace.
  let j = ind.chars;
  if (s.charAt(j) === '<') {
    let k = j + 1;
    if (s.charAt(k) === '/') k++;
    if (k < s.length && /[A-Za-z]/.test(s.charAt(k))) {
      k++;
      while (k < s.length && /[A-Za-z0-9-]/.test(s.charAt(k))) k++;
      const nc = s.charAt(k);
      if (nc === '>' || nc === ' ' || nc === '\t' || nc === '/') {
        let q = 0, close = -1;
        while (k < s.length) {
          const ch = s.charCodeAt(k);
          if (q) { if (ch === q) q = 0; }
          else if (ch === 34 || ch === 39) q = ch;
          else if (ch === 62) { close = k; break; }
          k++;
        }
        if (close !== -1) {
          // Only whitespace may follow the closing '>'.
          let m = close + 1, ok = true;
          while (m < s.length) {
            const ch = s.charCodeAt(m);
            if (ch !== 32 && ch !== 9) { ok = false; break; }
            m++;
          }
          if (ok) return 7;
        }
      }
    }
  }
  return 0;
}

function htmlBlockEnd(line, type) {
  if (type >= 1 && type <= 5) return HTML_BLOCK_CLOSE[type - 1].test(line);
  return false; // type 6 ends at a blank line; type 7 continues to a blank line
}

// Parse a list marker at the given indent. Returns null if there is none.
// contentIndent is the absolute column where the item's content starts;
// markerCols is the number of columns from the marker to the content.
function parseListMarker(s, ind) {
  if (ind.cols > 3) return null;
  const j = ind.chars;
  const c = s.charAt(j);
  let ordered = false, start = 0, delim = '', bullet = '';
  let mpos = j; // position just after the marker char(s)
  if (c === '-' || c === '+' || c === '*') {
    bullet = c; mpos = j + 1;
  } else if (c >= '0' && c <= '9') {
    ordered = true;
    let k = j, num = 0, digits = 0;
    while (k < s.length && s.charAt(k) >= '0' && s.charAt(k) <= '9') { num = num * 10 + (s.charCodeAt(k) - 48); digits++; k++; }
    if (digits === 0 || digits > 9) return null;
    const d = s.charAt(k);
    if (d !== '.' && d !== ')') return null;
    delim = d; start = num; mpos = k + 1;
    if (digits + 1 > 10) return null;
  } else return null;
  // Whitespace after the marker.
  let col = ind.cols + (mpos - j); // column just after the marker
  let k = mpos, spaces = 0;
  while (k < s.length && (s.charCodeAt(k) === 32 || s.charCodeAt(k) === 9)) {
    if (s.charCodeAt(k) === 9) { const w = 4 - (col % 4); col += w; spaces += w; }
    else { col++; spaces++; }
    k++;
  }
  if (k >= s.length) {
    // Empty item: content indent is marker width + 1.
    return { ordered, start, delim, bullet, markerCols: mpos - j, contentIndent: ind.cols + (mpos - j) + 1 };
  }
  if (spaces === 0) return null;
  let contentIndent;
  if (spaces >= 5) contentIndent = ind.cols + (mpos - j) + 1;
  else contentIndent = col;
  return { ordered, start, delim, bullet, markerCols: col - ind.cols, contentIndent };
}

// Task list item marker: [ ] or [x] at the start of an item's content.
function taskMarker(text) {
  if (text.length >= 3 && text.charAt(0) === '[' && (text.charAt(1) === ' ' || text.charAt(1) === 'x' || text.charAt(1) === 'X') && text.charAt(2) === ']' && (text.length === 3 || text.charAt(3) === ' ' || text.charAt(3) === '\t')) {
    return { checked: text.charAt(1) !== ' ', rest: text.slice(3).replace(/^[ \t]+/, '') };
  }
  return null;
}

// Does this line (content after container stripping) start a block that can
// interrupt a paragraph?
function startsInterruptBlock(s) {
  const ind = indentColsOf(s);
  if (ind.cols >= 4) return false;
  const c0 = s.charAt(ind.chars);
  if (c0 === '#') {
    let j = ind.chars, level = 0;
    while (s.charAt(j) === '#') { level++; j++; }
    if (level <= 6 && level >= 1 && (j >= s.length || s.charAt(j) === ' ' || s.charAt(j) === '\t')) return true;
  }
  if (c0 === '`' || c0 === '~') {
    let j = ind.chars, len = 0;
    while (s.charAt(j) === c0) { len++; j++; }
    if (len >= 3) {
      if (c0 === '`' && s.slice(j).includes('`')) return false;
      return true;
    }
  }
  if (isThematicBreak(s, ind)) return true;
  const ht = htmlBlockType(s, ind);
  if (ht >= 1 && ht <= 6) return true;
  if (c0 === '>') return true;
  const li = parseListMarker(s, ind);
  if (li) {
    // A list interrupts a paragraph only if its first item is non-empty,
    // and (for ordered lists) it starts with 1.
    const after = s.slice(ind.chars + li.markerCols);
    if (after.trim() === '') return false;
    if (li.ordered && li.start !== 1) return false;
    return true;
  }
  return false;
}

function setextLevel(s) {
  const ind = indentColsOf(s);
  if (ind.cols > 3) return 0;
  let j = ind.chars;
  if (j >= s.length) return 0;
  const c = s.charAt(j);
  if (c !== '=' && c !== '-') return 0;
  // A run of the same char, then only trailing whitespace (no internal spaces).
  while (j < s.length && s.charAt(j) === c) j++;
  while (j < s.length && (s.charAt(j) === ' ' || s.charAt(j) === '\t')) j++;
  if (j < s.length) return 0;
  return c === '=' ? 1 : 2;
}

function isThematicBreak(s, ind) {
  if (ind.cols > 3) return false;
  let j = ind.chars;
  const c = s.charAt(j);
  if (c !== '-' && c !== '_' && c !== '*') return false;
  let count = 0;
  while (j < s.length) {
    const ch = s.charAt(j);
    if (ch === c) count++;
    else if (ch !== ' ' && ch !== '\t') return false;
    j++;
  }
  return count >= 3;
}

function fenceClose(s, fenceChar, fenceLen) {
  const ind = indentColsOf(s);
  if (ind.cols > 3) return -1;
  let j = ind.chars, len = 0;
  while (s.charAt(j) === fenceChar) { len++; j++; }
  if (len < fenceLen) return -1;
  while (j < s.length) { if (s.charAt(j) !== ' ' && s.charAt(j) !== '\t') return -1; j++; }
  return len;
}

// ---------- rendering ----------
function renderDoc(root, refs) {
  let out = '';
  for (const child of root.children) out += renderBlock(child, refs);
  return out;
}

function renderChildren(node, refs) {
  let out = '';
  for (const c of node.children) out += renderBlock(c, refs);
  return out;
}

function renderItem(item, tight, refs) {
  let inner = '';
  for (const c of item.children) {
    if (tight && c.t === 'paragraph') inner += parseInline(c.lines.join('\n'), refs);
    else inner += renderBlock(c, refs);
  }
  return '<li>' + inner + '</li>\n';
}

function renderBlock(b, refs) {
  switch (b.t) {
    case 'paragraph': {
      if (!b.lines || b.lines.length === 0) return '';
      return '<p>' + parseInline(b.lines.join('\n'), refs) + '</p>\n';
    }
    case 'heading':
      return '<h' + b.level + '>' + parseInline(b.text, refs) + '</h' + b.level + '>\n';
    case 'code': {
      let content = b.lines.join('\n');
      if (b.lines.length > 0) content += '\n';
      if (b.fenced) {
        const lang = b.info ? b.info.split(/\s+/)[0] : '';
        const cls = lang ? ' class="language-' + escapeAttr(lang) + '"' : '';
        return '<pre><code' + cls + '>' + escapeHtml(content) + '</code></pre>\n';
      }
      return '<pre><code>' + escapeHtml(content) + '</code></pre>\n';
    }
    case 'html': {
      if (!b.lines || b.lines.length === 0) return '';
      return b.lines.join('\n') + (b.noTrail ? '' : '\n');
    }
    case 'hr': return '<hr>\n';
    case 'blockquote':
      return '<blockquote>\n' + renderChildren(b, refs) + '</blockquote>\n';
    case 'list': {
      const tag = b.ordered ? 'ol' : 'ul';
      const start = b.ordered && b.start !== 1 ? ' start="' + b.start + '"' : '';
      let out = '<' + tag + start + '>\n';
      for (const item of b.children) out += renderItem(item, b.tight, refs);
      return out + '</' + tag + '>\n';
    }
    case 'table': {
      let out = '<table>\n<thead>\n<tr>\n';
      for (let i = 0; i < b.header.length; i++) {
        const a = b.align[i];
        const attr = a ? ' align="' + a + '"' : '';
        out += '<th' + attr + '>' + parseInline(b.header[i], refs) + '</th>\n';
      }
      out += '</tr>\n</thead>\n<tbody>\n';
      for (const row of b.rows) {
        const cells = splitTableRow(row);
        out += '<tr>\n';
        for (let i = 0; i < b.header.length; i++) {
          const a = b.align[i];
          const attr = a ? ' align="' + a + '"' : '';
          const cell = i < cells.length ? cells[i] : '';
          out += '<td' + attr + '>' + parseInline(cell, refs) + '</td>\n';
        }
        out += '</tr>\n';
      }
      out += '</tbody>\n</table>\n';
      return out;
    }
  }
  return '';
}

// ---------- inline parsing ----------
function parseInline(text, refs) {
  const items = [];
  const delims = [];
  let openersBottom = -1;
  const n = text.length;
  let i = 0;
  let buf = '';
  const flush = () => { if (buf) { items.push({ k: 'text', s: buf }); buf = ''; } };
  // Unicode whitespace (CommonMark): ASCII whitespace plus the Zs category
  // (NBSP, U+1680, U+2000–U+200A, U+2028/2029, U+202F, U+205F, U+3000).
  const isWhite = (c) => c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12 || c === 0xA0 || c === 0x1680 || (c >= 0x2000 && c <= 0x200A) || c === 0x2028 || c === 0x2029 || c === 0x202F || c === 0x205F || c === 0x3000;

  while (i < n) {
    const c = text.charCodeAt(i);
    // Email autolink at the start of a word (local part starts with alnum).
    if (isAlnum(c) && (i === 0 || !isEmailLocalChar(text.charCodeAt(i - 1)))) {
      const em = tryEmail(text, i);
      if (em) { flush(); items.push({ k: 'autolink', href: 'mailto:' + escapeAttr(encodeUrl(em.text)), text: escapeAttr(em.text) }); i = em.end; continue; }
    }
    if (c === 92) {
      if (i + 1 < n) {
        const d = text.charCodeAt(i + 1);
        if (d === 10) { flush(); items.push({ k: 'br' }); i += 2; continue; }
        // Backslash-escaped punctuation: emit the char, HTML-escaped.
        if (isPunct(d)) { const esc = ESC[d]; buf += esc || text[i + 1]; i += 2; continue; }
      }
      buf += '\\'; i++; continue;
    }
    if (c === 38) {
      const e = decodeEntity(text, i);
      if (e) {
        if (text.charCodeAt(i + 1) === 35) {
          // Numeric reference: emit the decoded char, HTML-escaped.
          const ch = e[0], esc = ESC[ch.charCodeAt(0)];
          buf += esc || ch;
        } else {
          // Named entity: marked passes it through verbatim, whether or
          // not it is a defined entity.
          buf += text.slice(i, e[1]);
        }
        i = e[1]; continue;
      }
      buf += '&amp;'; i++; continue;
    }
    if (c === 96) {
      let j = i, run = 0;
      while (j < n && text.charCodeAt(j) === 96) { run++; j++; }
      let k = j, found = -1;
      while (k < n) {
        if (text.charCodeAt(k) === 96) {
          let m = k, r2 = 0;
          while (m < n && text.charCodeAt(m) === 96) { r2++; m++; }
          if (r2 === run) { found = k; break; }
          k = m;
        } else k++;
      }
      if (found === -1) { buf += '`'.repeat(run); i = j; continue; }
      let content = text.slice(j, found);
      content = content.replace(/\r\n?|\n/g, ' ');
      if (content.length >= 2 && content.charAt(0) === ' ' && content.charAt(content.length - 1) === ' ' && !/^ +$/.test(content)) {
        content = content.slice(1, -1);
      }
      flush();
      items.push({ k: 'code', s: escapeHtml(content) });
      i = found + run;
      continue;
    }
    if (c === 10) {
      flush();
      let sp = 0, m = i - 1;
      while (m >= 0 && text.charCodeAt(m) === 32) { sp++; m--; }
      if (sp >= 2) {
        const last = items[items.length - 1];
        if (last && last.k === 'text') last.s = last.s.replace(/ +$/, '');
        items.push({ k: 'br' });
      } else {
        items.push({ k: 'soft' });
      }
      i++;
      continue;
    }
    if (c === 60) {
      const al = tryAutolink(text, i);
      if (al) { flush(); items.push({ k: 'autolink', href: al.href, text: al.text }); i = al.end; continue; }
      const tag = tryHtmlTag(text, i);
      if (tag) { flush(); items.push({ k: 'html', s: tag }); i += tag.length; continue; }
      buf += '&lt;'; i++; continue;
    }
    if (c === 91 || (c === 33 && i + 1 < n && text.charCodeAt(i + 1) === 91)) {
      const img = c === 33;
      flush();
      const item = { k: 'linkopen', img, active: true };
      items.push(item);
      delims.push({ item, ch: '[', len: 1, canOpen: true, canClose: false, active: true, img });
      if (img) i += 2; else i += 1;
      continue;
    }
    if (c === 93) {
      flush();
      const res = tryResolveLink(text, i, items, delims, openersBottom, refs);
      if (res) {
        openersBottom = res.openersBottom;
        i = res.end;
        continue;
      }
      buf += ']'; i++; continue;
    }
    if (c === 42 || c === 95 || c === 126) {
      const ch = text[i];
      let j = i, run = 0;
      while (j < n && text.charAt(j) === ch) { run++; j++; }
      const before = i > 0 ? text.charCodeAt(i - 1) : -1;
      const after = j < n ? text.charCodeAt(j) : -1;
      const beforeWs = before === -1 || isWhite(before);
      const afterWs = after === -1 || isWhite(after);
      const beforePunct = before !== -1 && isFlankPunct(before);
      const afterPunct = after !== -1 && isFlankPunct(after);
      const leftFlank = !afterWs && (!afterPunct || beforeWs || beforePunct);
      const rightFlank = !beforeWs && (!beforePunct || afterWs || afterPunct);
      let canOpen, canClose;
      if (ch === '_') {
        canOpen = leftFlank && (!rightFlank || beforePunct);
        canClose = rightFlank && (!leftFlank || afterPunct);
      } else {
        canOpen = leftFlank;
        canClose = rightFlank;
      }
      flush();
      const item = { k: 'delim', ch, len: run, canOpen, canClose };
      items.push(item);
      delims.push({ item, ch, len: run, canOpen, canClose, active: true });
      i = j;
      continue;
    }
    if ((c === 119 && text.startsWith('www.', i)) || (c === 104 && (text.startsWith('http://', i) || text.startsWith('https://', i)))) {
      if (i === 0 || isWhite(text.charCodeAt(i - 1))) {
        const url = tryExtendedUrl(text, i);
        if (url) { flush(); items.push({ k: 'autolink', href: url.href, text: url.text }); i = url.end; continue; }
      }
    }
    if (c === 62) { buf += '&gt;'; i++; continue; }
    if (c === 34) { buf += '&quot;'; i++; continue; }
    if (c === 39) { buf += '&#39;'; i++; continue; }
    buf += text[i]; i++;
  }
  flush();
  processEmphasis(items, delims);
  return renderInline(items, refs);
}

function tryAutolink(text, i) {
  const n = text.length;
  let j = i + 1;
  if (j < n && /[A-Za-z]/.test(text.charAt(j))) {
    let k = j + 1;
    while (k < n && /[A-Za-z0-9+.-]/.test(text.charAt(k))) k++;
    if (k - j >= 2 && k - j <= 32 && k < n && text.charAt(k) === ':') {
      let m = k + 1;
      while (m < n && text.charAt(m) !== '>') {
        const cc = text.charCodeAt(m);
        if (cc === 32 || cc === 10 || cc === 60) return null;
        m++;
      }
      if (m < n && m > k + 1) {
        const url = text.slice(i + 1, m);
        return { href: escapeAttr(encodeUrl(url)), text: escapeAttr(url), end: m + 1 };
      }
      return null;
    }
  }
  let k = i + 1;
  while (k < n && text.charAt(k) !== '>') {
    const cc = text.charCodeAt(k);
    if (cc === 32 || cc === 10 || cc === 60) return null;
    k++;
  }
  if (k >= n) return null;
  const inner = text.slice(i + 1, k);
  if (/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(inner)) {
    return { href: escapeHtml('mailto:' + encodeUrl(inner)), text: escapeHtml(inner), end: k + 1 };
  }
  return null;
}

function tryHtmlTag(text, i) {
  const rest = text.slice(i);
  let m = rest.match(/^<!--(?:[^-]|-(?!->))*-->/);
  if (m) return m[0];
  m = rest.match(/^<\?[\s\S]*?\?>/);
  if (m) return m[0];
  m = rest.match(/^<![A-Za-z][^>]*>/);
  if (m) return m[0];
  m = rest.match(/^<!\[CDATA\[[\s\S]*?\]\]>/);
  if (m) return m[0];
  m = rest.match(/^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>/);
  if (m) return m[0];
  return null;
}

function encodeUrl(url) {
  let out = '';
  for (let i = 0; i < url.length; i++) {
    const c = url.charCodeAt(i);
    if (c === 32) out += '%20';
    else if (c === 34) out += '%22';
    else if (c === 60) out += '%3C';
    else if (c === 62) out += '%3E';
    else if (c === 92) out += '%5C';
    else if (c === 96) out += '%60';
    else if (c === 91) out += '%5B';
    else if (c === 93) out += '%5D';
    else if (c === 123) out += '%7B';
    else if (c === 124) out += '%7C';
    else if (c === 125) out += '%7D';
    else if (c === 94) out += '%5E';
    else if (c < 32 || c > 126) out += encodeURIComponent(url[i]);
    else out += url[i];
  }
  return out;
}

// ---------- link resolution ----------
// Try to resolve a link at text[i] === ']'. Looks back through the delimiter
// stack for the nearest active '[' opener, then parses an inline destination
// / title or a reference label after the ']'. On success, converts the range
// into a link item and returns { end, openersBottom }.
// Parse an inline link destination/title at text[j] === '('. Returns
// {dest, title, end} or null if the parenthesised part is not a valid
// inline link.
function parseInlineLink(text, j) {
  const n = text.length;
  let k = j + 1;
  while (k < n && (text.charCodeAt(k) === 32 || text.charCodeAt(k) === 9 || text.charCodeAt(k) === 10)) k++;
  let d = '';
  if (k < n && text.charCodeAt(k) === 60) {
    let m = k + 1, ok = false;
    while (m < n) {
      const cc = text.charCodeAt(m);
      if (cc === 62) { ok = true; break; }
      if (cc === 10 || cc === 60) return null;
      if (cc === 92 && m + 1 < n && isPunct(text.charCodeAt(m + 1))) { d += text[m + 1]; m += 2; continue; }
      d += text[m]; m++;
    }
    if (!ok) return null;
    k = m + 1;
  } else {
    let depth = 0, m = k;
    while (m < n) {
      const cc = text.charCodeAt(m);
      if (cc === 32 || cc === 9 || cc === 10) break;
      if (cc === 92 && m + 1 < n && isPunct(text.charCodeAt(m + 1))) { d += text[m + 1]; m += 2; continue; }
      if (cc === 40) depth++;
      else if (cc === 41) { if (depth === 0) break; depth--; }
      d += text[m]; m++;
    }
    k = m;
  }
  const dest = unescapeStr(d);
  let title = null;
  let m = k;
  while (m < n && (text.charCodeAt(m) === 32 || text.charCodeAt(m) === 9 || text.charCodeAt(m) === 10)) m++;
  if (m < n && text.charCodeAt(m) !== 41) {
    const t = parseLinkTitle(text, m);
    if (!t) return null;
    title = t.title; m = t.end;
    while (m < n && (text.charCodeAt(m) === 32 || text.charCodeAt(m) === 9 || text.charCodeAt(m) === 10)) m++;
  }
  if (m >= n || text.charCodeAt(m) !== 41) return null;
  return { dest, title, end: m + 1 };
}

function tryResolveLink(text, i, items, delims, openersBottom, refs) {
  // Find the nearest active '[' delimiter above openersBottom.
  let openerIdx = -1;
  for (let d = delims.length - 1; d > openersBottom; d--) {
    const e = delims[d];
    if (e.ch === '[' && e.active) { openerIdx = d; break; }
    if (e.ch === '[' && !e.active) continue;
  }
  if (openerIdx === -1) return null;
  const opener = delims[openerIdx];
  const openItem = opener.item;
  // A failed link attempt deactivates this opener: it may not form a link
  // with a later ']' (cm-513).
  const fail = () => { opener.active = false; return null; };
  // The link text is the items between openItem and the current ']' (which is
  // not yet an item). It must be non-empty and must not contain an unescaped
  // '[' that would make it a nested link... (handled by openersBottom).
  // Parse what follows the ']'.
  const n = text.length;
  let j = i + 1;
  let dest = null, title = null, end = -1;
  // Inline link: (dest "title"). If the parenthesised part is not a valid
  // inline link, fall back to a shortcut reference link (cm-568).
  const inline = (j < n && text.charCodeAt(j) === 40) ? parseInlineLink(text, j) : null;
  if (inline) {
    dest = inline.dest; title = inline.title; end = inline.end;
  } else if (j < n && text.charCodeAt(j) === 40) {
    // A '(' follows but is not a valid inline link: try shortcut ref.
    const linkText = linkTextOf(items, openItem);
    if (linkText === null) return fail();
    const ref = refs.get(normalizeLabel(linkText));
    if (!ref) return fail();
    dest = ref.dest; title = ref.title; end = i + 1;
  } else {
    // Reference link: [label], [], or shortcut.
    let label = null, after = j;
    if (j < n && text.charCodeAt(j) === 91) {
      // [text][label] or [text][].
      const lab = parseLinkLabel(text, j);
      if (!lab) return fail();
      // A collapsed reference [text][] uses the link text as the label.
      label = lab.label === '' ? null : lab.label;
      after = lab.end;
    } else {
      // Shortcut: the label is the link text itself.
      label = null; // computed from the link text below
    }
    let ref;
    if (label === null) {
      const linkText = linkTextOf(items, openItem);
      if (linkText === null) return fail();
      ref = refs.get(normalizeLabel(linkText));
      if (!ref) return fail();
      // Collapsed [text][] consumes the empty second label too.
      end = after !== j ? after : i + 1;
    } else {
      ref = refs.get(normalizeLabel(label));
      if (!ref) return fail();
      end = after;
    }
    if (!ref) return fail();
    dest = ref.dest; title = ref.title;
  }
  // Build the link item: replace the opener item and everything after it up
  // to (not including) the ']' with a link node, and drop the ']' + suffix.
  const openPos = items.indexOf(openItem);
  const children = items.slice(openPos + 1);
  // Mark the delimiters inside this link's text: they may match each other
  // but not delimiters outside the link (cm-473/474/521/534/535).
  const childSet = new Set(children);
  const linkId = ++tryResolveLink._nextLinkId;
  for (const e of delims) {
    if (e.item && childSet.has(e.item)) e.linkId = linkId;
  }
  // Remove any nested linkopen items that are still active inside (they are
  // literal text now); keep them as text.
  for (const ch of children) {
    if (ch.k === 'linkopen') { ch.k = 'text'; ch.s = ch.img ? '![' : '['; }
  }
  const linkItem = { k: 'link', href: dest, title, img: opener.img, children };
  items.splice(openPos, items.length - openPos, linkItem);
  // Deactivate this opener. A link (not an image) also raises openersBottom
  // so no earlier '[' can form a link containing it (links cannot nest);
  // an image leaves earlier '[' usable as an outer link's opener.
  opener.active = false;
  return { end, openersBottom: opener.img ? openersBottom : openerIdx };
}
tryResolveLink._nextLinkId = 0;

// The raw text of a link's label (the items between the opener and ']'),
// or null if it contains a link/code span that makes it unusable as a label.
function linkTextOf(items, openItem) {
  const start = items.indexOf(openItem);
  let out = '';
  for (let k = start + 1; k < items.length; k++) {
    const it = items[k];
    if (it.k === 'text') out += it.s;
    else if (it.k === 'code') out += it.s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    else if (it.k === 'delim') out += it.ch.repeat(it.len);
    else if (it.k === 'soft') out += '\n';
    else if (it.k === 'br') out += '\n';
    else if (it.k === 'html') out += it.s;
    else if (it.k === 'autolink') out += it.text;
    else return null; // nested link etc.
  }
  return out;
}

// Parse a link label [ ... ] starting at text[j] === '['. Returns {label, end}
// or null. Labels may contain balanced brackets only via escapes; a code span
// inside a label uses the exact-length closing rule.
function parseLinkLabel(text, j) {
  const n = text.length;
  let k = j + 1, label = '', depth = 0;
  while (k < n) {
    const c = text.charCodeAt(k);
    // A backslash escape: only \[ and \] resolve here (they affect the
    // label structure); other escapes are preserved verbatim so the label
    // matches only a ref defined with the same escape.
    if (c === 92 && k + 1 < n) {
      const nx = text.charCodeAt(k + 1);
      if (nx === 91 || nx === 93) { label += text[k + 1]; k += 2; continue; }
      label += text[k] + text[k + 1]; k += 2; continue;
    }
    // Balanced nested brackets are part of the label.
    if (c === 91) { depth++; label += text[k]; k++; continue; }
    if (c === 93) {
      if (depth > 0) { depth--; label += text[k]; k++; continue; }
      return { label, end: k + 1 };
    }
    if (c === 96) {
      // Code span: exact-length closing run.
      let m = k, run = 0;
      while (m < n && text.charCodeAt(m) === 96) { run++; m++; }
      let p = m, found = -1;
      while (p < n) {
        if (text.charCodeAt(p) === 96) {
          let q = p, r2 = 0;
          while (q < n && text.charCodeAt(q) === 96) { r2++; q++; }
          if (r2 === run) { found = p; break; }
          p = q;
        } else p++;
      }
      if (found === -1) { label += '`'.repeat(run); k = m; continue; }
      label += text.slice(k, found + run);
      k = found + run;
      continue;
    }
    label += text[k]; k++;
  }
  return null;
}

// Parse a link title at text[m]: "...", '...', or (...). Returns {title, end}.
function parseLinkTitle(text, m) {
  const n = text.length;
  const c = text.charCodeAt(m);
  if (c === 34 || c === 39) {
    const q = c;
    let k = m + 1, t = '';
    while (k < n) {
      const cc = text.charCodeAt(k);
      if (cc === q) return { title: unescapeStr(t), end: k + 1 };
      if (cc === 92 && k + 1 < n && isPunct(text.charCodeAt(k + 1))) { t += text[k + 1]; k += 2; continue; }
      if (cc === 10) return null;
      t += text[k]; k++;
    }
    return null;
  }
  if (c === 40) {
    let k = m + 1, t = '', depth = 0;
    while (k < n) {
      const cc = text.charCodeAt(k);
      if (cc === 40) depth++;
      else if (cc === 41) {
        if (depth === 0) return { title: unescapeStr(t), end: k + 1 };
        depth--;
      }
      if (cc === 92 && k + 1 < n && isPunct(text.charCodeAt(k + 1))) { t += text[k + 1]; k += 2; continue; }
      if (cc === 10) return null;
      t += text[k]; k++;
    }
    return null;
  }
  return null;
}

// ---------- extended autolinks ----------
// Trim trailing punctuation from a URL per the GFM rules, and handle the
// entity-like &name; cut-off. Returns the trimmed end index.
function trimUrlEnd(text, start, end) {
  // Cut before an entity-like &name; (a ';' preceded by &xxx).
  let e = end;
  // Find the last '&' that starts a plausible entity and cut before it.
  for (let k = end - 1; k >= start; k--) {
    if (text.charCodeAt(k) === 38) {
      let m = k + 1;
      while (m < end && /[A-Za-z0-9#]/.test(text.charAt(m))) m++;
      if (m < end && text.charCodeAt(m) === 59 && m - k > 1) { e = k; break; }
      break;
    }
    if (!/[A-Za-z0-9#]/.test(text.charAt(k)) && text.charCodeAt(k) !== 59) break;
  }
  end = e;
  // Balance parens: if there are more ')' than '(', drop trailing ')'s.
  // Then trim trailing punctuation [?!.,:;*_~'] and a trailing backslash.
  let depth = 0;
  for (let k = start; k < end; k++) {
    if (text.charCodeAt(k) === 40) depth++;
    else if (text.charCodeAt(k) === 41) depth--;
  }
  while (end > start) {
    const c = text.charCodeAt(end - 1);
    if (c === 41 && depth < 0) { end--; depth++; continue; }
    if (c === 63 || c === 33 || c === 46 || c === 44 || c === 58 || c === 59 || c === 42 || c === 95 || c === 126 || c === 39) { end--; continue; }
    if (c === 92) { end--; continue; }
    break;
  }
  return end;
}

function tryExtendedUrl(text, i) {
  const n = text.length;
  let j = i;
  // Consume the URL characters: anything except whitespace and < >.
  while (j < n) {
    const c = text.charCodeAt(j);
    if (c === 32 || c === 9 || c === 10 || c === 60 || c === 62) break;
    j++;
  }
  if (j === i) return null;
  let end = trimUrlEnd(text, i, j);
  // A trailing backslash is kept in the URL (percent-encoded), not a break.
  if (end <= i) return null;
  let url = text.slice(i, end);
  // The URL must contain a '.' after the scheme/www (a valid domain).
  const host = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
  if (!host.includes('.')) return null;
  // For www. URLs, the href gets http:// prepended.
  const href = url.startsWith('www.') ? 'http://' + url : url;
  return { href: escapeAttr(encodeUrl(href)), text: escapeAttr(url), end };
}

// Try to match an email autolink starting at text[i] (local-part start).
function isEmailLocalChar(c) {
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) ||
    c === 46 || c === 33 || c === 35 || c === 36 || c === 37 || c === 38 || c === 39 ||
    c === 42 || c === 43 || c === 47 || c === 61 || c === 63 || c === 94 || c === 95 ||
    c === 96 || c === 123 || c === 124 || c === 125 || c === 126 || c === 45;
}

function tryEmail(text, i) {
  const n = text.length;
  let j = i;
  while (j < n && isEmailLocalChar(text.charCodeAt(j))) j++;
  if (j === i || j >= n || text.charCodeAt(j) !== 64) return null;
  const local = text.slice(i, j);
  if (local.charAt(0) === '.' || local.charAt(local.length - 1) === '.' || local.includes('..')) return null;
  let k = j + 1;
  const domStart = k;
  while (k < n) {
    const c = text.charCodeAt(k);
    if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 45 || c === 46 || c === 95) k++;
    else break;
  }
  if (k === domStart) return null;
  let dom = text.slice(domStart, k);
  if (!dom.includes('.')) return null;
  if (dom.charAt(dom.length - 1) === '-') return null;
  while (dom.length && dom.charAt(dom.length - 1) === '.') { dom = dom.slice(0, -1); k--; }
  if (!dom.includes('.')) return null;
  const email = local + '@' + dom;
  return { text: email, end: domStart + dom.length };
}

// ---------- emphasis ----------
function processEmphasis(items, delims) {
  // For each delimiter that can close, look back for the nearest matching
  // opener; apply the odd-match rule; record matches. A delimiter may match
  // more than once (e.g. ***), so each item keeps a list of its matches, and
  // a closer with length left is re-processed until exhausted or unmatched.
  // Nested-emphasis blocking: an outer opener is blocked when a matched
  // inner pair sits between it and the closer, the inner opener can only
  // open, the inner closer can both open and close, and the inner closer's
  // length plus the outer opener's length is a multiple of 3.
  const matchedPairs = [];
  for (let d = 0; d < delims.length; d++) {
    const closer = delims[d];
    if (!closer.active || !closer.canClose) continue;
    if (closer.ch === '[') continue;
    while (closer.active && closer.canClose && closer.item.len > 0) {
      let matched = false;
      for (let o = d - 1; o >= 0; o--) {
        const opener = delims[o];
        if (!opener.active || opener.ch !== closer.ch || !opener.canOpen) continue;
        // Link boundary: delimiters inside a link's text cannot match
        // delimiters outside it (or inside a different link).
        if (opener.linkId !== closer.linkId) continue;
        // Overlap rule: an opener inside an already-matched pair cannot
        // match a closer outside that pair (emphasis may nest, not cross).
        let overlaps = false;
        for (const p of matchedPairs) {
          if (p.openIdx < o && o < p.closeIdx && d > p.closeIdx) { overlaps = true; break; }
        }
        if (overlaps) continue;
        // Nested-emphasis blocking (see above): sum the outer opener's
        // length and the lengths of the closers of all matched pairs fully
        // between it and this closer (can-both closers only); if the total
        // is a multiple of 3 and at least one intervening pair has a
        // can-open-only opener and a can-both closer, the outer opener is
        // blocked for this closer.
        let blocked = false;
        {
          let s = opener.len;
          let hasBlockingPair = false;
          for (const p of matchedPairs) {
            if (p.openIdx > o && p.closeIdx < d && p.open.ch === opener.ch) {
              if (p.close.canOpen && p.close.canClose) s += p.close.len;
              if (p.open.canOpen && !p.open.canClose && p.close.canOpen && p.close.canClose) hasBlockingPair = true;
            }
          }
          blocked = hasBlockingPair && s % 3 === 0;
        }
        if (blocked) continue;
        // Odd-match rule (spec): if either delimiter can both open and close,
        // the sum of the run lengths must not be a multiple of 3 unless both
        // lengths are multiples of 3.
        if ((opener.canOpen && opener.canClose) || (closer.canOpen && closer.canClose)) {
          const ol = opener.item.len, cl = closer.item.len;
          if ((ol + cl) % 3 === 0 && !(ol % 3 === 0 && cl % 3 === 0)) continue;
        }
        let kind, use;
        if (closer.ch === '~') {
          if (opener.item.len < 2 || closer.item.len < 2) continue;
          kind = 'del'; use = 2;
        } else if (opener.item.len >= 2 && closer.item.len >= 2) {
          kind = 'strong'; use = 2;
        } else {
          kind = 'em'; use = 1;
        }
        const m = { open: opener, close: closer, kind, use };
        (opener.item.matches || (opener.item.matches = [])).push(m);
        (closer.item.matches || (closer.item.matches = [])).push(m);
        matchedPairs.push({ openIdx: o, closeIdx: d, open: opener, close: closer });
        opener.item.len -= use;
        closer.item.len -= use;
        if (opener.item.len === 0) opener.active = false;
        if (closer.item.len === 0) closer.active = false;
        matched = true;
        break;
      }
      if (!matched) break;
    }
  }
}

// Plain text of inline items (for image alt attributes): emphasis markers
// that formed emphasis contribute nothing, literal delimiters contribute
// their characters, code spans contribute their text, HTML is stripped.
function plainText(items) {
  let out = '';
  for (const it of items) {
    if (it.k === 'text' || it.k === 'code') {
      out += it.s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    } else if (it.k === 'delim') {
      if (it.len > 0) out += it.ch.repeat(it.len);
    } else if (it.k === 'soft' || it.k === 'br') {
      out += '\n';
    } else if (it.k === 'autolink') {
      out += it.text;
    } else if (it.k === 'link') {
      out += plainText(it.children);
    } else if (it.k === 'linkopen') {
      out += it.img ? '![' : '[';
    }
  }
  return out;
}

// Render the flat item list, honouring emphasis matches and link markers.
// Emphasis is rendered with a stack: an opener pushes its matches (outermost
// first), a closer pops its match.
function renderInline(items, refs) {
  let out = '';
  const stack = []; // open matches
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.k === 'text') { out += it.s; continue; }
    if (it.k === 'code') { out += '<code>' + it.s + '</code>'; continue; }
    if (it.k === 'html') { out += it.s; continue; }
    if (it.k === 'br') { out += '<br>'; continue; }
    if (it.k === 'soft') { out += '\n'; continue; }
    if (it.k === 'autolink') { out += '<a href="' + it.href + '">' + it.text + '</a>'; continue; }
    if (it.k === 'delim') {
      // First close any matches for which this item is the closer.
      if (it.matches) {
        for (const m of it.matches) {
          if (m.close.item !== it) continue;
          const idx = stack.lastIndexOf(m);
          if (idx !== -1) {
            // Close everything above it first (should not happen for
            // well-nested matches, but stay safe).
            while (stack.length > idx) {
              const top = stack.pop();
              out += '</' + (top.kind === 'em' ? 'em' : top.kind === 'strong' ? 'strong' : 'del') + '>';
            }
          }
        }
      }
      // Leftover delimiter length is literal text. For an opener the matched
      // delimiters are the last ones in the run, so the leftover comes
      // before the opening tag; for a closer the leftover comes after the
      // closing tag (already emitted above).
      if (it.len > 0) out += escapeHtml(it.ch.repeat(it.len));
      // Then open any matches for which this item is the opener.
      if (it.matches) {
        const opens = it.matches.filter((m) => m.open.item === it);
        for (let q = opens.length - 1; q >= 0; q--) {
          const m = opens[q];
          stack.push(m);
          out += '<' + (m.kind === 'em' ? 'em' : m.kind === 'strong' ? 'strong' : 'del') + '>';
        }
      }
      continue;
    }
    if (it.k === 'linkopen') {
      out += it.img ? '![' : '[';
      continue;
    }
    if (it.k === 'link') {
      if (it.img) {
        const alt = plainText(it.children);
        const title = it.title ? ' title="' + escapeAttr(it.title) + '"' : '';
        out += '<img src="' + escapeAttr(encodeUrl(it.href)) + '" alt="' + escapeAttr(alt) + '"' + title + '>';
      } else {
        const title = it.title ? ' title="' + escapeAttr(it.title) + '"' : '';
        out += '<a href="' + escapeAttr(encodeUrl(it.href)) + '"' + title + '>' + renderInline(it.children, refs) + '</a>';
      }
      continue;
    }
  }
  return out;
}

// Unescape backslash escapes and entities in a link destination / title / label
// context: backslash + ASCII punctuation -> the punctuation; entities decoded.
function unescapeStr(s) {
  if (!s.includes('\\') && !s.includes('&')) return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 92 && i + 1 < s.length && isPunct(s.charCodeAt(i + 1))) { out += s[i + 1]; i++; }
    else if (c === 38) {
      const e = decodeEntity(s, i);
      if (e) { out += e[0]; i = e[1] - 1; }
      else out += '&';
    } else out += s[i];
  }
  return out;
}

// Normalize a link label: collapse whitespace, case-fold, unescape \[ and \],
// fold ß/ẞ to ss.
function normalizeLabel(s) {
  let out = '';
  let ws = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i], c = s.charCodeAt(i);
    if (c === 92 && i + 1 < s.length && (s.charCodeAt(i + 1) === 91 || s.charCodeAt(i + 1) === 93)) { out += s[i + 1]; i++; ws = false; continue; }
    if (isSpace(c)) { if (!ws && out.length) out += ' '; ws = true; continue; }
    ws = false;
    if (ch === '\u00df' || ch === '\u1e9e') out += 'ss';
    else out += ch.toLowerCase();
  }
  return out.replace(/ +$/, '');
}
