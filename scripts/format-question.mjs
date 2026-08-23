// format-question — แปลง `.question.json` ที่ agent เขียน เป็นข้อความสำหรับคนอ่าน
//
// ⚠️ ไฟล์นี้เหมือนกับของ repo `ebr` ทุกตัวอักษร — สองที่ใช้สัญญาเดียวกันกับ Apps Script
// แก้ที่ไหนต้องแก้อีกที่ด้วย · เทสของทั้งสอง repo ตรวจรูปร่าง payload ข้อเดียวกัน
//
// อยู่ในไฟล์แยกแทนที่จะฝังใน workflow เพราะสองอย่าง
//   1. โค้ดที่ฝังใน YAML ทดสอบไม่ได้ และการ escape ซ้อนสามชั้น (yaml → bash → js)
//      คือที่ที่บั๊กเงียบชอบไปอยู่
//   2. `.question.json` มาจาก agent ซึ่งแปลว่าเป็น **ข้อมูลที่เชื่อไม่ได้** —
//      ต้องมีที่ที่ตรวจรูปร่างมันได้จริง ๆ ก่อนเอาไปยิงออกนอกระบบ
//
//   node scripts/format-question.mjs   อ่าน .question.json เขียน .question.md + .question.payload.json

import { readFileSync, writeFileSync } from 'node:fs';

export const LETTERS = ['A', 'B', 'C', 'D'];

/** ตัดให้เหลือแค่รูปร่างที่ยอมรับได้ — ห้ามส่งอะไรที่ไม่ได้ตรวจออกไปที่ LINE */
export function normalise(raw, { maxTitle = 300, maxOption = 120 } = {}) {
  const s = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
  const title = s(raw?.title).slice(0, maxTitle);
  const options = (Array.isArray(raw?.options) ? raw.options : [])
    .map((o) => s(o).slice(0, maxOption))
    .filter(Boolean)
    .slice(0, LETTERS.length);
  const why = s(raw?.why).slice(0, maxTitle);
  return { title, options, why };
}

/** คำถามนี้ใช้ได้ไหม — ตัวเลือกน้อยกว่าสองข้อไม่ใช่คำถามแบบเลือกตอบ */
export function problems({ title, options }) {
  const out = [];
  if (!title) out.push('ไม่มีหัวข้อคำถาม');
  if (options.length < 2) out.push(`ต้องมีตัวเลือกอย่างน้อย 2 ข้อ (มี ${options.length})`);
  return out;
}

export function toMarkdown({ title, options, why }) {
  const lines = ['agent ติดตรงนี้ ตอบแล้วมันจะเดินต่อรอบหน้า', '', title, ''];
  options.forEach((o, i) => lines.push(`${LETTERS[i]}) ${o}`));
  if (why) lines.push('', `ทำไมตัดสินเองไม่ได้: ${why}`);
  lines.push('', 'ตอบทาง LINE หรือคอมเมนต์ที่นี่ก็ได้ แล้วติดป้าย `อนุมัติแล้ว` ใหม่');
  return lines.join('\n');
}

export function toPayload(q, issue) {
  return { type: 'ถาม', issue: Number(issue), title: q.title, options: q.options };
}

if (process.argv[1]?.endsWith('format-question.mjs')) {
  let raw;
  try {
    raw = JSON.parse(readFileSync('.question.json', 'utf8'));
  } catch (err) {
    console.error(`::error::อ่าน .question.json ไม่ออก — ${err.message}`);
    process.exit(1);
  }

  const q = normalise(raw);
  const bad = problems(q);
  if (bad.length) {
    // ห้ามส่งคำถามที่ตอบไม่ได้ออกไป — เจ้าของจะได้ข้อความที่กดอะไรไม่ได้ตอนขับรถ
    for (const b of bad) console.error(`::error::คำถามใช้ไม่ได้ — ${b}`);
    process.exit(1);
  }

  writeFileSync('.question.md', toMarkdown(q), 'utf8');
  writeFileSync('.question.payload.json', JSON.stringify(toPayload(q, process.env.ISSUE)), 'utf8');
  console.log(`เตรียมคำถามแล้ว — ${q.options.length} ตัวเลือก`);
}
