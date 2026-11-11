import {Easing, interpolate} from 'remotion';

export const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// イージングは CSS の cubic-bezier と同じ値。仕様書の「動き」列にこの名前で書く。
export const EASE = {
  /** 強い減速。登場に使う */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** 加速。退場に使う */
  in: Easing.bezier(0.7, 0, 0.84, 0),
  /** 加減速。カメラ移動に使う */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  /** 行き過ぎて戻る。ポップな登場に使う */
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  linear: Easing.linear,
} as const;

/** frame が from→to の間に a→b へ変化する。範囲外は端の値で止まる。 */
export const tween = (
  frame: number,
  from: number,
  to: number,
  a: number,
  b: number,
  easing: (t: number) => number = EASE.out,
): number => interpolate(frame, [from, to], [a, b], {...CLAMP, easing});

/** from 以上 to 未満のとき true */
export const between = (frame: number, from: number, to: number) => frame >= from && frame < to;
