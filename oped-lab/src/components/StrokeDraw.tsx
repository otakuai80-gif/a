import React from 'react';
import {evolvePath} from '@remotion/paths';
import {useCurrentFrame} from 'remotion';
import {EASE, tween} from '../lib/anim';

/** SVGパスを線で描いていく。<svg> の中で使う。 */
export const StrokeDraw: React.FC<{
  d: string;
  start: number;
  duration: number;
  stroke: string;
  strokeWidth?: number;
  easing?: (t: number) => number;
  opacity?: number;
}> = ({d, start, duration, stroke, strokeWidth = 4, easing = EASE.inOut, opacity = 1}) => {
  const frame = useCurrentFrame();
  const progress = tween(frame, start, start + duration, 0, 1, easing);
  if (progress <= 0) {
    return null;
  }
  const {strokeDasharray, strokeDashoffset} = evolvePath(progress, d);
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={strokeDasharray}
      strokeDashoffset={strokeDashoffset}
      opacity={opacity}
    />
  );
};
