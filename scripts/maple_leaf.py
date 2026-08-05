#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
枫叶形状生成器
----------------
用参数化方法生成一版更写实的五裂枫叶：
  - 中央裂片尖长、侧裂片与基裂片依次变短
  - 裂片间深 V 形裂口（sinus）
  - 叶缘细密不规则锯齿
  - 心形叶基 + 叶柄
  - 种子随机产生轻微不对称，保持自然感

输出：
  1. effect-preview/leaf-design/ 下的 PNG/SVG 预览（用于迭代确认）
  2. components/maple-leaf-shape.ts 轮廓点数据（供 MapleLeaves.tsx 使用）

用法：
  python scripts/maple_leaf.py            # 默认种子渲染预览 + 导出
  python scripts/maple_leaf.py --seed 42  # 指定种子
"""

from __future__ import annotations

import argparse
import math
import os
import random

# ---------------------------------------------------------------------------
# 参数
# ---------------------------------------------------------------------------

# 裂片定义：(角度°, 相对主裂片长度, 叶身半宽)
# 角度 90° 指正上方；按角度升序排列（右下基裂片 → 右上裂片 → 中央 → 左上裂片 → 左下基裂片）。
LOBE_DEFS = [
    (-20.0, 0.70, 0.14),   # 右下基裂片
    (22.0, 0.92, 0.18),    # 右上裂片
    (90.0, 1.00, 0.22),    # 中央裂片
    (158.0, 0.92, 0.18),   # 左上裂片
    (200.0, 0.70, 0.14),   # 左下基裂片
]

STEM_LEN = 0.42          # 叶柄长度（相对主裂片）
STEM_CURVE = 0.035       # 叶柄弯曲幅度
SERR_AMP = 0.055         # 锯齿幅度（相对局部尺度）
SERR_DENSE = 16          # 单条边缘锯齿个数
EDGE_SAMPLES = 96        # 单条边缘采样点数


def _jitter(v: float, amt: float, rng: random.Random) -> float:
    return v + rng.uniform(-amt, amt)


def _norm(x: float, y: float) -> tuple[float, float]:
    d = math.hypot(x, y) or 1.0
    return (x / d, y / d)


def build_outline(seed: int = 7) -> tuple[list[tuple[float, float]], float, list[tuple[float, float]]]:
    """返回 (轮廓点列表, 主裂片长度, 裂尖点列表)。坐标：原点在叶基（叶柄附着处），y 向上。"""
    rng = random.Random(seed)

    # 1) 裂片尖端：角度/长度各自带少量随机，产生自然不对称
    tips: list[tuple[float, float, float, float, float]] = []  # (x, y, angle, len, width)
    for ang_deg, base_len, base_w in LOBE_DEFS:
        ang = math.radians(_jitter(ang_deg, 3.2, rng))
        length = _jitter(base_len, 0.07, rng)
        width = base_w * length
        width *= _jitter(1.0, 0.08, rng)
        tips.append((length * math.cos(ang), length * math.sin(ang), ang, length, width))

    # 2) 裂口点：相邻裂片（按角度环形相邻）之间
    n = len(tips)
    sinuses: list[tuple[float, float]] = []
    for i in range(n):
        (_x1, _y1, a1, l1, _w1), (_x2, _y2, a2, l2, _w2) = tips[i], tips[(i + 1) % n]
        mid_ang = a1 + (((a2 - a1 + math.pi) % (2 * math.pi)) - math.pi) / 2
        mid_ang += math.radians(_jitter(0.0, 2.0, rng))
        depth = (l1 + l2) / 2 * _jitter(0.24, 0.03, rng)
        # 底部（两基裂片之间）是叶柄附着的心形缺口，更深
        if i == n - 1:
            depth = (l1 + l2) / 2 * _jitter(0.14, 0.02, rng)
        sinuses.append((depth * math.cos(mid_ang), depth * math.sin(mid_ang)))

    def bulge_side(axis: tuple[float, float], s: tuple[float, float]) -> tuple[float, float]:
        """裂口 s 相对裂片轴线的外鼓方向（叉积判断左右）。"""
        cross = axis[0] * s[1] - axis[1] * s[0]
        if cross > 0:
            return (-axis[1], axis[0])   # 轴线逆时针侧
        return (axis[1], -axis[0])       # 轴线顺时针侧

    def serrated_edge(
        p0: tuple[float, float],
        p1: tuple[float, float],
        bulge: tuple[float, float],
        lobe_len: float,
        lobe_w: float,
        rng: random.Random,
    ) -> list[tuple[float, float]]:
        """从裂口 p0 到裂尖 p1 的锯齿边缘，向 bulge 方向鼓出。"""
        dx = p1[0] - p0[0]
        dy = p1[1] - p0[1]
        nx, ny = _norm(bulge[0], bulge[1])
        pts: list[tuple[float, float]] = []
        ph1 = rng.uniform(0, math.pi * 2)
        ph2 = rng.uniform(0, math.pi * 2)
        step = 1.0 / EDGE_SAMPLES
        for k in range(EDGE_SAMPLES + 1):
            t = k * step
            b = math.sin(math.pi * t)
            bx = p0[0] + dx * t + nx * b * lobe_w
            by = p0[1] + dy * t + ny * b * lobe_w
            # 锯齿：裂片中部最明显，尖端与裂口处收细
            taper = math.sin(math.pi * t)
            # 锯齿：斜向尖齿（0→1 爬升、快速回落），方向指向裂尖；
            # 裂口内缘（t 接近 0）保持平滑，齿从中部才开始出现
            tooth = ((t * SERR_DENSE + ph1) % 1.0) ** 1.15
            ti = int(t * SERR_DENSE + ph1)
            uneven = 0.35 + 1.15 * abs(math.sin(seed * 91.7 + ti * 12.9))
            edge_taper = min(1.0, max(0.0, (t - 0.40) / 0.25))
            tip_taper = min(1.0, max(0.0, (0.90 - t) / 0.14))
            amp = SERR_AMP * lobe_len * taper * edge_taper * tip_taper * b * uneven
            pts.append((bx + nx * amp * tooth, by + ny * amp * tooth))
        return pts

    # 3) 逐裂片生成两条边缘（裂口→裂尖），首尾相接成闭合轮廓
    outline: list[tuple[float, float]] = []
    for i in range(n):
        ax, ay, _ang, _len, lw = tips[i]
        alen = math.hypot(ax, ay) or 1.0
        axis = (ax / alen, ay / alen)
        # 尖端略微外延，形成锐利的渐尖头
        tip = (ax + axis[0] * 0.045, ay + axis[1] * 0.045)
        s_prev = sinuses[(i - 1) % n]
        s_next = sinuses[i]
        l = tips[i][3]
        edge_prev = serrated_edge(s_prev, tip, bulge_side(axis, s_prev), l, lw, rng)
        edge_next = serrated_edge(s_next, tip, bulge_side(axis, s_next), l, lw, rng)
        outline.extend(edge_prev[:-1])
        outline.append(tip)
        outline.extend(reversed(edge_next[:-1]))

    return outline, 1.0, [(t[0], t[1]) for t in tips]


def stem_points(L: float, seed: int) -> list[tuple[float, float]]:
    """叶柄：从叶基向下，略带弯曲。"""
    rng = random.Random(seed + 99)
    curve = _jitter(STEM_CURVE, 0.015, rng)
    n = 8
    pts = []
    for i in range(n + 1):
        t = i / n
        x = curve * math.sin(t * math.pi) * L
        y = -(STEM_LEN * t) * L
        pts.append((x, y))
    return pts


# ---------------------------------------------------------------------------
# 渲染预览
# ---------------------------------------------------------------------------

def render_preview_png(
    outline: list[tuple[float, float]],
    stem: list[tuple[float, float]],
    tips: list[tuple[float, float]],
    path: str,
    night: bool = False,
    scale: int = 4,
) -> None:
    from PIL import Image, ImageDraw

    pad = 0.26
    w = math.ceil((2 + pad * 2) * 200 * scale)
    h = math.ceil((2 + STEM_LEN + pad * 2) * 200 * scale)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def to_canvas(p: tuple[float, float]) -> tuple[float, float]:
        x, y = p
        cx = (x + 1 + pad) * 200 * scale
        cy = (1 + pad - y) * 200 * scale  # y 向上 -> 屏幕向下
        return (cx, cy)

    poly = [to_canvas(p) for p in outline]

    if night:
        d.polygon(poly, fill=(22, 18, 14, 255))
        # 月光轮廓：亮一层的冷银色描边
        d.line(poly + [poly[0]], fill=(190, 206, 222, 255), width=max(2, scale))
    else:
        # 先做叶片遮罩，所有绘制都在遮罩内合成
        from PIL import ImageFilter
        mask = Image.new("L", (w, h), 0)
        md = ImageDraw.Draw(mask)
        md.polygon(poly, fill=255)
        leaf = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ld = ImageDraw.Draw(leaf)

        # 叶面纵向渐变（暖黄橙 → 深红褐）
        y_top = min(p[1] for p in poly)
        y_bot = max(p[1] for p in poly)
        steps = 48
        for i in range(steps):
            k = i / steps
            y0 = int(y_top + (y_bot - y_top) * k)
            y1 = int(y_top + (y_bot - y_top) * (i + 1) / steps) + 1
            r = int(226 + (172 - 226) * k)
            g = int(96 + (58 - 96) * k)
            b = int(52 + (34 - 52) * k)
            ld.rectangle((0, y0, w, y1), fill=(r, g, b, 255))
        # 上部柔光：模糊暖光带，模拟侧光（先画再高斯模糊，避免条纹）
        glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gl_top = y_top
        gl_bot = y_top + (y_bot - y_top) * 0.45
        gd.rectangle((0, int(gl_top), w, int(gl_bot)), fill=(255, 216, 158, 72))
        glow = glow.filter(ImageFilter.GaussianBlur(60 * scale // 2))
        leaf = Image.alpha_composite(leaf, glow)
        ld = ImageDraw.Draw(leaf)

        # 叶脉（掌状主脉：曲线 + 次级侧脉）
        cx, cy = to_canvas((0, 0.02))
        for (tx, ty) in tips:
            # 主脉：朝裂尖方向，带轻微弧度
            midx, midy = to_canvas((tx * 0.46, ty * 0.46))
            tipx, tipy = to_canvas((tx * 0.92, ty * 0.92))
            vein_w = max(4, scale * 2) if abs(ty - 1) < 0.1 else max(3, scale)
            # 三次曲线：控制点让主脉微微外弓
            ctrl_x, ctrl_y = to_canvas((tx * 0.72, ty * 0.72))
            pts_vein = []
            for kk in range(1, 13):
                tt = kk / 12
                u = 1 - tt
                px = u * u * cx + 2 * u * tt * ctrl_x + tt * tt * tipx
                py = u * u * cy + 2 * u * tt * ctrl_y + tt * tt * tipy
                pts_vein.append((px, py))
            ld.line([(cx, cy)] + pts_vein, fill=(110, 34, 20, 150), width=vein_w, joint="curve")
            # 侧脉：主脉中点附近向两侧分叉（大致指向叶缘）
            for s in (-1, 1):
                ex = midx + s * 26 * scale
                ey = midy - 16 * scale
                ld.line([(midx, midy), (ex, ey)], fill=(110, 34, 20, 90), width=max(2, scale // 2))
        ld.line([(cx, cy), (to_canvas((0, -0.02))[0], cy)], fill=(110, 34, 20, 150), width=vein_w)
        # 叶缘描边
        ld.line(poly + [poly[0]], fill=(118, 36, 22, 230), width=max(1, scale // 2))
        img.paste(leaf, (0, 0), mask)

    # 叶柄：粗细渐变
    stem_pts = [to_canvas(p) for p in stem]
    stem_w0 = max(6, scale * 5)
    stem_w1 = max(3, scale * 2)
    for i in range(len(stem_pts) - 1):
        t = i / max(1, len(stem_pts) - 1)
        wid = int(stem_w0 + (stem_w1 - stem_w0) * t)
        d.line([stem_pts[i], stem_pts[i + 1]], fill=(92, 46, 22, 255), width=wid)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


def render_preview_svg(
    outline: list[tuple[float, float]],
    stem: list[tuple[float, float]],
    tips: list[tuple[float, float]],
    path: str,
    night: bool = False,
) -> None:
    pad = 0.26
    w = 2 + pad * 2
    h = 2 + STEM_LEN + pad * 2

    def pt(p: tuple[float, float]) -> str:
        x, y = p
        cx = x + 1 + pad
        cy = 1 + pad - y
        return f"{cx:.4f},{cy:.4f}"

    poly = " ".join(pt(p) for p in outline)
    stem_pts = [pt(p) for p in stem]
    stem_d = "M " + stem_pts[0] + " " + " ".join(f"L {s}" for s in stem_pts[1:])

    if night:
        fill = "#16120e"
        stroke = "#c6d4e0"
        gradient = ""
        vein_lines = ""
    else:
        fill = "url(#leaf)"
        stroke = "#782216"
        gradient = """
  <defs>
    <linearGradient id="leaf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e26034"/>
      <stop offset="100%" stop-color="#ac3a22"/>
    </linearGradient>
  </defs>"""
        cx, cy = pt((0, 0.02)).split(",")
        vein_lines = "".join(
            f'<line x1="{cx}" y1="{cy}" x2="{pt((tx * 0.9, ty * 0.9)).split(",")[0]}" '
            f'y2="{pt((tx * 0.9, ty * 0.9)).split(",")[1]}" stroke="#761f13" stroke-width="0.018" stroke-linecap="round"/>'
            for (tx, ty) in tips
        )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="640" height="{int(640 * h / w)}">
  <rect width="100%" height="100%" fill="#f5efe0"/>
  {gradient}
  <polygon points="{poly}" fill="{fill}" stroke="{stroke}" stroke-width="0.012"/>
  {vein_lines}
  <path d="{stem_d}" fill="none" stroke="#5c2c18" stroke-width="0.035" stroke-linecap="round"/>
</svg>
"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)


def render_silhouette_png(
    outline: list[tuple[float, float]],
    stem: list[tuple[float, float]],
    path: str,
    scale: int = 4,
) -> None:
    """纯剪影预览：只画轮廓填色，方便检查形状本身。"""
    from PIL import Image, ImageDraw

    pad = 0.26
    w = math.ceil((2 + pad * 2) * 200 * scale)
    h = math.ceil((2 + STEM_LEN + pad * 2) * 200 * scale)
    img = Image.new("RGBA", (w, h), (255, 252, 244, 255))
    d = ImageDraw.Draw(img)

    def to_canvas(p: tuple[float, float]) -> tuple[float, float]:
        x, y = p
        return ((x + 1 + pad) * 200 * scale, (1 + pad - y) * 200 * scale)

    poly = [to_canvas(p) for p in outline]
    d.polygon(poly, fill=(176, 62, 40, 255))
    stem_pts = [to_canvas(p) for p in stem]
    for i in range(len(stem_pts) - 1):
        d.line([stem_pts[i], stem_pts[i + 1]], fill=(92, 46, 22, 255), width=max(4, scale * 3))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


def render_preview_html(
    outline: list[tuple[float, float]],
    stem: list[tuple[float, float]],
    path: str,
) -> None:
    """生成 effect-preview/leaf-preview.html：白天/夜晚精灵预览，与组件共用同一份轮廓。"""
    import json

    outline_json = json.dumps([[round(x, 6), round(y, 6)] for x, y in outline])
    stem_json = json.dumps([[round(x, 6), round(y, 6)] for x, y in stem])

    html = f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>枫叶精灵预览 · 新叶形</title>
<style>
  body {{ margin:0; font-family:"KaiTi","STKaiti","Songti SC",serif; background:#e9e1cd; color:#2c2a24; }}
  h1 {{ text-align:center; font-weight:400; letter-spacing:.4em; margin:28px 0 6px; font-size:22px; }}
  p.desc {{ text-align:center; color:#6f685a; margin:0 0 26px; font-size:13px; letter-spacing:.2em; }}
  .panel {{ max-width: 980px; margin: 0 auto 34px; padding: 22px 24px 26px; border:1px solid rgba(44,42,36,.18);
           background:#fdfaf0; box-shadow:0 10px 30px -18px rgba(60,50,30,.35); }}
  .panel.night {{ background:#241c10; border-color:rgba(236,223,192,.2); }}
  .panel h2 {{ margin:0 0 16px; font-weight:400; font-size:16px; letter-spacing:.35em; color:#6f685a; }}
  .panel.night h2 {{ color:#a89a73; }}
  .grid {{ display:flex; flex-wrap:wrap; gap:18px; justify-content:center; }}
  .cell {{ text-align:center; }}
  .cell canvas {{ display:block; margin:0 auto; }}
  .cell span {{ display:block; margin-top:8px; font-size:12px; color:#8a8170; letter-spacing:.15em; }}
  .size-row {{ display:flex; gap:42px; justify-content:center; align-items:flex-end; margin-top:8px; }}
  .size-row .cell span {{ font-size:11px; color:#a09886; }}
</style>
</head>
<body>
<h1>枫叶 · 精灵预览</h1>
<p class="desc">由 scripts/maple_leaf.py 参数化生成 · 与 components/MapleLeaves.tsx 同源</p>

<div class="panel">
  <h2>白天 · 秋色</h2>
  <div class="grid" id="day"></div>
</div>

<div class="panel night">
  <h2>夜晚 · 剪影与月光</h2>
  <div class="grid" id="night"></div>
</div>

<div class="panel">
  <h2>实际飘落尺寸</h2>
  <div class="size-row" id="sizes"></div>
</div>

<script>
const OUTLINE = {outline_json};
const STEM = {stem_json};
const DAY_COLORS = ['#b3402f','#c04a35','#a5352a','#8f3b28','#c2593a','#b94b34','#c07a2e'];

function centroid(pts){{
  let a=0,cx=0,cy=0;
  for(let i=0;i<pts.length;i++){{
    const [x0,y0]=pts[i],[x1,y1]=pts[(i+1)%pts.length];
    const cr=x0*y1-x1*y0; a+=cr; cx+=(x0+x1)*cr; cy+=(y0+y1)*cr;
  }}
  a*=0.5; return Math.abs(a)<1e-9?[0,0]:[cx/(6*a),cy/(6*a)];
}}

function tips(){{
  const sec=[[],[],[],[],[]];
  for(const [x,y] of OUTLINE){{
    const deg=Math.atan2(y,x)*180/Math.PI;
    let idx;
    if(deg>-90&&deg<=1) idx=0;
    else if(deg>1&&deg<=56) idx=1;
    else if(deg>56&&deg<=124) idx=2;
    else if(deg>124&&deg<=179) idx=3;
    else idx=4;
    sec[idx].push([x,y]);
  }}
  return sec.map(s=>{{
    let b=s[0]||[0,1], br=-1;
    for(const p of s){{ const r=p[0]*p[0]+p[1]*p[1]; if(r>br){{br=r;b=p;}} }}
    return b;
  }});
}}

function bez(p0,c1,c2,p1,t){{
  const u=1-t;
  return [u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*p1[0],
          u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*p1[1]];
}}

function makeSprite(color, night){{
  const S=96, TS=tips();
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
  for(const [x,y] of OUTLINE){{
    if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y;
  }}
  const sb=Math.min.apply(null,STEM.map(p=>p[1]));
  const w=Math.ceil((maxX-minX)*S)+8, h=Math.ceil((maxY-sb)*S)+8;
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const g=c.getContext('2d');
  const toPx=p=>[(p[0]-minX)*S+4,(maxY-p[1])*S+4];
  const trace=()=>{{
    g.beginPath(); const s=toPx(OUTLINE[0]); g.moveTo(s[0],s[1]);
    for(let i=1;i<OUTLINE.length;i++){{ const p=toPx(OUTLINE[i]); g.lineTo(p[0],p[1]); }}
    g.closePath();
  }};
  trace();
  if(night){{
    g.fillStyle='#171310'; g.fill();
    g.strokeStyle='rgba(198,214,230,0.55)'; g.lineWidth=1.4; g.lineJoin='round'; g.stroke();
    g.save(); trace(); g.clip();
    const ml=g.createLinearGradient(0,0,w,h);
    ml.addColorStop(0,'rgba(205,222,236,0.12)'); ml.addColorStop(1,'rgba(205,222,236,0)');
    g.fillStyle=ml; g.fillRect(0,0,w,h); g.restore();
  }} else {{
    const [cx,cy]=centroid(OUTLINE);
    const gr=g.createLinearGradient(0,toPx([cx,maxY])[1],0,toPx([cx,minY])[1]);
    const sh=(hex,amt)=>{{
      const n=parseInt(hex.slice(1),16);
      const f=v=>Math.max(0,Math.min(255,v+amt));
      return `rgb(${{f((n>>16)&255)}},${{f((n>>8)&255)}},${{f(n&255)}})`;
    }};
    gr.addColorStop(0,sh(color,34)); gr.addColorStop(0.45,color); gr.addColorStop(1,sh(color,-34));
    g.fillStyle=gr; g.fill();
    g.save(); trace(); g.clip();
    const hx=toPx([cx-0.28,cy+0.22]);
    const gl=g.createRadialGradient(hx[0],hx[1],2,hx[0],hx[1],Math.max(w,h)*0.55);
    gl.addColorStop(0,'rgba(255,226,180,0.34)'); gl.addColorStop(1,'rgba(255,226,180,0)');
    g.fillStyle=gl; g.fillRect(0,0,w,h);
    const base=toPx([0,0]); g.lineCap='round';
    for(const [tx,ty] of TS){{
      const tip=toPx([tx*0.92,ty*0.92]), ctrl=toPx([tx*0.58,ty*0.58]);
      g.strokeStyle='rgba(66,17,6,0.42)'; g.lineWidth=Math.abs(tx)<0.08?1.3:0.95;
      g.beginPath(); g.moveTo(base[0],base[1]);
      for(let i=1;i<=10;i++){{ const b=bez(base,ctrl,ctrl,tip,i/10); g.lineTo(b[0],b[1]); }}
      g.stroke();
    }}
    g.restore();
    g.strokeStyle='rgba(46,12,6,0.5)'; g.lineWidth=1.1; g.lineJoin='round'; g.stroke();
  }}
  const sp=STEM.map(toPx);
  g.lineCap='round'; g.strokeStyle=night?'rgba(24,20,16,0.95)':'#5e2a15';
  const w0=Math.max(1.6,0.05*S), w1=Math.max(1,0.03*S);
  for(let i=0;i<sp.length-1;i++){{
    g.lineWidth=w0+(w1-w0)*(i/(sp.length-1));
    g.beginPath(); g.moveTo(sp[i][0],sp[i][1]); g.lineTo(sp[i+1][0],sp[i+1][1]); g.stroke();
  }}
  const cc=toPx(centroid(OUTLINE));
  return {{canvas:c, cx:cc[0], cy:cc[1]}};
}}

function drawInto(host, src, scale){{
  const cell=document.createElement('div'); cell.className='cell';
  const cv=document.createElement('canvas');
  cv.width=src.canvas.width*scale; cv.height=src.canvas.height*scale;
  const g=cv.getContext('2d');
  g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
  g.scale(scale,scale); g.drawImage(src.canvas,-src.cx+src.canvas.width/2, -src.cy+src.canvas.height/2);
  cell.appendChild(cv); host.appendChild(cell);
  return cell;
}}

const day=document.getElementById('day');
DAY_COLORS.forEach(col=>{{
  const src=makeSprite(col,false);
  const cell=drawInto(day,src,1.6);
  const span=document.createElement('span'); span.textContent=col; cell.appendChild(span);
}});

const night=document.getElementById('night');
for(let i=0;i<5;i++){{
  const src=makeSprite('#171310',true);
  const cell=drawInto(night,src,1.6);
  const span=document.createElement('span'); span.textContent='剪影 · 月光轮廓'; cell.appendChild(span);
}}

const sizes=document.getElementById('sizes');
;['56px','38px','26px','18px'].forEach(sz=>{{
  const cell=document.createElement('div'); cell.className='cell';
  const cv=document.createElement('canvas');
  const src=makeSprite('#b3402f',false);
  const px=parseInt(sz);
  cv.width=Math.round(src.canvas.width*px/96); cv.height=Math.round(src.canvas.height*px/96);
  const g=cv.getContext('2d');
  g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
  g.scale(px/96,px/96);
  g.drawImage(src.canvas,-src.cx+src.canvas.width/2,-src.cy+src.canvas.height/2);
  cv.style.width=sz; cv.style.height='auto';
  const cap=document.createElement('span'); cap.textContent=sz;
  cell.appendChild(cv); cell.appendChild(cap); sizes.appendChild(cell);
}});
</script>
</body>
</html>
"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)


def export_ts(
    outline: list[tuple[float, float]],
    stem: list[tuple[float, float]],
    path: str,
) -> None:
    """导出轮廓点到 TypeScript 模块，供 canvas 精灵使用。"""
    def fmt_pair(p: tuple[float, float]) -> str:
        return f"[{p[0]:.6f},{p[1]:.6f}]"

    outline_s = ",\n  ".join(fmt_pair(p) for p in outline)
    stem_s = ",\n  ".join(fmt_pair(p) for p in stem)
    content = f"""// 本文件由 scripts/maple_leaf.py 自动生成，请勿手改。
// 坐标：原点在叶基（叶柄附着处），y 向上，主裂片长度约 1。
export const MAPLE_OUTLINE: [number, number][] = [
  {outline_s},
]

export const MAPLE_STEM: [number, number][] = [
  {stem_s},
]

export const MAPLE_MAIN_LEN = 1.0
"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=7, help="随机种子")
    ap.add_argument("--out", default="effect-preview/leaf-design", help="预览输出目录")
    ap.add_argument("--ts-out", default="components/maple-leaf-shape.ts", help="TS 导出路径")
    args = ap.parse_args()

    outline, L, tips = build_outline(args.seed)
    stem = stem_points(L, args.seed)

    render_preview_png(outline, stem, tips, os.path.join(args.out, f"leaf-day-seed{args.seed}.png"))
    render_preview_png(outline, stem, tips, os.path.join(args.out, f"leaf-night-seed{args.seed}.png"), night=True)
    render_preview_svg(outline, stem, tips, os.path.join(args.out, f"leaf-day-seed{args.seed}.svg"))
    render_preview_svg(outline, stem, tips, os.path.join(args.out, f"leaf-night-seed{args.seed}.svg"), night=True)
    render_silhouette_png(outline, stem, os.path.join(args.out, f"leaf-silhouette-seed{args.seed}.png"))
    render_preview_html(outline, stem, "effect-preview/leaf-preview.html")
    export_ts(outline, stem, args.ts_out)

    print(f"生成完成：{args.out}/leaf-day-seed{args.seed}.png（白天）、leaf-night-seed{args.seed}.png（夜晚）")
    print(f"导出：{args.ts_out}")


if __name__ == "__main__":
    main()
