# oped-lab

Remotion で動画の OP と ED を試作するためのプロジェクトです。Claude Code で開いて使います。

## 入っているもの

- 演出仕様書(`docs/specs/`): 3ジャンル、サンプル各5本、試作仕様4本
- 試作4本(`YT-ED` は v0、ほかは v1)

| ID | 内容 | 長さ |
|---|---|---|
| `YT-OP` | YouTube系 OP | 6秒 |
| `YT-ED` | YouTube系 ED(終了画面の台紙) | 20秒 |
| `ANIME-OP` | アニメ風 OP(150 BPM、20小節、仮BGM付き) | 32秒 |
| `CORP-OPENER` | 番組・企業系オープナー | 8秒 |

- サンプル動画の分析スクリプト(`scripts/analyze.sh`)
- 仮BGM と効果音の生成スクリプト(`scripts/make-bgm.py`、`scripts/make-sfx.py`。numpy だけで動く)
- Claude Code 用の決まり(`CLAUDE.md`)とコマンド(`/analyze`、`/still`)

## 必要なもの

- Node.js 18 以上
- Claude Code
- 分析スクリプトや音の生成スクリプトを使う場合: ffmpeg、Python 3、numpy

## はじめかた

```bash
npm install          # 依存関係を入れる
npm run dev          # Remotion Studio が開く(初回は描画用のブラウザを自動で取得する)
```

別のターミナルで Claude Code を起動します。

```bash
claude
```

最初に次のように頼むと、公式スキルの導入から現状の確認までが済みます。

```
npm run setup:skills を実行してから、CLAUDE.md と docs/specs/README.md を読んで、
4本の試作の現状と、それぞれの「次に検討すること」を一覧にしてください。
```

## 文言と色を変える

Studio の右側のパネルで、題名、名前、色を変えられます。既定値は `src/Root.tsx` にあります。

## 書き出す

```bash
npx remotion render YT-OP out/YT-OP.mp4
npm run render:all                       # 4本まとめて
```

## Claude Code への頼み方の例

```
docs/specs/01-youtube.md の YT-OP を、タイトルを3文字+4文字に変えても崩れないように直して。
直したらフレーム 40、70、110 を静止画で書き出して確認して。
```

```
bash scripts/analyze.sh ~/Videos/my-op.mp4 を実行して、結果から
docs/specs/samples/my-op.md を _template.md の形式で書いて。
```

```
public/audio/theme.wav を分析して BPM を出し、cuts.ts を合わせて、
ANIME-OP を 89 秒版に拡張する案を仕様書に書いて。コードはまだ直さないで。
```

## ライセンス

同梱フォントと参照物は `THIRD_PARTY.md` を見てください。Remotion は4人以上の営利組織では有料ライセンスが必要です。
