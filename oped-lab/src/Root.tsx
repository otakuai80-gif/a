import React from 'react';
import {Composition, Folder} from 'remotion';
import './lib/fonts';
import {AnimeOP, animeOPSchema} from './compositions/anime/AnimeOP';
import {ANIME_OP_BARS, ANIME_OP_BPM} from './compositions/anime/cuts';
import {CorpOpener, corpOpenerSchema} from './compositions/corporate/CorpOpener';
import {YouTubeED, youTubeEDSchema} from './compositions/youtube/YouTubeED';
import {YouTubeOP, youTubeOPSchema} from './compositions/youtube/YouTubeOP';
import {makeGrid} from './lib/timing';

const FPS = 30;
const W = 1920;
const H = 1080;

// 題名、チャンネル名、社名、人名はすべて仮のもの。Studio 右側のパネルか、ここの defaultProps で差し替える。
export const Root: React.FC = () => {
  return (
    <>
      <Folder name="01-YouTube">
        <Composition
          id="YT-OP"
          component={YouTubeOP}
          schema={youTubeOPSchema}
          durationInFrames={180}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{
            titleTop: 'つくる',
            titleBottom: '実験室',
            tagline: '毎週、なにかを作って試す。',
            paper: '#F4EFE6',
            ink: '#16130F',
            accent: '#FF4B2B',
            second: '#2447F9',
            third: '#FFC93C',
            sfx: true,
          }}
        />
        <Composition
          id="YT-ED"
          component={YouTubeED}
          schema={youTubeEDSchema}
          durationInFrames={600}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{
            thanks: 'ご視聴ありがとうございました',
            channelName: 'つくる実験室',
            subscribeLabel: 'チャンネル登録',
            slotLabels: ['次の動画', 'おすすめ'],
            ticker: '企画・撮影・編集　(あなたの名前)　／　音楽　(曲名と作者)　／　毎週金曜 20時 更新',
            showGuides: true,
            ink: '#16130F',
            paper: '#F4EFE6',
            accent: '#FF4B2B',
            second: '#2447F9',
            third: '#FFC93C',
          }}
        />
      </Folder>
      <Folder name="02-Anime">
        <Composition
          id="ANIME-OP"
          component={AnimeOP}
          schema={animeOPSchema}
          durationInFrames={makeGrid(ANIME_OP_BPM, FPS).bar(ANIME_OP_BARS)}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{
            title: 'アオイ信号',
            titleEn: 'AOI SIGNAL',
            words: ['まだ', '遠く', '青', 'へ', '走れ', '越えて', '夜明け', '進め'],
            credits: [
              {role: '原作', name: '(原作者名)'},
              {role: '監督', name: '(監督名)'},
              {role: 'キャラクターデザイン', name: '(担当者名)'},
              {role: '音楽', name: '(担当者名)'},
              {role: '美術監督', name: '(担当者名)'},
              {role: '主題歌', name: '(曲名 / 歌手名)'},
              {role: 'アニメーション制作', name: '(制作会社名)'},
              {role: '製作', name: '(製作委員会名)'},
            ],
            art: {a: '', b: '', c: ''},
            audio: 'bgm',
          }}
        />
      </Folder>
      <Folder name="03-Corporate">
        <Composition
          id="CORP-OPENER"
          component={CorpOpener}
          schema={corpOpenerSchema}
          durationInFrames={240}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{
            company: 'ハクト製作所',
            companyEn: 'HAKUTO WORKS',
            tagline: 'つくる人の、となりに。',
            bg: '#F3F1EC',
            ink: '#14171A',
            accent: '#0E5F4B',
            sfx: true,
          }}
        />
      </Folder>
    </>
  );
};
