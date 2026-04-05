"""
지뢰찾기 픽셀아트 에셋 생성기
=================================
기획서 섹션 8 '아트 에셋 스펙' 기반
모든 스프라이트는 투명 배경(RGBA)으로 생성
"""

from PIL import Image, ImageDraw

# ============================================================
# 공통 팔레트 (지뢰찾기 클래식 + 모던 믹스)
# ============================================================
PALETTE = {
    # 셀 기본
    "cell_light":    (192, 192, 192),   # 셀 면 밝은 부분
    "cell_dark":     (128, 128, 128),   # 셀 면 어두운 부분
    "cell_face":     (189, 189, 189),   # 닫힌 셀 면
    "cell_opened":   (215, 215, 215),   # 열린 셀 배경
    "cell_border_l": (255, 255, 255),   # 볼록 하이라이트
    "cell_border_d": (123, 123, 123),   # 볼록 그림자
    "cell_inner_d":  (90,  90,  90),    # 오목 안쪽 그림자

    # 숫자 색상 (기획서 명시)
    "num1": (0,   0,   255),
    "num2": (0,   128, 0),
    "num3": (255, 0,   0),
    "num4": (0,   0,   128),
    "num5": (128, 0,   0),
    "num6": (0,   128, 128),
    "num7": (0,   0,   0),
    "num8": (128, 128, 128),

    # 오브젝트
    "mine_body":     (30,  30,  30),
    "mine_spike":    (50,  50,  50),
    "mine_shine":    (220, 220, 220),
    "flag_pole":     (40,  40,  40),
    "flag_red":      (230, 40,  40),
    "flag_base":     (40,  40,  40),
    "wrong_x":       (230, 40,  40),
    "explode_bg":    (255, 50,  50),

    # HUD / 7세그먼트
    "seg_on":        (255, 30,  30),
    "seg_off":       (80,  0,   0),
    "seg_bg":        (20,  20,  20),

    # 재시작 버튼
    "btn_face_yellow": (255, 220, 50),
    "btn_face_outline":(80,  80,  0),
    "btn_smile":     (40,  40,  0),
    "btn_eyes":      (40,  40,  0),
    "btn_dead_mouth": (40,  40,  0),
    "btn_sunglasses": (40,  40,  0),

    # 이펙트
    "fx_orange":     (255, 160, 40),
    "fx_yellow":     (255, 230, 60),
    "fx_red":        (255, 60,  30),
    "fx_white":      (255, 255, 255),
    "fx_flag_sparkle":(255, 255, 200),
}

T = (0, 0, 0, 0)  # 투명


# ============================================================
# 헬퍼 함수
# ============================================================
def px(draw, x, y, color, alpha=255):
    """단일 픽셀 그리기"""
    if isinstance(color, tuple) and len(color) == 4:
        draw.point((x, y), fill=color)
    else:
        draw.point((x, y), fill=(*color, alpha))


def fill_rect(draw, x1, y1, x2, y2, color, alpha=255):
    """사각형 채우기"""
    if isinstance(color, tuple) and len(color) == 4:
        draw.rectangle([x1, y1, x2, y2], fill=color)
    else:
        draw.rectangle([x1, y1, x2, y2], fill=(*color, alpha))


# ============================================================
# 1. ui_cell 스프라이트시트 (32x32px × 6프레임 = 192x32)
# 프레임: closed, opened, flagged, exploded, mine, wrong_flag
# ============================================================
def draw_cell_closed(draw, ox, oy):
    """닫힌 셀 - 볼록 3D 타일"""
    S = 32
    # 밝은 면 (위, 왼쪽 테두리)
    fill_rect(draw, ox, oy, ox+S-1, oy+S-1, PALETTE["cell_face"])
    # 하이라이트 (위쪽 2px, 왼쪽 2px)
    fill_rect(draw, ox, oy, ox+S-1, oy+1, PALETTE["cell_border_l"])
    fill_rect(draw, ox, oy, ox+1, oy+S-1, PALETTE["cell_border_l"])
    # 그림자 (아래쪽 2px, 오른쪽 2px)
    fill_rect(draw, ox, oy+S-2, ox+S-1, oy+S-1, PALETTE["cell_border_d"])
    fill_rect(draw, ox+S-2, oy, ox+S-1, oy+S-1, PALETTE["cell_border_d"])
    # 깊은 그림자 코너
    fill_rect(draw, ox+S-1, oy, ox+S-1, oy+S-1, PALETTE["cell_inner_d"])
    fill_rect(draw, ox, oy+S-1, ox+S-1, oy+S-1, PALETTE["cell_inner_d"])


def draw_cell_opened(draw, ox, oy):
    """열린 셀 - 오목 타일 (빈칸)"""
    S = 32
    fill_rect(draw, ox, oy, ox+S-1, oy+S-1, PALETTE["cell_opened"])
    # 오목 테두리 (어두운 안쪽)
    fill_rect(draw, ox, oy, ox+S-1, oy, PALETTE["cell_inner_d"])
    fill_rect(draw, ox, oy, ox, oy+S-1, PALETTE["cell_inner_d"])
    # 밝은 바깥 (아래, 오른쪽)
    fill_rect(draw, ox+1, oy+S-1, ox+S-1, oy+S-1, PALETTE["cell_border_l"])
    fill_rect(draw, ox+S-1, oy+1, ox+S-1, oy+S-1, PALETTE["cell_border_l"])


def draw_flag(draw, ox, oy):
    """깃발 아이콘 (닫힌 셀 위에)"""
    # 기둥
    fill_rect(draw, ox+15, oy+8, ox+16, oy+24, PALETTE["flag_pole"])
    # 빨간 깃발 삼각형
    for row in range(7):
        x_start = ox + 7
        x_end = ox + 14 - row
        if x_end >= x_start:
            fill_rect(draw, x_start, oy+8+row, x_end, oy+8+row, PALETTE["flag_red"])
    # 받침대
    fill_rect(draw, ox+11, oy+25, ox+20, oy+25, PALETTE["flag_base"])
    fill_rect(draw, ox+10, oy+26, ox+21, oy+26, PALETTE["flag_base"])


def draw_mine(draw, ox, oy):
    """지뢰 아이콘"""
    cx, cy = ox+15, oy+15
    # 본체 (원)
    for dy in range(-5, 6):
        for dx in range(-5, 6):
            if dx*dx + dy*dy <= 28:
                px(draw, cx+dx, cy+dy, PALETTE["mine_body"])
    # 스파이크 (십자)
    fill_rect(draw, cx-7, cy-1, cx+7, cy+1, PALETTE["mine_body"])
    fill_rect(draw, cx-1, cy-7, cx+1, cy+7, PALETTE["mine_body"])
    # 대각선 스파이크
    for i in range(-5, 6):
        px(draw, cx+i, cy+i, PALETTE["mine_body"])
        px(draw, cx+i, cy-i, PALETTE["mine_body"])
    # 하이라이트
    px(draw, cx-2, cy-2, PALETTE["mine_shine"])
    px(draw, cx-3, cy-3, PALETTE["mine_shine"])


def generate_ui_cell():
    """ui_cell 스프라이트시트 생성"""
    S = 32
    frames = 6
    img = Image.new("RGBA", (S * frames, S), T)
    draw = ImageDraw.Draw(img)

    # 프레임 0: closed (닫힌 셀)
    draw_cell_closed(draw, 0, 0)

    # 프레임 1: opened (열린 빈 셀)
    draw_cell_opened(draw, S, 0)

    # 프레임 2: flagged (깃발)
    draw_cell_closed(draw, S*2, 0)
    draw_flag(draw, S*2, 0)

    # 프레임 3: exploded (폭발 - 빨간 배경 + 지뢰)
    fill_rect(draw, S*3, 0, S*4-1, S-1, PALETTE["explode_bg"])
    draw_mine(draw, S*3, 0)

    # 프레임 4: mine (게임오버 시 공개되는 지뢰)
    draw_cell_opened(draw, S*4, 0)
    draw_mine(draw, S*4, 0)

    # 프레임 5: wrong_flag (잘못된 깃발 - X 표시)
    draw_cell_opened(draw, S*5, 0)
    draw_mine(draw, S*5, 0)
    # X 표시
    for i in range(-6, 7):
        px(draw, S*5+15+i, 15+i, PALETTE["wrong_x"])
        px(draw, S*5+15+i, 15-i, PALETTE["wrong_x"])
        px(draw, S*5+16+i, 15+i, PALETTE["wrong_x"])
        px(draw, S*5+16+i, 15-i, PALETTE["wrong_x"])

    return img


# ============================================================
# 2. ui_btn_restart 스프라이트시트 (48x48px × 3프레임 = 144x48)
# 프레임: normal(😊), happy/승리(😎), dead/패배(😵)
# ============================================================
def draw_smiley_base(draw, ox, oy):
    """스마일리 베이스 (노란 원)"""
    cx, cy = ox+23, oy+23
    for dy in range(-18, 19):
        for dx in range(-18, 19):
            if dx*dx + dy*dy <= 320:
                px(draw, cx+dx, cy+dy, PALETTE["btn_face_yellow"])
    # 외곽선
    for dy in range(-18, 19):
        for dx in range(-18, 19):
            dist = dx*dx + dy*dy
            if 300 < dist <= 340:
                px(draw, cx+dx, cy+dy, PALETTE["btn_face_outline"])


def draw_btn_normal(draw, ox, oy):
    """노멀 스마일 😊"""
    draw_smiley_base(draw, ox, oy)
    cx, cy = ox+23, oy+23
    # 눈 (두 개의 점)
    fill_rect(draw, cx-7, cy-6, cx-5, cy-3, PALETTE["btn_eyes"])
    fill_rect(draw, cx+5, cy-6, cx+7, cy-3, PALETTE["btn_eyes"])
    # 입 (웃는 호)
    for angle_x in range(-8, 9):
        y_off = (angle_x * angle_x) // 10
        px(draw, cx+angle_x, cy+6+y_off, PALETTE["btn_smile"])
        px(draw, cx+angle_x, cy+7+y_off, PALETTE["btn_smile"])


def draw_btn_happy(draw, ox, oy):
    """승리 선글라스 😎"""
    draw_smiley_base(draw, ox, oy)
    cx, cy = ox+23, oy+23
    # 선글라스 프레임
    fill_rect(draw, cx-11, cy-7, cx-3, cy-2, PALETTE["btn_sunglasses"])
    fill_rect(draw, cx+3, cy-7, cx+11, cy-2, PALETTE["btn_sunglasses"])
    fill_rect(draw, cx-2, cy-5, cx+2, cy-4, PALETTE["btn_sunglasses"])
    # 입 (넓은 웃음)
    for angle_x in range(-9, 10):
        y_off = (angle_x * angle_x) // 12
        px(draw, cx+angle_x, cy+6+y_off, PALETTE["btn_smile"])
        px(draw, cx+angle_x, cy+7+y_off, PALETTE["btn_smile"])


def draw_btn_dead(draw, ox, oy):
    """패배 😵"""
    draw_smiley_base(draw, ox, oy)
    cx, cy = ox+23, oy+23
    # X 눈
    for i in range(-3, 4):
        px(draw, cx-6+i, cy-5+i, PALETTE["btn_eyes"])
        px(draw, cx-6+i, cy-5-i, PALETTE["btn_eyes"])
        px(draw, cx+6+i, cy-5+i, PALETTE["btn_eyes"])
        px(draw, cx+6+i, cy-5-i, PALETTE["btn_eyes"])
    # O 입
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            dist = dx*dx + dy*dy
            if 5 < dist <= 12:
                px(draw, cx+dx, cy+8+dy, PALETTE["btn_dead_mouth"])


def generate_ui_btn_restart():
    """ui_btn_restart 스프라이트시트 생성"""
    S = 48
    img = Image.new("RGBA", (S * 3, S), T)
    draw = ImageDraw.Draw(img)

    draw_btn_normal(draw, 0, 0)
    draw_btn_happy(draw, S, 0)
    draw_btn_dead(draw, S*2, 0)

    return img


# ============================================================
# 3. ui_hud_timer (7세그먼트 디스플레이)
# 23x46px × 11프레임 (0~9 + 마이너스) = 253x46
# ============================================================
# 7세그먼트 레이아웃 (a~g):
#  aaa
# f   b
#  ggg
# e   c
#  ddd
SEGMENTS = {
    '0': (1,1,1,1,1,1,0),
    '1': (0,1,1,0,0,0,0),
    '2': (1,1,0,1,1,0,1),
    '3': (1,1,1,1,0,0,1),
    '4': (0,1,1,0,0,1,1),
    '5': (1,0,1,1,0,1,1),
    '6': (1,0,1,1,1,1,1),
    '7': (1,1,1,0,0,0,0),
    '8': (1,1,1,1,1,1,1),
    '9': (1,1,1,1,0,1,1),
    '-': (0,0,0,0,0,0,1),
}


def draw_7seg(draw, ox, oy, digit_str):
    """7세그먼트 1자리 그리기 (23x46)"""
    W, H = 23, 46
    fill_rect(draw, ox, oy, ox+W-1, oy+H-1, PALETTE["seg_bg"])

    segs = SEGMENTS[digit_str]

    # 각 세그먼트 위치 정의 (x1, y1, x2, y2)
    # a: 상단 가로
    seg_rects = {
        'a': (ox+4, oy+2, ox+18, oy+5),
        'b': (ox+16, oy+4, ox+19, oy+20),
        'c': (ox+16, oy+25, ox+19, oy+41),
        'd': (ox+4, oy+40, ox+18, oy+43),
        'e': (ox+3, oy+25, ox+6, oy+41),
        'f': (ox+3, oy+4, ox+6, oy+20),
        'g': (ox+4, oy+21, ox+18, oy+24),
    }

    for i, key in enumerate('abcdefg'):
        color = PALETTE["seg_on"] if segs[i] else PALETTE["seg_off"]
        r = seg_rects[key]
        fill_rect(draw, r[0], r[1], r[2], r[3], color)


def generate_ui_hud_7seg():
    """7세그먼트 스프라이트시트 생성"""
    W, H = 23, 46
    frames = 11  # 0-9 + minus
    img = Image.new("RGBA", (W * frames, H), T)
    draw = ImageDraw.Draw(img)

    for i in range(10):
        draw_7seg(draw, W*i, 0, str(i))
    draw_7seg(draw, W*10, 0, '-')

    return img


# ============================================================
# 4. fx_explosion (32x32px × 4프레임 = 128x32)
# ============================================================
def generate_fx_explosion():
    """폭발 이펙트 스프라이트시트"""
    S = 32
    frames = 4
    img = Image.new("RGBA", (S * frames, S), T)
    draw = ImageDraw.Draw(img)
    cx_base, cy = 15, 15

    # 프레임 0: 작은 점 (시작)
    ox = 0
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            if dx*dx + dy*dy <= 5:
                px(draw, ox+cx_base+dx, cy+dy, PALETTE["fx_white"])

    # 프레임 1: 중간 폭발
    ox = S
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            dist = dx*dx + dy*dy
            if dist <= 20:
                px(draw, ox+cx_base+dx, cy+dy, PALETTE["fx_yellow"])
            elif dist <= 40:
                px(draw, ox+cx_base+dx, cy+dy, PALETTE["fx_orange"])

    # 프레임 2: 큰 폭발
    ox = S*2
    for dy in range(-10, 11):
        for dx in range(-10, 11):
            dist = dx*dx + dy*dy
            if dist <= 30:
                px(draw, ox+cx_base+dx, cy+dy, PALETTE["fx_white"])
            elif dist <= 60:
                px(draw, ox+cx_base+dx, cy+dy, PALETTE["fx_yellow"])
            elif dist <= 100:
                px(draw, ox+cx_base+dx, cy+dy, PALETTE["fx_orange"], 200)
            elif dist <= 120:
                px(draw, ox+cx_base+dx, cy+dy, PALETTE["fx_red"], 150)

    # 프레임 3: 소멸 (파편)
    ox = S*3
    import random
    random.seed(42)  # 재현성
    for _ in range(20):
        dx = random.randint(-12, 12)
        dy = random.randint(-12, 12)
        c = random.choice([PALETTE["fx_orange"], PALETTE["fx_yellow"], PALETTE["fx_red"]])
        px(draw, ox+cx_base+dx, cy+dy, c, 180)
        px(draw, ox+cx_base+dx+1, cy+dy, c, 100)

    return img


# ============================================================
# 5. fx_flag (32x32px × 3프레임 = 96x32)
# ============================================================
def generate_fx_flag():
    """깃발 꽂기 이펙트 스프라이트시트"""
    S = 32
    frames = 3
    img = Image.new("RGBA", (S * frames, S), T)
    draw = ImageDraw.Draw(img)
    cx, cy = 15, 15

    # 프레임 0: 작은 반짝임
    ox = 0
    for d in [(-3, -3), (3, -3), (-3, 3), (3, 3)]:
        px(draw, ox+cx+d[0], cy+d[1], PALETTE["fx_flag_sparkle"])

    # 프레임 1: 별 모양 반짝임
    ox = S
    points = [(-6, 0), (6, 0), (0, -6), (0, 6),
              (-4, -4), (4, -4), (-4, 4), (4, 4)]
    for p in points:
        px(draw, ox+cx+p[0], cy+p[1], PALETTE["fx_flag_sparkle"])
        px(draw, ox+cx+p[0]//2, cy+p[1]//2, PALETTE["fx_white"], 200)

    # 프레임 2: 소멸 (넓게 퍼진 점들)
    ox = S*2
    far_points = [(-8, -2), (8, -2), (-2, -8), (2, 8),
                  (-7, -7), (7, -5), (-5, 7), (7, 7)]
    for p in far_points:
        px(draw, ox+cx+p[0], cy+p[1], PALETTE["fx_flag_sparkle"], 150)

    return img


# ============================================================
# 숫자 셀 스프라이트시트 (32x32px × 8프레임 = 256x32)
# 숫자 1~8이 그려진 열린 셀
# ============================================================
# 5x7 비트맵 폰트 (숫자 1~8)
NUM_FONT = {
    1: [
        "  #  ",
        " ##  ",
        "  #  ",
        "  #  ",
        "  #  ",
        "  #  ",
        " ### ",
    ],
    2: [
        " ### ",
        "#   #",
        "    #",
        "  ## ",
        " #   ",
        "#    ",
        "#####",
    ],
    3: [
        " ### ",
        "#   #",
        "    #",
        "  ## ",
        "    #",
        "#   #",
        " ### ",
    ],
    4: [
        "   # ",
        "  ## ",
        " # # ",
        "#  # ",
        "#####",
        "   # ",
        "   # ",
    ],
    5: [
        "#####",
        "#    ",
        "#### ",
        "    #",
        "    #",
        "#   #",
        " ### ",
    ],
    6: [
        " ### ",
        "#   #",
        "#    ",
        "#### ",
        "#   #",
        "#   #",
        " ### ",
    ],
    7: [
        "#####",
        "    #",
        "   # ",
        "  #  ",
        "  #  ",
        "  #  ",
        "  #  ",
    ],
    8: [
        " ### ",
        "#   #",
        "#   #",
        " ### ",
        "#   #",
        "#   #",
        " ### ",
    ],
}

NUM_COLORS = [
    PALETTE["num1"], PALETTE["num2"], PALETTE["num3"], PALETTE["num4"],
    PALETTE["num5"], PALETTE["num6"], PALETTE["num7"], PALETTE["num8"],
]


def generate_ui_cell_numbers():
    """숫자 셀 (1~8) 스프라이트시트"""
    S = 32
    frames = 8
    img = Image.new("RGBA", (S * frames, S), T)
    draw = ImageDraw.Draw(img)

    for num in range(1, 9):
        ox = S * (num - 1)
        # 열린 셀 배경
        draw_cell_opened(draw, ox, 0)

        # 숫자 그리기 (중앙 정렬, 2x 스케일)
        font = NUM_FONT[num]
        color = NUM_COLORS[num - 1]
        start_x = ox + 11  # (32 - 5*2) / 2 = 11
        start_y = 9         # (32 - 7*2) / 2 = 9

        for row_i, row in enumerate(font):
            for col_i, ch in enumerate(row):
                if ch == '#':
                    x = start_x + col_i * 2
                    y = start_y + row_i * 2
                    fill_rect(draw, x, y, x+1, y+1, color)

    return img


# ============================================================
# 메인: 모든 에셋 생성 + 저장
# ============================================================
def main():
    import os

    base = os.path.dirname(os.path.abspath(__file__))
    sprites_dir = os.path.join(base, "sprites")
    fx_dir = os.path.join(base, "fx")
    ui_dir = os.path.join(base, "ui")

    os.makedirs(sprites_dir, exist_ok=True)
    os.makedirs(fx_dir, exist_ok=True)
    os.makedirs(ui_dir, exist_ok=True)

    assets = []

    # 1. ui_cell (셀 상태 스프라이트)
    path = os.path.join(sprites_dir, "ui_cell_states.png")
    generate_ui_cell().save(path)
    assets.append(("ui_cell_states.png", "192x32", "6 frames"))
    print(f"  ✅ {path}")

    # 2. ui_cell 숫자 (1~8)
    path = os.path.join(sprites_dir, "ui_cell_numbers.png")
    generate_ui_cell_numbers().save(path)
    assets.append(("ui_cell_numbers.png", "256x32", "8 frames"))
    print(f"  ✅ {path}")

    # 3. ui_btn_restart
    path = os.path.join(ui_dir, "ui_btn_restart.png")
    generate_ui_btn_restart().save(path)
    assets.append(("ui_btn_restart.png", "144x48", "3 frames"))
    print(f"  ✅ {path}")

    # 4. ui_hud_timer / ui_hud_minecount (공유)
    path = os.path.join(ui_dir, "ui_hud_7seg.png")
    generate_ui_hud_7seg().save(path)
    assets.append(("ui_hud_7seg.png", "253x46", "11 frames"))
    print(f"  ✅ {path}")

    # 5. fx_explosion
    path = os.path.join(fx_dir, "fx_explosion.png")
    generate_fx_explosion().save(path)
    assets.append(("fx_explosion.png", "128x32", "4 frames"))
    print(f"  ✅ {path}")

    # 6. fx_flag
    path = os.path.join(fx_dir, "fx_flag.png")
    generate_fx_flag().save(path)
    assets.append(("fx_flag.png", "96x32", "3 frames"))
    print(f"  ✅ {path}")

    print(f"\n🎨 총 {len(assets)}개 스프라이트시트 생성 완료!")
    for name, size, frames in assets:
        print(f"   {name:30s} {size:10s} ({frames})")


if __name__ == "__main__":
    main()
