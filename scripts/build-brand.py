#!/usr/bin/env python3
"""แปลงไฟล์แบรนด์ต้นฉบับใน assets/brand/ → ไฟล์ที่เสิร์ฟจริงใน public/

  assets/brand/mark.png  (สัญลักษณ์สี่เหลี่ยม 4 ช่อง) → favicon.ico / favicon-32.png
                                                        / favicon-192.png / apple-touch-icon.png
  assets/brand/logo.png  (สัญลักษณ์ + คำว่า "ทูลสยาม") → public/logo.png (โลโก้บน header)

ต้นฉบับมีเงาจาง ๆ กินพื้นที่เกือบเต็มเฟรม จึงครอปตาม alpha ที่เข้มพอ (> 40)
ก่อน แล้วค่อยเติมระยะขอบเองให้เท่ากันทุกไฟล์ — ไม่งั้น favicon ขนาด 16 px จะเล็กจนดูไม่ออก

รัน: npm run brand   (ต้องมี Pillow: pip3 install pillow)
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/brand"
OUT = ROOT / "public"

# ระยะขอบรอบสัญลักษณ์ คิดเป็นสัดส่วนของด้านที่ยาวที่สุด
ICON_PAD = 0.06
# พื้นหลัง apple-touch-icon — iOS ไม่รองรับความโปร่งใส จะเติมพื้นดำให้เองถ้าไม่ใส่
IOS_BG = (255, 255, 255, 255)


def trim(im: Image.Image, threshold: int = 40) -> Image.Image:
    """ครอปทิ้งขอบโปร่งใสและเงาจาง ๆ ออก"""
    alpha = im.getchannel("A").point(lambda v: 255 if v > threshold else 0)
    box = alpha.getbbox()
    return im.crop(box) if box else im


def square(im: Image.Image, pad: float) -> Image.Image:
    """วางภาพไว้กลางผืนสี่เหลี่ยมจัตุรัสโปร่งใสพร้อมระยะขอบ"""
    side = round(max(im.size) * (1 + 2 * pad))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    return canvas


def save_png(im: Image.Image, path: Path, size: tuple[int, int]) -> None:
    """ย่อแล้วบันทึกเป็น PNG แบบ palette — โลโก้มีแค่ไล่เฉดเขียวเฉดเดียว
    255 สีจึงพอ และไฟล์เล็กกว่า truecolor ราว 5 เท่า (FASTOCTREE คงช่อง alpha ไว้)"""
    resized = im.resize(size, Image.LANCZOS)
    resized.quantize(colors=255, method=Image.FASTOCTREE).save(path, "PNG", optimize=True)
    print(f"{path.relative_to(ROOT)!s:<32} {size[0]}x{size[1]:<6} {path.stat().st_size // 1024} KB")


def main() -> None:
    icon = square(trim(Image.open(SRC / "mark.png").convert("RGBA")), ICON_PAD)

    save_png(icon, OUT / "favicon-32.png", (32, 32))
    save_png(icon, OUT / "favicon-192.png", (192, 192))

    # .ico หลายขนาดในไฟล์เดียว สำหรับเบราว์เซอร์เก่าและ crawler ที่ยิงหา /favicon.ico ตรง ๆ
    ico = OUT / "favicon.ico"
    icon.resize((64, 64), Image.LANCZOS).save(ico, "ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"{ico.relative_to(ROOT)!s:<32} {'16/32/48':<11} {ico.stat().st_size // 1024} KB")

    apple = Image.new("RGBA", icon.size, IOS_BG)
    apple.alpha_composite(icon)
    save_png(apple.convert("RGB"), OUT / "apple-touch-icon.png", (180, 180))

    # โลโก้บน header สูงราว 32 px — ส่งที่ 3x เผื่อจอความละเอียดสูง
    logo = trim(Image.open(SRC / "logo.png").convert("RGBA"))
    height = 96
    save_png(logo, OUT / "logo.png", (round(logo.width * height / logo.height), height))


if __name__ == "__main__":
    main()
