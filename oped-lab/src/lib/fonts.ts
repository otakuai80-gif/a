import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// フォントは public/fonts に同梱(すべて SIL Open Font License 1.1)。
// ネットワークに依存しないので、どの環境でも同じ結果でレンダリングされる。
const faces: {family: string; file: string; weight: string}[] = [
  {family: 'ZenKaku', file: 'zen-kaku-gothic-new-japanese-500-normal.woff2', weight: '500'},
  {family: 'ZenKaku', file: 'zen-kaku-gothic-new-japanese-700-normal.woff2', weight: '700'},
  {family: 'ZenKaku', file: 'zen-kaku-gothic-new-japanese-900-normal.woff2', weight: '900'},
  {family: 'Shippori', file: 'shippori-mincho-japanese-500-normal.woff2', weight: '500'},
  {family: 'Shippori', file: 'shippori-mincho-japanese-800-normal.woff2', weight: '800'},
  {family: 'Dela', file: 'dela-gothic-one-japanese-400-normal.woff2', weight: '400'},
  {family: 'Grotesk', file: 'space-grotesk-latin-500-normal.woff2', weight: '500'},
  {family: 'Grotesk', file: 'space-grotesk-latin-700-normal.woff2', weight: '700'},
];

for (const f of faces) {
  loadFont({family: f.family, url: staticFile(`fonts/${f.file}`), weight: f.weight}).catch((err) => {
    console.error('フォントの読み込みに失敗:', f.file, err);
  });
}

export const FONT = {
  /** 日本語ゴシック(本文、見出し) */
  gothic: "'ZenKaku', sans-serif",
  /** 欧文はGrotesk、和文はゴシック */
  latin: "'Grotesk', 'ZenKaku', sans-serif",
  /** 明朝(アニメ風タイトル、クレジット) */
  mincho: "'Shippori', serif",
  /** 極太ディスプレイ(YouTube系タイトル) */
  display: "'Dela', 'ZenKaku', sans-serif",
} as const;
