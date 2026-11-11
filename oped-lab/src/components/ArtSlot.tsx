import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {FONT} from '../lib/fonts';

/**
 * イラストや写真の差し替え枠。
 * src に public/ からの相対パス(例 "art/hero.png")を渡すとその画像を表示し、
 * 空のときは「ここに素材が入る」ことが分かる仮の枠を表示する。
 * Remotion は絵を描けないので、作画素材は必ずこの枠を通して外から入れる。
 */
export const ArtSlot: React.FC<{
  src?: string;
  label: string;
  color?: string;
  style?: React.CSSProperties;
}> = ({src, label, color = 'rgba(255,255,255,0.55)', style}) => {
  if (src) {
    return <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', ...style}} />;
  }
  return (
    <AbsoluteFill
      style={{
        border: `3px dashed ${color}`,
        color,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT.latin,
        fontWeight: 500,
        fontSize: 26,
        letterSpacing: '0.12em',
        textAlign: 'center',
        backgroundImage: `repeating-linear-gradient(135deg, transparent 0 22px, ${color} 22px 23px)`,
        backgroundBlendMode: 'soft-light',
        ...style,
      }}
    >
      <div style={{background: 'rgba(0,0,0,0.35)', padding: '10px 22px', whiteSpace: 'pre-line', lineHeight: 1.5}}>{label}</div>
    </AbsoluteFill>
  );
};
