#!/usr/bin/env python3
"""音声から BPM と拍の位置を推定する(numpy のみ使用)。
使い方: python3 scripts/beats.py audio.wav beats.json
一定テンポの曲を前提にした簡易推定。テンポが揺れる曲や静かな曲では外れるので、
結果は必ず耳で確認する。BPM が半分や2倍で出ることがある。"""
import json, sys, wave
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
with wave.open(src, 'rb') as w:
    sr, n, ch, sw = w.getframerate(), w.getnframes(), w.getnchannels(), w.getsampwidth()
    raw = w.readframes(n)
if sw != 2:
    sys.exit('16bit の WAV にしてください')
x = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768
if ch > 1:
    x = x.reshape(-1, ch).mean(axis=1)

hop, win = 256, 1024
frames = 1 + (len(x) - win) // hop
if frames < 50 or np.abs(x).max() < 1e-4:
    json.dump({'bpm': None, 'beats': [], 'note': '音が短いか無音'}, open(dst, 'w'))
    sys.exit(0)
idx = np.arange(win)[None, :] + hop * np.arange(frames)[:, None]
spec = np.abs(np.fft.rfft(x[idx] * np.hanning(win), axis=1))
flux = np.maximum(0, np.diff(np.log1p(spec * 100), axis=0)).sum(axis=1)  # 音の立ち上がりの強さ
flux = flux - flux.mean()
rate = sr / hop

# 自己相関でテンポ(60〜200 BPM)を探す
ac = np.correlate(flux, flux, mode='full')[len(flux) - 1:]
ac = ac / np.arange(len(flux), 0, -1)  # 重なりの長さで割り、長い周期が不利にならないようにする
lags = np.arange(len(ac))
lo, hi = int(rate * 60 / 200), int(rate * 60 / 60)
seg = ac[lo:hi + 1]
# 山を拾い、最大の 80% 以上ある山のうち最も速いテンポを選ぶ(半分のテンポに引っ張られにくくする)
peaks = [i for i in range(1, len(seg) - 1) if seg[i] >= seg[i - 1] and seg[i] >= seg[i + 1]]
if not peaks:
    peaks = [int(np.argmax(seg))]
top = max(seg[i] for i in peaks)
lag = lo + min(i for i in peaks if seg[i] >= 0.8 * top)
# 放物線補間で細かく合わせる
if 0 < lag < len(ac) - 1:
    a, b, c = ac[lag - 1], ac[lag], ac[lag + 1]
    lag = lag + 0.5 * (a - c) / (a - 2 * b + c + 1e-9)
bpm = 60 * rate / lag

# 拍の位相: 拍の位置に立ち上がりが最も集まるずれを選ぶ
best, best_off = -1e9, 0.0
for off in np.linspace(0, lag, 64, endpoint=False):
    pos = np.arange(off, len(flux), lag).astype(int)
    score = flux[pos].sum()
    if score > best:
        best, best_off = score, off
# 曲の頭(0秒付近)の拍は立ち上がりを測れず抜けやすいので、1拍ぶん前に戻れるなら戻す
if best_off - lag >= -0.1 * lag:
    best_off = max(0.0, best_off - lag)
beats = np.arange(best_off, len(flux), lag) / rate
json.dump({'bpm': round(float(bpm), 2), 'first_beat': round(float(beats[0]), 3), 'beats': [round(float(t), 3) for t in beats]}, open(dst, 'w'))
print(f'BPM {bpm:.1f}, 拍 {len(beats)} 個')
