// checks — ด่านของหน้าเว็บ ไม่มี dependency ไม่มี build step
//
// ทำไมต้องมี: 22 ส.ค. 2026 มีโค้ดที่เพิ่มเข้ามาประกาศ `esc` ซ้ำกับของเดิม
// ผลคือ **สคริปต์ทั้งไฟล์พัง ทั้งหน้าใช้ไม่ได้** และจับได้เพราะบังเอิญเปิดเบราว์เซอร์ดู
// เท่านั้น ไม่มีเทสอะไรจับเลย · ไฟล์นี้คือด่านขั้นต่ำที่ต้องมีก่อนปล่อยให้ agent
// แตะ index.html ([[INVARIANTS]] ของ life: agent ที่เขียนโค้ดได้ต้องมีด่านคนกั้น)
//
//   node checks.mjs            ตรวจ index.html
//   node checks.mjs --print    พิมพ์รายละเอียดที่ตรวจได้ แม้ผ่านหมด

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

// โดเมนเดียวที่หน้านี้ยิงไปได้
//
// ⚠️ นี่คือกฎความปลอดภัย ไม่ใช่กฎความสะอาด — หน้านี้ถือ PAT อยู่ใน sessionStorage
// การ fetch ไปโดเมนอื่นแม้แต่ครั้งเดียวคือช่องที่โทเคนหลุดออกไปได้
export const ALLOWED_HOSTS = ['api.github.com', 'github.com'];

// ตัวบ่งชี้ว่ามีของนอกเข้ามา — คอมที่ทำงานอาจบล็อก และหน้านี้ต้องเปิดจากดิสก์ได้ด้วย
const EXTERNAL_HINTS = [
  'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net',
  'unpkg.com', 'cdnjs.cloudflare.com', 'esm.sh', 'skypack.dev',
];

/** ดึงเนื้อในของ <script> ที่ไม่มี src ออกมาพร้อมเลขบรรทัดที่เริ่ม */
/**
 * คำขึ้นต้นที่ life/scripts/issue-intake.mjs รับจริง (+ "สั่ง"/"ถาม" ที่ workflow แยกเอง)
 * อยู่คนละ repo จึงอ่านตรง ๆ ไม่ได้ — เพิ่มที่นั่นแล้วต้องมาเพิ่มที่นี่
 */
const SERVER_PREFIXES = ['ออกกำลังกาย', 'ปิดงาน', 'เพิ่มงาน', 'โอที', 'ยืนยันงาน', 'ทิ้งงาน', 'นัด', 'ตอบ', 'สั่ง', 'ถาม'];

export function inlineScripts(html) {
  const out = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] ?? '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const line = html.slice(0, m.index).split('\n').length;
    out.push({ attrs, code: m[2], line });
  }
  return out;
}

/**
 * ชื่อที่ประกาศไว้ที่คอลัมน์ 0 ของสคริปต์
 *
 * ใช้คอลัมน์เป็นตัวบอกว่า "ระดับบนสุด" แทนการแยกวิเคราะห์จริง เพราะไม่มี parser
 * ให้ใช้และเราไม่รับ dependency · เคสที่พลาดจริง (`function esc()` ชนกับ
 * `const esc =` ทั้งคู่อยู่คอลัมน์ 0) จับได้ด้วยวิธีนี้ทั้งหมด
 */
/**
 * ชื่อที่ประกาศไว้ที่คอลัมน์ 0
 *
 * 🛑 7 ก.ย. 2026 — regex เดิมจับแค่ `const|let|var|function|class`
 *    ไฟล์มี `async function` อยู่ **25 ตัว** และด่านมองไม่เห็นสักตัว
 *    ประกาศ `async function load` ซ้ำได้โดยด่านยังเขียว ซึ่งคือบั๊กชนิดเดียวกับ
 *    `esc` ซ้ำเมื่อ 22 ส.ค. ที่ทำให้ script ทั้งไฟล์พังและทั้งหน้าใช้ไม่ได้
 *
 * ⚠️ `(?=[\s*])` ต้องมี — ถ้าใช้ `\s*` เฉย ๆ คำว่า `constfoo` จะถูกอ่านเป็น
 *    const ชื่อ foo · lookahead บังคับว่าหลังคำสำคัญต้องเป็นเว้นวรรคหรือดาว
 *    ส่วน `\*?` รองรับ generator (`function* gen`) ซึ่งตอนนี้ยังไม่มีในไฟล์
 *    แต่ถ้าวันหนึ่งมี จะได้ไม่ตาบอดซ้ำรอยเดิม
 */
export function topLevelNames(code) {
  const out = [];
  const re = /^(?:async\s+)?(const|let|var|function|class)(?=[\s*])\s*\*?\s*([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(code)) !== null) {
    out.push({ kind: m[1], name: m[2], line: code.slice(0, m.index).split('\n').length });
  }
  return out;
}

/** ชื่อที่ประกาศซ้ำ — ตัวนี้คือบั๊กที่เกิดขึ้นจริง */
export function duplicateNames(code) {
  const seen = new Map();
  const dup = [];
  for (const d of topLevelNames(code)) {
    if (seen.has(d.name)) dup.push({ ...d, firstLine: seen.get(d.name) });
    else seen.set(d.name, d.line);
  }
  return dup;
}

/** id ทั้งหมดในไฟล์ รวมที่อยู่ใน template literal ด้วย */
export function idsIn(html) {
  return [...html.matchAll(/\bid=["']([A-Za-z0-9_-]+)["']/g)].map((m) => m[1]);
}

/** id ที่โค้ดไปหยิบผ่าน $('...') หรือ getElementById */
export function idsUsed(html) {
  const a = [...html.matchAll(/\$\(["']([A-Za-z0-9_-]+)["']\)/g)].map((m) => m[1]);
  const b = [...html.matchAll(/getElementById\(["']([A-Za-z0-9_-]+)["']\)/g)].map((m) => m[1]);
  return [...new Set([...a, ...b])];
}

/** โดเมนทุกตัวที่ถูกอ้างถึงในไฟล์ */
export function hostsIn(html) {
  return [...new Set([...html.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)].map((m) => m[1]))];
}

/**
 * คำขึ้นต้นที่กล่องแชทบนหน้าเว็บรู้จัก — ดึงจาก CHAT_ROUTES ในไฟล์จริง
 * ไม่ได้ก็อปรายการมาไว้อีกชุด เพราะสองชุดจะหลุดจากกันวันหนึ่ง
 */
export function chatRoutesIn(html) {
  const m = /const CHAT_ROUTES = \[([\s\S]*?)\];/.exec(String(html ?? ''));
  if (!m) return null;
  return [...m[1].matchAll(/[{,]\s*p:\s*'([^']+)'/g)].map((x) => x[1]);
}

/**
 * ความลับที่ห้ามอยู่ในไฟล์ไม่ว่ากรณีใด
 *
 * 🛑 เพิ่มอีกชั้นจาก `agent-guard.yml` เมื่อ 8 ก.ย. 2026 — **ของที่นั่นยังอยู่ครบ ไม่ได้ย้าย**
 *    ที่นั่นรันเฉพาะ `pull_request_target` — **push ตรงเข้า main ไม่เคยโดนตรวจเลย**
 *    และ `checks.mjs` เองไม่มีกฎนี้สักข้อ ทั้งที่ README ประกาศว่า "ไม่มีโทเคนฝังในโค้ด"
 *    ตอนนี้ `checks` เป็น required status check แล้ว จึงเป็นที่ที่ถูกต้อง
 *
 * ⚠️ ต้องกำหนดความยาวขั้นต่ำ ไม่งั้น placeholder `github_pat_...` ในช่องกรอก
 *    จะถูกจับเป็นโทเคนหลุด แล้วคนจะปิดด่านทิ้งเพราะมันร้องผิด
 */
export const SECRET_PATTERNS = [
  { re: /gh[pousr]_[A-Za-z0-9]{30,}/, what: 'GitHub token' },
  { re: /github_pat_[A-Za-z0-9_]{30,}/, what: 'GitHub PAT' },
  { re: /sk-ant-[A-Za-z0-9_-]{20,}/, what: 'Anthropic API key' },
  { re: /AKfyc[A-Za-z0-9_-]{20,}/, what: 'URL ของ Apps Script deployment' },
];

export function secretsIn(text) {
  const t = String(text ?? '');
  return SECRET_PATTERNS.filter((p) => p.re.test(t)).map((p) => p.what);
}

/**
 * ทุกบรรทัดที่ **เขียนโทเคนลงเครื่องจริง ๆ** — คืนรายการที่เก็บของแต่ละจุด หรือ null
 *
 * 🛑 สองรอบแล้วที่กฎข้อนี้เฝ้าผิดที่
 *
 *    รอบแรก  `/sessionStorage/.test(html)` — ผ่านเพราะคำนั้นอยู่ในคอมเมนต์
 *    รอบสอง  อ่านรูปของ `store()` — **ซึ่งไม่มีใครเรียกเลย เป็นโค้ดตาย**
 *            เปลี่ยนบรรทัดที่เขียนจริงให้ลง localStorage เสมอ ด่านยังเขียว
 *
 *    บทเรียน: **เฝ้าบรรทัดที่ลงมือ ไม่ใช่บรรทัดที่ประกาศเจตนา**
 *    และเทสต้องกลายพันธุ์ `index.html` ตัวจริง ไม่ใช่สตริงที่เราแต่งเอง
 *    รอบสองผ่านเพราะเทสทดสอบกับสตริงที่เขียนขึ้นมาเองทั้งหมด
 *
 * 'conditional' = ผู้ใช้เลือกเอง · 'sessionStorage' = ชั่วคราวเสมอ
 * อย่างอื่นถือเป็น 'localStorage' คือเก็บถาวร — **เดาไปทางที่อันตรายกว่าเสมอ**
 */
/**
 * ทางที่ `KEY` ถูกใช้นอกเหนือจาก get/set/removeItem — คืนรายการปัญหา
 *
 * 🛑 agent-review ชี้ว่า `tokenWrite()` กันการ **แก้** บรรทัดเดิมได้ครบ
 *    แต่ไม่กันการ **เพิ่ม** บรรทัดที่สอง · ยืนยันด้วยการรัน สองรูปนี้ผ่านเขียว
 *
 *      localStorage.setItem("life_pat", v);        ← เลี่ยงชื่อ KEY ใช้ค่าตรง ๆ
 *      const K2 = KEY; localStorage.setItem(K2, v); ← ผ่านตัวแปรตัวกลาง
 *
 *    ปิดด้วยกฎสองข้อที่ตรวจได้จริง
 *      1. ค่าของ KEY ต้องเป็นสตริงที่โผล่ครั้งเดียว คือที่บรรทัดประกาศ
 *      2. ตัวแปร KEY ต้องปรากฏเป็นอาร์กิวเมนต์ของ get/set/removeItem เท่านั้น
 *
 * ⚠️ ยังไม่ปิดทุกทาง — โค้ดที่ประกอบชื่อคีย์ขึ้นมาตอนรัน (`'life' + '_pat'`)
 *    ยังเล็ดลอดได้ · **การตรวจข้อความไม่มีวันปิดได้ครบ** และไม่ควรอ้างว่าปิดครบ
 *    แต่สองข้อข้างบนปิดทุกรูปที่มีคนสาธิตมาแล้วจริง
 */
/** ทำให้ข้อความปลอดภัยเมื่อเอาไปประกอบเป็น regex */
const reEscape = (t) => String(t).replace(/[.*+?^\${}()|[\]\\]/g, String.fromCharCode(92) + "$&");

/**
 * เนื้อใน <script> ล้วน ๆ — **ไม่ตัดคอมเมนต์**
 *
 * 🛑 สองรอบแล้วที่การตัดคอมเมนต์ด้วย regex ทำของพัง
 *
 *    รอบแรก  ตัดจาก HTML ทั้งไฟล์ → แอตทริบิวต์ accept ของ input รูปภาพ
 *            เปิดคอมเมนต์ปลอมแล้วกลืนบรรทัดประกาศ const KEY ไปด้วย
 *    รอบสอง  ตัดเฉพาะในสคริปต์ → ยังพังอยู่ดี เพราะทุก URL มี // อยู่กลางสตริง
 *            ทุกอย่างหลัง URL ในบรรทัดเดียวกันหายไปจากสายตาด่าน
 *            บรรทัดที่เขียนโทเคนซ่อนหลัง URL ได้ทั้งบรรทัด
 *
 * **ตัวตัดคอมเมนต์ที่ไม่รู้จักสตริง เชื่อไม่ได้** และจะรู้จักสตริงได้ต้องเขียน tokenizer
 * ซึ่งเกินกว่าที่ไฟล์นี้ควรมี · จึงไม่ตัดเลย แล้วไปข้ามคอมเมนต์ตอนรายงานแทน
 * ข้ามเฉพาะบรรทัดที่ **ทั้งบรรทัดเป็นคอมเมนต์** ซึ่งดูจากตัวขึ้นต้นได้โดยไม่ต้องรู้จักสตริง
 */
function scriptCode(html) {
  return inlineScripts(html).map((x) => x.code).join('\n;\n');
}

export function keyMisuse(html) {
  const src = scriptCode(html ?? "");

  // ⚠️ ต้องรับ backtick ด้วย — รอบก่อนรับแค่ ' กับ " แล้ว
  //    `localStorage.setItem(`+"`"+`life_pat`+"`"+`, v)` หลุดทั้งชุด
  //    ต่างจากเคสที่ปิดไปแล้วแค่เครื่องหมายคำพูดตัวเดียว
  const decl = /const\s+KEY\s*=\s*(['"`])([^'"`]+)\1/.exec(src);
  if (!decl) return ['ไม่เจอการประกาศ const KEY — ตรวจเส้นทางโทเคนไม่ได้'];

  const out = [];
  const value = decl[2];

  // ⚠️ ต้อง escape ก่อนยัดเข้า RegExp
  //    ถ้าค่าคีย์มี ( หรือ . ของเดิมจะโยน SyntaxError ทั้งรอบ หรือกลายเป็น wildcard
  //    ด่านที่พังพร้อม stack trace แย่กว่าด่านที่บอกว่าอะไรผิด
  const hits = (src.match(new RegExp("(['\"`])" + reEscape(value) + "\\1", 'g')) ?? []).length;
  if (hits > 1) {
    out.push(`สตริง '${value}' โผล่ ${hits} ครั้ง — ต้องมีที่บรรทัดประกาศ KEY ที่เดียว`);
  }

  // ลบการใช้ที่ถูกต้องทิ้งก่อน แล้วที่เหลือคือการใช้ผิด
  //
  // ⚠️ ทำกับทั้งไฟล์ ไม่ใช่ทีละบรรทัด เพราะ `setItem(` กับ `KEY` อยู่คนละบรรทัดได้
  //    รอบก่อนวนทีละบรรทัดแล้วขึ้นแดงใส่โค้ดที่ถูกต้อง ซึ่งเป็น false alarm
  //    ชนิดที่ไฟล์นี้เตือนตัวเองไว้ว่า "ด่านที่ร้องผิดคือด่านที่ถูกปิดทิ้ง"
  const rest = src
    .replace(/const\s+KEY\s*=\s*(['\"`])[^'\"`]*\1/, ' ')
    .replace(/(?:get|set|remove)Item\(\s*KEY\b/g, ' ');

  // ⚠️ ข้ามเฉพาะบรรทัดที่ทั้งบรรทัดเป็นคอมเมนต์ — คอมเมนต์ต่อท้ายโค้ดยังนับ
  //    เดาไปทางที่ปลอดภัยกว่า: ยอมร้องเกินดีกว่ายอมให้ผ่านเพราะเดาว่าเป็นคอมเมนต์
  for (const line of rest.split('\n')) {
    const t = line.trim();
    if (!/\bKEY\b/.test(t)) continue;
    //    ⚠️ ช่องแคบที่รู้ตัว: บรรทัดโค้ดที่ขึ้นต้นด้วย * (ตัวคูณที่ตัดบรรทัด)
    //       จะถูกข้ามไปด้วย · ยอมไว้เพราะรูปนั้นแทบไม่มีใครเขียน และการแยกให้ออก
    //       ต้องรู้ว่าอยู่ในบล็อกคอมเมนต์หรือเปล่า ซึ่งต้องมี tokenizer อีกที
    if (t.startsWith('//') || t.startsWith('*')) continue;
    out.push(`ใช้ KEY นอกเหนือจาก get/set/removeItem: ${t.slice(0, 60)}`);
  }
  return out;
}

export function tokenWrite(html) {
  const hits = [...String(html ?? '').matchAll(/([^\n;{}]*)\.setItem\(\s*KEY\s*,/g)]
    .map((m) => m[1].trim());
  if (!hits.length) return null;
  return hits.map((recv) => {
    if (/\?[^:]*:\s*sessionStorage\s*\)?$/.test(recv)) return 'conditional';
    if (/(^|[^\w.])sessionStorage\s*\)?$/.test(recv)) return 'sessionStorage';
    return 'localStorage';
  });
}

/**
 * เกณฑ์ชั่วโมงที่ถือว่าข้อมูลเก่า — คืนตัวเลข หรือ null ถ้าไม่มีเลย
 *
 * ⚠️ **ข้อนี้พิสูจน์ได้แค่ว่ากฎยังอยู่ในโค้ด ไม่ได้พิสูจน์ว่ามันขึ้นจริงบนหน้าจอ**
 *    การพิสูจน์อย่างหลังต้องรันหน้าใน DOM ซึ่งยังทำไม่ได้ที่นี่
 *    README ต้องเขียนตรง ๆ ว่าข้อนี้ยังอาศัยคน
 */
/** เพดานชั่วโมงที่ยอมรับได้ — ต้องตรงกับตัวเลขใน README */
export const STALE_MAX = 18;

export function staleHours(html) {
  const m = /ageH\s*>\s*(\d+)/.exec(String(html ?? ''));
  return m ? Number(m[1]) : null;
}

export function check(html, { root = ROOT } = {}) {
  const errors = [];
  const warnings = [];
  const facts = {};

  // ---- ไม่มี build step ----
  for (const f of ['package.json', 'node_modules', 'src', 'dist', 'build']) {
    if (existsSync(join(root, f))) {
      errors.push(`เจอ ${f} — หน้านี้ต้องเป็นไฟล์เดียวเปิดจากดิสก์ได้ ไม่มีขั้นตอน build`);
    }
  }

  // ---- สคริปต์ต้องอ่านออก ----
  const scripts = inlineScripts(html);
  facts.scripts = scripts.length;
  if (scripts.length === 0) errors.push('ไม่มี <script> ในไฟล์เลย — น่าจะมีอะไรผิด');

  for (const s of scripts) {
    if (/\btype\s*=\s*["']module["']/i.test(s.attrs)) {
      // module ทำให้เปิดจาก file:// ไม่ได้เพราะติด CORS — และหน้านี้ต้องเปิดจากดิสก์ได้
      errors.push(`บรรทัด ${s.line}: <script type="module"> เปิดจากดิสก์ไม่ได้`);
    }
    try {
      new Script(s.code, { filename: `index.html:${s.line}` });
    } catch (err) {
      errors.push(`บรรทัด ${s.line}: สคริปต์ parse ไม่ผ่าน — ${err.message}`);
    }
  }

  // ---- ห้ามประกาศชื่อซ้ำ (บั๊กที่เกิดขึ้นจริง) ----
  const allCode = scripts.map((s) => s.code).join('\n;\n');
  const dups = duplicateNames(allCode);
  // facts ที่เพิ่มมาต้องโผล่ใน --print ด้วย ไม่งั้นเก็บไว้ทำไม
  facts.topLevel = topLevelNames(allCode).length;
  for (const d of dups) {
    errors.push(`ประกาศ \`${d.name}\` ซ้ำ (${d.kind} บรรทัดที่ ${d.line} ของสคริปต์ ประกาศแรกอยู่บรรทัด ${d.firstLine}) — ทั้งไฟล์จะไม่ทำงาน`);
  }

  // ---- id ----
  const ids = idsIn(html);
  const seen = new Set();
  const dupIds = new Set();
  for (const id of ids) {
    if (seen.has(id)) dupIds.add(id);
    seen.add(id);
  }
  facts.ids = seen.size;
  for (const id of dupIds) errors.push(`id ซ้ำ: ${id}`);

  const used = idsUsed(html);
  facts.idsUsed = used.length;
  const missing = used.filter((id) => !seen.has(id));
  for (const id of missing) errors.push(`โค้ดหยิบ id "${id}" แต่ไม่มี element ไหนใช้ชื่อนี้`);

  // ---- ไม่มีของนอก ----
  if (/<script[^>]*\bsrc\s*=/i.test(html)) errors.push('มี <script src=...> — ห้ามมี dependency ภายนอก');
  if (/<link[^>]*rel\s*=\s*["']?stylesheet/i.test(html)) errors.push('มี <link rel="stylesheet"> — ห้ามมี stylesheet ภายนอก');
  if (/@import/i.test(html)) errors.push('มี @import ใน CSS — ห้ามมี');
  for (const h of EXTERNAL_HINTS) {
    if (html.includes(h)) errors.push(`อ้างถึง ${h} — คอมที่ทำงานอาจบล็อก และหน้านี้ต้องเปิดจากดิสก์ได้`);
  }

  // ---- ยิงไปได้เฉพาะ GitHub ----
  const hosts = hostsIn(html);
  facts.hosts = hosts;
  for (const h of hosts) {
    if (!ALLOWED_HOSTS.includes(h)) {
      errors.push(`อ้างถึงโดเมน ${h} — หน้านี้ถือ PAT อยู่ใน sessionStorage การยิงออกนอก GitHub คือช่องที่โทเคนหลุด`);
    }
  }

  // ---- ความลับห้ามอยู่ในไฟล์ ----
  for (const what of secretsIn(html)) {
    errors.push(`เจอ ${what} ในไฟล์ — repo นี้ public และประวัติ git ลบไม่ได้`);
  }

  // ---- โทเคนต้องไม่ถูกเก็บถาวรโดยปริยาย ----
  const writes = tokenWrite(html);
  facts.tokenWrite = writes;
  if (writes === null) {
    errors.push('ไม่เจอบรรทัดที่เขียนโทเคนลงเครื่อง — ตรวจไม่ได้ ถือว่าไม่ผ่าน');
  } else {
    for (const w of writes) {
      if (w === 'localStorage') {
        errors.push('มีบรรทัดที่เขียนโทเคนลง localStorage โดยไม่ให้ผู้ใช้เลือก'
          + ' — คอมที่ทำงานไม่ใช่เครื่องของเรา (INVARIANTS §5.1)');
      }
    }
  }
  for (const m of keyMisuse(html)) errors.push(m);

  // ---- ต้องเตือนเมื่อข้อมูลเก่า ----
  const stale = staleHours(html);
  facts.staleHours = stale;
  if (stale === null) {
    errors.push('ไม่มีเกณฑ์เตือนข้อมูลเก่า — หน้าจะแสดงแผนของเมื่อวานเหมือนของวันนี้เงียบ ๆ');
  } else if (stale > STALE_MAX) {
    // ⚠️ ตัวเลขนี้ต้องตรงกับที่ README เขียน ไม่งั้นเอกสารกับด่านบอกคนละอย่าง
    //    ซึ่งเป็นความผิดพลาดชนิดเดียวกับที่ทั้ง PR นี้ตั้งใจจะแก้
    errors.push(`เกณฑ์เตือนข้อมูลเก่าตั้งไว้ ${stale} ชม. เกิน ${STALE_MAX} ที่ README ประกาศไว้`);
  }

  // ---- กล่องแชทต้องรู้จักคำสั่งครบตามที่ฝั่งเซิร์ฟเวอร์รับจริง ----
  //
  // ⚠️ 30 ส.ค. 2026 หน้าเว็บขาดคำว่า "นัด" ไปเงียบ ๆ ขณะที่ LINE มี
  //    ผลคือพิมพ์ "นัด หมอฟัน 5 ก.ย." แล้วระบบ **จดลง วันนัด.md ถูกต้อง**
  //    แต่ตอบกลับว่า "จดเข้ากล่องแล้ว เดี๋ยว Iris จัดให้เป็นงานเอง" ซึ่งผิด
  //    เจ้าของอ่านแล้วจะคิดว่าสั่งไม่ได้ แล้วเลิกใช้ทั้งที่มันใช้ได้อยู่
  //
  //    แหล่งความจริงคือ life/scripts/issue-intake.mjs ซึ่งอยู่คนละ repo
  //    ด่านนี้จึงถือรายการไว้เอง — เพิ่มคำสั่งใหม่ที่นั่นต้องมาเพิ่มที่นี่ด้วย
  const routes = chatRoutesIn(html);
  facts.chatRoutes = routes ? routes.length : 0;
  if (!routes) {
    errors.push('หา CHAT_ROUTES ในไฟล์ไม่เจอ — กล่องแชทจะตอบผิดทุกคำสั่ง');
  } else {
    for (const p of SERVER_PREFIXES) {
      if (!routes.includes(p)) errors.push(`กล่องแชทไม่รู้จักคำว่า "${p}" ที่ฝั่งเซิร์ฟเวอร์รับอยู่ — จะตอบยืนยันผิด`);
    }
  }

  return { errors, warnings, facts };
}

// ---------- CLI ----------

if (process.argv[1]?.endsWith('checks.mjs')) {
  const files = readdirSync(ROOT).filter((f) => f.endsWith('.html'));
  if (files.length !== 1) {
    console.error(`::error::ต้องมีไฟล์ .html ไฟล์เดียว แต่เจอ ${files.length} (${files.join(', ')})`);
    process.exit(1);
  }
  const html = readFileSync(join(ROOT, files[0]), 'utf8');
  const { errors, warnings, facts } = check(html);

  if (process.argv.includes('--print') || errors.length) {
    console.log(`${files[0]} — สคริปต์ ${facts.scripts} ก้อน · ประกาศระดับบน ${facts.topLevel} ชื่อ · id ${facts.ids} ตัว (ใช้จริง ${facts.idsUsed}) · โดเมน ${(facts.hosts ?? []).join(' ') || 'ไม่มี'}`);
    // facts ที่เก็บแล้วไม่โชว์ ก็เท่ากับไม่ได้เก็บ — คนอ่านต้องเห็นว่าด่านเห็นอะไร
    console.log(`  โทเคน ${(facts.tokenWrite ?? ['ไม่พบ']).join(' ')} · เตือนข้อมูลเก่าที่ ${facts.staleHours ?? 'ไม่มี'} ชม.`);
  }
  for (const w of warnings) console.log(`::warning::${w}`);
  for (const e of errors) console.error(`::error::${e}`);

  if (errors.length) {
    console.error(`\n${errors.length} เรื่องที่ต้องแก้`);
    process.exit(1);
  }
  console.log('✔ ด่านผ่าน');
}
