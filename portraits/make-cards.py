# ครอปรูปการ์ด 1:1 ออกจากภาพมีพื้นหลังใน scene/
#
#   python portraits/make-cards.py
#
# ต้องมี Pillow — เป็นเครื่องมือที่รันด้วยมือตอนได้รูปใหม่ ไม่ได้อยู่ในหน้าเว็บ
# หน้าเว็บยังไม่มี dependency อะไรทั้งสิ้นเหมือนเดิม
#
# ⚠️ อ่านจาก scene/ เขียนลงข้างนอก — ห้ามให้ต้นทางกับปลายทางอยู่โฟลเดอร์เดียวกัน
#    Windows มองชื่อไฟล์แบบไม่แยกตัวพิมพ์ Iris.jpg กับ iris.jpg คือไฟล์เดียวกัน
#    เคยครอปทับต้นฉบับตัวเองมาแล้ว เสียไปสามใบโดยไม่มีอะไรเตือน

import os
import sys
from PIL import Image

# console ของ Windows เป็น cp1252 — print ภาษาไทยแล้วโยน UnicodeEncodeError
# ทิ้งงานที่ทำไปแล้วครึ่ง ๆ กลาง ๆ ต้องบังคับ utf-8 ก่อนพิมพ์อะไรทั้งนั้น
sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
SCENE = os.path.join(HERE, 'scene')

# ชื่อ: (จุดกลางหน้า x, y, ขนาดกรอบ) — **เป็นสัดส่วนของความกว้าง/สูง ไม่ใช่พิกเซล**
#
# ⚠️ ต้องเป็นสัดส่วนเท่านั้น เพราะ shrink_scene ย่อภาพก่อนครอป
#    ถ้าจดเป็นพิกเซลจากภาพต้นฉบับ กรอบจะเลื่อนไปอีกที่หนึ่งเงียบ ๆ หน้าโดนตัดครึ่ง
#
# ขนาดกรอบเล็ก = หน้าใหญ่ขึ้น · ภาพที่ถ่ายไกลต้องใช้กรอบเล็กกว่า
CROPS = {
    'iris':  (0.573, 0.322, 0.404),
    'ada':   (0.586, 0.352, 0.417),
    'ray':   (0.618, 0.342, 0.417),
    'wren':  (0.330, 0.225, 0.260),
    'cora':  (0.420, 0.320, 0.300),
    'scout': (0.495, 0.250, 0.300),
    'mason': (0.546, 0.270, 0.350),
    'vera':  None,
}

CARD = 256
SCENE_W = 1200


def card(name, box):
    src = next((os.path.join(SCENE, name + e) for e in ('.jpg', '.png')
                if os.path.exists(os.path.join(SCENE, name + e))), None)
    if src is None:
        return f'{name}: ยังไม่มีภาพใน scene/'
    if box is None:
        return f'{name}: มีภาพแล้วแต่ยังไม่ได้วัดกรอบครอป — เติมใน CROPS'

    fx, fy, fs = box
    im = Image.open(src).convert('RGB')
    w, h = im.size
    s = round(fs * w)
    l = max(0, min(w - s, round(fx * w) - s // 2))
    t = max(0, min(h - s, round(fy * h) - s // 2))
    out = os.path.join(HERE, name + '.jpg')
    im.crop((l, t, l + s, t + s)).resize((CARD, CARD), Image.LANCZOS).save(
        out, 'JPEG', quality=88, optimize=True)
    return f'{name}.jpg {os.path.getsize(out) // 1024} KB'


def shrink_scene(name):
    """ย่อภาพมีพื้นหลังให้ใต้เพดาน แล้วแปลงเป็น jpg ทิ้งไฟล์เดิม"""
    p = os.path.join(SCENE, name + '.png')
    if not os.path.exists(p):
        return None
    im = Image.open(p).convert('RGB')
    w, h = im.size
    im.resize((SCENE_W, round(h * SCENE_W / w)), Image.LANCZOS).save(
        os.path.join(SCENE, name + '.jpg'), 'JPEG', quality=82, optimize=True)
    os.remove(p)
    return f'scene/{name}.jpg'


if __name__ == '__main__':
    for name, box in CROPS.items():
        moved = shrink_scene(name)
        if moved:
            print(moved)
        print(card(name, box))
