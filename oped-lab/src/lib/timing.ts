/**
 * 音楽の拍・小節をフレーム番号に変換する。
 * 例: 150 BPM, 30fps なら 1拍 = 12フレーム、1小節(4拍) = 48フレーム。
 * BPM と fps の組み合わせで1拍が整数フレームにならない場合は、拍ごとに四捨五入する
 * (誤差を累積させないため、必ず「拍数 × 1拍の長さ」を丸める)。
 */
export const makeGrid = (bpm: number, fps: number, beatsPerBar = 4) => {
  const beatLen = (60 / bpm) * fps;
  return {
    bpm,
    fps,
    beatLen,
    /** 0始まりの拍数 → フレーム */
    beat: (n: number) => Math.round(n * beatLen),
    /** 0始まりの小節数(+拍) → フレーム */
    bar: (n: number, beat = 0) => Math.round((n * beatsPerBar + beat) * beatLen),
    /** フレーム → 現在の拍番号(0始まり、通し) */
    beatAt: (frame: number) => Math.floor(frame / beatLen),
    /** フレーム → 拍の中での進み具合 0〜1 */
    phase: (frame: number) => (frame / beatLen) % 1,
  };
};

export type Grid = ReturnType<typeof makeGrid>;

export const sec = (seconds: number, fps: number) => Math.round(seconds * fps);
