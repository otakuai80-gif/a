import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {z} from 'zod';
import {zColor} from '@remotion/zod-types';
import {SplitText} from '../../components/SplitText';
import {StrokeDraw} from '../../components/StrokeDraw';
import {EASE, tween} from '../../lib/anim';
import {FONT} from '../../lib/fonts';

/**
 * YouTube系ED(終了画面の台紙)試作 v0(20秒 / 600フレーム)
 * 仕様: docs/specs/01-youtube.md「試作仕様 YT-ED」
 *
 * YouTube Studio の「終了画面」で重ねる要素(動画2本、チャンネル登録の円)の置き場所を
 * 空けた台紙。showGuides を false にすると、枠内の案内文字が消えて本番用になる。
 *
 *   0- 20  アクセント色の帯が上へ抜けて暗い地が出る
 *  16- 60  動画枠2つの輪郭を線で描く
 *  30- 70  お礼の見出しが1文字ずつせり上がる
 *  70-100  登録の円がポップ、以後はゆっくり脈動
 *  90-    クレジットの帯が下端を流れ続ける
 * 570-600  全体をフェードアウト
 */
export const youTubeEDSchema = z.object({
  thanks: z.string(),
  channelName: z.string(),
  subscribeLabel: z.string(),
  slotLabels: z.array(z.string()).length(2),
  ticker: z.string(),
  showGuides: z.boolean(),
  ink: zColor(),
  paper: zColor(),
  accent: zColor(),
  second: zColor(),
  third: zColor(),
});

export type YouTubeEDProps = z.infer<typeof youTubeEDSchema>;

// 終了画面の要素を置く枠(1920x1080 基準)。YouTube Studio 側の要素をこの枠に合わせて配置する。
export const END_SCREEN_SLOTS = {
  videos: [
    {x: 1080, y: 110, w: 700, h: 394},
    {x: 1080, y: 574, w: 700, h: 394},
  ],
  subscribe: {cx: 290, cy: 740, r: 130},
} as const;

const roundedRect = (x: number, y: number, w: number, h: number, r: number) =>
  `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;

export const YouTubeED: React.FC<YouTubeEDProps> = ({
  thanks,
  channelName,
  subscribeLabel,
  slotLabels,
  ticker,
  showGuides,
  ink,
  paper,
  accent,
  second,
  third,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, durationInFrames} = useVideoConfig();

  const curtain = tween(frame, 0, 20, 0, -100, EASE.inOut);
  const fadeOut = tween(frame, durationInFrames - 30, durationInFrames - 2, 1, 0, EASE.linear);

  const sub = END_SCREEN_SLOTS.subscribe;
  const subScale = spring({frame: frame - 70, fps, config: {damping: 9, stiffness: 130, mass: 0.7}});
  const pulse = 1 + Math.sin((frame - 100) * 0.09) * 0.035 * (frame > 100 ? 1 : 0);
  const ring = ((frame - 100) % 60) / 60; // 2秒ごとに広がる輪
  const arrow = tween(frame, 96, 116, 0, 1, EASE.out);

  // クレジットの帯: 1フレームあたり 3px で左へ流す
  const tickerText = `${ticker}　　◆　　`.repeat(10);
  const tickerX = -Math.max(0, frame - 90) * 3;
  const tickerIn = tween(frame, 90, 110, 80, 0, EASE.out);

  return (
    <AbsoluteFill style={{background: ink, opacity: fadeOut}}>
      {/* 背景の点グリッド */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${paper}22 2px, transparent 2px)`,
          backgroundSize: '48px 48px',
          backgroundPosition: `${frame * 0.25}px ${frame * 0.15}px`,
        }}
      />

      {/* 動画枠 */}
      <svg width={width} height={1080} style={{position: 'absolute'}}>
        {END_SCREEN_SLOTS.videos.map((s, i) => (
          <g key={i}>
            <rect x={s.x + 14} y={s.y + 14} width={s.w} height={s.h} rx={18} fill={i === 0 ? accent : second} opacity={tween(frame, 40 + i * 8, 60 + i * 8, 0, 1)} />
            <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={18} fill={ink} opacity={tween(frame, 36 + i * 8, 50 + i * 8, 0, 1)} />
            <StrokeDraw d={roundedRect(s.x, s.y, s.w, s.h, 18)} start={16 + i * 8} duration={40} stroke={paper} strokeWidth={5} />
          </g>
        ))}
      </svg>
      {END_SCREEN_SLOTS.videos.map((s, i) => (
        <div key={i} style={{position: 'absolute', left: s.x, top: s.y, width: s.w, height: s.h, opacity: tween(frame, 56 + i * 8, 72 + i * 8, 0, 1)}}>
          <div
            style={{
              position: 'absolute',
              left: 22,
              top: -26,
              background: i === 0 ? accent : second,
              color: i === 0 ? ink : paper,
              fontFamily: FONT.gothic,
              fontWeight: 900,
              fontSize: 30,
              padding: '6px 22px',
              borderRadius: 999,
              letterSpacing: '0.1em',
            }}
          >
            {slotLabels[i]}
          </div>
          {showGuides ? (
            <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: `${paper}66`, fontFamily: FONT.latin, fontSize: 24, letterSpacing: '0.14em'}}>
              終了画面の「動画」要素をここに重ねる
            </AbsoluteFill>
          ) : null}
        </div>
      ))}

      {/* 見出し */}
      <div style={{position: 'absolute', left: 130, top: 150, width: 800}}>
        <div style={{fontFamily: FONT.latin, fontWeight: 700, color: third, fontSize: 30, letterSpacing: '0.3em', opacity: tween(frame, 26, 40, 0, 1)}}>
          THANK YOU FOR WATCHING
        </div>
        <div style={{fontFamily: FONT.display, color: paper, fontSize: 88, marginTop: 18, lineHeight: 1.2}}>
          <SplitText text={thanks.slice(0, Math.ceil(thanks.length / 2))} start={30} stagger={2} duration={18} />
          <br />
          <SplitText text={thanks.slice(Math.ceil(thanks.length / 2))} start={40} stagger={2} duration={18} />
        </div>
        <div style={{height: 8, width: `${tween(frame, 58, 84, 0, 100)}%`, maxWidth: 420, background: accent, borderRadius: 4, marginTop: 26}} />
      </div>

      {/* チャンネル登録の円 */}
      <div
        style={{
          position: 'absolute',
          left: sub.cx - sub.r,
          top: sub.cy - sub.r,
          width: sub.r * 2,
          height: sub.r * 2,
          transform: `scale(${subScale * pulse})`,
        }}
      >
        {frame > 100 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `4px solid ${accent}`,
              transform: `scale(${1 + ring * 0.45})`,
              opacity: 1 - ring,
            }}
          />
        ) : null}
        <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: accent, boxShadow: `10px 10px 0 ${second}`}} />
        {showGuides ? (
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: ink, fontFamily: FONT.gothic, fontWeight: 700, fontSize: 22, textAlign: 'center', lineHeight: 1.5}}>
            「登録」要素を
            <br />
            ここに重ねる
          </AbsoluteFill>
        ) : null}
      </div>
      <div style={{position: 'absolute', left: sub.cx + sub.r + 44, top: sub.cy - 62, opacity: arrow, transform: `translateX(${(1 - arrow) * 40}px)`}}>
        <div style={{fontFamily: FONT.gothic, fontWeight: 900, color: paper, fontSize: 44, letterSpacing: '0.06em'}}>← {subscribeLabel}</div>
        <div style={{fontFamily: FONT.gothic, fontWeight: 500, color: `${paper}aa`, fontSize: 30, marginTop: 10}}>{channelName}</div>
      </div>

      {/* クレジットの帯 */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, background: third, transform: `translateY(${tickerIn}px)`, overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 0,
            whiteSpace: 'nowrap',
            fontFamily: FONT.gothic,
            fontWeight: 700,
            fontSize: 28,
            color: ink,
            letterSpacing: '0.08em',
            transform: `translateX(${tickerX}px)`,
          }}
        >
          {tickerText}
        </div>
      </div>

      {/* 冒頭の帯 */}
      <AbsoluteFill style={{background: accent, transform: `translateY(${curtain}%)`}} />
    </AbsoluteFill>
  );
};
