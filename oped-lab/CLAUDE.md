# oped-lab

Remotion で動画の OP と ED を試作するプロジェクト。演出仕様書(`docs/specs/`)を先に書き、それをコードに落とす。

## コマンド

| 目的 | コマンド |
|---|---|
| プレビュー(Remotion Studio) | `npm run dev` |
| 型チェック | `npm run typecheck` |
| 静止画を1枚書き出す | `npx remotion still <ID> out/check.jpg --frame=<番号> --scale=0.5` |
| 動画を書き出す | `npx remotion render <ID> out/<ID>.mp4` |
| 4本まとめて書き出す | `npm run render:all` |
| サンプル動画を分析する | `bash scripts/analyze.sh <動画ファイル>` |
| 仮BGM と効果音を作り直す | `python3 scripts/make-bgm.py`、`python3 scripts/make-sfx.py` |
| Remotion 公式スキルを入れる | `npm run setup:skills` |

コンポジションの ID: `YT-OP`、`YT-ED`、`ANIME-OP`、`CORP-OPENER`

## 構成

| 場所 | 内容 |
|---|---|
| `docs/specs/` | 演出仕様書。ジャンルごとのサンプル仕様と試作仕様 |
| `docs/workflow.md` | サンプル入手から書き出しまでの手順 |
| `src/Root.tsx` | コンポジションの登録と既定の文言、色 |
| `src/compositions/` | ジャンルごとの試作 |
| `src/compositions/anime/cuts.ts` | アニメ風 OP のカット表(小節と拍で記述) |
| `src/components/` | 共通部品(`SplitText`、`StrokeDraw`、`Grain`、`ArtSlot`、`SfxTrack`) |
| `src/lib/` | `anim.ts`(イージングと tween)、`timing.ts`(拍とフレームの変換)、`fonts.ts` |
| `scripts/` | 分析、音の生成(クリック音、仮BGM、効果音。共通部品は `synth.py`)、一括書き出し |
| `public/fonts/` | 同梱フォント。`public/audio/` は音(`sfx/` は効果音)、`public/art/` は差し替え用の絵 |
| `analysis/` | 分析結果(git には含めない) |

## 守ること

### Remotion の決まり

- 動きはすべて `useCurrentFrame()` のフレーム番号から計算する。CSS の `transition`、`animation`、`@keyframes`、Tailwind の animate 系クラス、`setTimeout`、`requestAnimationFrame` は使わない。Remotion は各フレームを独立に描くので、これらはちらつきの原因になる。
- 乱数は `random('種')`(remotion)を使う。`Math.random()` は書き出すたびに結果が変わるので使わない。
- 時間は `src/lib/anim.ts` の `tween(frame, 開始, 終了, 値A, 値B, EASE.xxx)` で書く。範囲外は端の値で止まる。
- 音楽に合わせるものは `makeGrid(bpm, fps)` で拍をフレームに変換する。フレーム数を直接書かない。
- 30fps、1920×1080 が基準。
- フォントは `public/fonts/` のものを `FONT.gothic` などで指定する。ネットワークから読み込まない。
- 画像は `<Img>`、音は `<Html5Audio>`、ファイルは `staticFile()` で参照する。
- 3D を使う場合も、`useFrame()` ではなく `useCurrentFrame()` で動かす。

### 進め方

1. 見た目やタイミングを変えるときは、先に `docs/specs/` の試作仕様を直す。仕様書とコードを同じ内容に保つ。
2. アニメ風 OP のカット割りは `cuts.ts` が正本。カットを足すときは `cuts.ts`、`AnimeOP.tsx` の `scenes`、仕様書の3か所を直す。
3. 変更したら、動きの山場のフレームを静止画で書き出して画像を見る。型チェックだけで済ませない。
4. 全体の書き出しは時間がかかるので、静止画で確認してから1回で済ませる。
5. コンポジションを足すときは `src/Root.tsx` に登録し、zod のスキーマと既定値を付ける。Studio の右側で値を変えられるようになる。

### 素材

- サンプルから取り入れるのは構成、尺、タイミング、動きの種類だけ。既存の作品の題名、ロゴ、キャラクター、楽曲、歌詞、画面の絵は使わない。試作の中身はすべて新しく作る。
- Remotion は絵を描けない。人物やイラストは `ArtSlot` に画像を渡して入れる。図形で既存のキャラクターを描くこともしない。
- 分析する動画は、自分の動画か、利用を許可された動画に限る。それ以外は保存せず、配信を見て `docs/specs/_template.md` を手で埋める。
- 曲は権利のあるものだけを `public/audio/` に置く。

## 現在の状態

- `YT-OP`、`ANIME-OP`、`CORP-OPENER` は v1、`YT-ED` は v0。各仕様書の「次に検討すること」が残作業。
- v1 の変更: `ANIME-OP` に仮BGM と A パートのクロスディゾルブ、`YT-OP` と `CORP-OPENER` に効果音。
- アニメ風のサンプル仕様5本は文献が根拠で、映像での確認はしていない。
- `ANIME-OP` の音は仮BGM(`scripts/make-bgm.py` で生成した試作用の曲)。カット表を変えたら `make-bgm.py` の構成も直す。本番の曲は未定。素材枠 A、B、C は空。
- `YT-ED` の枠の位置は、YouTube Studio の終了画面で実際に合わせて調整する必要がある。
