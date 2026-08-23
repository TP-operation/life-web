// เทสของตัวจัดรูปคำถามที่ agent ส่งกลับมา
//
// `.question.json` เขียนโดย agent ซึ่งแปลว่าเป็น **ข้อมูลที่เชื่อไม่ได้**
// สิ่งที่ผ่านตัวนี้จะถูกยิงออกไปที่ LINE และโผล่บนมือถือเจ้าของตอนขับรถ
// จึงต้องมีที่ที่ตรวจรูปร่างได้จริงก่อนส่ง

const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');

const mod = import(pathToFileURL(join(__dirname, 'scripts', 'format-question.mjs')).href);

test('ตัดช่องว่างและขึ้นบรรทัดใหม่ออกจากตัวเลือก', async () => {
  const { normalise } = await mod;
  const q = normalise({ title: '  เลือก\n  ทางไหน  ', options: ['ก\nข', ' ค '] });
  assert.equal(q.title, 'เลือก ทางไหน');
  assert.deepEqual(q.options, ['ก ข', 'ค']);
});

test('รับได้มากสุด 4 ตัวเลือก เพราะปุ่มบน LINE มีแค่ A ถึง D', async () => {
  const { normalise, LETTERS } = await mod;
  const q = normalise({ title: 'x', options: ['1', '2', '3', '4', '5', '6'] });
  assert.equal(q.options.length, LETTERS.length);
});

test('ตัวเลือกที่ยาวเกินถูกตัด — อ่านบนมือถือตอนขับรถต้องจบในบรรทัดเดียว', async () => {
  const { normalise } = await mod;
  const q = normalise({ title: 'x', options: ['ก'.repeat(500)] });
  assert.ok(q.options[0].length <= 120);
});

test('ตัวเลือกว่างถูกทิ้ง ไม่ใช่กลายเป็นปุ่มเปล่า', async () => {
  const { normalise } = await mod;
  const q = normalise({ title: 'x', options: ['ก', '', '   ', 'ข'] });
  assert.deepEqual(q.options, ['ก', 'ข']);
});

test('ของที่ไม่ใช่รูปร่างที่คาดไว้ ไม่ทำให้พัง', async () => {
  const { normalise } = await mod;
  for (const bad of [null, undefined, {}, { options: 'ไม่ใช่ array' }, { title: 123 }]) {
    const q = normalise(bad);
    assert.ok(Array.isArray(q.options), JSON.stringify(bad));
  }
});

test('ตัวเลือกน้อยกว่าสองข้อไม่ใช่คำถามแบบเลือกตอบ', async () => {
  const { normalise, problems } = await mod;
  assert.ok(problems(normalise({ title: 'x', options: ['ก'] })).length > 0);
  assert.ok(problems(normalise({ title: '', options: ['ก', 'ข'] })).length > 0);
  assert.deepEqual(problems(normalise({ title: 'x', options: ['ก', 'ข'] })), []);
});

test('ข้อความที่ส่งมีตัวเลือกครบและไม่มี markdown', async () => {
  const { normalise, toMarkdown } = await mod;
  const md = toMarkdown(normalise({ title: 'เก็บ est ไว้ไหม', options: ['เก็บ', 'ตัดทิ้ง'], why: 'กระทบทั้งระบบ' }));
  assert.match(md, /A\) เก็บ/);
  assert.match(md, /B\) ตัดทิ้ง/);
  assert.match(md, /กระทบทั้งระบบ/);
  assert.equal(md.includes('**'), false, 'LINE แสดงดอกจันดิบ');
});

test('payload ที่ยิงไป Apps Script มีเฉพาะสิ่งที่ตกลงกันไว้', async () => {
  const { normalise, toPayload } = await mod;
  const p = toPayload(normalise({ title: 'x', options: ['ก', 'ข'] }), '29');
  assert.deepEqual(Object.keys(p).sort(), ['issue', 'options', 'title', 'type']);
  assert.equal(p.type, 'ถาม');
  assert.equal(p.issue, 29, 'ต้องเป็นตัวเลข ไม่ใช่สตริง');
});
