/**
 * アニメ風OP 試作のカット表(正本)。docs/specs/02-anime.md の「試作仕様」と同じ内容。
 * 位置は「小節(0始まり)+ 拍(0始まり)」、長さは拍数で書く。フレームへの変換は lib/timing.ts が行う。
 * BPM を変えると全カットが追従する。
 */
export const ANIME_OP_BPM = 150;
export const ANIME_OP_BARS = 20;

export type Cut = {
  id: string;
  /** 開始小節(0始まり) */
  bar: number;
  /** 開始拍(0始まり) */
  beat: number;
  /** 長さ(拍) */
  beats: number;
  section: 'イントロ' | '題字' | 'Aパート' | 'ビルド' | 'サビ' | '締め';
  note: string;
};

export const ANIME_OP_CUTS: Cut[] = [
  {id: 'C01', bar: 0, beat: 0, beats: 4, section: 'イントロ', note: '暗転、1拍目に閃光、2拍目から線'},
  {id: 'C02', bar: 1, beat: 0, beats: 4, section: 'イントロ', note: '白黒、輪郭の欧文、赤の点滅'},
  {id: 'C03', bar: 2, beat: 0, beats: 8, section: '題字', note: '1拍目は地色のみ、2拍目に題字'},
  {id: 'C04', bar: 4, beat: 0, beats: 8, section: 'Aパート', note: '地平線、左パン、素材A'},
  {id: 'C05', bar: 6, beat: 0, beats: 8, section: 'Aパート', note: '信号塔、上へ移動、縦書きクレジット'},
  {id: 'C06', bar: 8, beat: 0, beats: 8, section: 'Aパート', note: '車窓、横流れ、素材B'},
  {id: 'C07', bar: 10, beat: 0, beats: 8, section: 'Aパート', note: '信号の寄り、固定、赤から青'},
  {id: 'C08a', bar: 12, beat: 0, beats: 2, section: 'ビルド', note: '文字カット(2拍)'},
  {id: 'C08b', bar: 12, beat: 2, beats: 2, section: 'ビルド', note: '文字カット(2拍)'},
  {id: 'C09a', bar: 13, beat: 0, beats: 1, section: 'ビルド', note: '文字カット(1拍)'},
  {id: 'C09b', bar: 13, beat: 1, beats: 1, section: 'ビルド', note: '文字カット(1拍)'},
  {id: 'C09c', bar: 13, beat: 2, beats: 1, section: 'ビルド', note: '文字カット(1拍)'},
  {id: 'C09d', bar: 13, beat: 3, beats: 1, section: 'ビルド', note: '文字カット(1拍)'},
  {id: 'C10', bar: 14, beat: 0, beats: 8, section: 'サビ', note: '速度線、拍で弾む信号、素材C'},
  {id: 'C11', bar: 16, beat: 0, beats: 4, section: 'サビ', note: '16分のフラッシュカット16枚'},
  {id: 'C12', bar: 17, beat: 0, beats: 4, section: 'サビ', note: '放射、青い円が覆う'},
  {id: 'C13', bar: 18, beat: 0, beats: 8, section: '締め', note: '題字に戻る、静止、暗転'},
];
