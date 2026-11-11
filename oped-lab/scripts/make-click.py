#!/usr/bin/env python3
"""拍の確認用クリック音を作る(曲が決まるまでの仮の音)。
使い方: python3 scripts/make-click.py 150 20   # BPM, 小節数 → public/audio/click-150bpm.wav
小節の頭は高い音、それ以外の拍は低い音。"""
import math, struct, sys, wave, os

bpm = float(sys.argv[1]) if len(sys.argv) > 1 else 150
bars = int(sys.argv[2]) if len(sys.argv) > 2 else 20
sr = 44100
beat = 60 / bpm
total = int(sr * beat * 4 * bars)
buf = [0.0] * total
for b in range(bars * 4):
    start = int(b * beat * sr)
    freq = 1760 if b % 4 == 0 else 880
    amp = 0.6 if b % 4 == 0 else 0.35
    for i in range(int(0.045 * sr)):
        if start + i < total:
            buf[start + i] += amp * math.sin(2 * math.pi * freq * i / sr) * math.exp(-i / (0.008 * sr))
out = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', f'click-{int(bpm)}bpm.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, v)) * 32767)) for v in buf))
print('wrote', os.path.normpath(out), f'{total / sr:.2f}s')
