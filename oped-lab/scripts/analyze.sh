#!/usr/bin/env bash
# サンプル動画を分析して analysis/<名前>/ に結果を出す。
#   bash scripts/analyze.sh <動画ファイル> [1秒あたりの抽出枚数=4] [カット検出のしきい値=0.3]
# 出力: meta.json(基本情報) cuts.txt(カット時刻) frames/(縮小フレーム) sheet_XX.jpg(一覧)
#       audio.wav beats.json(BPMと拍) summary.md(まとめ。仕様書の下書きに使う)
# 必要: ffmpeg, ffprobe, python3。拍の検出には numpy も必要(pip install numpy)。
# 対象は、自分の動画か、利用を許可された動画に限ること。
set -euo pipefail
IN="${1:?動画ファイルを指定してください}"
FPS="${2:-4}"
TH="${3:-0.3}"
NAME="$(basename "${IN%.*}")"
OUT="analysis/$NAME"
mkdir -p "$OUT/frames"

ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate -of json "$IN" > "$OUT/meta.json"

# カット検出。フェードやディゾルブは拾いにくいので、summary.md を見て目視で補う。
ffmpeg -hide_banner -nostats -i "$IN" -vf "select='gt(scene,$TH)',showinfo" -an -f null - 2>&1 \
  | grep -o 'pts_time:[0-9.]*' | cut -d: -f2 > "$OUT/cuts.txt" || true

# 縮小フレームと一覧(1枚に 6x5 = 30コマ)。N番目のコマの時刻 = (N-1) / FPS 秒。
rm -f "$OUT"/frames/*.jpg "$OUT"/sheet_*.jpg
ffmpeg -v error -y -i "$IN" -vf "fps=$FPS,scale=480:-2" -q:v 4 "$OUT/frames/%04d.jpg"
ffmpeg -v error -y -framerate 1 -i "$OUT/frames/%04d.jpg" -vf "tile=6x5:padding=4:margin=4" -q:v 4 "$OUT/sheet_%02d.jpg"

# 音声と拍
if ffmpeg -v error -y -i "$IN" -vn -ac 1 -ar 22050 "$OUT/audio.wav" 2>/dev/null; then
  python3 "$(dirname "$0")/beats.py" "$OUT/audio.wav" "$OUT/beats.json" || echo "拍の検出は省略しました(numpy が必要です)"
else
  echo "音声トラックがないため、拍の検出は省略しました"
fi

python3 "$(dirname "$0")/summarize.py" "$OUT" "$FPS"
echo "完了: $OUT/summary.md"
