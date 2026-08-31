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
export function topLevelNames(code) {
  const out = [];
  const re = /^(const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
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

  if (!/sessionStorage/.test(html)) {
    warnings.push('ไม่เจอ sessionStorage — โทเคนของคอมที่ทำงานต้องไม่ถูกเก็บถาวร (INVARIANTS §5.1)');
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
  }
  for (const w of warnings) console.log(`::warning::${w}`);
  for (const e of errors) console.error(`::error::${e}`);

  if (errors.length) {
    console.error(`\n${errors.length} เรื่องที่ต้องแก้`);
    process.exit(1);
  }
  console.log('✔ ด่านผ่าน');
}
