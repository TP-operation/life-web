# พรอมต์สร้างตัวละครสำหรับ Gemini

> อยู่ในโฟลเดอร์เดียวกับที่วางรูป **จะได้ไม่ต้องตามหาอีก**
> ตัวไหนได้รูปแล้วดูที่ `scene/` · ยังไม่ได้ก็ก็อปพรอมต์ข้างล่างไปใช้

ยึดจาก `70-agents/*.md` ใน repo `life` ทุกตัว — สิ่งที่แต่ละตัวทำ และ **สิ่งที่มันทำไม่ได้**

> ### หลักที่ใช้ตลอดชุดนี้
> **ให้ภาพบอกข้อจำกัดด้วย ไม่ใช่แค่หน้าที่**
>
> Vera *approve ไม่ได้* → วาดตอนกำลังตรวจ ปากกาลอยอยู่ **ไม่ใช่ตอนประทับตรา**
> Scout *อ่านอย่างเดียว* → ถือปากกามาร์ค **ไม่ใช่ถือเครื่องมือซ่อม**
> Wren *แตะทะเบียนไม่ได้* → ถือคลิปบอร์ด เดินดู **ไม่ใช่ยกของ**
>
> ภาพที่เห็นทุกวันสอนเราว่าตัวนั้นทำอะไรได้ — ถ้าภาพบอกผิด ความเข้าใจก็ผิดตาม

**วิธีใช้** — ก็อป `บล็อกสไตล์` + `บล็อกตัวละคร` + `บล็อกห้าม` ต่อกันเป็นพรอมท์เดียว

ถ้าเลือกแบบของ PISFY ได้แล้ว **แนบภาพนั้นไปด้วย** แล้วเติมบรรทัด
`Match the art style, palette, and level of detail of the attached reference exactly.`
ทั้งทีมจะได้ดูเหมือนมาจากมือคนวาดคนเดียวกัน

---

## บล็อกสไตล์ (ใช้ร่วมทุกตัว)

```
Anime illustration, clean cel-shaded style with soft directional lighting.
Crisp line art, muted desaturated palette — no neon, no heavy gradients, no glow effects.
A single character at work inside a small, specific room, shown from the waist up
or in a medium shot, positioned slightly off-centre with the environment readable
around them. The room is lived-in and purposeful, not decorative.
Calm, focused, unhurried mood. Quiet competence, not enthusiasm.
Landscape 3:2 composition, high resolution.
```

---

## 1 · Iris — คัดแยกกล่อง

> เดา est/deadline จากที่เจ้าของพิมพ์เข้ากล่อง · **เดาผิดได้** ทุกตัวเลขมีป้าย `est_by: agent`

```
A composed woman in her late twenties with a straight blunt ink-navy bob and calm
muted teal-green eyes. She wears a dark navy work apron over a cream shirt.
She stands at a wooden sorting table in a small intake room: shallow wooden trays
in rows, each holding slips of handwritten paper; a brass balance scale; a rubber
stamp resting unused; a tall window with pale early-morning light.
She holds one slip up, reading it, deciding which tray it belongs to.
Her expression is neutral and considering — she has not decided yet.
Accent colour: muted teal (#4a7c74). Background palette: warm off-white and aged wood.
```

## 2 · Ada — ถามตอบความรู้

> ตอบคำถามแล้วเก็บเป็นโน้ตความรู้ · **ทุกคำตอบเป็น `ai-draft`** จนกว่าเจ้าของจะตรวจ

```
A woman in her late twenties with dark hair pinned back and thin round glasses,
wearing a muted amber cardigan over a cream collar.
She sits in a narrow archive room: a wall of small wooden card-catalogue drawers
with brass label holders, a green-shaded desk lamp, one open reference book,
and a stack of blank index cards.
She is writing on a card, pen touching paper, eyes still on the open book —
caught mid-thought rather than finished.
One card on the stack is visibly marked with a small pencil tick, as if pending review.
Accent colour: muted amber (#b8873f). Background palette: warm brown, cream, dim green lamplight.
```

## 3 · Ray — สั่งงาน

> รับคำสั่งเดียวแล้วหาว่าเป็นงานของโปรเจคไหน · **เลือกปลายทางเองไม่ได้จริง** script เป็นคนแปลชื่อเป็น repo

```
A young person with short dark hair and a slate-blue work vest over a grey shirt,
standing at an old manual switchboard in a narrow signal room.
The board is a grid of labelled brass jacks, each with a small engraved nameplate;
patch cables hang in loops; only a few lamps are lit.
They are holding one cable, checking a nameplate before plugging it in —
verifying the label rather than choosing freely.
A printed list of permitted destinations is pinned beside the board.
Accent colour: soft blue (#7aa2f7). Background palette: cool grey, brass, dark wood.
```

## 4 · Wren — กวาดโปรเจค

> เดินดูทะเบียนโปรเจคคืนเสาร์ · **แตะ `60-projects/` ไม่ได้** รายงานอย่างเดียว

```
A wiry person with cropped hair and a muted green field jacket,
walking the aisle of a workshop late at night after everyone has gone home.
Rows of workbenches under dust sheets, tools hung in their outlines on the wall,
one warm lantern casting a long pool of light down the aisle, the rest in shadow.
They carry a clipboard and are writing a short note while looking at one covered bench —
observing and recording, hands nowhere near the work itself.
Accent colour: muted green (#5fd39a, desaturated). Background palette: deep night blue, warm lantern amber.
```

## 5 · Cora — สรุปสัปดาห์

> สรุปสัปดาห์คืนอาทิตย์ · **ห้ามทวง ห้ามนับ streak** — "ไม่ได้ทำ" คือสถานะปกติ

```
A woman with long dark hair loosely tied, in a muted violet-grey knit,
sitting at a desk in a quiet room on a Sunday night.
A large ledger lies open, ruled into seven columns — several of them plainly empty,
and the empty ones are unremarkable, not marked or circled.
A cup of tea has gone cold beside it. A window shows dark blue night outside.
She is writing the last line of the page, calm and matter-of-fact.
No charts, no scores, no exclamation marks anywhere in the scene.
Accent colour: muted violet (#9d8ec4). Background palette: night blue, soft lamplight, warm paper.
```

## 6 · Scout — คัดกรองงาน

> อ่าน issue ก่อนใครแล้วบอกว่างานนี้คืออะไร ต้องแตะอะไรบ้าง · **อ่านอย่างเดียว** ติดป้ายได้แค่ `คัดกรองแล้ว`

```
A person in their early thirties with short ash-blond hair and a pale blue field shirt,
at a survey desk in a bright drafting room.
A large rolled-out technical drawing covers the desk, weighted at the corners;
a brass magnifier, a compass, a stack of small pinned notes, and coloured tabs.
They lean over the drawing with a pencil, placing a small marker flag on one area —
annotating it, not altering it. No tools for cutting, joining, or repair anywhere in frame.
Accent colour: pale steel blue (#6f9ba8). Background palette: cool daylight, white paper, pale wood.
```

## 7 · Mason — ลงมือแก้

> **ตัวเดียวในทีมที่เขียนโค้ดได้** · push `main` ไม่ได้ ผลลัพธ์สูงสุดคือ PR ที่ต้องผ่านตาเจ้าของ

```
A broad-shouldered person with dark hair tied back and a leather apron over rolled
shirtsleeves, working at a well-used workbench in a small atelier.
Blueprints pinned to the wall behind, hand tools hung in strict order,
a half-finished wooden component clamped in a jig, curls of shavings on the bench.
They are shaping the piece with focused care, both hands on the work.
The finished piece is not installed anywhere — it sits on the bench,
waiting on a tray marked for someone else to check.
Accent colour: warm amber (#e0aa4e). Background palette: warm wood, worn leather, soft workshop light.
```

## 8 · Vera — ตรวจ PR

> ตาคู่ที่สองก่อนถึงเจ้าของ · **approve ไม่ได้** ทั้งโดยเจตนาและโดยกฎของ GitHub — คอมเมนต์อย่างเดียว

```
A woman in her thirties with dark hair in a low bun and a white lab coat over a
charcoal shirt, at a quality-inspection bench in a clean, plain room.
A bright articulated task lamp throws hard light across the bench.
A clipboard checklist, a pair of callipers, and a single item laid out under the lamp.
She is examining the item closely, pen hovering above the checklist — mid-judgement.
An approval stamp sits at the far edge of the bench, clearly out of reach and unused.
Her expression is questioning, not satisfied.
Accent colour: muted red (#c85a4e). Background palette: clean white, cool grey, one warm lamp.
```

---

## บล็อกห้าม (ต่อท้ายทุกครั้ง)

```
Avoid: exaggerated smile, open-mouth grin, wink, thumbs up, peace sign,
chibi proportions, sparkles, hearts, glowing effects, lens flare,
speech bubbles, any text or lettering or numbers, watermark,
oversaturated or neon colours, cluttered fantasy background,
robots, holograms, floating UI panels, sci-fi screens,
genki/idol energy, generic AI-glossy rendering.
```

**ห้ามมีจอและ UI ลอย ๆ โดยตั้งใจ** — ถ้าวาดเป็นห้องคอมพิวเตอร์ ทุกตัวจะหน้าตาเหมือนกันหมด
ห้องที่ต่างกันคือสิ่งเดียวที่ทำให้จำได้ว่าใครคือใคร

**ห้ามมีตัวหนังสือ** เพราะโมเดลสร้างภาพเขียนตัวหนังสือผิดเกือบทุกครั้ง และผิดในภาพที่จะเห็นทุกวัน


---

# ทีมฝั่ง nse — Dean · Felix · Tess

ทำงานที่ `nse-manufac/plan` กับ `store` ซึ่งเป็นงานให้โรงงานที่บ้าน

> ### ทั้งสามตัวนี้อยู่ใน**โลกโรงงานเล็ก** ไม่ใช่โลกงานฝีมือ/ห้องสมุดแบบทีมแรก
> คอนกรีตขัดมัน · เหล็ก · ไฟฟลูออเรสเซนต์ · แบบฟอร์มคาร์บอนสำเนา · กล่องพลาสติกลังไม้
> ไม่ใช่ไม้เก่า ทองเหลือง โคมไฟเขียว
>
> ทั้งสองทีมขึ้นหน้าเดียวกันคนละเซคชัน **ถ้าโลกเหมือนกันจะจำไม่ได้ว่าใครอยู่ฝั่งไหน**

## 9 · Dean — หัวหน้าทีม คัดกรอง issue

> อ่านงานที่เข้ามาก่อนใคร บอกว่าคืออะไร ต้องแตะอะไร · **แก้อะไรไม่ได้เลย** มีแค่สิทธิ์อ่าน

```
A calm man in his forties with close-cropped greying hair and steel-rimmed glasses,
wearing a plain grey short-sleeve work shirt with a pen in the breast pocket.
He stands at a receiving counter just inside a small factory's front office:
a steel-topped counter, wire trays of carbon-copy job forms, a wall of pigeonholes
behind him each labelled with a plain metal tag, a fluorescent tube overhead,
a roller shutter half open to the plant floor beyond.
He is reading one incoming form and writing a short routing note on it,
deciding which pigeonhole it goes to.
The counter is bare of any tool — no machines, nothing to work a part with,
only paper, trays and pigeonholes within reach.
Accent colour: slate grey-blue (#5b6b7a). Background palette: cool concrete, galvanised steel, pale green form paper.
```

## 10 · Felix — ช่างซ่อม แก้ตาม issue

> **ตัวเดียวฝั่ง nse ที่เขียนโค้ดได้** · push `main` ไม่ได้ · แตะ `.github/` ไม่ได้ ผลลัพธ์สูงสุดคือ PR

```
A compact man in his thirties with dark curly hair tied back and a smear of oil
on one forearm, in navy work coveralls with the sleeves pushed up.
He works at a repair bench in the corner of a small factory: a vice holding a
partly disassembled machine part, a pegboard of spanners and screwdrivers,
a parts washer tray, a spool of wire, a bare bulb in a wire cage above the bench.
He is fitting a component back together with both hands, focused and unhurried.
Behind him and clearly out of his working area, a running production line is
roped off with a chain and a plain hanging sign — he is not near it and not looking at it.
A finished repaired part sits in a wire basket at the bench edge labelled for collection.
Accent colour: warm ochre (#c98b2e). Background palette: navy cotton, oiled steel, cool concrete floor.
```

## 11 · Tess — ผู้ตรวจ ตรวจ PR ก่อนถึงเจ้าของ

> ตาคู่ที่สองฝั่ง nse · **approve ไม่ได้** ทั้งโดยเจตนาและโดยกฎของ GitHub — คอมเมนต์อย่างเดียว

```
A woman in her late thirties with straight black hair cut to the jaw and a plain
navy cardigan over a grey blouse, at a proofing table in a small print-and-records room.
A backlit glass light table with two sheets laid over each other for comparison,
a magnifier loupe on a cord, a red pencil, a metal ruler, shelves of ring binders behind.
She leans over the two sheets, loupe in hand, red pencil hovering — comparing, not yet marking.
An approval stamp and its ink pad sit inside a closed glass-fronted cabinet against the
far wall, plainly not hers to reach.
Her expression is attentive and unconvinced.
Accent colour: muted crimson (#a8453f). Background palette: cool white light-table glow, grey steel shelving, navy wool.
```

---

## ครอปรูปการ์ด

พอได้ภาพมาแล้ว วางที่ `scene/<ชื่อพิมพ์เล็ก>.png` แล้วเปิด `make-cards.py` เติมกรอบครอปใน `CROPS`
สคริปต์จะย่อภาพให้ใต้เพดานและครอปรูปการ์ดให้ในทีเดียว — ดูวิธีที่ [README](README.md)

---

## รอบต่อไป — รูปสำหรับการ์ด

ภาพมีพื้นหลังใช้บนการ์ดขนาด 30px ไม่ได้ จะเละ · ต้องมีอีกใบที่เป็นครอปใกล้

แนบภาพที่ได้แล้วสั่ง

```
Using this exact character — same face, same hair, same clothing, same palette —
generate a tight head-and-shoulders portrait on a plain, softly blurred version of
the same room. Face centred, eyes on the upper third, nothing important within 10%
of the frame edge. Square 1:1. Keep the art style identical.
```

## ตั้งชื่อไฟล์

| ไฟล์ | ใช้ที่ไหน |
|---|---|
| `iris.png` · `ada.png` · `ray.png` · `wren.png` · `cora.png` · `scout.png` · `mason.png` · `vera.png` | รูปการ์ด 1:1 — ตรงกับ `portrait:` ใน `70-agents/` |
| `iris-scene.png` · … | ภาพมีพื้นหลัง 3:2 — สำหรับหน้าทะเบียน |

วางทั้งหมดที่ `D:\life-web\portraits\`

> ⚠️ **ย่อให้เหลือใต้ 200 KB ต่อไฟล์ก่อนวาง** — `life-web` เป็น repo ที่โหลดทุกครั้งที่เปิดหน้า
> รูปการ์ดใหญ่ 256×256 ก็พอ ส่วนภาพมีพื้นหลัง 1200 ด้านยาวพอ

เชื่อมโยง — `70-agents/` · [[ทีม-agent]] · แคนวาสที่ส่งไปก่อนหน้า
