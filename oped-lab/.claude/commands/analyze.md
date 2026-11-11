---
description: サンプル動画を分析して演出仕様書の下書きを作る
argument-hint: <動画ファイルのパス>
---
次の動画を分析して、演出仕様書の下書きを作ってください: $ARGUMENTS

1. 自分の動画か、利用を許可された動画かを私に確認する。そうでなければ中止する。
2. `bash scripts/analyze.sh "$ARGUMENTS"` を実行する。
3. `analysis/<名前>/summary.md` と `sheet_*.jpg` を読む。
4. カット検出が拾えていないフェードやディゾルブを、一覧画像から補う。
5. 動きの速い区間は `frames/` を順に見て、何がどこからどこへ何フレームで動くかを書く。
6. `docs/specs/_template.md` の形式で `docs/specs/samples/<名前>.md` を書く。歌詞、台詞、画面の文章は写さない。
7. 推定 BPM は半分や2倍の可能性があることを添えて報告する。
