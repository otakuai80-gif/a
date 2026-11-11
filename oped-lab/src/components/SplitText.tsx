import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE, tween} from '../lib/anim';

/**
 * 1文字ずつ、マスクの下からせり上がって登場するテキスト。
 * start: 最初の文字が動き出すフレーム / stagger: 文字ごとの遅れ / duration: 1文字の所要フレーム
 */
export const SplitText: React.FC<{
  text: string;
  start: number;
  stagger?: number;
  duration?: number;
  from?: 'bottom' | 'top';
  style?: React.CSSProperties;
}> = ({text, start, stagger = 2, duration = 16, from = 'bottom', style}) => {
  const frame = useCurrentFrame();
  const chars = Array.from(text);
  return (
    <span style={{display: 'inline-flex', overflow: 'hidden', lineHeight: 1.15, ...style}}>
      {chars.map((ch, i) => {
        const s = start + i * stagger;
        const offset = tween(frame, s, s + duration, from === 'bottom' ? 110 : -110, 0, EASE.out);
        return (
          <span key={i} style={{display: 'inline-block', transform: `translateY(${offset}%)`, whiteSpace: 'pre'}}>
            {ch}
          </span>
        );
      })}
    </span>
  );
};
