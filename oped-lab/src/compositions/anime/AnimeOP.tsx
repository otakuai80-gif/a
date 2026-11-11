import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {z} from 'zod';
import {ArtSlot} from '../../components/ArtSlot';
import {Grain} from '../../components/Grain';
import {SplitText} from '../../components/SplitText';
import {EASE, tween} from '../../lib/anim';
import {FONT} from '../../lib/fonts';
import {makeGrid} from '../../lib/timing';
import {ANIME_OP_BPM, ANIME_OP_CUTS} from './cuts';

/**
 * アニメ風OP 試作 v1(150 BPM、20小節 = 32秒 / 960フレーム)
 * 仕様: docs/specs/02-anime.md「試作仕様 ANIME-OP」
 * カット割りは ./cuts.ts が正本。ここは各カットの絵作りだけを書く。
 *
 * 題名、クレジット、図形はすべてこの試作用の創作。キャラクターの絵は ArtSlot に外から入れる。
 * v1: 仮BGM を追加(audio)。A パートのカット間をクロスディゾルブでつなぐ(cuts.ts の dissolve)。
 */
export const animeOPSchema = z.object({
  title: z.string(),
  titleEn: z.string(),
  words: z.array(z.string()).min(8),
  credits: z.array(z.object({role: z.string(), name: z.string()})).length(8),
  art: z.object({a: z.string(), b: z.string(), c: z.string()}),
  /** bgm: 仮BGM(scripts/make-bgm.py)、click: 拍のクリック音、none: 無音 */
  audio: z.enum(['bgm', 'click', 'none']),
});

const AUDIO_FILES = {bgm: 'audio/anime-op-bgm.wav', click: 'audio/click-150bpm.wav'} as const;

export type AnimeOPProps = z.infer<typeof animeOPSchema>;

const C = {
  night: '#0B1026',
  blue: '#1E6BFF',
  red: '#FF3B30',
  cream: '#F6F1E7',
  yellow: '#FFD23F',
  ink: '#05070F',
};

// カット内の細かいタイミングに使う1拍の長さ(30fps 前提)。150 BPM なら 12フレーム。
const BEAT = Math.round((60 / ANIME_OP_BPM) * 30);

type Credit = {role: string; name: string};

/** クレジット1件。画面内の線や面に沿わせて置き、絵の一部として見せる。 */
const CreditLine: React.FC<{
  credit: Credit;
  start: number;
  color: string;
  vertical?: boolean;
  style?: React.CSSProperties;
}> = ({credit, start, color, vertical, style}) => {
  const frame = useCurrentFrame();
  const o = tween(frame, start, start + 10, 0, 1, EASE.linear);
  const shift = tween(frame, start, start + 18, 24, 0, EASE.out);
  return (
    <div
      style={{
        position: 'absolute',
        color,
        opacity: o,
        fontFamily: FONT.mincho,
        writingMode: vertical ? 'vertical-rl' : undefined,
        transform: vertical ? `translateY(${shift}px)` : `translateX(${shift}px)`,
        ...style,
      }}
    >
      <span style={{fontSize: 30, fontWeight: 500, letterSpacing: '0.3em', opacity: 0.85}}>{credit.role}</span>
      <span style={{display: 'inline-block', width: vertical ? undefined : 36, height: vertical ? 30 : undefined}} />
      <span style={{fontSize: 52, fontWeight: 800, letterSpacing: '0.16em'}}>{credit.name}</span>
    </div>
  );
};

/** 拍の頭で光る白い閃光 */
const Flash: React.FC<{at: number; length?: number; color?: string}> = ({at, length = 6, color = '#fff'}) => {
  const frame = useCurrentFrame();
  const o = frame < at ? 0 : tween(frame, at, at + length, 1, 0, EASE.out);
  return <AbsoluteFill style={{background: color, opacity: o, pointerEvents: 'none'}} />;
};

/** カットの頭で frames フレームかけて現れる(クロスディゾルブの上側) */
const DissolveIn: React.FC<{frames: number; children: React.ReactNode}> = ({frames, children}) => {
  const frame = useCurrentFrame();
  const o = frames > 0 ? tween(frame, 0, frames, 0, 1, EASE.inOut) : 1;
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

/* ---------- C01 暗転、閃光、一本の線 ---------- */
const C01: React.FC<{credit: Credit}> = ({credit}) => {
  const frame = useCurrentFrame();
  const line = tween(frame, BEAT, BEAT * 3, 0, 100, EASE.inOut);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <div style={{position: 'absolute', left: 0, top: 620, height: 3, width: `${line}%`, background: C.cream}} />
      <CreditLine credit={credit} start={BEAT * 2} color={C.cream} style={{left: 180, top: 520}} />
      <Flash at={0} />
    </AbsoluteFill>
  );
};

/* ---------- C02 白黒、輪郭だけの大きな欧文、赤い点滅 ---------- */
const C02: React.FC<{credit: Credit; titleEn: string}> = ({credit, titleEn}) => {
  const frame = useCurrentFrame();
  const drift = tween(frame, 0, 48, 0, -90, EASE.linear);
  const blink = frame % BEAT < 4 ? 1 : 0.15;
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: 300,
          whiteSpace: 'nowrap',
          fontFamily: FONT.latin,
          fontWeight: 700,
          fontSize: 420,
          letterSpacing: '-0.02em',
          color: 'transparent',
          WebkitTextStroke: `2px ${C.cream}55`,
          transform: `translateX(${drift}px)`,
        }}
      >
        {titleEn}
      </div>
      <div style={{position: 'absolute', left: 0, top: 620, height: 3, width: '100%', background: C.cream}} />
      <div style={{position: 'absolute', left: 1500, top: 596, width: 50, height: 50, borderRadius: '50%', background: C.red, opacity: blink, boxShadow: `0 0 60px ${C.red}`}} />
      <CreditLine credit={credit} start={BEAT} color={C.cream} style={{left: 180, top: 660}} />
    </AbsoluteFill>
  );
};

/* ---------- 題字(C03 と C13 で共用) ---------- */
const TitleLogo: React.FC<{title: string; titleEn: string; appear: number; ink: string}> = ({title, titleEn, appear, ink}) => {
  const frame = useCurrentFrame();
  if (frame < appear) {
    return null;
  }
  const signal = tween(frame, appear, appear + 14, 0, 1, EASE.back);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 46}}>
        <div style={{width: 170, height: 170, borderRadius: '50%', background: C.blue, transform: `scale(${signal})`, boxShadow: `0 0 0 14px ${ink}, 0 0 0 20px ${C.blue}`}} />
        <div style={{fontFamily: FONT.mincho, fontWeight: 800, fontSize: 230, color: ink, letterSpacing: '0.04em'}}>
          <SplitText text={title} start={appear} stagger={2} duration={12} />
        </div>
      </div>
      <div style={{fontFamily: FONT.latin, fontWeight: 700, fontSize: 40, color: ink, letterSpacing: '0.9em', marginTop: 30, paddingLeft: '0.9em', opacity: tween(frame, appear + 14, appear + 30, 0, 1)}}>
        {titleEn}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- C03 題字。1拍目は地の色だけ変え、2拍目で題字を出す ---------- */
const C03: React.FC<{title: string; titleEn: string}> = ({title, titleEn}) => {
  const frame = useCurrentFrame();
  const push = tween(frame, 0, 96, 1, 1.06, EASE.linear);
  return (
    <AbsoluteFill style={{background: C.cream}}>
      <AbsoluteFill style={{transform: `scale(${push})`}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 250, height: 6, background: C.ink, width: `${tween(frame, BEAT, BEAT * 3, 0, 100)}%`}} />
        <div style={{position: 'absolute', right: 0, top: 830, height: 6, background: C.ink, width: `${tween(frame, BEAT, BEAT * 3, 0, 100)}%`}} />
        <TitleLogo title={title} titleEn={titleEn} appear={BEAT} ink={C.ink} />
      </AbsoluteFill>
      <Flash at={0} length={5} />
      <Flash at={BEAT} length={4} color={C.blue} />
    </AbsoluteFill>
  );
};

/* ---------- C04 地平線。左へパン、電柱が3層の視差で流れる ---------- */
const C04: React.FC<{credit: Credit; art: string}> = ({credit, art}) => {
  const frame = useCurrentFrame();
  const pan = tween(frame, 0, 96, 0, 1, EASE.linear);
  const layers = [
    {speed: 140, scale: 0.5, y: 640, color: '#27408f', count: 9},
    {speed: 320, scale: 0.8, y: 690, color: '#141f52', count: 6},
    {speed: 620, scale: 1.3, y: 780, color: C.ink, count: 4},
  ];
  return (
    <AbsoluteFill style={{background: `linear-gradient(${C.night} 0%, #1c2f7a 52%, #f08a5d 78%, ${C.yellow} 100%)`}}>
      <div style={{position: 'absolute', left: 1180 + pan * 60, top: 560, width: 300, height: 300, borderRadius: '50%', background: C.cream, boxShadow: `0 0 120px ${C.yellow}`}} />
      {layers.map((l, li) => (
        <div key={li} style={{position: 'absolute', inset: 0, transform: `translateX(${pan * l.speed}px)`}}>
          <div style={{position: 'absolute', left: -700, right: -100, top: l.y, bottom: 0, background: l.color}} />
          {new Array(l.count).fill(0).map((_, i) => {
            const x = -500 + (i * 2600) / l.count;
            const h = 420 * l.scale;
            return (
              <div key={i} style={{position: 'absolute', left: x, top: l.y - h, width: 12 * l.scale, height: h, background: l.color}}>
                <div style={{position: 'absolute', left: -60 * l.scale, top: 30 * l.scale, width: 132 * l.scale, height: 8 * l.scale, background: l.color}} />
                <div style={{position: 'absolute', left: -40 * l.scale, top: 70 * l.scale, width: 92 * l.scale, height: 8 * l.scale, background: l.color}} />
              </div>
            );
          })}
          <div style={{position: 'absolute', left: -700, right: -100, top: l.y - 420 * l.scale + 34 * l.scale, height: 2, background: l.color}} />
        </div>
      ))}
      <div style={{position: 'absolute', left: 1260, top: 250, width: 420, height: 620, opacity: 0.95}}>
        <ArtSlot src={art || undefined} label={'キャラクター素材 A\n(立ち姿、逆光)'} />
      </div>
      {/* クレジットは電線の高さに沿わせる */}
      <CreditLine credit={credit} start={18} color={C.cream} style={{left: 150, top: 300}} />
      <div style={{position: 'absolute', left: 150, top: 392, height: 2, width: tween(frame, 12, 50, 0, 760), background: C.cream}} />
    </AbsoluteFill>
  );
};

/* ---------- C05 信号塔。カメラが上へ(絵は下へ流れる) ---------- */
const C05: React.FC<{credit: Credit}> = ({credit}) => {
  const frame = useCurrentFrame();
  const tilt = tween(frame, 0, 96, 0, 760, EASE.inOut);
  const lamps = [C.red, C.yellow, C.blue];
  return (
    <AbsoluteFill style={{background: `linear-gradient(#0f1c5c, ${C.blue} 70%, #7fb0ff)`}}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: [120, 1240, 380, 1420][i] + frame * (i % 2 ? 0.9 : -0.6),
            top: [820, 520, 120, -260][i] + tilt * 0.55,
            width: [520, 440, 620, 500][i],
            height: 70,
            borderRadius: 35,
            background: `${C.cream}cc`,
          }}
        />
      ))}
      <div style={{position: 'absolute', left: 900, top: -900 + tilt, width: 46, height: 2200, background: C.ink}} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} style={{position: 'absolute', left: 860, top: -900 + tilt + i * 240, width: 126, height: 10, background: C.ink}} />
      ))}
      <div style={{position: 'absolute', left: 800, top: -760 + tilt, width: 246, height: 620, borderRadius: 40, background: C.ink, padding: 30}}>
        {lamps.map((c, i) => {
          const on = Math.floor(frame / 24) % 3 === i;
          return <div key={c} style={{width: 186, height: 166, borderRadius: '50%', background: c, marginBottom: 20, opacity: on ? 1 : 0.22, boxShadow: on ? `0 0 70px ${c}` : 'none'}} />;
        })}
      </div>
      <CreditLine credit={credit} start={14} color={C.cream} vertical style={{left: 1320, top: 180}} />
    </AbsoluteFill>
  );
};

/* ---------- C06 車窓。窓の列が右から左へ流れる ---------- */
const C06: React.FC<{credit: Credit; art: string}> = ({credit, art}) => {
  const frame = useCurrentFrame();
  const x = tween(frame, 0, 96, 300, -1500, EASE.linear);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 150, height: 14, background: C.yellow}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 880, height: 14, background: C.yellow}} />
      <div style={{position: 'absolute', top: 230, left: x, display: 'flex', gap: 60}}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{position: 'relative', width: 500, height: 580, borderRadius: 40, overflow: 'hidden', background: `linear-gradient(${['#f08a5d', C.blue, '#7fb0ff'][i % 3]}, ${C.cream})`, flexShrink: 0}}>
            <div style={{position: 'absolute', left: -200 + ((frame * 22 + i * 130) % 900), top: 380, width: 260, height: 300, background: `${C.night}99`, borderRadius: 30}} />
            {i === 3 ? <ArtSlot src={art || undefined} label={'キャラクター素材 B\n(横顔、窓ごし)'} color="rgba(5,7,15,0.6)" /> : null}
          </div>
        ))}
      </div>
      <CreditLine credit={credit} start={14} color={C.cream} style={{left: 150, top: 930}} />
    </AbsoluteFill>
  );
};

/* ---------- C07 信号の寄り。固定。2小節目の2拍目で赤から青へ ---------- */
const C07: React.FC<{credit: Credit}> = ({credit}) => {
  const frame = useCurrentFrame();
  const change = 48 + BEAT;
  const isBlue = frame >= change;
  const color = isBlue ? C.blue : C.red;
  const ripple = tween(frame, change, change + 30, 0, 1, EASE.out);
  const breathe = 1 + Math.sin(frame * 0.12) * 0.012;
  return (
    <AbsoluteFill style={{background: C.night, alignItems: 'center', justifyContent: 'center'}}>
      {isBlue ? <div style={{position: 'absolute', width: 620, height: 620, borderRadius: '50%', border: `6px solid ${C.blue}`, transform: `scale(${1 + ripple * 1.6})`, opacity: 1 - ripple}} /> : null}
      <div style={{width: 620, height: 620, borderRadius: '50%', background: `radial-gradient(circle at 38% 34%, #fff8 0%, ${color} 34%, ${color} 100%)`, boxShadow: `0 0 200px ${color}`, transform: `scale(${breathe})`}} />
      <CreditLine credit={credit} start={10} color={C.cream} style={{left: 150, top: 900}} />
      <Flash at={change} length={5} />
    </AbsoluteFill>
  );
};

/* ---------- C08, C09 文字カット。1語を画面いっぱいに ---------- */
const WordCard: React.FC<{word: string; index: number}> = ({word, index}) => {
  const frame = useCurrentFrame();
  const schemes = [
    {bg: C.blue, fg: C.cream},
    {bg: C.cream, fg: C.ink},
    {bg: C.red, fg: C.cream},
    {bg: C.ink, fg: C.yellow},
  ];
  const s = schemes[index % schemes.length];
  const scale = tween(frame, 0, 10, 1.25, 1, EASE.out);
  return (
    <AbsoluteFill style={{background: s.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
      <div style={{fontFamily: FONT.mincho, fontWeight: 800, fontSize: word.length > 2 ? 380 : 620, color: s.fg, transform: `scale(${scale}) rotate(${index % 2 ? 4 : -4}deg)`, whiteSpace: 'nowrap', lineHeight: 1}}>
        {word}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- C10 サビ。斜めの速度線、拍で弾む信号、2拍目と4拍目に言葉 ---------- */
const C10: React.FC<{credit: Credit; words: string[]; art: string}> = ({credit, words, art}) => {
  const frame = useCurrentFrame();
  const phase = (frame % BEAT) / BEAT;
  const bounce = 1 + (1 - phase) * (1 - phase) * 0.16;
  const beatIndex = Math.floor(frame / BEAT);
  const wordIndex = Math.floor((beatIndex - 1) / 2); // 2拍目、4拍目で切り替え
  const showWord = beatIndex >= 1;
  const wordAge = (frame - BEAT) % (BEAT * 2);
  return (
    <AbsoluteFill style={{background: C.blue, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: 'rotate(-18deg) scale(1.6)'}}>
        {new Array(14).fill(0).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: i * 80,
              left: -1200 + ((frame * (60 + (i % 4) * 22) + i * 400) % 3400),
              width: 500 + (i % 3) * 260,
              height: 14 + (i % 3) * 16,
              background: i % 4 === 0 ? C.yellow : `${C.cream}${i % 2 ? 'cc' : '66'}`,
            }}
          />
        ))}
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 250, top: 190, width: 560, height: 700}}>
        <ArtSlot src={art || undefined} label={'キャラクター素材 C\n(走る全身)'} />
      </div>
      <div style={{position: 'absolute', left: 1180, top: 150, width: 260, height: 260, borderRadius: '50%', background: C.red, transform: `scale(${bounce})`, boxShadow: `0 0 0 16px ${C.cream}`}} />
      {showWord ? (
        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 470,
            fontFamily: FONT.mincho,
            fontWeight: 800,
            fontSize: 250,
            color: C.cream,
            textShadow: `10px 10px 0 ${C.ink}`,
            transform: `translateX(${tween(wordAge, 0, 8, 120, 0)}px) skewX(-8deg)`,
            whiteSpace: 'nowrap',
          }}
        >
          {words[4 + (wordIndex % 4)]}
        </div>
      ) : null}
      <CreditLine credit={credit} start={20} color={C.cream} style={{left: 150, top: 940}} />
      <Flash at={0} length={5} />
    </AbsoluteFill>
  );
};

/* ---------- C11 16分のフラッシュカット。3フレームごとに図形を切り替え ---------- */
const C11: React.FC = () => {
  const frame = useCurrentFrame();
  const i = Math.floor(frame / 3);
  const invert = i % 2 === 1;
  const bg = invert ? C.cream : C.ink;
  const fg = invert ? C.ink : C.cream;
  const kind = i % 4;
  return (
    <AbsoluteFill style={{background: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
      {kind === 0 ? <div style={{position: 'absolute', inset: -200, backgroundImage: `repeating-linear-gradient(${45 + i * 30}deg, ${fg} 0 40px, transparent 40px 110px)`}} /> : null}
      {kind === 1 ? <div style={{width: 300 + i * 46, height: 300 + i * 46, borderRadius: '50%', border: `${40 + i * 3}px solid ${i % 3 === 0 ? C.red : fg}`}} /> : null}
      {kind === 2 ? <div style={{position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${fg} 6px, transparent 6px), linear-gradient(90deg, ${fg} 6px, transparent 6px)`, backgroundSize: `${90 + i * 8}px ${90 + i * 8}px`}} /> : null}
      {kind === 3 ? (
        <>
          <div style={{position: 'absolute', width: '120%', height: 120, background: i % 3 === 0 ? C.blue : fg, transform: `rotate(${i * 11}deg)`}} />
          <div style={{position: 'absolute', width: 120, height: '160%', background: fg, transform: `rotate(${i * 11}deg)`}} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------- C12 放射。線が回り、青い円が画面を覆う ---------- */
const C12: React.FC = () => {
  const frame = useCurrentFrame();
  const cover = tween(frame, 12, 46, 0, 2400, EASE.in);
  return (
    <AbsoluteFill style={{background: C.yellow, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: 2600, height: 2600, transform: `rotate(${frame * 2.4}deg)`, background: `repeating-conic-gradient(${C.ink} 0deg 5deg, transparent 5deg 15deg)`}} />
      <div style={{position: 'absolute', width: 380, height: 380, borderRadius: '50%', background: C.cream}} />
      <div style={{position: 'absolute', width: cover, height: cover, borderRadius: '50%', background: C.blue}} />
      <Flash at={0} length={5} />
    </AbsoluteFill>
  );
};

/* ---------- C13 題字に戻る。最後は静止して暗転 ---------- */
const C13: React.FC<{title: string; titleEn: string; credit: Credit}> = ({title, titleEn, credit}) => {
  const frame = useCurrentFrame();
  const bg = tween(frame, 0, 10, 0, 1, EASE.linear);
  const out = tween(frame, 84, 96, 0, 1, EASE.linear);
  return (
    <AbsoluteFill style={{background: C.blue}}>
      <AbsoluteFill style={{background: C.cream, opacity: bg}} />
      <TitleLogo title={title} titleEn={titleEn} appear={BEAT} ink={C.ink} />
      <CreditLine credit={credit} start={BEAT * 3} color={C.ink} style={{left: 0, right: 0, top: 900, textAlign: 'center'}} />
      <AbsoluteFill style={{background: C.ink, opacity: out}} />
    </AbsoluteFill>
  );
};

export const AnimeOP: React.FC<AnimeOPProps> = ({title, titleEn, words, credits, art, audio}) => {
  const {fps} = useVideoConfig();
  const grid = makeGrid(ANIME_OP_BPM, fps);

  const scenes: Record<string, React.ReactNode> = {
    C01: <C01 credit={credits[0]} />,
    C02: <C02 credit={credits[1]} titleEn={titleEn} />,
    C03: <C03 title={title} titleEn={titleEn} />,
    C04: <C04 credit={credits[2]} art={art.a} />,
    C05: <C05 credit={credits[3]} />,
    C06: <C06 credit={credits[4]} art={art.b} />,
    C07: <C07 credit={credits[5]} />,
    C08a: <WordCard word={words[0]} index={0} />,
    C08b: <WordCard word={words[1]} index={1} />,
    C09a: <WordCard word={words[2]} index={2} />,
    C09b: <WordCard word={words[3]} index={3} />,
    C09c: <WordCard word={words[2]} index={0} />,
    C09d: <WordCard word={words[3]} index={1} />,
    C10: <C10 credit={credits[6]} words={words} art={art.c} />,
    C11: <C11 />,
    C12: <C12 />,
    C13: <C13 title={title} titleEn={titleEn} credit={credits[7]} />,
  };

  return (
    <AbsoluteFill style={{background: C.ink}}>
      {ANIME_OP_CUTS.map((cut, i) => {
        const from = grid.bar(cut.bar, cut.beat);
        const to = grid.bar(cut.bar, cut.beat + cut.beats);
        // 次のカットがディゾルブで入るときは、その間だけこのカットを下に残す
        const next = ANIME_OP_CUTS[i + 1];
        const tail = next?.dissolve ? grid.beat(next.dissolve) : 0;
        const fadeIn = cut.dissolve ? grid.beat(cut.dissolve) : 0;
        return (
          <Sequence key={cut.id} name={`${cut.id} ${cut.note}`} from={from} durationInFrames={to - from + tail}>
            <DissolveIn frames={fadeIn}>{scenes[cut.id]}</DissolveIn>
          </Sequence>
        );
      })}
      <Grain opacity={0.1} holdFrames={2} />
      {audio !== 'none' ? <Html5Audio src={staticFile(AUDIO_FILES[audio])} /> : null}
    </AbsoluteFill>
  );
};
