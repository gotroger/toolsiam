#!/bin/bash
# แปลงภาพปกต้นฉบับใน assets/covers-src/ →
#   public/covers/<slug>.webp  ภาพบนการ์ด 1200x675 (16:9)
#   public/og/<slug>.jpg       ภาพสำหรับ og:image — JPEG เพราะ crawler บางเจ้า (เช่น LINE) ยังไม่รองรับ WebP
#
# ต้องมี cwebp (brew install webp)
# ต้นฉบับควรเป็นอัตราส่วน ~16:9 ความกว้าง ≥ 1200 px ตั้งชื่อไฟล์ตาม slug ของเครื่องมือ
# เช่น assets/covers-src/net-salary.png → public/covers/net-salary.webp
set -euo pipefail
cd "$(dirname "$0")/.."

command -v cwebp >/dev/null || { echo "ไม่พบ cwebp — ติดตั้งด้วย: brew install webp" >&2; exit 1; }
mkdir -p public/covers public/og

# Pillow บีบ JPEG ได้เล็กกว่า sips เกือบครึ่งที่คุณภาพเท่ากัน (progressive + optimize)
if python3 -c "import PIL" 2>/dev/null; then JPEG_ENCODER=pillow; else JPEG_ENCODER=sips; fi

shopt -s nullglob
for src in assets/covers-src/*.png assets/covers-src/*.jpg assets/covers-src/*.jpeg; do
  slug="$(basename "${src%.*}")"
  out="public/covers/${slug}.webp"

  # ครอปให้ได้ 16:9 พอดีก่อนย่อ เพื่อไม่ให้ภาพถูกยืดหรือบีบ
  read -r w h < <(sips -g pixelWidth -g pixelHeight "$src" | awk '/pixel/ {printf "%s ", $2} END {print ""}')
  target_h=$(( w * 9 / 16 ))
  if [ "$target_h" -le "$h" ]; then
    crop="-crop 0 $(( (h - target_h) / 2 )) $w $target_h"
  else
    target_w=$(( h * 16 / 9 ))
    crop="-crop $(( (w - target_w) / 2 )) 0 $target_w $h"
  fi

  cwebp -quiet -q 80 -m 6 -sharp_yuv $crop -resize 1200 675 "$src" -o "$out"

  # og:image ใช้กรอบเดียวกับภาพบนการ์ด แปลงต่อจากไฟล์ webp ที่ครอปแล้ว
  og="public/og/${slug}.jpg"
  if [ "$JPEG_ENCODER" = pillow ]; then
    python3 -c "
from PIL import Image
Image.open('$out').convert('RGB').save('$og', 'JPEG', quality=82, optimize=True, progressive=True)
"
  else
    sips -s format jpeg -s formatOptions 82 "$out" --out "$og" >/dev/null
  fi

  printf '%-24s webp %-6s og %s\n' "$slug" "$(du -h "$out" | cut -f1)" "$(du -h "$og" | cut -f1)"
done

echo "การ์ด: $(du -ch public/covers/*.webp | tail -1 | cut -f1)  og: $(du -ch public/og/*.jpg | tail -1 | cut -f1)"
