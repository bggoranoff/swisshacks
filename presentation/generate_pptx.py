#!/usr/bin/env python3
"""Generate SIX AI presentation as PPTX matching the HTML version."""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

# ── Colors ──────────────────────────────────────────────
WHITE       = RGBColor(0xFF, 0xFF, 0xFF)
BG_LIGHT    = RGBColor(0xF1, 0xF5, 0xF9)
BG_LIGHT2   = RGBColor(0xF8, 0xFA, 0xFC)
BORDER      = RGBColor(0xCB, 0xD5, 0xE1)
MUTED       = RGBColor(0x94, 0xA3, 0xB8)
TEXT_DARK   = RGBColor(0x0F, 0x17, 0x2A)
TEXT_SUB    = RGBColor(0x47, 0x55, 0x69)
SIX_RED     = RGBColor(0xC8, 0x10, 0x2E)
SIX_RED_DK  = RGBColor(0x9B, 0x0C, 0x23)
SIX_BLUE    = RGBColor(0x2E, 0x6F, 0xD6)
SIX_BLUE_BR = RGBColor(0x4F, 0x8B, 0xF0)
NAVY        = RGBColor(0x14, 0x23, 0x3F)
GREEN       = RGBColor(0x16, 0xA3, 0x4A)
AMBER       = RGBColor(0xD9, 0x77, 0x06)
PURPLE      = RGBColor(0x7C, 0x3A, 0xED)

# Pill backgrounds (light tints)
RED_TINT    = RGBColor(0xFD, 0xEE, 0xF0)
BLUE_TINT   = RGBColor(0xEB, 0xF1, 0xFB)
GREEN_TINT  = RGBColor(0xE8, 0xF8, 0xEE)
AMBER_TINT  = RGBColor(0xFD, 0xF3, 0xE4)
PURPLE_TINT = RGBColor(0xF1, 0xEB, 0xFD)
HIGHLIGHT_BG = RGBColor(0xFE, 0xF7, 0xF8)

DIR = os.path.dirname(os.path.abspath(__file__))

# ── Helpers ─────────────────────────────────────────────
def add_textbox(slide, left, top, width, height):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    txBox.text_frame.word_wrap = True
    return txBox.text_frame

def set_run(para, text, size=14, bold=False, color=TEXT_DARK, font_name='Segoe UI'):
    run = para.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font_name
    return run

def add_para(tf, text, size=14, bold=False, color=TEXT_DARK, align=PP_ALIGN.LEFT, space_before=0, space_after=0):
    if len(tf.paragraphs) == 1 and tf.paragraphs[0].text == '':
        para = tf.paragraphs[0]
    else:
        para = tf.add_paragraph()
    para.alignment = align
    para.space_before = Pt(space_before)
    para.space_after = Pt(space_after)
    set_run(para, text, size, bold, color)
    return para

def add_rounded_rect(slide, left, top, width, height, fill=WHITE, line_color=BORDER, line_width=Pt(1)):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = line_color
    shape.line.width = line_width
    shape.adjustments[0] = 0.02
    return shape

def add_pill(slide, left, top, text, bg_color, text_color, width=None):
    w = width or Inches(max(1.4, len(text) * 0.11))
    h = Inches(0.32)
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.color.rgb = text_color
    shape.line.width = Pt(0.75)
    shape.adjustments[0] = 0.15
    tf = shape.text_frame
    tf.margin_top = Pt(2)
    tf.margin_bottom = Pt(2)
    tf.margin_left = Pt(6)
    tf.margin_right = Pt(6)
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = text
    run.font.size = Pt(10)
    run.font.bold = False
    run.font.color.rgb = text_color
    run.font.name = 'Segoe UI'
    return shape

def add_logo_and_label(slide, label_text):
    """Add SIX AI logo top-left and slide label top-right."""
    # SIX AI logo
    tf = add_textbox(slide, Inches(0.5), Inches(0.3), Inches(1.2), Inches(0.4))
    p = tf.paragraphs[0]
    set_run(p, 'SIX', 13, True, SIX_RED)
    set_run(p, ' AI', 13, False, TEXT_SUB)

    # Slide label
    tf2 = add_textbox(slide, Inches(7.5), Inches(0.3), Inches(2.2), Inches(0.3))
    p2 = tf2.paragraphs[0]
    p2.alignment = PP_ALIGN.RIGHT
    set_run(p2, label_text, 8, False, MUTED)

    # SwissHacks logo
    logo_path = os.path.join(DIR, 'pptx_slide2_Google_Shape_64_p14.png')
    if os.path.exists(logo_path):
        slide.shapes.add_picture(logo_path, Inches(8.6), Inches(0.25), Inches(1.1))


# ══════════════════════════════════════════════════════════
# PRESENTATION
# ══════════════════════════════════════════════════════════
prs = Presentation()
prs.slide_width = Inches(10)
prs.slide_height = Inches(5.625)  # 16:9
blank_layout = prs.slide_layouts[6]  # blank

# ══════════════════════════════════════════════════════════
# SLIDE 0 — TITLE
# ══════════════════════════════════════════════════════════
s0 = prs.slides.add_slide(blank_layout)
s0.background.fill.solid()
s0.background.fill.fore_color.rgb = BG_LIGHT2

# SIX AI large title
tf = add_textbox(s0, Inches(0), Inches(0.8), Inches(10), Inches(1.2))
p = tf.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
set_run(p, 'SIX', 48, True, SIX_RED)
set_run(p, ' AI', 48, False, TEXT_DARK)

# Subtitle
tf2 = add_textbox(s0, Inches(1.5), Inches(2.0), Inches(7), Inches(0.6))
p2 = tf2.paragraphs[0]
p2.alignment = PP_ALIGN.CENTER
set_run(p2, 'Cursor meets Palantir (for relationship managers)', 20, True, NAVY)

# Team names
names = ['Boris Goranov', 'Hristo Stefanov', 'Nikola Staykov']
x_positions = [Inches(1.2), Inches(3.8), Inches(6.4)]
for i, name in enumerate(names):
    tf_n = add_textbox(s0, x_positions[i], Inches(3.2), Inches(2.6), Inches(0.5))
    p_n = tf_n.paragraphs[0]
    p_n.alignment = PP_ALIGN.CENTER
    set_run(p_n, name, 14, True, TEXT_SUB)

# Dividers
for x in [Inches(3.65), Inches(6.25)]:
    line = s0.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(3.2), Pt(1), Inches(0.45))
    line.fill.solid()
    line.fill.fore_color.rgb = BORDER
    line.line.fill.background()

# SwissHacks 2026
tf3 = add_textbox(s0, Inches(2), Inches(4.2), Inches(6), Inches(0.4))
p3 = tf3.paragraphs[0]
p3.alignment = PP_ALIGN.CENTER
set_run(p3, 'SWISSHACKS 2026', 11, True, MUTED)

# SwissHacks logo
logo_path = os.path.join(DIR, 'pptx_slide2_Google_Shape_64_p14.png')
if os.path.exists(logo_path):
    s0.shapes.add_picture(logo_path, Inches(8.4), Inches(0.25), Inches(1.2))


# ══════════════════════════════════════════════════════════
# SLIDE 1 — PROBLEM
# ══════════════════════════════════════════════════════════
s1 = prs.slides.add_slide(blank_layout)
s1.background.fill.solid()
s1.background.fill.fore_color.rgb = WHITE
add_logo_and_label(s1, '02 / 06  —  Problem')

# Eyebrow
tf = add_textbox(s1, Inches(0.5), Inches(0.9), Inches(9), Inches(0.3))
add_para(tf, 'THE PROBLEM', 10, True, SIX_RED, PP_ALIGN.CENTER)

# Title
tf2 = add_textbox(s1, Inches(0.8), Inches(1.25), Inches(8.4), Inches(0.9))
p = tf2.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
set_run(p, 'Private banking is personal — ', 28, True, TEXT_DARK)
set_run(p, 'but only if you have CHF 50M+', 28, True, SIX_RED)

# Subtitle
tf3 = add_textbox(s1, Inches(1.5), Inches(2.1), Inches(7), Inches(0.5))
add_para(tf3, 'Ultra-high-net-worth clients get a dedicated RM who knows them deeply. Everyone else gets a template.', 14, False, TEXT_SUB, PP_ALIGN.CENTER)

# Pain cards
cards = [
    ('🏦', 'The UHNW privilege gap', 'Deep personalisation is reserved for the top 1%. Everyone else gets a template.'),
    ('⏱️', "RMs can't scale intimacy", '50–150 clients per RM. Cross-referencing values, portfolio and news for each is humanly impossible.'),
    ('📉', 'Generic service loses clients', 'Clients who feel like a number switch banks. Poor personalisation costs AUM.'),
]

card_w = Inches(2.8)
card_h = Inches(2.1)
gap = Inches(0.25)
start_x = Inches(0.65)
card_y = Inches(2.8)

for i, (icon, title, desc) in enumerate(cards):
    x = start_x + i * (card_w + gap)
    box = add_rounded_rect(s1, x, card_y, card_w, card_h)
    # Icon
    tf_i = add_textbox(s1, x + Inches(0.2), card_y + Inches(0.15), Inches(0.5), Inches(0.4))
    add_para(tf_i, icon, 20, False, TEXT_DARK)
    # Title
    tf_t = add_textbox(s1, x + Inches(0.2), card_y + Inches(0.55), card_w - Inches(0.4), Inches(0.35))
    add_para(tf_t, title, 13, True, TEXT_DARK)
    # Desc
    tf_d = add_textbox(s1, x + Inches(0.2), card_y + Inches(0.9), card_w - Inches(0.4), Inches(1.1))
    add_para(tf_d, desc, 11, False, TEXT_SUB)


# ══════════════════════════════════════════════════════════
# SLIDE 2 — SOLUTION
# ══════════════════════════════════════════════════════════
s2 = prs.slides.add_slide(blank_layout)
s2.background.fill.solid()
s2.background.fill.fore_color.rgb = WHITE
add_logo_and_label(s2, '03 / 06  —  Solution')

tf = add_textbox(s2, Inches(0.5), Inches(0.9), Inches(9), Inches(0.3))
add_para(tf, 'OUR SOLUTION', 10, True, SIX_BLUE, PP_ALIGN.CENTER)

tf2 = add_textbox(s2, Inches(0.8), Inches(1.2), Inches(8.4), Inches(0.8))
p = tf2.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
set_run(p, 'Give ', 28, True, TEXT_DARK)
set_run(p, 'every client', 28, True, SIX_BLUE)
set_run(p, ' the UHNW experience — at scale', 28, True, TEXT_DARK)

# Flow pipeline
flow_items = [
    ('CRM History', SIX_BLUE),
    ('Client DNA', SIX_RED),
    ('Live Intelligence', PURPLE),
    ('Personalised Advisory', GREEN),
]
flow_y = Inches(2.05)
flow_start_x = Inches(0.8)
pill_w = Inches(1.7)
arrow_w = Inches(0.35)

for i, (label, color) in enumerate(flow_items):
    x = flow_start_x + i * (pill_w + arrow_w)
    add_pill(s2, x, flow_y, label, WHITE, color, width=pill_w)
    if i < len(flow_items) - 1:
        tf_a = add_textbox(s2, x + pill_w, flow_y, arrow_w, Inches(0.32))
        add_para(tf_a, '→', 12, False, MUTED, PP_ALIGN.CENTER)

# Feature grid (2x2)
features = [
    ('🧬', 'AI Client DNA', 'Synthesises CRM history into a living profile — values, risk appetite, life events — in seconds, not decades.', RED_TINT, SIX_RED),
    ('⚡', 'Conflict & Mandate Alerts', 'Continuously checks every position against personal values and CIO ratings — flags misalignments before they cost trust.', AMBER_TINT, AMBER),
    ('📰', 'News Scored Per Client', "Market news ranked by relevance to each client's portfolio and beliefs, not generic asset-class feeds.", BLUE_TINT, SIX_BLUE),
    ('✉️', 'Advisory in One Click', 'Tone-matched, context-aware client message in under 5 seconds — outreach that used to take an hour.', GREEN_TINT, GREEN),
]

feat_w = Inches(4.3)
feat_h = Inches(1.2)
feat_gap_x = Inches(0.3)
feat_gap_y = Inches(0.2)
feat_start_x = Inches(0.55)
feat_start_y = Inches(2.65)

for i, (icon, title, desc, tint, color) in enumerate(features):
    col = i % 2
    row = i // 2
    x = feat_start_x + col * (feat_w + feat_gap_x)
    y = feat_start_y + row * (feat_h + feat_gap_y)

    box = add_rounded_rect(s2, x, y, feat_w, feat_h)

    # Icon box
    icon_box = add_rounded_rect(s2, x + Inches(0.15), y + Inches(0.15), Inches(0.4), Inches(0.4), tint, tint, Pt(0))
    tf_ic = icon_box.text_frame
    tf_ic.margin_top = Pt(2)
    tf_ic.margin_left = Pt(2)
    p_ic = tf_ic.paragraphs[0]
    p_ic.alignment = PP_ALIGN.CENTER
    set_run(p_ic, icon, 14, False, TEXT_DARK)

    # Title
    tf_t = add_textbox(s2, x + Inches(0.65), y + Inches(0.12), feat_w - Inches(0.8), Inches(0.3))
    add_para(tf_t, title, 12, True, TEXT_DARK)

    # Desc
    tf_d = add_textbox(s2, x + Inches(0.65), y + Inches(0.42), feat_w - Inches(0.8), Inches(0.7))
    add_para(tf_d, desc, 10, False, TEXT_SUB)


# ══════════════════════════════════════════════════════════
# SLIDE 3 — ARCHITECTURE
# ══════════════════════════════════════════════════════════
s3 = prs.slides.add_slide(blank_layout)
s3.background.fill.solid()
s3.background.fill.fore_color.rgb = WHITE
add_logo_and_label(s3, '04 / 06  —  Architecture')

tf = add_textbox(s3, Inches(0.5), Inches(0.85), Inches(9), Inches(0.3))
add_para(tf, 'ARCHITECTURE', 10, True, SIX_RED, PP_ALIGN.CENTER)

tf2 = add_textbox(s3, Inches(1), Inches(1.15), Inches(8), Inches(0.6))
p = tf2.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
set_run(p, 'One ', 28, True, TEXT_DARK)
set_run(p, 'intelligent', 28, True, SIX_RED)
set_run(p, ' platform', 28, True, TEXT_DARK)

# Sub
tf3 = add_textbox(s3, Inches(1.2), Inches(1.65), Inches(7.6), Inches(0.45))
add_para(tf3, 'Real-time data from SIX Financial & Event Registry, processed by specialised LLM assistants, served through an RM-first interface.', 10, False, TEXT_SUB, PP_ALIGN.CENTER)

# ── Data Sources row ──
ds_y = Inches(2.15)
ds_box = add_rounded_rect(s3, Inches(0.5), ds_y, Inches(9), Inches(0.65))
tf_ds = add_textbox(s3, Inches(0.7), ds_y + Inches(0.02), Inches(2), Inches(0.25))
add_para(tf_ds, '● DATA SOURCES', 9, True, SIX_BLUE)

ds_pills = ['SIX Financial MCP', 'Event Registry News', 'CRM Notes', 'Portfolio Data']
px = Inches(0.7)
for pill_text in ds_pills:
    pw = Inches(max(1.5, len(pill_text) * 0.11))
    add_pill(s3, px, ds_y + Inches(0.3), pill_text, BLUE_TINT, SIX_BLUE, width=pw)
    px += pw + Inches(0.15)

# Arrow
tf_arr = add_textbox(s3, Inches(4), Inches(2.82), Inches(2), Inches(0.3))
add_para(tf_arr, '↓  Live data feeds', 9, False, MUTED, PP_ALIGN.CENTER)

# ── Assistant/Agent row ──
agent_y = Inches(3.15)
agent_w = Inches(2.85)
agent_gap = Inches(0.2)
agent_start_x = Inches(0.5)

agents = [
    ('Conflict Assistant', 'Monitors the portfolio'),
    ('Message Assistant', 'Drafts the advisory notes'),
    ('Chat Agent', 'Natural language tool use across the system'),
]

for i, (name, desc) in enumerate(agents):
    x = agent_start_x + i * (agent_w + agent_gap)
    box = add_rounded_rect(s3, x, agent_y, agent_w, Inches(0.7), HIGHLIGHT_BG, SIX_RED, Pt(1))
    tf_n = add_textbox(s3, x + Inches(0.15), agent_y + Inches(0.02), agent_w - Inches(0.3), Inches(0.25))
    add_para(tf_n, '● ' + name.upper(), 8, True, SIX_RED)
    pw = Inches(min(agent_w.inches - 0.3, max(1.6, len(desc) * 0.095)))
    add_pill(s3, x + Inches(0.15), agent_y + Inches(0.33), desc, RED_TINT, SIX_RED, width=pw)

# Arrow
tf_arr2 = add_textbox(s3, Inches(4), Inches(3.88), Inches(2), Inches(0.3))
add_para(tf_arr2, '↓  REST API', 9, False, MUTED, PP_ALIGN.CENTER)

# ── Bottom row: Trust & RM Dashboard ──
bot_y = Inches(4.2)
bot_w = Inches(4.4)

# Trust & Compliance
tc_box = add_rounded_rect(s3, Inches(0.5), bot_y, bot_w, Inches(0.85))
tf_tc = add_textbox(s3, Inches(0.7), bot_y + Inches(0.02), Inches(3), Inches(0.25))
add_para(tf_tc, '● TRUST & COMPLIANCE', 8, True, GREEN)

tc_pills = ['Audit Trail', 'Explainability', 'Trace Logging', 'Spider Graph Scoring']
px = Inches(0.7)
py = bot_y + Inches(0.3)
for pill_text in tc_pills:
    pw = Inches(max(1.1, len(pill_text) * 0.1))
    if px + pw > Inches(0.5) + bot_w - Inches(0.15):
        px = Inches(0.7)
        py += Inches(0.3)
    add_pill(s3, px, py, pill_text, GREEN_TINT, GREEN, width=pw)
    px += pw + Inches(0.12)

# RM Dashboard
rm_box = add_rounded_rect(s3, Inches(5.1), bot_y, bot_w, Inches(0.85))
tf_rm = add_textbox(s3, Inches(5.3), bot_y + Inches(0.02), Inches(3), Inches(0.25))
add_para(tf_rm, '● RM DASHBOARD', 8, True, SIX_BLUE)

rm_pills = ['Home & Action Items', 'Global News View', 'Client Panels']
px = Inches(5.3)
for pill_text in rm_pills:
    pw = Inches(max(1.2, len(pill_text) * 0.105))
    add_pill(s3, px, bot_y + Inches(0.3), pill_text, BLUE_TINT, SIX_BLUE, width=pw)
    px += pw + Inches(0.12)


# ══════════════════════════════════════════════════════════
# SLIDE 4 — DEMO
# ══════════════════════════════════════════════════════════
s4 = prs.slides.add_slide(blank_layout)
s4.background.fill.solid()
s4.background.fill.fore_color.rgb = WHITE
add_logo_and_label(s4, '05 / 06  —  Live Demo')

# Left half
tf = add_textbox(s4, Inches(0.6), Inches(0.9), Inches(4), Inches(0.3))
add_para(tf, 'LIVE DEMO', 10, True, SIX_RED)

tf2 = add_textbox(s4, Inches(0.6), Inches(1.25), Inches(4.2), Inches(0.8))
p = tf2.paragraphs[0]
set_run(p, 'From CRM to advisory ', 26, True, TEXT_DARK)
set_run(p, 'in 15 seconds', 26, True, SIX_RED)

tf3 = add_textbox(s4, Inches(0.6), Inches(2.1), Inches(4), Inches(0.6))
add_para(tf3, 'Four real Swiss private banking personas. Actual CRM logs. Live SIX financial data. One RM. Zero compromise.', 11, False, TEXT_SUB)

# Steps
steps = [
    'Select any client — their DNA surfaces instantly from CRM history',
    'See live conflicts and news matched to their personal values',
    'Hit Generate Advisory — bespoke message in <5s',
    'Ask the AI assistant anything — it knows the client cold',
]
step_y = Inches(2.8)
for i, step in enumerate(steps):
    y = step_y + i * Inches(0.38)
    # Number circle
    circ = s4.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.6), y, Inches(0.25), Inches(0.25))
    circ.fill.solid()
    circ.fill.fore_color.rgb = SIX_RED
    circ.line.fill.background()
    ctf = circ.text_frame
    ctf.margin_top = Pt(0)
    ctf.margin_bottom = Pt(0)
    ctf.margin_left = Pt(0)
    ctf.margin_right = Pt(0)
    cp = ctf.paragraphs[0]
    cp.alignment = PP_ALIGN.CENTER
    set_run(cp, str(i + 1), 8, True, WHITE)
    # Text
    tf_s = add_textbox(s4, Inches(0.95), y, Inches(3.8), Inches(0.3))
    add_para(tf_s, step, 10, False, TEXT_SUB)

# URL chip
url_box = add_rounded_rect(s4, Inches(0.6), Inches(4.45), Inches(2.5), Inches(0.35), BG_LIGHT)
tf_url = add_textbox(s4, Inches(0.75), Inches(4.45), Inches(2.3), Inches(0.35))
p_url = tf_url.paragraphs[0]
p_url.alignment = PP_ALIGN.LEFT
set_run(p_url, '● ', 10, False, GREEN)
set_run(p_url, 'wealthadvisor-ai.fly.dev', 10, False, TEXT_SUB, 'Consolas')

# Right half — mock browser
right_bg = add_rounded_rect(s4, Inches(5), Inches(0), Inches(5), Inches(5.625), BG_LIGHT, BORDER)

browser = add_rounded_rect(s4, Inches(5.3), Inches(0.5), Inches(4.4), Inches(4.6), WHITE, BORDER)

# Browser bar
bar = add_rounded_rect(s4, Inches(5.3), Inches(0.5), Inches(4.4), Inches(0.35), BG_LIGHT, BORDER)
# Browser dots
for j, c in enumerate([RGBColor(0xEF,0x44,0x44), RGBColor(0xF5,0x9E,0x0B), RGBColor(0x22,0xC5,0x5E)]):
    dot = s4.shapes.add_shape(MSO_SHAPE.OVAL, Inches(5.45 + j * 0.2), Inches(0.58), Inches(0.12), Inches(0.12))
    dot.fill.solid()
    dot.fill.fore_color.rgb = c
    dot.line.fill.background()

# URL bar
url_bar = add_rounded_rect(s4, Inches(6.2), Inches(0.57), Inches(2.5), Inches(0.2), WHITE, BORDER)
tf_ub = url_bar.text_frame

tf_ub.margin_top = Pt(0)
tf_ub.margin_bottom = Pt(0)
tf_ub.margin_left = Pt(4)
p_ub = tf_ub.paragraphs[0]
set_run(p_ub, 'wealthadvisor-ai.fly.dev', 7, False, TEXT_SUB, 'Consolas')

# Mock sidebar
sidebar = add_rounded_rect(s4, Inches(5.3), Inches(0.85), Inches(1.3), Inches(4.25), BG_LIGHT, BORDER)
tf_sb = add_textbox(s4, Inches(5.4), Inches(0.9), Inches(1.1), Inches(0.25))
p_sb = tf_sb.paragraphs[0]
set_run(p_sb, 'SIX ', 8, True, SIX_RED)
set_run(p_sb, 'AI', 8, False, TEXT_SUB)

# Mock clients
clients = [
    ('HS', 'H. Schneider', 'Balanced', SIX_RED, True),
    ('MH', 'M. Huber', 'Defensive', SIX_BLUE, False),
    ('ER', 'E. Räber', 'Defensive', SIX_RED_DK, False),
    ('JA', 'J. Ammann', 'Growth', SIX_BLUE_BR, False),
]
for ci, (init, name, strat, color, sel) in enumerate(clients):
    cy = Inches(1.25 + ci * 0.4)
    if sel:
        sel_bg = add_rounded_rect(s4, Inches(5.35), cy - Inches(0.04), Inches(1.2), Inches(0.35), RED_TINT, RED_TINT, Pt(0))

    av = s4.shapes.add_shape(MSO_SHAPE.OVAL, Inches(5.45), cy, Inches(0.22), Inches(0.22))
    av.fill.solid()
    av.fill.fore_color.rgb = color
    av.line.fill.background()
    av_tf = av.text_frame
    av_tf.margin_top = Pt(0)
    av_tf.margin_bottom = Pt(0)
    ap = av_tf.paragraphs[0]
    ap.alignment = PP_ALIGN.CENTER
    set_run(ap, init, 6, True, WHITE)

    tf_cn = add_textbox(s4, Inches(5.72), cy - Inches(0.02), Inches(0.9), Inches(0.3))
    add_para(tf_cn, name, 7, True, TEXT_DARK)
    add_para(tf_cn, strat, 6, False, TEXT_SUB)

# Mock main content - advisory
adv_box = add_rounded_rect(s4, Inches(6.75), Inches(0.95), Inches(2.8), Inches(1.1),
                           RGBColor(0xFE, 0xF9, 0xFA), RGBColor(0xF0, 0xD0, 0xD5))
tf_adv = add_textbox(s4, Inches(6.85), Inches(0.98), Inches(2.6), Inches(1.0))
p_adv = tf_adv.paragraphs[0]
set_run(p_adv, 'Advisory Draft — ', 7, True, SIX_RED)
set_run(p_adv, "Dear Hubertus, the announced shutdown of AstraZeneca's chronic-illness research division directly conflicts with your foundation's mission. We recommend a swap into Roche Holding.", 7, False, TEXT_SUB)

# DNA card
dna_box = add_rounded_rect(s4, Inches(6.75), Inches(2.15), Inches(2.8), Inches(0.7), BG_LIGHT, BORDER)
tf_dna = add_textbox(s4, Inches(6.85), Inches(2.18), Inches(2), Inches(0.2))
add_para(tf_dna, 'CLIENT DNA', 7, True, SIX_RED)

dna_pills = [('health legacy', BLUE_TINT, SIX_BLUE), ('ESG alignment', BLUE_TINT, SIX_BLUE),
             ('pharma risk', RED_TINT, SIX_RED), ('family foundation', PURPLE_TINT, PURPLE)]
dpx = Inches(6.85)
for pill_text, bg, tc in dna_pills:
    pw = Inches(max(0.8, len(pill_text) * 0.08))
    if dpx + pw > Inches(9.4):
        dpx = Inches(6.85)
    add_pill(s4, dpx, Inches(2.45), pill_text, bg, tc, width=pw)
    dpx += pw + Inches(0.08)

# Alert
alert_box = add_rounded_rect(s4, Inches(6.75), Inches(2.95), Inches(2.8), Inches(0.4), RED_TINT, RGBColor(0xF0, 0xD0, 0xD5))
tf_al = add_textbox(s4, Inches(6.85), Inches(2.97), Inches(2.6), Inches(0.35))
add_para(tf_al, '⚠ Major Pharma Co. shuts chronic-illness research — direct conflict with client DNA', 7, False, SIX_RED_DK)


# ══════════════════════════════════════════════════════════
# SLIDE 5 — Q&A / TEAM
# ══════════════════════════════════════════════════════════
s5 = prs.slides.add_slide(blank_layout)
s5.background.fill.solid()
s5.background.fill.fore_color.rgb = WHITE
add_logo_and_label(s5, '06 / 06  —  Q&A')

tf = add_textbox(s5, Inches(0.5), Inches(0.85), Inches(9), Inches(0.3))
add_para(tf, 'THE TEAM', 10, True, SIX_RED, PP_ALIGN.CENTER)

tf2 = add_textbox(s5, Inches(1), Inches(1.15), Inches(8), Inches(0.6))
p = tf2.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
set_run(p, 'Questions & ', 28, True, TEXT_DARK)
set_run(p, 'Answers', 28, True, SIX_RED)

tf3 = add_textbox(s5, Inches(2), Inches(1.7), Inches(6), Inches(0.4))
add_para(tf3, 'Built in ~24 hours at SwissHacks 2026', 13, False, TEXT_SUB, PP_ALIGN.CENTER)

# Team cards
team = [
    ('boris.JPG', 'Boris Goranov', 'FRONT-END', SIX_BLUE, BLUE_TINT),
    ('hristo.jpeg', 'Hristo Stefanov', 'BACK-END', GREEN, GREEN_TINT),
    ('nikola.jpeg', 'Nikola Staykov', 'BUSINESS', AMBER, AMBER_TINT),
]

card_w = Inches(2.4)
card_h = Inches(2.6)
card_gap = Inches(0.4)
cards_total_w = 3 * card_w.inches + 2 * card_gap.inches
card_start_x = Inches((10 - cards_total_w) / 2)
card_y = Inches(2.15)

for i, (photo, name, role, role_color, role_bg) in enumerate(team):
    x = Inches(card_start_x.inches + i * (card_w.inches + card_gap.inches))
    box = add_rounded_rect(s5, x, card_y, card_w, card_h)

    # Photo
    photo_path = os.path.join(DIR, photo)
    if os.path.exists(photo_path):
        photo_size = Inches(1.4)
        photo_x = Inches(x.inches + (card_w.inches - photo_size.inches) / 2)
        pic = s5.shapes.add_picture(photo_path, photo_x, card_y + Inches(0.2), photo_size, photo_size)

    # Name
    tf_name = add_textbox(s5, x, card_y + Inches(1.7), card_w, Inches(0.35))
    add_para(tf_name, name, 14, True, TEXT_DARK, PP_ALIGN.CENTER)

    # Role pill
    role_w = Inches(max(1.0, len(role) * 0.12))
    role_x = Inches(x.inches + (card_w.inches - role_w.inches) / 2)
    add_pill(s5, role_x, card_y + Inches(2.1), role, role_bg, role_color, width=role_w)

# Closing statement
tf_close = add_textbox(s5, Inches(1.5), Inches(4.55), Inches(7), Inches(0.4))
add_para(tf_close, 'Every client deserves a personal banker. We built one.', 16, True, TEXT_DARK, PP_ALIGN.CENTER)

# Questions?
tf_q = add_textbox(s5, Inches(3), Inches(5.0), Inches(4), Inches(0.35))
add_para(tf_q, '💬  Questions?', 14, True, TEXT_SUB, PP_ALIGN.CENTER)


# ── Save ────────────────────────────────────────────────
out_path = os.path.join(DIR, 'SIX_AI_Presentation.pptx')
prs.save(out_path)
print(f'Saved: {out_path}')
