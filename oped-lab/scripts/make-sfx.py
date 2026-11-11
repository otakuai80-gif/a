#!/usr/bin/env python3
"""YT-OP と CORP-OPENER の効果音を作る(この試作のための創作音)。
使い方: python3 scripts/make-sfx.py   → public/audio/sfx/*.wav

| ファイル | 長さ | 用途 |
|---|---|---|
| whoosh.wav  | 0.7秒 | 色帯ワイプ、レターボックスの開閉 |
| swish.wav   | 0.35秒 | 要素の移動、文字の登場 |
| pop.wav     | 0.25秒 | マークや紙吹雪の登場 |
| tick.wav    | 0.04秒 | タイプ表示の1文字 |
| iris.wav    | 0.9秒 | アイリスアウト |
| pen.wav     | 1.4秒 | 線描き(細い擦れる音) |
| thud.wav    | 1.2秒 | 塗りが入る(低く柔らかい音) |
| sparkle.wav | 1.2秒 | 光の帯 |
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from synth import SR, bell, highpass, noise, shaped_noise, t_axis, write_wav  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'audio', 'sfx')


def norm(x, peak_db=-3.0):
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)


def fade(x, a=0.005, r=0.02):
    n = len(x)
    e = np.ones(n)
    ka, kr = int(a * SR), int(r * SR)
    e[:ka] = np.linspace(0, 1, ka)
    e[n - kr:] = np.linspace(1, 0, kr)
    return x * e


def bump(n, peak_at=0.45, sharp=2.0):
    p = np.linspace(0, 1, n)
    return np.where(p < peak_at, (p / peak_at) ** sharp, ((1 - p) / (1 - peak_at)) ** (sharp * 0.8))


# 風切り: 帯域が上がってから下がる
d = 0.7
w = shaped_noise(d, lambda p: 150 + 900 * np.sin(np.pi * p), lambda p: 700 + 5200 * np.sin(np.pi * p))
write_wav(os.path.join(OUT, 'whoosh.wav'), norm(fade(w * bump(len(w), 0.45))))

# 短い風切り
d = 0.35
w = shaped_noise(d, lambda p: 1200 + 1500 * p, lambda p: 4000 + 6000 * p)
write_wav(os.path.join(OUT, 'swish.wav'), norm(fade(w * bump(len(w), 0.3, 1.5)), -6))

# ポップ: 高い音から下がる短い音
t = t_axis(0.25)
f = 300 + 700 * np.exp(-t / 0.025)
pop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.06) + highpass(noise(0.25)) * np.exp(-t / 0.003) * 0.2
write_wav(os.path.join(OUT, 'pop.wav'), norm(fade(pop, 0.001, 0.02)))

# タイプの1打
t = t_axis(0.04)
tick = highpass(noise(0.04), 2) * np.exp(-t / 0.004) * 0.6 + np.sin(2 * np.pi * 2100 * t) * np.exp(-t / 0.006) * 0.4
write_wav(os.path.join(OUT, 'tick.wav'), norm(fade(tick, 0.0005, 0.005), -8))

# アイリス: 下がる風切りの最後に低い音
d = 0.9
w = shaped_noise(d, lambda p: 900 - 700 * p, lambda p: 7000 - 6000 * p) * bump(int(d * SR), 0.7, 1.6)
t = t_axis(d)
thump = np.sin(2 * np.pi * 55 * t) * np.exp(-np.clip(t - 0.62, 0, None) / 0.12) * (t > 0.62)
write_wav(os.path.join(OUT, 'iris.wav'), norm(fade(w + thump * 0.8)))

# ペン: 細い帯域のノイズを、紙をなぞるように揺らす
d = 1.4
t = t_axis(d)
pen = shaped_noise(d, lambda p: 3000, lambda p: 8000)
pen *= (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t) ** 2) * np.clip(t / 0.08, 0, 1) * np.clip((d - t) / 0.25, 0, 1)
write_wav(os.path.join(OUT, 'pen.wav'), norm(pen, -10))

# 塗り: 低く柔らかい打音と和音の余韻
t = t_axis(1.2)
f = 52 + 30 * np.exp(-t / 0.05)
thud = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.3)
for n_hz, a in [(220, 0.18), (277.2, 0.12), (329.6, 0.12)]:
    thud += np.sin(2 * np.pi * n_hz * t) * np.exp(-t / 0.5) * a * np.clip(t / 0.02, 0, 1)
write_wav(os.path.join(OUT, 'thud.wav'), norm(fade(thud, 0.001, 0.1)))

# 光: 高い鐘を少しずつずらして重ねる
sp = np.zeros(int(1.2 * SR))
for i, hz in enumerate([2093, 2637, 3136, 4186]):
    b = bell(hz, 1.2 - i * 0.06)
    s = int(i * 0.06 * SR)
    sp[s:s + len(b)] += b * (1 - i * 0.15)
write_wav(os.path.join(OUT, 'sparkle.wav'), norm(fade(sp, 0.001, 0.1), -6))
