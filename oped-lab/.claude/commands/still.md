---
description: コンポジションの指定フレームを静止画で書き出して確認する
argument-hint: <ID> <フレーム番号...>
---
$ARGUMENTS の最初の語をコンポジション ID、残りをフレーム番号として、
それぞれ `npx remotion still <ID> out/still-<ID>-<番号>.jpg --frame=<番号> --scale=0.5` で書き出し、
画像を読んで、仕様書(docs/specs/)の該当する時刻の記述と合っているかを報告してください。
合っていない点があれば、仕様とコードのどちらを直すべきかも添えてください。
