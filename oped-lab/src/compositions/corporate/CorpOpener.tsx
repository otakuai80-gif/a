import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {z} from 'zod';
import {zColor} from '@remotion/zod-types';
import {SfxCue, SfxTrack} from '../../components/Sfx';
import {SplitText} from '../../components/SplitText';
import {StrokeDraw} from '../../components/StrokeDraw';
import {EASE, tween} from '../../lib/anim';
import {FONT} from '../../lib/fonts';

/**
 * 番組・企業系オープナー 試作 v1(8秒 / 240フレーム)
 * 仕様: docs/specs/03-broadcast-corporate.md「試作仕様 CORP-OPENER」
 *
 *   0- 24  上下の黒帯が開く(レターボックス)
 *   8- 50  罫線が四方へ伸びる
 *  16- 66  マークを線で描く(外形 → 内側の順)
 *  60- 80  塗りが入り、線が消える
 *  76-112  マークが左へ寄り、社名が1文字ずつ現れる
 * 108-140  細い罫線が伸び、タグラインが上がってくる
 * 150-180  光の帯がマークを一度横切る
 * 210-240  黒帯が閉じる
 *
 * 効果音(v1): 線描きに細い音、塗りに低い音(SFX_CUES)。sfx を false にすると鳴らさない。
 */
export const corpOpenerSchema = z.object({
  company: z.string(),
  companyEn: z.string(),
  tagline: z.string(),
  bg: zColor(),
  ink: zColor(),
  accent: zColor(),
  sfx: z.boolean(),
});

export type CorpOpenerProps = z.infer<typeof corpOpenerSchema>;

// マーク(この試作用の創作): 角丸の枠の中に、右上がりの折れ線と点。200x200 の座標系。
const MARK_OUTER = 'M 44 12 H 156 A 32 32 0 0 1 188 44 V 156 A 32 32 0 0 1 156 188 H 44 A 32 32 0 0 1 12 156 V 44 A 32 32 0 0 1 44 12 Z';
const MARK_LINE = 'M 52 142 L 92 98 L 118 122 L 152 66';

// 効果音の位置。映像の動きの開始フレームと同じ数値にする(仕様書 03 の「効果音」表)。
const SFX_CUES: SfxCue[] = [
  {at: 0, sound: 'whoosh', volume: 0.45},
  {at: 16, sound: 'pen', volume: 0.6},
  {at: 30, sound: 'pen', volume: 0.4},
  {at: 60, sound: 'thud', volume: 0.9},
  {at: 62, sound: 'pop', volume: 0.3},
  {at: 76, sound: 'swish', volume: 0.45},
  {at: 150, sound: 'sparkle', volume: 0.55},
  {at: 210, sound: 'whoosh', volume: 0.45},
];

export const CorpOpener: React.FC<CorpOpenerProps> = ({company, companyEn, tagline, bg, ink, accent, sfx}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  const barOpen = tween(frame, 0, 24, 50, 0, EASE.inOut);
  const barClose = tween(frame, durationInFrames - 30, durationInFrames - 4, 0, 50, EASE.inOut);
  const bar = Math.max(barOpen, barClose);

  const rule = tween(frame, 8, 50, 0, 100, EASE.inOut);
  const fill = tween(frame, 60, 80, 0, 1, EASE.linear);
  const markX = tween(frame, 76, 104, 0, -430, EASE.inOut);
  const markScale = tween(frame, 76, 104, 1.35, 1, EASE.inOut);
  const dot = tween(frame, 62, 78, 0, 1, EASE.back);
  const sweep = tween(frame, 150, 180, -60, 160, EASE.inOut);
  const taglineO = tween(frame, 118, 140, 0, 1, EASE.linear);
  const taglineY = tween(frame, 118, 140, 18, 0, EASE.out);
  const spacing = tween(frame, 118, 150, 0.6, 0.32, EASE.out);
  const push = tween(frame, 0, durationInFrames, 1, 1.03, EASE.linear);

  return (
    <AbsoluteFill style={{background: bg}}>
      <AbsoluteFill style={{transform: `scale(${push})`}}>
        {/* 罫線 */}
        <div style={{position: 'absolute', left: 120, top: 200, height: 1, width: `calc(${rule}% - 240px)`, background: `${ink}33`}} />
        <div style={{position: 'absolute', right: 120, top: 880, height: 1, width: `calc(${rule}% - 240px)`, background: `${ink}33`}} />
        <div style={{position: 'absolute', left: 120, top: 200, width: 1, height: `${rule * 6.8}px`, background: `${ink}33`}} />
        <div style={{position: 'absolute', right: 120, bottom: 200, width: 1, height: `${rule * 6.8}px`, background: `${ink}33`}} />

        {/* マークと社名 */}
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <div style={{position: 'relative', width: 200, height: 200, transform: `translateX(${markX}px) scale(${markScale})`}}>
            <svg viewBox="0 0 200 200" width={200} height={200} style={{position: 'absolute', overflow: 'visible'}}>
              <path d={MARK_OUTER} fill={accent} opacity={fill} />
              <StrokeDraw d={MARK_OUTER} start={16} duration={40} stroke={ink} strokeWidth={5} opacity={1 - fill} />
              <StrokeDraw d={MARK_LINE} start={30} duration={36} stroke={fill > 0.5 ? bg : ink} strokeWidth={14} />
              <circle cx={152} cy={66} r={13 * dot} fill={bg} />
            </svg>
            {/* 光の帯 */}
            <div style={{position: 'absolute', inset: 12, borderRadius: 32, overflow: 'hidden'}}>
              <div style={{position: 'absolute', top: -40, bottom: -40, left: `${sweep}%`, width: 60, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)', transform: 'skewX(-20deg)'}} />
            </div>
          </div>
        </AbsoluteFill>

        <div style={{position: 'absolute', left: 700, top: 428, width: 1000}}>
          <div style={{fontFamily: FONT.gothic, fontWeight: 900, fontSize: 132, color: ink, letterSpacing: '0.06em'}}>
            <SplitText text={company} start={84} stagger={3} duration={20} />
          </div>
          <div style={{fontFamily: FONT.latin, fontWeight: 500, fontSize: 34, color: accent, letterSpacing: '0.42em', marginTop: 6, opacity: tween(frame, 100, 118, 0, 1)}}>
            {companyEn}
          </div>
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, top: 740, textAlign: 'center'}}>
          <div style={{margin: '0 auto', height: 2, width: tween(frame, 108, 136, 0, 220), background: accent}} />
          <div style={{fontFamily: FONT.mincho, fontWeight: 500, fontSize: 44, color: ink, marginTop: 30, opacity: taglineO, transform: `translateY(${taglineY}px)`, letterSpacing: `${spacing}em`, paddingLeft: `${spacing}em`}}>
            {tagline}
          </div>
        </div>
      </AbsoluteFill>

      {/* レターボックス */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: `${bar}%`, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: `${bar}%`, background: '#000'}} />
      <SfxTrack cues={SFX_CUES} enabled={sfx} />
    </AbsoluteFill>
  );
};
