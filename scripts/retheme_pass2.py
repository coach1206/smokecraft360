#!/usr/bin/env python3
"""
retheme_pass2.py — Second-pass cream/obsidian token sweep.
Catches patterns missed by the first script: pure whites, pure blacks,
very-dark rgba families, single-decimal rgba forms, brownish muteds.
"""
import os, re, sys

SRC = os.path.join(os.path.dirname(__file__), "..", "artifacts", "smokecraft", "src")

# ── Ordered replacement pairs (string literals, applied sequentially) ─────────
REPLACEMENTS = [
    # ── 1. Pure white text → Obsidian ────────────────────────────────────────
    ('"#FFFFFF"',   '"#1A1A1B"'),
    ('"#ffffff"',   '"#1A1A1B"'),
    ('"#FFF"',      '"#1A1A1B"'),
    ('"#fff"',      '"#1A1A1B"'),
    ("'#FFFFFF'",   "'#1A1A1B'"),
    ("'#ffffff'",   "'#1A1A1B'"),
    ("'#FFF'",      "'#1A1A1B'"),
    ("'#fff'",      "'#1A1A1B'"),
    # JSX prop form: color="#fff"
    ('color="#fff"',     'color="#1A1A1B"'),
    ('color="#FFF"',     'color="#1A1A1B"'),
    ('color="#FFFFFF"',  'color="#1A1A1B"'),
    ('color="#ffffff"',  'color="#1A1A1B"'),
    # plain word
    (': "white"',  ': "#1A1A1B"'),
    (": 'white'",  ": '#1A1A1B'"),

    # ── 2. Pure black hex → Obsidian (was text colour) ───────────────────────
    ('"#000"',    '"#1A1A1B"'),
    ("'#000'",    "'#1A1A1B'"),
    ('"#000000"', '"#1A1A1B"'),
    ("'#000000'", "'#1A1A1B'"),

    # ── 3. Old amber-button foreground (dark espresso on amber) → Cream ───────
    ('"hsl(22 18% 6%)"',  '"#F5F2ED"'),
    ("'hsl(22 18% 6%)'",  "'#F5F2ED'"),

    # ── 4. Old brownish-cream text hex → Obsidian ─────────────────────────────
    ('"#e8e0c8"', '"#1A1A1B"'),
    ('"#E8E0C8"', '"#1A1A1B"'),
    ('"#d8ceb8"', '"#1A1A1B"'),
    ('"#D8CEB8"', '"#1A1A1B"'),

    # ── 5. Very-dark rgba families → Cream surface (rgba(245,242,237,…)) ──────
    # rgba(8,6,4,…)   — single- and two-decimal alpha
    ("rgba(8,6,4,0.96)",  "rgba(245,242,237,0.96)"),
    ("rgba(8,6,4,0.92)",  "rgba(245,242,237,0.92)"),
    ("rgba(8,6,4,0.90)",  "rgba(245,242,237,0.90)"),
    ("rgba(8,6,4,0.88)",  "rgba(245,242,237,0.88)"),
    ("rgba(8,6,4,0.85)",  "rgba(245,242,237,0.85)"),
    ("rgba(8,6,4,0.82)",  "rgba(245,242,237,0.82)"),
    ("rgba(8,6,4,0.80)",  "rgba(245,242,237,0.80)"),
    ("rgba(8,6,4,0.75)",  "rgba(245,242,237,0.75)"),
    ("rgba(8,6,4,0.72)",  "rgba(245,242,237,0.72)"),
    ("rgba(8,6,4,0.70)",  "rgba(245,242,237,0.70)"),
    ("rgba(8,6,4,0.65)",  "rgba(245,242,237,0.65)"),
    ("rgba(8,6,4,0.60)",  "rgba(245,242,237,0.60)"),
    ("rgba(8,6,4,0.55)",  "rgba(245,242,237,0.55)"),
    ("rgba(8,6,4,0.50)",  "rgba(245,242,237,0.50)"),
    ("rgba(8,6,4,0.45)",  "rgba(245,242,237,0.45)"),
    ("rgba(8,6,4,0.40)",  "rgba(245,242,237,0.40)"),
    ("rgba(8,6,4,0.35)",  "rgba(245,242,237,0.35)"),
    ("rgba(8,6,4,0.30)",  "rgba(245,242,237,0.30)"),
    ("rgba(8,6,4,0.25)",  "rgba(245,242,237,0.25)"),
    ("rgba(8,6,4,0.20)",  "rgba(245,242,237,0.20)"),
    ("rgba(8,6,4,0.18)",  "rgba(245,242,237,0.18)"),
    ("rgba(8,6,4,0.15)",  "rgba(245,242,237,0.15)"),
    ("rgba(8,6,4,0.12)",  "rgba(245,242,237,0.12)"),
    ("rgba(8,6,4,0.10)",  "rgba(245,242,237,0.10)"),
    ("rgba(8,6,4,0.08)",  "rgba(245,242,237,0.08)"),
    ("rgba(8,6,4,0.05)",  "rgba(245,242,237,0.05)"),
    # single-decimal catch
    ("rgba(8,6,4,0.9)",   "rgba(245,242,237,0.90)"),
    ("rgba(8,6,4,0.8)",   "rgba(245,242,237,0.80)"),
    ("rgba(8,6,4,0.7)",   "rgba(245,242,237,0.70)"),
    ("rgba(8,6,4,0.6)",   "rgba(245,242,237,0.60)"),
    ("rgba(8,6,4,0.5)",   "rgba(245,242,237,0.50)"),
    ("rgba(8,6,4,0.4)",   "rgba(245,242,237,0.40)"),
    ("rgba(8,6,4,0.3)",   "rgba(245,242,237,0.30)"),
    ("rgba(8,6,4,0.2)",   "rgba(245,242,237,0.20)"),
    ("rgba(8,6,4,0.1)",   "rgba(245,242,237,0.10)"),

    # rgba(4,3,2,…)  — catch-all prefix
    ("rgba(4,3,2,", "rgba(245,242,237,"),

    # rgba(10,8,6,…) — catch-all prefix
    ("rgba(10,8,6,", "rgba(245,242,237,"),

    # rgba(10,6,2,…) — catch-all prefix
    ("rgba(10,6,2,", "rgba(245,242,237,"),

    # rgba(18,14,10,…) — catch-all prefix
    ("rgba(18,14,10,", "rgba(245,242,237,"),

    # rgba(12,9,6,…) — catch-all prefix
    ("rgba(12,9,6,", "rgba(245,242,237,"),

    # rgba(6,4,2,…) — catch-all prefix
    ("rgba(6,4,2,", "rgba(245,242,237,"),

    # ── 6. Cream-text rgba (missed single-decimal forms) → Obsidian rgba ──────
    ("rgba(240,232,212,0.9)", "rgba(26,26,27,0.88)"),
    ("rgba(240,232,212,0.8)", "rgba(26,26,27,0.78)"),
    ("rgba(240,232,212,0.7)", "rgba(26,26,27,0.68)"),
    ("rgba(240,232,212,0.6)", "rgba(26,26,27,0.58)"),
    ("rgba(240,232,212,0.5)", "rgba(26,26,27,0.50)"),
    ("rgba(240,232,212,0.4)", "rgba(26,26,27,0.40)"),
    ("rgba(240,232,212,0.3)", "rgba(26,26,27,0.30)"),
    ("rgba(240,232,212,0.2)", "rgba(26,26,27,0.20)"),
    ("rgba(240,232,212,0.1)", "rgba(26,26,27,0.12)"),

    # rgba(232,224,200,…) — old brownish cream text
    ("rgba(232,224,200,0.95)", "rgba(26,26,27,0.90)"),
    ("rgba(232,224,200,0.90)", "rgba(26,26,27,0.88)"),
    ("rgba(232,224,200,0.85)", "rgba(26,26,27,0.82)"),
    ("rgba(232,224,200,0.80)", "rgba(26,26,27,0.78)"),
    ("rgba(232,224,200,0.75)", "rgba(26,26,27,0.72)"),
    ("rgba(232,224,200,0.70)", "rgba(26,26,27,0.68)"),
    ("rgba(232,224,200,0.65)", "rgba(26,26,27,0.62)"),
    ("rgba(232,224,200,0.60)", "rgba(26,26,27,0.58)"),
    ("rgba(232,224,200,0.55)", "rgba(26,26,27,0.52)"),
    ("rgba(232,224,200,0.50)", "rgba(26,26,27,0.48)"),
    ("rgba(232,224,200,0.45)", "rgba(26,26,27,0.44)"),
    ("rgba(232,224,200,0.40)", "rgba(26,26,27,0.40)"),
    ("rgba(232,224,200,0.35)", "rgba(26,26,27,0.35)"),
    ("rgba(232,224,200,0.30)", "rgba(26,26,27,0.30)"),
    ("rgba(232,224,200,0.25)", "rgba(26,26,27,0.25)"),
    ("rgba(232,224,200,0.20)", "rgba(26,26,27,0.20)"),
    ("rgba(232,224,200,0.15)", "rgba(26,26,27,0.15)"),
    ("rgba(232,224,200,0.10)", "rgba(26,26,27,0.12)"),
    # single-decimal
    ("rgba(232,224,200,0.9)", "rgba(26,26,27,0.88)"),
    ("rgba(232,224,200,0.8)", "rgba(26,26,27,0.78)"),
    ("rgba(232,224,200,0.7)", "rgba(26,26,27,0.68)"),
    ("rgba(232,224,200,0.6)", "rgba(26,26,27,0.58)"),
    ("rgba(232,224,200,0.5)", "rgba(26,26,27,0.48)"),
    ("rgba(232,224,200,0.4)", "rgba(26,26,27,0.40)"),
    ("rgba(232,224,200,0.3)", "rgba(26,26,27,0.30)"),
    ("rgba(232,224,200,0.2)", "rgba(26,26,27,0.20)"),
    ("rgba(232,224,200,0.1)", "rgba(26,26,27,0.12)"),

    # ── 7. Brownish muted rgba → warm graphite ────────────────────────────────
    ("rgba(180,155,100,0.95)", "rgba(107,94,78,0.90)"),
    ("rgba(180,155,100,0.90)", "rgba(107,94,78,0.88)"),
    ("rgba(180,155,100,0.85)", "rgba(107,94,78,0.82)"),
    ("rgba(180,155,100,0.80)", "rgba(107,94,78,0.78)"),
    ("rgba(180,155,100,0.75)", "rgba(107,94,78,0.72)"),
    ("rgba(180,155,100,0.70)", "rgba(107,94,78,0.68)"),
    ("rgba(180,155,100,0.65)", "rgba(107,94,78,0.62)"),
    ("rgba(180,155,100,0.60)", "rgba(107,94,78,0.58)"),
    ("rgba(180,155,100,0.55)", "rgba(107,94,78,0.52)"),
    ("rgba(180,155,100,0.50)", "rgba(107,94,78,0.50)"),
    ("rgba(180,155,100,0.45)", "rgba(107,94,78,0.45)"),
    ("rgba(180,155,100,0.40)", "rgba(107,94,78,0.40)"),
    ("rgba(180,155,100,0.35)", "rgba(107,94,78,0.35)"),
    ("rgba(180,155,100,0.30)", "rgba(107,94,78,0.30)"),
    ("rgba(180,155,100,0.25)", "rgba(107,94,78,0.25)"),
    ("rgba(180,155,100,0.22)", "rgba(107,94,78,0.25)"),
    ("rgba(180,155,100,0.20)", "rgba(107,94,78,0.20)"),
    ("rgba(180,155,100,0.15)", "rgba(107,94,78,0.18)"),
    ("rgba(180,155,100,0.10)", "rgba(107,94,78,0.12)"),
    # single-decimal
    ("rgba(180,155,100,0.9)", "rgba(107,94,78,0.88)"),
    ("rgba(180,155,100,0.8)", "rgba(107,94,78,0.78)"),
    ("rgba(180,155,100,0.7)", "rgba(107,94,78,0.68)"),
    ("rgba(180,155,100,0.6)", "rgba(107,94,78,0.58)"),
    ("rgba(180,155,100,0.5)", "rgba(107,94,78,0.50)"),
    ("rgba(180,155,100,0.4)", "rgba(107,94,78,0.40)"),
    ("rgba(180,155,100,0.3)", "rgba(107,94,78,0.30)"),
    ("rgba(180,155,100,0.2)", "rgba(107,94,78,0.20)"),
    ("rgba(180,155,100,0.1)", "rgba(107,94,78,0.12)"),

    # ── 8. Amber-adjacent rgba (brownish gold → true amber) ───────────────────
    ("rgba(180,130,30,",  "rgba(212,139,0,"),
    ("rgba(230,200,120,", "rgba(212,139,0,"),
    ("rgba(224,196,120,", "rgba(212,139,0,"),
    ("rgba(230,190,100,", "rgba(212,139,0,"),
    ("rgba(230,200,120,0.95)", "rgba(212,139,0,0.95)"),

    # ── 9. Tailwind text-white → obsidian bracket class ───────────────────────
    ("text-white",  "text-[#1A1A1B]"),
]

SKIP_DIRS = {"node_modules", "dist", ".git", "__pycache__"}
EXTENSIONS = {".tsx", ".ts"}

modified = 0
for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for fname in files:
        if not any(fname.endswith(ext) for ext in EXTENSIONS):
            continue
        path = os.path.join(root, fname)
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            original = fh.read()
        content = original
        for old, new in REPLACEMENTS:
            content = content.replace(old, new)
        if content != original:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(content)
            rel = os.path.relpath(path, SRC)
            print(f"  ✓ {rel}")
            modified += 1

print(f"\nPass 2 complete — {modified} files updated.")
