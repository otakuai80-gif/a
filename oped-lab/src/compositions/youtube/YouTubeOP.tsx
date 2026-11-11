import React from 'react';
import {AbsoluteFill, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {z} from 'zod';
import {zColor} from '@remotion/zod-types';
import {SfxCue, SfxTrack} from '../../components/Sfx';
import {EASE, tween} from '../../lib/anim';
import {FONT} from '../../lib/fonts';

/**
 * YouTube系OP 試作 v1(6秒 / 180フレーム)
 * 仕様: docs/specs/01-youtube.md「試作仕様 YT-OP」
 *
 *   0- 24  色帯ワイプ(3本が時間差で横切り、紙色の地を出す)
 *  14- 44  マーク登場(円がバウンド、プラス記号が半回転)、24 から上へ移動
 *  38- 66  タイトル上下合わせ(上段は上から、下段は下から)
 *  62- 92  下線が左から伸びる → タグラインをタイプ表示
 *  88-150  ホールド(紙吹雪が拍ごとに弾ける、全体がゆっくり寄る)
 * 150-180  アイリスアウト(円形に閉じて本編へ)
 *
 * 効果音(v1): sfxCues を参照。sfx を false にすると鳴らさない。
 */
export const youTubeOPSchema = z.object({
  titleTop: z.string(),
  titleBottom: z.string(),
  tagline: z.string(),
  paper: zColor(),
  ink: zColor(),
  accent: zColor(),
  second: zColor(),
  third: zColor(),
  sfx: z.boolean(),
});

export type YouTubeOPProps = z.infer<typeof youTubeOPSchema>;

const Confetti: React.FC<{colors: string[]; start: number}> = ({colors, start}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const pieces = new Array(26).fill(0).map((_, i) => {
    const burst = i % 3; // 3回に分けて弾ける(15フレーム間隔)
    const t0 = start + burst * 15;
    const p = spring({frame: frame - t0, fps, config: {damping: 14, stiffness: 120, mass: 0.6}});
    const angle = random(`a${i}`) * Math.PI * 2;
    const dist = 360 + random(`d${i}`) * 520;
    const size = 16 + random(`s${i}`) * 30;
    const x = width / 2 + Math.cos(angle) * dist * p;
    const y = height / 2 + Math.sin(angle) * dist * 0.62 * p;
    const rot = random(`r${i}`) * 360 + (frame - t0) * (random(`w${i}`) - 0.5) * 3;
    const round = random(`k${i}`) > 0.55;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: round ? size : size * 0.45,
          borderRadius: round ? '50%' : 3,
          background: colors[i % colors.length],
          transform: `rotate(${rot}deg) scale(${p})`,
          opacity: frame < t0 ? 0 : 1,
        }}
      />
    );
  });
  return <AbsoluteFill>{pieces}</AbsoluteFill>;
};

// 効果音の位置。映像の動きの開始フレームと同じ数値にする(仕様書 01 の「効果音」表)。
const TYPE_START = 70;
const TYPE_SPEED = 0.6; // 1フレームあたりの文字数
const sfxCues = (tagline: string): SfxCue[] => [
  {at: 0, sound: 'whoosh', volume: 0.8},
  {at: 14, sound: 'pop', volume: 0.9},
  {at: 24, sound: 'swish', volume: 0.5},
  {at: 38, sound: 'swish', volume: 0.7},
  {at: 62, sound: 'swish', volume: 0.4},
  // タイプ表示: k 文字目が出るフレームで1打
  ...Array.from(tagline).map((_, i) => ({at: TYPE_START + Math.ceil((i + 1) / TYPE_SPEED), sound: 'tick' as const, volume: 0.55})),
  {at: 88, sound: 'pop', volume: 0.6},
  {at: 103, sound: 'pop', volume: 0.5},
  {at: 118, sound: 'pop', volume: 0.4},
  {at: 150, sound: 'iris', volume: 0.8},
];

export const YouTubeOP: React.FC<YouTubeOPProps> = ({titleTop, titleBottom, tagline, paper, ink, accent, second, third, sfx}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  // 色帯ワイプ: 斜めの帯が左から右へ抜ける
  const bars = [accent, second, third].map((c, i) => {
    const x = tween(frame, i * 4, 20 + i * 4, -130, 130, EASE.inOut);
    return (
      <AbsoluteFill key={c + i} style={{background: c, transform: `translateX(${x}%) skewX(-14deg)`, width: '130%', left: '-15%'}} />
    );
  });
  const paperReveal = tween(frame, 6, 22, 0, 100, EASE.inOut);

  // マーク
  const markScale = spring({frame: frame - 14, fps, config: {damping: 9, stiffness: 140, mass: 0.7}});
  const plusRot = tween(frame, 18, 44, -180, 0, EASE.out);
  const markY = tween(frame, 24, 44, 0, -330, EASE.inOut);
  const markShrink = tween(frame, 24, 44, 1, 0.5, EASE.inOut);

  // タイトル
  const topY = spring({frame: frame - 38, fps, config: {damping: 13, stiffness: 110}, from: -160, to: 0});
  const bottomY = spring({frame: frame - 42, fps, config: {damping: 13, stiffness: 110}, from: 160, to: 0});
  const titleOpacity = tween(frame, 38, 46, 0, 1, EASE.linear);

  // 下線とタグライン
  const underline = tween(frame, 62, 84, 0, 100, EASE.out);
  const typed = Math.max(0, Math.min(tagline.length, Math.floor((frame - TYPE_START) * TYPE_SPEED)));

  // ホールド中のゆっくりした寄り
  const push = tween(frame, 60, 150, 1, 1.05, EASE.linear);

  // アイリスアウト
  const iris = tween(frame, 150, 176, 75, 0, EASE.in);

  return (
    <AbsoluteFill style={{background: ink}}>
      <AbsoluteFill style={{clipPath: `circle(${iris}% at 50% 50%)`}}>
        <AbsoluteFill style={{background: accent}} />
        <AbsoluteFill style={{background: paper, clipPath: `inset(0 ${100 - paperReveal}% 0 0)`}} />

        <AbsoluteFill style={{transform: `scale(${push})`}}>
          <Confetti colors={[accent, second, third, ink]} start={88} />

          {/* マーク: 円の中にプラス記号(「足して作る」) */}
          <div
            style={{
              position: 'absolute',
              left: width / 2 - 110,
              top: height / 2 - 110,
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: accent,
              transform: `translateY(${markY}px) scale(${markScale * markShrink})`,
              boxShadow: `14px 14px 0 ${ink}`,
            }}
          >
            <div style={{position: 'absolute', inset: 0, transform: `rotate(${plusRot}deg)`}}>
              <div style={{position: 'absolute', left: 95, top: 45, width: 30, height: 130, background: paper, borderRadius: 6}} />
              <div style={{position: 'absolute', left: 45, top: 95, width: 130, height: 30, background: paper, borderRadius: 6}} />
            </div>
          </div>

          {/* タイトル */}
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: titleOpacity}}>
            <div style={{fontFamily: FONT.display, color: ink, fontSize: 190, lineHeight: 1.08, textAlign: 'center', marginTop: 96}}>
              <div style={{overflow: 'hidden', paddingTop: 8}}>
                <div style={{transform: `translateY(${topY}px)`}}>{titleTop}</div>
              </div>
              <div style={{overflow: 'hidden', paddingBottom: 14}}>
                <div style={{transform: `translateY(${bottomY}px)`, color: second}}>{titleBottom}</div>
              </div>
            </div>
            <div style={{width: 760, height: 16, marginTop: 6}}>
              <div style={{width: `${underline}%`, height: '100%', background: third, borderRadius: 8, boxShadow: `6px 6px 0 ${ink}`}} />
            </div>
            <div style={{fontFamily: FONT.gothic, fontWeight: 700, fontSize: 46, color: ink, marginTop: 34, height: 60, letterSpacing: '0.08em'}}>
              {tagline.slice(0, typed)}
              <span style={{opacity: typed < tagline.length && frame > 70 ? 1 : 0, color: accent}}>▍</span>
            </div>
          </AbsoluteFill>
        </AbsoluteFill>

        {bars}
      </AbsoluteFill>
      <SfxTrack cues={sfxCues(tagline)} enabled={sfx} />
    </AbsoluteFill>
  );
};
