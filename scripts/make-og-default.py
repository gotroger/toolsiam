#!/usr/bin/env python3
"""สร้างภาพ OG เริ่มต้นของเว็บ → public/og/_default.jpg (1200x675)

ใช้กับหน้าที่ไม่มีภาพปกของตัวเอง เช่น หน้าแรก /tools /pricing
รันใหม่เมื่อแก้ข้อความหรือสีแบรนด์:  python3 scripts/make-og-default.py
ต้องมี Pillow:  pip3 install Pillow
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 675
BG_TOP, BG_BOTTOM = (247, 254, 251), (234, 250, 241)
GLOW = (201, 239, 219)
BRAND = (5, 150, 105)
INK = (15, 42, 32)
MUTED = (71, 105, 89)

THAI = '/System/Library/Fonts/Supplemental/Thonburi.ttc'


def font(size, bold=False):
    return ImageFont.truetype(THAI, size, index=1 if bold else 0)


def centered(draw, y, text, f, fill):
    box = draw.textbbox((0, 0), text, font=f)
    draw.text(((W - (box[2] - box[0])) / 2 - box[0], y), text, font=f, fill=fill)
    return box[3] - box[1]


img = Image.new('RGB', (W, H), BG_TOP)
d = ImageDraw.Draw(img)

# พื้นหลังไล่สีแนวตั้ง
for y in range(H):
    t = y / (H - 1)
    d.line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOTTOM)))

# แสงนุ่มกลางภาพ ให้เข้าชุดกับภาพปกเครื่องมือ
glow = Image.new('RGB', (W, H), BG_TOP)
gd = ImageDraw.Draw(glow)
steps = 60
for i in range(steps, 0, -1):
    t = i / steps
    rx, ry = 470 * t, 330 * t
    gd.ellipse([W / 2 - rx, H * 0.44 - ry, W / 2 + rx, H * 0.44 + ry],
               fill=tuple(round(a + (b - a) * (1 - t)) for a, b in zip(BG_TOP, GLOW)))
img = Image.blend(img, glow, 0.85)
d = ImageDraw.Draw(img)

# ไทล์โลโก้
tw, th = 168, 168
tx, ty = (W - tw) / 2, 118
d.rounded_rectangle([tx + 6, ty + 12, tx + tw + 6, ty + th + 14], radius=44, fill=(190, 227, 209))
d.rounded_rectangle([tx, ty, tx + tw, ty + th], radius=42, fill=BRAND)
f_mark = font(112, bold=True)
mb = d.textbbox((0, 0), 'ท', font=f_mark)
d.text((tx + (tw - (mb[2] - mb[0])) / 2 - mb[0], ty + (th - (mb[3] - mb[1])) / 2 - mb[1]),
       'ท', font=f_mark, fill=(255, 255, 255))

centered(d, 340, 'ทูลสยาม  ToolSiam', font(76, bold=True), INK)
centered(d, 452, 'เครื่องมือออนไลน์ภาษาไทย ใช้ฟรี ไม่ต้องติดตั้ง', font(38), MUTED)

d.rounded_rectangle([W / 2 - 60, 552, W / 2 + 60, 560], radius=4, fill=BRAND)

img.save('public/og/_default.jpg', 'JPEG', quality=86, optimize=True, progressive=True)
print('public/og/_default.jpg', img.size)
