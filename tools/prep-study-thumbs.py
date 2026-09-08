# -*- coding: utf-8 -*-
# tools/prep-study-thumbs.py — Study 목록 카드용 썸네일: 3:2 크롭 → 360×240 → EXIF 제거 → 40 KB 이하
# 사용: python tools/prep-study-thumbs.py <저장소 루트> [원본 디렉터리]
# 원본은 대부분 각 글의 img/ 안에 이미 있다(라이선스·크레딧이 그 글에 달려 있다).
# 사이트 밖에서 받아온 사진만 두 번째 인자의 디렉터리에서 찾는다(기본값: 저장소 루트).
import os, sys
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = sys.argv[1]
SCRATCH = sys.argv[2] if len(sys.argv) > 2 else ROOT
DST = os.path.join(ROOT, 'site', 'study', 'img')
os.makedirs(DST, exist_ok=True)
SIZE, LIMIT = (360, 240), 40 * 1024

# (결과, 원본 경로, 세로 크롭 기준 0=위 0.5=중앙 1=아래, [명시 크롭 박스])
# 네 번째 값이 있으면 3:2 자동 크롭 대신 그 박스를 그대로 쓴다(여백이 넓은 원본용).
JOBS = [
    ('mix-design.jpg',          os.path.join(ROOT, 'site/study/mix-design/img/pour.jpg'), 0.5),
    # Pixabay 1734392 (peggy_marco) — 8000×8000 정사각에 흰 여백이 넓어 피사체에 맞춰 직접 자른다
    ('mix-design-example.jpg',  os.path.join(SCRATCH, 'mixer-santa.jpg'), 0.5, (1150, 350, 6800, 4117)),
    ('slump-test.jpg',          os.path.join(ROOT, 'site/study/slump-test/img/slump-hero.jpg'), 0.5),
    ('air-yield.jpg',           os.path.join(ROOT, 'site/study/air-yield/img/placing.jpg'), 0.5),
    ('concrete-cylinders.jpg',  os.path.join(ROOT, 'site/study/concrete-cylinders/img/cylinder-hero.jpg'), 0.5),
    ('aggregate-gradation.jpg', os.path.join(ROOT, 'site/study/aggregate-gradation/img/sieve-stack.jpg'), 0.5),
    ('rebar-tension.jpg',       os.path.join(ROOT, 'site/study/rebar-tension/img/rebar-closeup.jpg'), 0.5),
    ('soil-compaction.jpg',     os.path.join(ROOT, 'site/study/soil-compaction/img/earthwork-hero.jpg'), 0.5),
    ('leveling.jpg',            os.path.join(ROOT, 'site/study/leveling/img/setup.jpg'), 0.5),
]
for job in JOBS:
    out, src, anchor = job[0], job[1], job[2]
    box = job[3] if len(job) > 3 else None
    im = Image.open(src).convert('RGB')
    if box:
        im = im.crop(box)
    w, h = im.size
    th = round(w * SIZE[1] / SIZE[0])          # 원본 폭에 맞춘 3:2 높이
    if th <= h:
        top = round((h - th) * anchor)
        im = im.crop((0, top, w, top + th))
    else:                                       # 원본이 3:2보다 납작하면 폭을 줄여 맞춘다
        tw = round(h * SIZE[0] / SIZE[1])
        left = round((w - tw) / 2)
        im = im.crop((left, 0, left + tw, h))
    im = im.resize(SIZE, Image.LANCZOS)
    path, q = os.path.join(DST, out), 82
    while True:
        im.save(path, 'JPEG', quality=q, optimize=True, progressive=True)  # convert('RGB') 사본이라 EXIF 는 남지 않는다
        if os.path.getsize(path) <= LIMIT or q <= 45:
            break
        q -= 4
    print(f'{out:26s} {im.size} {os.path.getsize(path):6d} B  q{q}')
