import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

/**
 * フィルムグレイン。乱数の種をフレーム番号にしているので、何度レンダリングしても同じ結果になる。
 * 重いので 1/3 解像度で生成して拡大している。holdFrames で粒の更新間隔を指定(2 = 2コマ打ち)。
 */
export const Grain: React.FC<{opacity?: number; holdFrames?: number}> = ({opacity = 0.08, holdFrames = 2}) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / holdFrames);
  const id = `grain-${seed}`;
  return (
    <AbsoluteFill style={{mixBlendMode: 'overlay', opacity, pointerEvents: 'none'}}>
      <svg width="100%" height="100%" viewBox="0 0 640 360" preserveAspectRatio="none">
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="640" height="360" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};
