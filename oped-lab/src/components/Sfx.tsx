import React from 'react';
import {Html5Audio, Sequence, staticFile} from 'remotion';

export type SfxName = 'whoosh' | 'swish' | 'pop' | 'tick' | 'iris' | 'pen' | 'thud' | 'sparkle';

/** 効果音1つ。at は鳴らし始めるフレーム、volume は 0〜1。 */
export type SfxCue = {at: number; sound: SfxName; volume?: number};

/**
 * 効果音を並べて鳴らす。音は scripts/make-sfx.py が public/audio/sfx/ に作る。
 * 映像のタイミングと同じ数値を cue に書き、動きと音を同じ場所で管理する。
 */
export const SfxTrack: React.FC<{cues: SfxCue[]; enabled?: boolean}> = ({cues, enabled = true}) => {
  if (!enabled) {
    return null;
  }
  return (
    <>
      {cues.map((c, i) => (
        <Sequence key={`${c.sound}-${c.at}-${i}`} from={c.at} name={`SFX ${c.sound}`} layout="none">
          <Html5Audio src={staticFile(`audio/sfx/${c.sound}.wav`)} volume={c.volume ?? 1} />
        </Sequence>
      ))}
    </>
  );
};
