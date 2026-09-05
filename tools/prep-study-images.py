# -*- coding: utf-8 -*-
# tools/prep-study-images.py — 강의 슬라이드 사진을 site/study/mix-design/img/ 로 압축 저장 (Pillow)
# 사용: python tools/prep-study-images.py <슬라이드 미디어 디렉터리>
#   디렉터리에는 image21.jpeg(타설) image23.jpeg(슬럼프) image24.jpeg(골재 등급) image26.jpeg(각진/둥근)이 있어야 한다.
import os
import sys
from PIL import Image

if len(sys.argv) != 2:
    sys.exit("usage: prep-study-images.py <media-dir>")
SRC = sys.argv[1]
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "study", "mix-design", "img")
os.makedirs(DST, exist_ok=True)

# (원본, 결과 파일, 최대 폭 px, JPEG 품질)
JOBS = [
    ("image21.jpeg", "pour.jpg", 1200, 65),
    ("image23.jpeg", "slump-test.jpg", 800, 85),
    ("image24.jpeg", "graded-aggregate.jpg", 350, 88),
    ("image26.jpeg", "angular-rounded.jpg", 331, 88),
]
for name, out, width, quality in JOBS:
    im = Image.open(os.path.join(SRC, name)).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    path = os.path.join(DST, out)
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    print(out, im.size, os.path.getsize(path), "bytes")
