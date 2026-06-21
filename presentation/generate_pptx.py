#!/usr/bin/env python3
"""Generate SIX AI presentation as PPTX — pixel-matched to the HTML version."""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

# ── Dimensions ──────────────────────────────────────────
# Standard widescreen 16:9
W = 13.333
H = 7.5
# Content area: ~80% centered (like HTML's max-width with padding)
MARGIN = 1.0
CW = W - 2 * MARGIN  # 11.333

DIR = os.path.dirname(os.path.abspath(__file__))
SIX_LOGO_SM = os.path.join(DIR, 'six_logo_small.png')
SIX_LOGO_LG = os.path.join(DIR, 'six_logo_large.png')
SWISSHACKS   = os.path.join(DIR, 'pptx_slide2_Google_Shape_64_p14.png')

# ── Colors ──────────────────────────────────────────────
WHITE    = RGBColor(0xFF,0xFF,0xFF)
BG       = RGBColor(0xF8,0xFA,0xFC)
SURFACE  = RGBColor(0xF1,0xF5,0xF9)
BORDER   = RGBColor(0xCB,0xD5,0xE1)
MUTED    = RGBColor(0x94,0xA3,0xB8)
TEXT     = RGBColor(0x0F,0x17,0x2A)
TSUB     = RGBColor(0x47,0x55,0x69)
RED      = RGBColor(0xC8,0x10,0x2E)
REDDK    = RGBColor(0x9B,0x0C,0x23)
BLUE     = RGBColor(0x2E,0x6F,0xD6)
BLUEBR   = RGBColor(0x4F,0x8B,0xF0)
NAVY     = RGBColor(0x14,0x23,0x3F)
GREEN    = RGBColor(0x16,0xA3,0x4A)
AMBER    = RGBColor(0xD9,0x77,0x06)
PURPLE   = RGBColor(0x7C,0x3A,0xED)
RTINT    = RGBColor(0xFE,0xF7,0xF8)
BTINT    = RGBColor(0xEB,0xF1,0xFB)
GTINT    = RGBColor(0xE8,0xF8,0xEE)
ATINT    = RGBColor(0xFD,0xF3,0xE4)
PTINT    = RGBColor(0xF1,0xEB,0xFD)

def I(v): return Inches(v)

# ── Helpers ─────────────────────────────────────────────
def _tb(slide, l, t, w, h):
    b = slide.shapes.add_textbox(I(l), I(t), I(w), I(h))
    b.text_frame.word_wrap = True
    return b.text_frame

def _run(p, txt, sz=14, bold=False, color=TEXT, italic=False, font='Segoe UI'):
    r = p.add_run(); r.text = txt
    r.font.size = Pt(sz); r.font.bold = bold; r.font.color.rgb = color
    r.font.italic = italic; r.font.name = font
    return r

def _p(tf, txt, sz=14, bold=False, color=TEXT, align=PP_ALIGN.LEFT, italic=False):
    p = tf.paragraphs[0] if (len(tf.paragraphs)==1 and tf.paragraphs[0].text=='') else tf.add_paragraph()
    p.alignment = align; _run(p, txt, sz, bold, color, italic); return p

def _rect(slide, l, t, w, h, fill=WHITE, lc=BORDER, lw=1, rad=0.015):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, I(l), I(t), I(w), I(h))
    s.fill.solid(); s.fill.fore_color.rgb = fill
    s.line.color.rgb = lc; s.line.width = Pt(lw)
    if s.adjustments: s.adjustments[0] = rad
    return s

def _pill(slide, l, t, txt, bg, fg, w=None, h=0.35, sz=11):
    w = w or max(1.3, len(txt)*0.125)
    s = _rect(slide, l, t, w, h, bg, fg, 0.75, 0.12)
    tf = s.text_frame
    tf.margin_top = tf.margin_bottom = Pt(1)
    tf.margin_left = tf.margin_right = Pt(6)
    tf.word_wrap = False
    _run(tf.paragraphs[0], txt, sz, False, fg)
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    return s

def _topbar(slide, label):
    # Thin line
    ln = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, I(0), I(0.52), I(W), Pt(0.75))
    ln.fill.solid(); ln.fill.fore_color.rgb = BORDER; ln.line.fill.background()
    # SIX logo
    if os.path.exists(SIX_LOGO_SM):
        slide.shapes.add_picture(SIX_LOGO_SM, I(0.4), I(0.14), I(0.5), I(0.25))
    tf = _tb(slide, 0.9, 0.15, 0.4, 0.28)
    _run(tf.paragraphs[0], 'AI', 13, False, TSUB)
    # Label
    tf2 = _tb(slide, 3, 0.17, W-6, 0.25)
    tf2.paragraphs[0].alignment = PP_ALIGN.CENTER
    _run(tf2.paragraphs[0], label, 9, False, MUTED)
    # SwissHacks
    if os.path.exists(SWISSHACKS):
        slide.shapes.add_picture(SWISSHACKS, I(W-1.6), I(0.1), I(1.3))

def cx(content_w):
    """Center x for content of given width."""
    return (W - content_w) / 2


# ══════════════════════════════════════════════════════════
prs = Presentation()
prs.slide_width = I(W); prs.slide_height = I(H)
BL = prs.slide_layouts[6]


# ══════════════════════════════════════════════════════════
# SLIDE 0 — TITLE
# ══════════════════════════════════════════════════════════
s = prs.slides.add_slide(BL)
s.background.fill.solid(); s.background.fill.fore_color.rgb = BG

if os.path.exists(SWISSHACKS):
    s.shapes.add_picture(SWISSHACKS, I(W-1.8), I(0.25), I(1.4))

# SIX logo + AI — centered
logo_w, logo_h = 2.2, 0.62
ai_w = 1.0
total = logo_w + 0.1 + ai_w
lx = cx(total)
if os.path.exists(SIX_LOGO_LG):
    s.shapes.add_picture(SIX_LOGO_LG, I(lx), I(2.2), I(logo_w), I(logo_h))
tf = _tb(s, lx + logo_w + 0.1, 2.0, ai_w, 0.9)
_run(tf.paragraphs[0], 'AI', 48, False, TEXT)

# Quote
tf = _tb(s, 2.5, 3.1, W-5, 1.0)
p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
_run(p, '"Intellectuals solve problems, geniuses prevent them."', 20, False, TSUB, True)
p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.CENTER; p2.space_before = Pt(8)
_run(p2, '— Albert Einstein, probably', 13, False, MUTED)

# Names
names = ['Boris Goranov', 'Hristo Stefanov', 'Nikola Staykov']
nw = 2.2  # each name block
gap = 0.15
total_nw = 3*nw + 2*(gap + 0.02 + gap)  # divider ~0.02 wide
nx = cx(total_nw)
for i, nm in enumerate(names):
    x = nx + i * (nw + gap + 0.02 + gap)
    tf = _tb(s, x, 4.6, nw, 0.35)
    _p(tf, nm, 15, True, TSUB, PP_ALIGN.CENTER)
    if i < 2:
        dx = x + nw + gap
        d = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, I(dx), I(4.65), Pt(1), I(0.25))
        d.fill.solid(); d.fill.fore_color.rgb = BORDER; d.line.fill.background()

tf = _tb(s, 3, 5.6, W-6, 0.35)
_p(tf, 'SWISSHACKS 2026', 11, True, MUTED, PP_ALIGN.CENTER)


# ══════════════════════════════════════════════════════════
# SLIDE 1 — PROBLEM
# ══════════════════════════════════════════════════════════
s = prs.slides.add_slide(BL)
s.background.fill.solid(); s.background.fill.fore_color.rgb = WHITE
_topbar(s, '02 / 06 — PROBLEM')

tf = _tb(s, MARGIN, 1.1, CW, 0.3)
_p(tf, 'THE PROBLEM', 12, True, RED, PP_ALIGN.CENTER)

tf = _tb(s, 1.5, 1.55, W-3, 1.2)
p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
_run(p, 'Private banking is personal — ', 34, True, TEXT)
_run(p, 'but only if you have CHF 50M+', 34, True, RED, True)

tf = _tb(s, 2.5, 2.9, W-5, 0.65)
p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
_run(p, 'Ultra-high-net-worth clients get a dedicated RM who knows them deeply.', 15, False, TSUB)
p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.CENTER
_run(p2, 'Everyone else gets a template.', 15, False, TSUB)

# Pain cards
cards = [('🏦','The UHNW privilege gap'), ('⏱️',"RMs can't scale intimacy"), ('📉','Generic service loses clients')]
cw, ch = 3.4, 0.95
cgap = 0.35
tcw = 3*cw + 2*cgap
csx = cx(tcw)
cy = 4.2

for i,(icon,title) in enumerate(cards):
    x = csx + i*(cw+cgap)
    _rect(s, x, cy, cw, ch)
    tf = _tb(s, x+0.25, cy+0.15, 0.5, 0.6)
    _p(tf, icon, 26, False, TEXT, PP_ALIGN.CENTER)
    tf = _tb(s, x+0.85, cy+0.2, cw-1.1, 0.55)
    _p(tf, title, 15, True, TEXT)


# ══════════════════════════════════════════════════════════
# SLIDE 2 — SOLUTION
# ══════════════════════════════════════════════════════════
s = prs.slides.add_slide(BL)
s.background.fill.solid(); s.background.fill.fore_color.rgb = WHITE
_topbar(s, '03 / 06 — SOLUTION')

tf = _tb(s, MARGIN, 0.85, CW, 0.3)
_p(tf, 'OUR SOLUTION', 12, True, BLUE, PP_ALIGN.CENTER)

tf = _tb(s, 1.5, 1.2, W-3, 1.2)
p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
_run(p, 'Give ', 34, True, TEXT)
_run(p, 'every client', 34, True, BLUE, True)
_run(p, ' the UHNW', 34, True, TEXT)
p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.CENTER
_run(p2, 'experience — at scale', 34, True, TEXT)

# Flow pipeline
flow = [('CRM History',BLUE),('Client DNA',RED),('Live Intelligence',PURPLE),('Personalised Advisory',GREEN)]
fw = 1.8; fa = 0.4
tfw = 4*fw + 3*fa
fsx = cx(tfw)
fy = 2.65
for i,(label,c) in enumerate(flow):
    x = fsx + i*(fw+fa)
    _pill(s, x, fy, '● '+label, WHITE, c, w=fw, h=0.35, sz=11)
    if i < 3:
        tf = _tb(s, x+fw, fy, fa, 0.35)
        _p(tf, '→', 14, False, MUTED, PP_ALIGN.CENTER)

# Feature grid 2x2
feats = [
    ('🧬','AI Client DNA','Synthesises CRM history into a living profile — values, risk appetite, life events — in seconds, not decades.',RTINT,RED),
    ('⚡','Conflict & Mandate Alerts','Continuously checks every position against personal values and CIO ratings — flags misalignments before they cost trust.',ATINT,AMBER),
    ('📰','News Scored Per Client',"Market news ranked by relevance to each client's portfolio and beliefs, not generic asset-class feeds.",BTINT,BLUE),
    ('✉️','Advisory in One Click','Tone-matched, context-aware client message in under 5 seconds — outreach that used to take an hour.',GTINT,GREEN),
]
fw2 = 5.4; fh2 = 1.15; fgx = 0.35; fgy = 0.25
tfww = 2*fw2 + fgx
fsx2 = cx(tfww)
fsy2 = 3.35

for i,(icon,title,desc,tint,clr) in enumerate(feats):
    col, row = i%2, i//2
    x = fsx2 + col*(fw2+fgx)
    y = fsy2 + row*(fh2+fgy)
    _rect(s, x, y, fw2, fh2)
    ib = _rect(s, x+0.18, y+0.2, 0.45, 0.45, tint, tint, 0)
    _run(ib.text_frame.paragraphs[0], icon, 16, False, TEXT)
    ib.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    tf = _tb(s, x+0.75, y+0.12, fw2-0.95, 0.3)
    _p(tf, title, 14, True, TEXT)
    tf = _tb(s, x+0.75, y+0.45, fw2-0.95, 0.65)
    _p(tf, desc, 10, False, TSUB)


# ══════════════════════════════════════════════════════════
# SLIDE 3 — ARCHITECTURE
# ══════════════════════════════════════════════════════════
s = prs.slides.add_slide(BL)
s.background.fill.solid(); s.background.fill.fore_color.rgb = WHITE
_topbar(s, '04 / 06 — ARCHITECTURE')

tf = _tb(s, MARGIN, 0.85, CW, 0.3)
_p(tf, 'ARCHITECTURE', 12, True, RED, PP_ALIGN.CENTER)

tf = _tb(s, 2, 1.15, W-4, 0.7)
p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
_run(p, 'One ', 34, True, TEXT)
_run(p, 'intelligent', 34, True, RED, True)
_run(p, ' platform', 34, True, TEXT)

tf = _tb(s, 2, 1.85, W-4, 0.5)
_p(tf, 'Real-time data from SIX Financial & Event Registry, processed by specialised LLM assistants, served through an RM-first interface.', 12, False, TSUB, PP_ALIGN.CENTER)

# Data Sources
dsy = 2.5
_rect(s, MARGIN, dsy, CW, 0.85, SURFACE, BORDER, 0.75)
tf = _tb(s, MARGIN+0.25, dsy+0.08, 3, 0.25)
p = tf.paragraphs[0]; _run(p, '●', 9, True, BLUE); _run(p, '  DATA SOURCES', 10, True, BLUE)
dsp = ['SIX Financial MCP','Event Registry News','CRM Notes','Portfolio Data']
px = MARGIN + 0.25
for pt in dsp:
    pw = max(1.4, len(pt)*0.13)
    _pill(s, px, dsy+0.42, pt, BTINT, BLUE, w=pw, sz=11)
    px += pw + 0.15

# Arrow
tf = _tb(s, 5, 3.4, W-10, 0.3)
_p(tf, '↓  Live data feeds', 10, False, MUTED, PP_ALIGN.CENTER)

# Assistants
ay = 3.75
aw = (CW - 0.3*2) / 3  # 3 equal boxes with gaps
for i,(nm,desc) in enumerate([('Conflict Assistant','Monitors the portfolio'),('Message Assistant','Drafts the advisory notes'),('Chat Agent','Natural language tool use across the system')]):
    x = MARGIN + i*(aw+0.3)
    _rect(s, x, ay, aw, 0.85, RTINT, RED, 0.75)
    tf = _tb(s, x+0.2, ay+0.08, aw-0.4, 0.25)
    p = tf.paragraphs[0]; _run(p, '●', 9, True, RED); _run(p, '  '+nm.upper(), 10, True, RED)
    pw = min(aw-0.4, max(1.6, len(desc)*0.12))
    _pill(s, x+0.2, ay+0.42, desc, RTINT, RED, w=pw, sz=11)

# Arrow
tf = _tb(s, 5, 4.65, W-10, 0.3)
_p(tf, '↓  REST API', 10, False, MUTED, PP_ALIGN.CENTER)

# Bottom: Trust & RM Dashboard
by = 5.0; bh = 1.15
bw1 = CW * 0.48
bw2 = CW * 0.48
bgap = CW - bw1 - bw2

# Trust
_rect(s, MARGIN, by, bw1, bh, SURFACE, BORDER, 0.75)
tf = _tb(s, MARGIN+0.25, by+0.08, 3, 0.25)
p = tf.paragraphs[0]; _run(p, '●', 9, True, GREEN); _run(p, '  TRUST & COMPLIANCE', 10, True, GREEN)
tcp = ['Audit Trail','Explainability','Trace Logging']
px = MARGIN + 0.25
for pt in tcp:
    pw = max(1.1, len(pt)*0.12)
    _pill(s, px, by+0.4, pt, GTINT, GREEN, w=pw, sz=10)
    px += pw + 0.12
_pill(s, MARGIN+0.25, by+0.78, 'Spider Graph Scoring', GTINT, GREEN, w=2.0, sz=10)

# RM Dashboard
rmx = MARGIN + bw1 + bgap
_rect(s, rmx, by, bw2, bh, SURFACE, BORDER, 0.75)
tf = _tb(s, rmx+0.25, by+0.08, 3, 0.25)
p = tf.paragraphs[0]; _run(p, '●', 9, True, BLUE); _run(p, '  RM DASHBOARD', 10, True, BLUE)
rmp = ['Home & Action Items','Global News View']
px = rmx + 0.25
for pt in rmp:
    pw = max(1.4, len(pt)*0.13)
    _pill(s, px, by+0.4, pt, BTINT, BLUE, w=pw, sz=10)
    px += pw + 0.12
_pill(s, rmx+0.25, by+0.78, 'Client Panels', BTINT, BLUE, w=1.5, sz=10)


# ══════════════════════════════════════════════════════════
# SLIDE 4 — DEMO
# ══════════════════════════════════════════════════════════
s = prs.slides.add_slide(BL)
s.background.fill.solid(); s.background.fill.fore_color.rgb = WHITE
_topbar(s, '05 / 06 — LIVE DEMO')

# Left half (0 to ~55%)
LW = 5.8
tf = _tb(s, 0.8, 1.0, LW, 0.3)
_p(tf, 'LIVE DEMO', 12, True, RED)

tf = _tb(s, 0.8, 1.5, LW, 1.0)
p = tf.paragraphs[0]
_run(p, 'From CRM to advisory ', 30, True, TEXT)
_run(p, 'in', 30, True, RED, True)
p2 = tf.add_paragraph()
_run(p2, '15 seconds', 30, True, RED, True)

tf = _tb(s, 0.8, 2.8, LW, 0.7)
_p(tf, 'Four real Swiss private banking personas. Actual CRM logs. Live SIX financial data. One RM. Zero compromise.', 13, False, TSUB)

steps = [
    'Select any client — their DNA surfaces instantly from CRM history',
    'See live conflicts and news matched to their personal values',
    'Hit Generate Advisory — bespoke message in <5s',
    'Ask the AI assistant anything — it knows the client cold',
]
for i,step in enumerate(steps):
    y = 3.8 + i*0.42
    c = s.shapes.add_shape(MSO_SHAPE.OVAL, I(0.8), I(y), I(0.28), I(0.28))
    c.fill.solid(); c.fill.fore_color.rgb = RED; c.line.fill.background()
    c.text_frame.margin_top = c.text_frame.margin_bottom = Pt(0)
    c.text_frame.margin_left = c.text_frame.margin_right = Pt(0)
    cp = c.text_frame.paragraphs[0]; cp.alignment = PP_ALIGN.CENTER
    _run(cp, str(i+1), 9, True, WHITE)
    tf = _tb(s, 1.2, y, LW-0.4, 0.35)
    _p(tf, step, 11, False, TSUB)

_rect(s, 0.8, 5.7, 3.5, 0.38, SURFACE, BORDER, 0.75)
tf = _tb(s, 0.95, 5.72, 3.3, 0.35)
p = tf.paragraphs[0]; _run(p, '●  ', 11, False, GREEN); _run(p, 'wealthadvisor-ai.fly.dev', 11, False, TSUB, font='Consolas')

# Right half — mock browser
rx = 7.0; rw = W - rx - 0.3
_rect(s, 6.6, 0, W-6.6, H, SURFACE, SURFACE, 0, 0)
bx = rx; bw = rw; bh = 6.0
_rect(s, bx, 0.7, bw, bh, WHITE, BORDER, 0.75)

# Browser bar
_rect(s, bx, 0.7, bw, 0.4, SURFACE, BORDER, 0.75)
for j,co in enumerate([RGBColor(0xEF,0x44,0x44), RGBColor(0xF5,0x9E,0x0B), RGBColor(0x22,0xC5,0x5E)]):
    d = s.shapes.add_shape(MSO_SHAPE.OVAL, I(bx+0.18+j*0.22), I(0.82), I(0.13), I(0.13))
    d.fill.solid(); d.fill.fore_color.rgb = co; d.line.fill.background()
ub = _rect(s, bx+1.0, 0.8, 2.8, 0.2, WHITE, BORDER, 0.5)
_run(ub.text_frame.paragraphs[0], 'wealthadvisor-ai.fly.dev', 7, False, TSUB, font='Consolas')
ub.text_frame.margin_top = ub.text_frame.margin_bottom = Pt(0)
ub.text_frame.margin_left = Pt(6)

# Sidebar
sx = bx; sw = 1.5
_rect(s, sx, 1.1, sw, bh-0.4, SURFACE, BORDER, 0.75)
tf = _tb(s, sx+0.1, 1.15, 1.2, 0.2)
p = tf.paragraphs[0]
if os.path.exists(SIX_LOGO_SM):
    s.shapes.add_picture(SIX_LOGO_SM, I(sx+0.1), I(1.17), I(0.35), I(0.17))
tf2 = _tb(s, sx+0.45, 1.15, 0.3, 0.2)
_run(tf2.paragraphs[0], 'AI', 7, False, TSUB)

clients = [('HS','H. Schneider','Balanced',RED,True),('MH','M. Huber','Defensive',BLUE,False),
           ('ER','E. Räber','Defensive',REDDK,False),('JA','J. Ammann','Growth',BLUEBR,False)]
for ci,(init,cn,strat,co,sel) in enumerate(clients):
    cy = 1.5 + ci*0.45
    if sel:
        _rect(s, sx+0.04, cy-0.04, sw-0.08, 0.4, RTINT, RTINT, 0, 0.01)
    av = s.shapes.add_shape(MSO_SHAPE.OVAL, I(sx+0.1), I(cy), I(0.24), I(0.24))
    av.fill.solid(); av.fill.fore_color.rgb = co; av.line.fill.background()
    av.text_frame.margin_top = av.text_frame.margin_bottom = Pt(0)
    av.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    _run(av.text_frame.paragraphs[0], init, 6, True, WHITE)
    tf = _tb(s, sx+0.4, cy-0.02, 1.0, 0.3)
    _p(tf, cn, 7, True, TEXT)
    _p(tf, strat, 6, False, TSUB)

# Main content
mx = sx + sw + 0.1; mw = bw - sw - 0.1
_rect(s, mx+0.1, 1.2, mw-0.2, 1.0, RTINT, RGBColor(0xF0,0xD0,0xD5), 0.75)
tf = _tb(s, mx+0.2, 1.25, mw-0.4, 0.9)
p = tf.paragraphs[0]
_run(p, 'Advisory Draft — ', 7, True, RED)
_run(p, "Dear Hubertus, the announced shutdown of AstraZeneca's chronic-illness research division directly conflicts with your foundation's mission. We recommend reviewing your exposure and suggest a swap into Roche Holding, CIO BUY-rated and aligned with your values.", 7, False, TSUB)

_rect(s, mx+0.1, 2.3, mw-0.2, 0.7, SURFACE, BORDER, 0.5)
tf = _tb(s, mx+0.2, 2.32, 1.5, 0.2)
_p(tf, 'CLIENT DNA', 7, True, RED)
dna = [('health legacy',BTINT,BLUE),('ESG alignment',BTINT,BLUE),('pharma exposure risk',RTINT,RED),('family foundation',PTINT,PURPLE)]
dpx = mx + 0.2
for pt,bg,tc in dna:
    pw = max(0.8, len(pt)*0.08)
    _pill(s, dpx, 2.6, pt, bg, tc, w=pw, h=0.22, sz=7)
    dpx += pw + 0.08

_rect(s, mx+0.1, 3.1, mw-0.2, 0.35, RTINT, RGBColor(0xF0,0xD0,0xD5), 0.5)
tf = _tb(s, mx+0.2, 3.12, mw-0.4, 0.3)
_p(tf, '⚠ Major Pharma Co. shuts chronic-illness research — direct conflict with client DNA', 7, False, REDDK)


# ══════════════════════════════════════════════════════════
# SLIDE 5 — Q&A
# ══════════════════════════════════════════════════════════
s = prs.slides.add_slide(BL)
s.background.fill.solid(); s.background.fill.fore_color.rgb = WHITE
_topbar(s, '06 / 06 — Q&A')

tf = _tb(s, MARGIN, 0.85, CW, 0.3)
_p(tf, 'THE TEAM', 12, True, RED, PP_ALIGN.CENTER)

tf = _tb(s, 2, 1.15, W-4, 0.7)
p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
_run(p, 'Questions & ', 34, True, TEXT)
_run(p, 'Answers', 34, True, RED, True)

tf = _tb(s, 2, 1.8, W-4, 0.35)
_p(tf, 'Built in ~24 hours at SwissHacks 2026', 14, False, TSUB, PP_ALIGN.CENTER)

team = [('boris.JPG','Boris Goranov','FRONT-END',BLUE,BTINT),
        ('hristo.jpeg','Hristo Stefanov','BACK-END',GREEN,GTINT),
        ('nikola.jpeg','Nikola Staykov','BUSINESS',AMBER,ATINT)]
tcw = 2.8; tch = 3.0; tgap = 0.4
ttw = 3*tcw + 2*tgap
tsx = cx(ttw); tsy = 2.3

for i,(photo,nm,role,rc,rbg) in enumerate(team):
    x = tsx + i*(tcw+tgap)
    _rect(s, x, tsy, tcw, tch)
    pp = os.path.join(DIR, photo)
    if os.path.exists(pp):
        psz = 1.6
        px = x + (tcw-psz)/2
        s.shapes.add_picture(pp, I(px), I(tsy+0.25), I(psz), I(psz))
    tf = _tb(s, x, tsy+2.0, tcw, 0.35)
    _p(tf, nm, 15, True, TEXT, PP_ALIGN.CENTER)
    rw = max(1.1, len(role)*0.13)
    rx = x + (tcw-rw)/2
    _pill(s, rx, tsy+2.4, role, rbg, rc, w=rw, sz=10)

tf = _tb(s, 2, 5.6, W-4, 0.45)
_p(tf, 'Every client deserves a personal banker. We built one.', 18, True, TEXT, PP_ALIGN.CENTER)

tf = _tb(s, 3, 6.15, W-6, 0.35)
_p(tf, '\U0001F4AC  Questions?', 15, True, TSUB, PP_ALIGN.CENTER)

tf = _tb(s, 3, 6.65, W-6, 0.3)
_p(tf, 'Powered by SIX Financial Data • SwissHacks 2026', 9, False, MUTED, PP_ALIGN.CENTER)

# ── Save ────────────────────────────────────────────────
out = os.path.join(DIR, 'SIX_AI_Presentation.pptx')
prs.save(out)
print(f'Saved: {out}')
