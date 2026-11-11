# 作業の流れ

サンプルの入手から試作の書き出しまでの手順です。

## 1. サンプルを入手する

| 入手元 | 扱い |
|---|---|
| 自分の動画、権利者から提供された動画 | ファイルを `scripts/analyze.sh` にかける |
| CC BY の動画 | クレジットを記録したうえで分析する |
| 公開されている Remotion テンプレート | コードからタイミングを読む |
| 市販のアニメ、他人の YouTube 動画 | 保存しない。配信を見ながら `docs/specs/_template.md` を手で埋める |

取り入れるのは構成と技法だけです。題名、ロゴ、キャラクター、楽曲、歌詞は試作に使いません。

## 2. 分析する

```bash
bash scripts/analyze.sh path/to/sample.mp4        # 1秒4枚で抽出
bash scripts/analyze.sh path/to/sample.mp4 8 0.25  # 1秒8枚、カット検出を敏感に
```

`analysis/<名前>/` に次のものができます。

| ファイル | 内容 |
|---|---|
| `summary.md` | 尺、ショット数、ショット長、カットの分布、推定 BPM、拍に乗ったカットの割合、ショット一覧 |
| `sheet_01.jpg` 〜 | 縮小フレームの一覧(1枚に30コマ) |
| `frames/` | 縮小フレーム |
| `cuts.txt` | 検出したカットの時刻 |
| `beats.json` | 推定 BPM と拍の時刻 |

Claude Code には次のように頼みます。

```
analysis/sample/summary.md と sheet_*.jpg を読んで、docs/specs/_template.md の形式で
docs/specs/samples/sample.md を書いてください。動きの速い 12〜15 秒は frames/ を
1コマずつ見て、イージングを推定してください。
```

注意:

- カット検出はフェードやディゾルブを拾いにくいので、一覧画像で補います。
- BPM は半分や2倍で出ることがあります。耳で確認します。
- 動きの細部は1秒4枚では抜けます。必要な区間だけ抽出枚数を増やします。
- 1920×1080 のフレームを大量に読ませるとトークンを消費します。スクリプトは幅 480px に縮小しています。

## 3. 仕様書にまとめる

サンプルごとの仕様を `docs/specs/` に書き、ジャンルの共通パターンを抜き出します。
そのうえで試作の仕様(カット表)を書きます。音楽に合わせるものは小節と拍で書きます。

## 4. 実装する

1. 仕様書の試作仕様を更新する。
2. アニメ風は `cuts.ts` を仕様に合わせる。
3. コンポジションを直す。
4. 動きの山場のフレームを静止画で書き出して目で確認する。

```bash
npx remotion still ANIME-OP out/check.jpg --frame=700 --scale=0.5
```

5. 型チェックを通す(`npm run typecheck`)。
6. Studio で通して再生する(`npm run dev`)。
7. 書き出す(`npx remotion render ANIME-OP out/ANIME-OP.mp4`)。

## 5. 検証する

書き出した試作を同じ分析にかけ、仕様どおりかを数値で確かめます。

```bash
bash scripts/analyze.sh out/ANIME-OP.mp4
```

`summary.md` のショット数、カット位置、拍に乗った割合を、仕様書のカット表と比べます。
