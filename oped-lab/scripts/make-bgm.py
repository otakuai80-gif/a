#!/usr/bin/env python3
"""ANIME-OP の仮BGMを作る(曲が決まるまでの、この試作のための創作曲)。
使い方: python3 scripts/make-bgm.py        → public/audio/anime-op-bgm.wav(150 BPM、20小節、32秒)

構成は src/compositions/anime/cuts.ts と docs/specs/02-anime.md のカット表に合わせてある。
カット表を変えたら、下の SECTIONS もあわせて直すこと。小節と拍は 0 始まり(cuts.ts と同じ)。

| 小節 | カット | 音 |
|---|---|---|
| 0     | C01  | 1拍目に低い衝撃とシンバル(閃光)。2拍目から上がっていく持続音(線) |
| 1     | C02  | 8分のハイハット、毎拍の電子音(赤い点の点滅)、4分のベース |
| 2-3   | C03  | 1拍目は低音だけ(地の色だけ変わる)。2拍目にシンバルと和音(題名) |
| 4-11  | C04-C07 | A パート。2拍4拍のスネア、分散和音。11小節目の2拍目で明るい和音と鐘(信号が青) |
| 12-13 | C08-C09 | ビルド。文字カットごとに和音を打つ(2拍ずつ→1拍ずつ)。ノイズが上がる |
| 14-15 | C10  | サビ。4つ打ち、2拍目と4拍目に手拍子(言葉が出る拍)、旋律 |
| 16    | C11  | 16分のスネア連打16発(フラッシュカット) |
| 17    | C12  | 上昇音と逆回転シンバル(青い円が覆う) |
| 18-19 | C13  | 1拍目にシンバル、2拍目に和音と鐘(題名)。最後の1拍で消える |
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from synth import (Mix, SR, bell, blip, boom, crash, env_adsr, hat, kick, midi_hz, saw,  # noqa: E402
                   shaped_noise, snare, square, write_wav)

BPM = 150
BARS = 20
BEAT = 60 / BPM

mix = Mix(BARS * 4 * BEAT)


def at(bar, beat=0.0):
    return (bar * 4 + beat) * BEAT


# 和音: (ベースの音, 上に重ねる音)。MIDI 番号。
CH = {
    'Em9': (40, [59, 62, 66, 67]),
    'Cmaj7': (36, [55, 59, 60, 64]),
    'D': (38, [57, 62, 66, 69]),
    'Bm7': (35, [57, 59, 62, 66]),
    'Em': (40, [55, 59, 64, 67]),
    'G': (43, [55, 59, 62, 67]),
    'Am7': (45, [55, 60, 64, 67]),
}


def pad(chord, bar, beat, beats, gain=0.09, attack=0.25):
    dur = beats * BEAT + 0.35
    for i, n in enumerate(CH[chord][1]):
        for det, pan in [(-7, -0.6), (7, 0.6)]:
            s = saw(midi_hz(n), dur, cutoff=1800, detune_cents=det) * env_adsr(int(dur * SR), a=attack, d=0.4, s=0.8, r=0.35)
            mix.add(s, at(bar, beat), gain, pan + (i - 1.5) * 0.05, rev=0.35)


def stab(chord, bar, beat, gain=0.22, length=0.5):
    for n in CH[chord][1] + [CH[chord][1][0] + 12]:
        s = saw(midi_hz(n), length + 0.3, cutoff=5000, decay_k=3.0) * env_adsr(int((length + 0.3) * SR), a=0.003, d=0.15, s=0.3, r=0.3)
        mix.add(s, at(bar, beat), gain / 2, 0.0, rev=0.5)


def bass(note, bar, beat, beats=1.0, gain=0.42):
    dur = beats * BEAT * 0.92
    n = int(dur * SR)
    s = (saw(midi_hz(note), dur, cutoff=900) * 0.8 + np.sin(2 * np.pi * midi_hz(note) * np.arange(n) / SR)) * env_adsr(n, a=0.004, d=0.12, s=0.6, r=0.04)
    mix.add(s, at(bar, beat), gain)


def pluck(note, bar, beat, gain=0.13, pan=-0.35):
    s = saw(midi_hz(note), 0.45, cutoff=6000, decay_k=6.0) * env_adsr(int(0.45 * SR), a=0.002, d=0.12, s=0.0, r=0.1)
    mix.add(s, at(bar, beat), gain, pan, rev=0.3)


def lead(note, bar, beat, eighths, gain=0.15):
    dur = eighths * BEAT / 2 * 0.95
    s = square(midi_hz(note), dur, cutoff=5000, vibrato=0.006) * env_adsr(int(dur * SR), a=0.01, d=0.2, s=0.75, r=0.06)
    mix.add(s, at(bar, beat), gain, 0.1, rev=0.4)
    mix.add(s, at(bar, beat) + BEAT * 0.75, gain * 0.3, -0.5, rev=0.4)  # 付点8分のこだま


def K(bar, beat, g=0.85):
    mix.add(kick(), at(bar, beat), g)


def S(bar, beat, g=0.5):
    mix.add(snare(), at(bar, beat), g, 0.05, rev=0.25)


def clap(bar, beat, g=0.45):
    for i, off in enumerate([0, 0.011, 0.023]):
        mix.add(snare(0.2, tone=1200) * 0.6, at(bar, beat) + off, g * (1 - i * 0.2), (i - 1) * 0.3, rev=0.4)


def H(bar, beat, g=0.5, open_=False):
    mix.add(hat(open_=open_), at(bar, beat), g, 0.35)


def C(bar, beat, g=0.55):
    mix.add(crash(), at(bar, beat), g, -0.2, rev=0.3)


def riser(bar_from, bar_to, g=0.35, lo=200, hi_end=9000):
    dur = at(bar_to) - at(bar_from)
    s = shaped_noise(dur, lambda p: lo + p * 1500, lambda p: 600 + p ** 2 * hi_end)
    s *= np.linspace(0.05, 1, len(s)) ** 2
    mix.add(s, at(bar_from), g, 0.0, rev=0.3)


# ---- 0: C01 衝撃、線 ----
mix.add(boom(), at(0), 0.9)
C(0, 0, 0.6)
K(0, 0)
drone_dur = 3 * BEAT + 0.2
t = np.arange(int(drone_dur * SR)) / SR
drone = sum(np.sin(2 * np.pi * midi_hz(n) * (1 + 0.04 * t / drone_dur) * t) for n in [52, 59, 64]) / 3
mix.add(drone * (t / drone_dur) ** 1.5, at(0, 1), 0.25, 0, rev=0.5)

# ---- 1: C02 拍の点滅 ----
for b in range(4):
    mix.add(blip(midi_hz(88 if b == 0 else 83)), at(1, b), 0.22, 0.5, rev=0.4)
    bass(28, 1, b, 0.5, 0.5)
    H(1, b + 0.5)
K(1, 0)
pad('Em', 1, 0, 4, gain=0.04, attack=0.8)

# ---- 2-3: C03 題字(1拍目は低音だけ、2拍目で明示) ----
mix.add(boom(1.0), at(2), 0.7)
C(2, 1, 0.65)
K(2, 1)
S(2, 1, 0.4)
stab('Em9', 2, 1, 0.3, 0.8)
mix.add(bell(midi_hz(76), 2.5), at(2, 1), 0.35, 0.2, rev=0.5)
pad('Em9', 2, 1, 7, gain=0.08)
bass(40, 2, 1, 7, 0.3)
for bar in (2, 3):
    for b in range(4):
        H(bar, b + 0.5, 0.35)
K(3, 0, 0.6)
K(3, 2, 0.6)
for i in range(4):  # 3小節目4拍目: 16分のスネアで A パートへ
    S(3, 3 + i * 0.25, 0.18 + i * 0.07)

# ---- 4-11: A パート ----
A_PROG = ['Cmaj7', 'D', 'Bm7', 'Em', 'Cmaj7', 'D', 'Bm7', None]
ARP = [0, 1, 2, 3, 2, 1, 2, 3]
for i, chord in enumerate(A_PROG):
    bar = 4 + i
    if chord is None:  # 11小節目: 1拍目は D、2拍目で G(信号が赤から青へ)
        pad('D', bar, 0, 1, gain=0.08, attack=0.05)
        pad('G', bar, 1, 3, gain=0.09, attack=0.02)
        stab('G', bar, 1, 0.28, 0.6)
        mix.add(bell(midi_hz(83), 2.2), at(bar, 1), 0.4, 0.3, rev=0.5)
        mix.add(bell(midi_hz(91), 1.8), at(bar, 1.5), 0.2, -0.3, rev=0.5)
        bass(38, bar, 0, 1)
        for b in range(1, 4):
            bass(43, bar, b, 1)
        for e in range(2, 8):
            pluck(CH['G'][1][ARP[e]] + 12, bar, e / 2)
    else:
        pad(chord, bar, 0, 4, gain=0.08)
        root = CH[chord][0]
        for e in range(8):
            bass(root if e % 4 != 3 else root + 12, bar, e / 2, 0.5, 0.36)
            pluck(CH[chord][1][ARP[e]] + 12, bar, e / 2)
    # A パートの太鼓: 1拍目と 3拍目の裏にキック、2拍目と4拍目にスネア
    K(bar, 0)
    K(bar, 2.5, 0.7)
    S(bar, 1)
    S(bar, 3)
    for e in range(8):
        H(bar, e / 2, 0.45 if e % 2 else 0.25)
    if i % 2 == 0:
        C(bar, 0, 0.25)  # カットの頭(2小節ごと)を薄いシンバルで示す

# ---- 12-13: ビルド(文字カット) ----
riser(12, 14, 0.3)
for b in (0, 2):
    stab('Cmaj7', 12, b, 0.3, 0.6)
    K(12, b)
    S(12, b, 0.35)
    bass(36, 12, b, 2)
for b in range(4):
    stab('D', 13, b, 0.3, 0.3)
    K(13, b)
    S(13, b, 0.32 + b * 0.05)
    bass(38, 13, b, 1)
for i in range(4):
    S(13, 3.5 + i * 0.125, 0.25 + i * 0.05)

# ---- 14-15: サビ ----
C(14, 0, 0.7)
CHORUS = [('Cmaj7', 14, 0), ('D', 14, 2), ('Bm7', 15, 0), ('Em', 15, 2)]
for chord, bar, beat in CHORUS:
    pad(chord, bar, beat, 2, gain=0.1, attack=0.03)
    stab(chord, bar, beat, 0.18, 0.4)
    root = CH[chord][0]
    for e in range(4):
        bass(root + (12 if e % 2 else 0), bar, beat + e / 2, 0.5, 0.4)
for bar in (14, 15):
    for b in range(4):
        K(bar, b, 0.9)
        H(bar, b + 0.5, 0.45, open_=True)
        H(bar, b + 0.25, 0.2)
        H(bar, b + 0.75, 0.2)
    clap(bar, 1)
    clap(bar, 3)
MELODY = [  # (小節, 拍, 音, 8分の長さ)
    (14, 0, 76, 2), (14, 1, 74, 1), (14, 1.5, 76, 1), (14, 2, 79, 2), (14, 3, 78, 2),
    (15, 0, 76, 1), (15, 0.5, 74, 1), (15, 1, 71, 2), (15, 2, 74, 2), (15, 3, 76, 2),
]
for bar, beat, note, length in MELODY:
    lead(note, bar, beat, length)

# ---- 16: C11 16分のフラッシュ ----
pad('Am7', 16, 0, 4, gain=0.09, attack=0.02)
for i in range(16):
    S(16, i * 0.25, 0.2 + 0.3 * i / 15)
    if i % 4 == 0:
        K(16, i / 4)
    bass(45, 16, i * 0.25, 0.25, 0.3)

# ---- 17: C12 放射、青い円が覆う ----
pad('D', 17, 0, 4, gain=0.1, attack=0.5)
K(17, 0)
C(17, 0, 0.5)
riser(17, 18, 0.45, lo=400, hi_end=12000)
rev_cym = crash(4 * BEAT)[::-1]
mix.add(rev_cym * 1.2, at(17), 0.6, 0.0)
for b in range(4):
    bass(38, 17, b, 1, 0.35)

# ---- 18-19: C13 題字、静止、暗転 ----
mix.add(boom(1.4), at(18), 0.8)
C(18, 0, 0.75)
K(18, 0)
bass(40, 18, 0, 1, 0.45)
stab('Em9', 18, 1, 0.34, 1.2)
S(18, 1, 0.45)
K(18, 1, 0.7)
mix.add(bell(midi_hz(76), 3.0), at(18, 1), 0.38, 0.2, rev=0.6)
mix.add(bell(midi_hz(83), 3.0), at(18, 1.5), 0.22, -0.3, rev=0.6)
pad('Em9', 18, 1, 6.5, gain=0.09)
bass(28, 18, 1, 6.5, 0.32)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'audio', 'anime-op-bgm.wav')
write_wav(out, mix.render(reverb_seconds=2.0, fade_out=BEAT))
