#!/usr/bin/env python3
"""analyze.sh の結果を summary.md にまとめる。演出仕様書の「実測」欄の下書きになる。"""
import json, os, sys

out = sys.argv[1]
sample_fps = float(sys.argv[2]) if len(sys.argv) > 2 else 4
meta = json.load(open(os.path.join(out, 'meta.json')))
dur = float(meta['format']['duration'])
v = next(s for s in meta['streams'] if s['codec_type'] == 'video')
num, den = v['r_frame_rate'].split('/')
fps = float(num) / float(den)
cuts = [float(l) for l in open(os.path.join(out, 'cuts.txt')).read().split() if l]
edges = [0.0] + cuts + [dur]
shots = [(edges[i], edges[i + 1]) for i in range(len(edges) - 1) if edges[i + 1] - edges[i] > 1e-3]
lens = [b - a for a, b in shots]

L = []
L.append(f'# 分析まとめ: {os.path.basename(out)}\n')
L.append(f'- 解像度 {v["width"]}x{v["height"]}、{fps:.2f} fps、尺 {dur:.2f} 秒({round(dur * fps)} フレーム)')
L.append(f'- ショット数 {len(shots)}(検出したカット {len(cuts)})')
L.append(f'- ショット長: 平均 {sum(lens) / len(lens):.2f} 秒、最短 {min(lens):.2f} 秒、最長 {max(lens):.2f} 秒')
third = dur / 3
dens = [sum(1 for c in cuts if i * third <= c < (i + 1) * third) for i in range(3)]
L.append(f'- カットの分布(前半 / 中盤 / 後半の3等分): {dens[0]} / {dens[1]} / {dens[2]}')

bp = os.path.join(out, 'beats.json')
beats = None
if os.path.exists(bp):
    bj = json.load(open(bp))
    if bj.get('bpm'):
        beats = bj['beats']
        L.append(f'- 推定 BPM {bj["bpm"]}(1拍 = {60 / bj["bpm"] * fps:.1f} フレーム)、最初の拍 {bj["first_beat"]} 秒。半分や2倍で出ることがあるので耳で確認する')
        if cuts:
            tol = 1.5 / fps
            d = [min(abs(c - b) for b in beats) for c in cuts]
            hit = sum(1 for x in d if x <= tol)
            L.append(f'- 拍に乗ったカット: {hit} / {len(cuts)}({100 * hit / len(cuts):.0f}%、許容 ±1.5 フレーム)')
            pos = [0, 0, 0, 0]
            for c, x in zip(cuts, d):
                if x <= tol:
                    k = min(range(len(beats)), key=lambda i: abs(beats[i] - c))
                    pos[k % 4] += 1
            L.append(f'- 拍に乗ったカットの位置(最初の拍を1拍目と仮定した4拍周期): 1拍目 {pos[0]} / 2拍目 {pos[1]} / 3拍目 {pos[2]} / 4拍目 {pos[3]}')

L.append('\n## ショット一覧\n')
L.append('| # | 開始(秒) | 開始(フレーム) | 長さ(秒) | 長さ(フレーム) | 一覧画像での位置 |')
L.append('|---|---|---|---|---|---|')
for i, (a, b) in enumerate(shots, 1):
    n = int(a * sample_fps) + 1
    L.append(f'| {i} | {a:.2f} | {round(a * fps)} | {b - a:.2f} | {round((b - a) * fps)} | sheet_{(n - 1) // 30 + 1:02d} の {(n - 1) % 30 + 1} コマ目〜 |')
L.append('\n一覧画像は左上から右へ、1枚に30コマ。画面要素、動き、トランジションは一覧と frames/ を見て仕様書に書き足す。')
open(os.path.join(out, 'summary.md'), 'w').write('\n'.join(L) + '\n')
