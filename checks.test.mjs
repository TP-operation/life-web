// เทสของด่านเอง — ด่านที่ผิดแย่กว่าไม่มีด่าน เพราะมันให้ความมั่นใจปลอม
//
//   node --test checks.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  check, inlineScripts, topLevelNames, duplicateNames, idsIn, idsUsed, hostsIn, ALLOWED_HOSTS,
  chatRoutesIn, secretsIn, tokenStore, staleHours,
} from './checks.mjs';

/** จุดจบของฟังก์ชันที่คอลัมน์ 0 — เขียนแบบนี้เพื่อเลี่ยง escape ในสคริปต์ที่สร้างไฟล์นี้ */
const NL_BRACE = String.fromCharCode(10) + '}';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const REAL = readFileSync(`${ROOT}index.html`, 'utf8');

// ทุก fixture ต้องเป็น "หน้าที่ถูกต้องอยู่แล้ว" ยกเว้นสิ่งที่เทสนั้นตั้งใจทำให้ผิด
// ไม่งั้นทุกเทสจะแดงเพราะเรื่องที่ไม่ได้ทดสอบ
//
// 8 ก.ย. 2026 เติมสองอย่างเข้ามา เพราะกฎเรื่องที่เก็บโทเคนกับการเตือนข้อมูลเก่า
// เปลี่ยนจาก warning เป็น error — หน้าที่ขาดสองอย่างนี้ไม่ใช่หน้าที่ถูกต้องอีกต่อไป
const BASELINE = `<script>const CHAT_ROUTES = [`
  + ['ออกกำลังกาย', 'ปิดงาน', 'เพิ่มงาน', 'โอที', 'ยืนยันงาน', 'ทิ้งงาน', 'นัด', 'ตอบ', 'สั่ง', 'ถาม']
    .map((p) => `{ p: '${p}' },`).join('')
  + `];
const KEY = 'pat';
const store = () => (localStorage.getItem(KEY) ? localStorage : sessionStorage);
function staleNote(genMs) {
  const ageH = (Date.now() - genMs) / 3600000;
  return ageH > 18 ? 'ข้อมูลเก่า' : '';
}
</script>`;

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}${BASELINE}</body></html>`;

// ---------- หน้าจริงต้องผ่าน ----------

test('index.html ที่ใช้อยู่ตอนนี้ผ่านด่าน', () => {
  const { errors } = check(REAL, { root: ROOT });
  assert.deepEqual(errors, [], errors.join('\n'));
});

// ---------- บั๊กที่เกิดขึ้นจริง 22 ส.ค. 2026 ----------

test('ประกาศชื่อซ้ำต้องแดง — นี่คือบั๊กที่ทำให้ทั้งหน้าใช้ไม่ได้', () => {
  const html = page('<script>const esc = (s) => s;\nfunction esc(s) { return s; }</script>');
  const { errors } = check(html, { root: ROOT });
  assert.ok(errors.length > 0, 'ต้องจับได้');
  assert.ok(errors.some((e) => e.includes('esc')), errors.join('\n'));
});

test('duplicateNames ชี้ทั้งบรรทัดที่ชนและบรรทัดแรก', () => {
  const [d] = duplicateNames('const esc = 1;\nlet x = 2;\nfunction esc() {}');
  assert.equal(d.name, 'esc');
  assert.equal(d.firstLine, 1);
  assert.equal(d.line, 3);
});

test('ชื่อเดียวกันคนละขอบเขตไม่นับว่าซ้ำ', () => {
  // ตัวแปรที่ย่อหน้าอยู่ข้างในฟังก์ชันไม่ใช่ระดับบนสุด ประกาศซ้ำได้ตามปกติ
  const code = 'function a() {\n  const t = 1;\n}\nfunction b() {\n  const t = 2;\n}';
  assert.deepEqual(duplicateNames(code), []);
});

// ---------- สคริปต์ต้องอ่านออก ----------

test('syntax ที่พังต้องแดง', () => {
  const { errors } = check(page('<script>const $ = = 1;</script>'), { root: ROOT });
  assert.ok(errors.some((e) => e.includes('parse ไม่ผ่าน')));
});

test('type="module" แดง เพราะเปิดจากดิสก์ไม่ได้', () => {
  const { errors } = check(page('<script type="module">const a = 1;</script>'), { root: ROOT });
  assert.ok(errors.some((e) => e.includes('module')));
});

test('inlineScripts ข้ามตัวที่มี src', () => {
  const s = inlineScripts('<script src="x.js"></script><script>const a = 1;</script>');
  assert.equal(s.length, 1);
  assert.match(s[0].code, /const a/);
});

// ---------- ของนอก ----------

test('เพิ่ม CDN แล้วแดง', () => {
  const { errors } = check(page('<script src="https://cdn.jsdelivr.net/npm/x"></script>'), { root: ROOT });
  assert.ok(errors.some((e) => e.includes('dependency ภายนอก')));
});

test('web font แดง — คอมที่ทำงานอาจบล็อก', () => {
  const html = page('<style>@import url(https://fonts.googleapis.com/css2?family=X);</style><script>const a = 1;</script>');
  const { errors } = check(html, { root: ROOT });
  assert.ok(errors.some((e) => e.includes('@import')));
  assert.ok(errors.some((e) => e.includes('fonts.googleapis.com')));
});

// ---------- โทเคนต้องไม่หลุดออกนอก GitHub ----------

test('ยิงไปโดเมนอื่นแดง เพราะหน้านี้ถือ PAT อยู่', () => {
  const html = page('<script>fetch("https://evil.example.com/x");\nconst s = sessionStorage;</script>');
  const { errors } = check(html, { root: ROOT });
  assert.ok(errors.some((e) => e.includes('evil.example.com') && e.includes('PAT')), errors.join('\n'));
});

test('GitHub ยังยิงได้', () => {
  assert.deepEqual(hostsIn('https://api.github.com/x https://github.com/y').sort(), ALLOWED_HOSTS.slice().sort());
  const html = page('<script>fetch("https://api.github.com/repos");\nconst s = sessionStorage;</script>');
  assert.deepEqual(check(html, { root: ROOT }).errors, []);
});

// ---------- id ----------

test('id ซ้ำแดง', () => {
  const html = page('<div id="a"></div><div id="a"></div><script>const x = 1;</script>');
  assert.ok(check(html, { root: ROOT }).errors.some((e) => e.includes('id ซ้ำ')));
});

test('เปลี่ยนชื่อ id แค่ครึ่งเดียวแดง', () => {
  // เคสที่พังเงียบที่สุด: เปลี่ยนใน markup แล้วลืมเปลี่ยนในโค้ด หน้าเปิดได้แต่ปุ่มตาย
  const html = page('<div id="askPanel"></div><script>const $ = (id) => document.getElementById(id);\n$("askBox");</script>');
  const { errors } = check(html, { root: ROOT });
  assert.ok(errors.some((e) => e.includes('askBox')), errors.join('\n'));
});

test('idsIn เจอ id ที่อยู่ใน template literal ด้วย', () => {
  // หน้านี้สร้าง markup ด้วย innerHTML เยอะ id ในนั้นก็ต้องนับ
  assert.deepEqual(idsIn('const t = `<div id="row-1"></div>`;'), ['row-1']);
});

test('idsUsed รับทั้ง $() และ getElementById', () => {
  assert.deepEqual(idsUsed('$("a"); document.getElementById("b");').sort(), ['a', 'b']);
});

// ---------- ไม่มี build step ----------

test('🛑 async function ซ้ำต้องแดง — ด่านเคยมองไม่เห็นทั้ง 25 ตัวในไฟล์', () => {
  // 7 ก.ย. 2026 CTO ฉีด `async function load(){}` ซ้ำเข้าไฟล์จริงแล้วด่านยังเขียว
  // เป็นบั๊กชนิดเดียวกับ esc ซ้ำเมื่อ 22 ส.ค. ที่ทำให้ script ทั้งไฟล์พัง
  const [d] = duplicateNames('async function load() {}\nasync function load() {}');
  assert.equal(d?.name, 'load');
  assert.equal(d.firstLine, 1);
  assert.equal(d.line, 2);
});

test('async ชนกับ function ธรรมดาก็ต้องแดง — ชื่อเดียวกันคือชนกัน', () => {
  const [d] = duplicateNames('function loadAgents() {}\nasync function loadAgents() {}');
  assert.equal(d?.name, 'loadAgents');
});

test('ด่านจริง — async function ทุกตัวในหน้าต้องถูกมองเห็น', () => {
  // ⚠️ ข้อนี้ตายเมื่อไหร่ที่ regex ถอยกลับ ไม่ต้องรอให้เกิดบั๊กจริงก่อน
  // ⚠️ inlineScripts คืน {attrs, code, line} ไม่ใช่สตริง
  //    join ตรง ๆ จะได้ '[object Object]' แล้วเทสแดงโดยที่ของจริงไม่ได้ผิด
  const code = inlineScripts(REAL).map((x) => x.code).join('\n;\n');
  const seen = new Set(topLevelNames(code).map((d) => d.name));
  const declared = [...REAL.matchAll(/^async function\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);

  assert.ok(declared.length >= 10,
    'เจอ async function แค่ ' + declared.length + ' ตัว — โครงไฟล์เปลี่ยนแล้ว ด่านนี้ตายแล้ว');
  const blind = declared.filter((n) => !seen.has(n));
  assert.deepEqual(blind, [], 'ด่านมองไม่เห็น async พวกนี้ — ประกาศซ้ำได้โดยไม่มีอะไรร้อง');
});

test('คำที่ขึ้นต้นเหมือนคำสำคัญแต่ไม่ใช่ ต้องไม่ถูกนับ', () => {
  // ถ้าใช้ \s* เฉย ๆ แทน lookahead คำว่า constfoo จะถูกอ่านเป็น const ชื่อ foo
  assert.deepEqual(topLevelNames('constfoo = 1'), []);
  assert.deepEqual(topLevelNames('functional = 1'), []);
  assert.deepEqual(topLevelNames('classroom = 1'), []);
});

test('generator ก็ต้องถูกมองเห็น — ยังไม่มีในไฟล์ แต่จะได้ไม่ตาบอดซ้ำ', () => {
  assert.deepEqual(topLevelNames('function* gen() {}').map((d) => d.name), ['gen']);
  assert.deepEqual(topLevelNames('async function* stream() {}').map((d) => d.name), ['stream']);
});


// ---------- กฎที่ README ประกาศไว้ ต้องมีกลไกบังคับ ----------
//
// 🛑 8 ก.ย. 2026 CTO พิสูจน์ว่า README อ้างสี่ข้อแต่ **ไม่มีข้อไหนถูกบังคับเลย**
//    ทุกข้อข้างล่างนี้คือเคสที่มันทดลองแล้วด่านเดิมผ่านเงียบ

test('🛑 ฝังโทเคนลงในไฟล์ต้องแดง — repo นี้ public และประวัติ git ลบไม่ได้', () => {
  // ⚠️ ต่อสตริงตอนรัน ห้ามเขียนรูปโทเคนเต็ม ๆ ลงไฟล์
  //    ไม่งั้น agent-guard จะจับเทสของเราเองว่าเป็นโทเคนหลุด — และมันจับถูกแล้ว
  const pat = 'github' + '_pat_' + '1'.repeat(40);
  const { errors } = check(page('<script>const T = "' + pat + '";</script>'), { root: ROOT });
  assert.ok(errors.some((e) => e.includes('GitHub PAT')));
});

test('จับความลับได้ครบทั้งสี่ชนิด', () => {
  assert.deepEqual(secretsIn('ghp_' + 'a'.repeat(36)), ['GitHub token']);
  assert.deepEqual(secretsIn('sk-ant-' + 'b'.repeat(24)), ['Anthropic API key']);
  assert.deepEqual(secretsIn('AKfyc' + 'c'.repeat(24)), ['URL ของ Apps Script deployment']);
  assert.deepEqual(secretsIn('ไม่มีอะไร'), []);
  assert.deepEqual(secretsIn(null), []);
});

test('⚠️ placeholder ในช่องกรอกต้องไม่ถูกจับเป็นโทเคนหลุด', () => {
  // ถ้าด่านร้องผิด คนจะปิดมันทิ้ง แล้วเราจะเสียด่านไปทั้งอัน
  assert.deepEqual(secretsIn('placeholder="github_pat_..."'), []);
  assert.deepEqual(secretsIn('ใส่ ghp_ ตามด้วยรหัส'), []);
});

test('ด่านจริง — ไฟล์ที่ใช้อยู่ต้องไม่มีความลับ', () => {
  assert.deepEqual(secretsIn(REAL), []);
});

test('🛑 บังคับให้เก็บโทเคนถาวรต้องแดง — คอมที่ทำงานไม่ใช่เครื่องของเรา', () => {
  // CTO เปลี่ยน store() ให้คืน localStorage เสมอแล้วด่านเดิมยังเขียว
  // เพราะมันตรวจแค่ว่ามีคำว่า sessionStorage อยู่ในไฟล์ ซึ่งยังอยู่ในคอมเมนต์
  const good = 'const store = () => (localStorage.getItem(KEY) ? localStorage : sessionStorage);';
  const bad = 'const store = () => localStorage; // sessionStorage';
  assert.equal(tokenStore(good), 'sessionStorage');
  assert.equal(tokenStore(bad), 'localStorage');
  assert.equal(tokenStore('ไม่มี store เลย'), null);
});

test('รูปที่อ่านไม่ออกต้องถือว่าอันตรายไว้ก่อน', () => {
  // เดาไปทางที่ปลอดภัยกว่า = เดาผิดแล้วโทเคนค้างในเครื่องคนอื่น
  assert.equal(tokenStore('const store = () => pickStore();'), 'localStorage');
});

test('ด่านจริง — หน้าที่ใช้อยู่ต้องเก็บโทเคนแบบชั่วคราวโดยปริยาย', () => {
  assert.equal(tokenStore(REAL), 'sessionStorage');
});

test('🛑 ลบเงื่อนไขเตือนข้อมูลเก่าต้องแดง', () => {
  // ไม่มีเงื่อนไขนี้ หน้าจะแสดงแผนของเมื่อวานเหมือนของวันนี้โดยไม่มีอะไรบอก
  assert.equal(staleHours('if (ageH > 18) {'), 18);
  assert.equal(staleHours('if (false) {'), null);
  const { errors } = check(REAL.replace('ageH > 18', 'false'), { root: ROOT });
  assert.ok(errors.some((e) => e.includes('เตือนข้อมูลเก่า')));
});

test('เกณฑ์ที่หลวมเกินหนึ่งวันก็ไม่นับว่ามีกฎ', () => {
  const { errors } = check(REAL.replace('ageH > 18', 'ageH > 72'), { root: ROOT });
  assert.ok(errors.some((e) => e.includes('72')));
});

test('ด่านจริง — เกณฑ์ที่ใช้อยู่ต้องไม่เกินหนึ่งวัน', () => {
  const h = staleHours(REAL);
  assert.ok(h !== null && h <= 24, 'ได้ ' + h);
});

test('topLevelNames นับเฉพาะที่คอลัมน์ 0', () => {
  const names = topLevelNames('const a = 1;\n  const b = 2;\nfunction c() {}').map((d) => d.name);
  assert.deepEqual(names, ['a', 'c']);
});

test('หน้าที่ไม่บอกว่าเก็บโทเคนที่ไหน ต้องแดง ไม่ใช่แค่เตือน', () => {
  // ⚠️ ของเดิมเป็น warning ซึ่ง CI ไม่แดง แปลว่ากฎนี้ไม่เคยกันอะไรเลย
  //    ตอนนี้ยกเป็น error แล้ว — ตรวจไม่ได้ ต้องถือว่าไม่ผ่าน
  const body = '<script>const a = 1;</script>';
  const bare = `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
  const { errors } = check(bare, { root: ROOT });
  assert.ok(errors.some((e) => e.includes('store()')), errors.join('\n'));
});

// ---------- กล่องแชทต้องรู้จักคำสั่งครบ ----------

test('chatRoutesIn ดึงคำขึ้นต้นออกมาได้ และไม่หยิบค่าของ say มาด้วย', () => {
  const html = `const CHAT_ROUTES = [
  { p: 'ปิดงาน', say: 'ปิดงานให้แล้ว' },
  { p: 'นัด', say: 'จดนัดให้แล้ว' },
];`;
  assert.deepEqual(chatRoutesIn(html), ['ปิดงาน', 'นัด']);
});

test('หา CHAT_ROUTES ไม่เจอ = ล้ม ไม่ใช่ผ่านเงียบ', () => {
  assert.equal(chatRoutesIn('ไม่มีอะไรเลย'), null);
  const bare = '<!doctype html><html><body><script>const a = 1;</script></body></html>';
  const { errors } = check(bare, { root: ROOT });
  assert.ok(errors.some((e) => e.includes('CHAT_ROUTES')));
});

test('ขาดคำสั่งที่เซิร์ฟเวอร์รับอยู่ ต้องแดง — บั๊ก "นัด" 30 ส.ค. 2026', () => {
  // ตัดคำเดียวออกจากรายการจริง แล้วต้องได้ error ที่ชี้คำนั้นตรง ๆ
  const real = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.ok(chatRoutesIn(real).includes('นัด'), 'ไฟล์จริงต้องมี นัด อยู่แล้ว');

  const broken = real.replace(/^.*p: 'นัด'.*$/m, '');
  const { errors } = check(broken, { root: ROOT });
  assert.ok(errors.some((e) => e.includes('นัด')), 'ตัด นัด ออกแล้วด่านต้องจับได้');
});

// ---------- ใครเป็นคนตอบในกล่องแชท ----------

/**
 * ดึงฟังก์ชันจากไฟล์จริง ไม่ใช่ก็อปมาไว้อีกชุด — สองชุดจะหลุดจากกันวันหนึ่ง
 * ตัดด้วยการหาตำแหน่ง ไม่ใช้ regex เพราะรูปแบบฟังก์ชันสำคัญน้อยกว่าความชัดเจน
 */
function fnFromPage(name) {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const head = `function ${name}(`;
  const a = html.indexOf(head);
  assert.notEqual(a, -1, `หา ${name} ในไฟล์จริงไม่เจอ`);
  const end = html.indexOf(NL_BRACE, a);
  assert.notEqual(end, -1, `หาจุดจบของ ${name} ไม่เจอ`);
  const src = html.slice(a, end + NL_BRACE.length);
  // eslint-disable-next-line no-new-func
  return new Function(`${src}` + '; return ' + name + ';')();
}
const REG = {
  agents: [
    { name: 'Ada', prefix: 'ถาม ', portrait: 'ada.jpg' },
    { name: 'Ray', prefix: 'สั่ง ', portrait: 'ray.jpg' },
    { name: 'Cora', prefix: null, portrait: 'cora.jpg' },
    { name: null, prefix: null, portrait: null },
  ],
};

test('รู้ว่าใครตอบจากคำขึ้นต้นของหัวข้อ', () => {
  const agentFor = fnFromPage('agentFor');
  assert.equal(agentFor('ถาม หม้อแปลงไหม้', REG).name, 'Ada');
  assert.equal(agentFor('สั่ง EBR ทำ M1c-5', REG).name, 'Ray');
});

test('เรื่องที่ไม่มีคำขึ้นต้น = สคริปต์จัดการ ไม่มีหน้าโดยตั้งใจ', () => {
  const agentFor = fnFromPage('agentFor');
  assert.equal(agentFor('ซื้อของเข้าบ้าน', REG), null);
  assert.equal(agentFor('', REG), null);
});

test('ไม่มีทะเบียนก็ไม่พัง แค่ไม่มีรูป', () => {
  const agentFor = fnFromPage('agentFor');
  assert.equal(agentFor('ถาม อะไรก็ได้', null), null);
  assert.equal(agentFor('ถาม อะไรก็ได้', { agents: [] }), null);
});

test('agent ที่ไม่มี prefix ต้องไม่ถูกจับคู่กับอะไรทั้งนั้น', () => {
  const agentFor = fnFromPage('agentFor');
  assert.equal(agentFor('อาทิตย์', REG), null, 'Cora ไม่ได้ตื่นจากคำขึ้นต้น');
});
