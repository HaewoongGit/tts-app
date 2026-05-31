'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import useTtsStore from '@/store/useTtsStore';

/**
 * 오디오 플레이어 및 인터랙티브 자막 하이라이트 컴포넌트
 * 음성 재생을 제어하며 현재 재생 위치에 매칭되는 단어를 강조하여 시각화합니다.
 */
export default function AudioPlayer() {
  const history = useTtsStore((state) => state.history);
  const currentTrackId = useTtsStore((state) => state.currentTrackId);
  const isPlaying = useTtsStore((state) => state.isPlaying);
  const setIsPlaying = useTtsStore((state) => state.setIsPlaying);
  const setCurrentTrack = useTtsStore((state) => state.setCurrentTrack);

  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  // [1. 고주파 재생 시간 추적 - requestAnimationFrame 활용]
  useEffect(() => {
    let animationFrameId;

    const updateProgress = () => {
      console.log('[AudioPlayer] rAF 실행, isPlaying:', isPlaying);
      // isPlaying 상태에 의존하지 않고 실제 audio 객체의 재생 여부(!paused)를 기준으로 루프를 제어합니다.
      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      // 기존 프레임이 있다면 취소하고 새로 시작하여 중복 루프를 방지합니다.
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateProgress);
    } else {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);

  // 현재 재생 중인 트랙 정보 조회
  const currentTrack = useMemo(() => {
    return history.find((track) => track.id === currentTrackId) || null;
  }, [history, currentTrackId]);

  const activeTrack = isMounted ? currentTrack : null;


  // ElevenLabs의 캐릭터 단위 타임스탬프를 단어 단위 타임스탬프로 결합
  const words = useMemo(() => {
    if (!activeTrack) return [];
    
    const text = activeTrack.text;
    const alignment = activeTrack.alignment;
    
    if (!alignment || !alignment.characters) {
      // 타임스탬프 정보가 없을 경우 공백 기준 단어 분할 처리 (일반 텍스트만 노출)
      return text.split(' ').map((word) => ({ text: word, start: -1, end: -1 }));
    }

    const { characters, character_start_times_seconds, character_end_times_seconds } = alignment;
    const result = [];
    let currentWord = '';
    let wordStart = null;
    let wordEnd = null;

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      const start = character_start_times_seconds[i];
      const end = character_end_times_seconds[i];

      // 공백 문자 확인 시 단어로 패킹
      if (char === ' ' || char === '\n' || char === '\t') {
        if (currentWord) {
          result.push({ text: currentWord, start: wordStart, end: wordEnd });
          currentWord = '';
          wordStart = null;
          wordEnd = null;
        }
      } else {
        if (wordStart === null) wordStart = start;
        wordEnd = end;
        currentWord += char;
      }
    }

    // 마지막 단어 처리
    if (currentWord) {
      result.push({ text: currentWord, start: wordStart, end: wordEnd });
    }

    return result;
  }, [activeTrack]);

  // [2. 문장의 마침점(., ?, !) 기호를 분석하여 문장 단위 경계(시작 시각) 계산]
  const sentenceStartTimes = useMemo(() => {
    if (!activeTrack || !activeTrack.alignment || !activeTrack.alignment.characters) {
      return [0];
    }

    const { characters, character_start_times_seconds } = activeTrack.alignment;
    const starts = [character_start_times_seconds[0] || 0];

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      // 마침표(.), 물음표(?), 느낌표(!) 문장을 종결하는 구분 문자 식별
      if (char === '.' || char === '?' || char === '!') {
        // 문장 뒤의 모든 공백 문자를 뛰어넘어 실제 텍스트 시작 인덱스 탐색
        let nextIdx = i + 1;
        while (
          nextIdx < characters.length && 
          (characters[nextIdx] === ' ' || characters[nextIdx] === '\n' || characters[nextIdx] === '\t')
        ) {
          nextIdx++;
        }
        if (nextIdx < characters.length) {
          starts.push(character_start_times_seconds[nextIdx]);
        }
      }
    }

    // 중복 제거 및 시간 순서대로 정렬하여 예외적인 데이터 오차 제어
    return Array.from(new Set(starts)).sort((a, b) => a - b);
  }, [activeTrack]);

  // 오디오 재생 상태 연동
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.error('Audio playback failed:', err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // 트랙 변경 시 오디오 리셋 및 자동 중지
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    audioRef.current.load();
  }, [currentTrackId, setIsPlaying]);

  // 컴포넌트 언마운트 시 오디오 일시정지 처리 (메모리 누수 방지 안전장치)
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // 오디오 오케스트레이션 핸들러
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handlePlayPause = () => {
    if (!currentTrack) return;
    setIsPlaying(!isPlaying);
  };

  // 프로그레스 바 클릭 시 탐색 기능 (Seek)
  const handleProgressClick = (e) => {
    if (!audioRef.current || !progressBarRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercentage = clickX / width;
    const newTime = clickPercentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // 재생 시간 포맷팅 (예: 0:14)
  const formatTime = (time) => {
    if (isNaN(time) || time === Infinity) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // [3. 문장 단위 탐색 상태 및 클릭 제어 핸들러]
  const hasNextSentence = activeTrack !== null && sentenceStartTimes.some((time) => time > currentTime + 0.15);
  const hasPrevSentence = activeTrack !== null;

  // Next 버튼 클릭: 다음 문장으로 스킵
  const handleNextSentence = () => {
    if (!audioRef.current || !currentTrack) return;

    // 현재 시간보다 0.15초 이상 뒤에 있는 첫 번째 문장의 시작점을 찾음
    const nextStart = sentenceStartTimes.find((time) => time > currentTime + 0.15);
    if (nextStart !== undefined) {
      audioRef.current.currentTime = nextStart;
      setCurrentTime(nextStart);
    }
  };

  // Prev 버튼 클릭: 문장 처음으로 이동하거나 이전 문장 시작점으로 이동
  const handlePrevSentence = () => {
    if (!audioRef.current || !currentTrack) return;

    // 현재 시간을 기준으로 속한 문장의 인덱스 탐색
    let currentSentenceIdx = -1;
    for (let i = 0; i < sentenceStartTimes.length; i++) {
      if (sentenceStartTimes[i] <= currentTime + 0.05) {
        currentSentenceIdx = i;
      } else {
        break;
      }
    }

    if (currentSentenceIdx === -1) return;

    const currentSentenceStart = sentenceStartTimes[currentSentenceIdx];
    const threshold = 1.5; // 현재 문장 시작 후 1.5초를 기준으로 이전 문장 스킵 여부 판단

    if (currentTime - currentSentenceStart < threshold && currentSentenceIdx > 0) {
      // 1.5초 이내에 클릭한 경우 이전 문장의 시작 시점으로 이동
      const prevStart = sentenceStartTimes[currentSentenceIdx - 1];
      audioRef.current.currentTime = prevStart;
      setCurrentTime(prevStart);
    } else {
      // 1.5초 이상 지난 경우 현재 문장의 처음으로 이동
      audioRef.current.currentTime = currentSentenceStart;
      setCurrentTime(currentSentenceStart);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between rounded-none sm:rounded-2xl border-0 sm:border border-slate-700/80 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-md shadow-2xl relative overflow-hidden min-h-[460px] group">
      {/* Subtle border glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={activeTrack ? activeTrack.audioUrl : undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* 1. Player Header */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-700/60">
        <label className="text-xs font-bold tracking-wider text-slate-300 uppercase">
          Player & Subtitle Highlight
        </label>
        
        {!activeTrack ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/20 text-slate-200 border border-slate-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Idle
          </span>
        ) : isPlaying ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Playing
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            Paused
          </span>
        )}
      </div>

      {/* 2. Interactive Text Highlight Area (대폭 넓혀진 핵심 자막 표시부) */}
      <div className="relative z-10 flex-1 my-2 sm:my-3.5 flex p-3 sm:p-4 rounded-xl bg-slate-950/50 border border-slate-700/60 min-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {!activeTrack ? (
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed text-center select-none max-w-xs sm:max-w-md m-auto">
            재생할 오디오가 없습니다. 목록에서 선택하거나 위 입력창에서 음성을 새로 생성해 보세요.
          </p>
        ) : (
          <p className="text-base sm:text-lg font-semibold leading-relaxed text-center select-none max-w-xl m-auto">
            {words.map((word, idx) => {
              // 실시간 오디오 재생 시간에 맞춰 해당 단어를 하이라이팅
              const isHighlighted = 
                word.start !== -1 && 
                currentTime >= word.start && 
                currentTime <= word.end;

              return (
                <span key={idx}>
                  <span
                    className={`transition-all duration-150 ${
                      isHighlighted
                        ? 'text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.95)]'
                        : 'text-slate-300/80'
                    }`}
                  >
                    {word.text}
                  </span>
                  {/* 단어 사이에 자연스러운 띄어쓰기 공백 추가 */}
                  {' '}
                </span>
              );
            })}
          </p>
        )}
      </div>

      {/* 3. Playback Controls (버튼 크기 및 여백 콤팩트화로 텍스트 공간 극대화) */}
      <div className="relative z-10 flex flex-col items-center gap-3 mb-3">
        <div className="flex items-center gap-5">
          {/* Previous Sentence Button */}
          <button
            type="button"
            onClick={handlePrevSentence}
            disabled={!hasPrevSentence}
            className="p-2.5 rounded-full border border-slate-700 bg-slate-950/60 text-slate-200 hover:border-indigo-500/50 hover:text-indigo-200 hover:bg-slate-900/80 active:scale-95 transition-all cursor-pointer shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
            title="이전 문장"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={handlePlayPause}
            disabled={!activeTrack}
            className="p-4 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 hover:shadow-lg hover:shadow-indigo-500/25 text-white active:scale-95 transition-all shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={isPlaying ? '일시정지' : '재생'}
          >
            {isPlaying ? (
              /* Pause Icon (SVG) */
              <svg className="w-5.5 h-5.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              /* Play Icon (SVG) */
              <svg className="w-5.5 h-5.5 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Next Sentence Button */}
          <button
            type="button"
            onClick={handleNextSentence}
            disabled={!hasNextSentence}
            className="p-2.5 rounded-full border border-slate-700 bg-slate-950/60 text-slate-200 hover:border-indigo-500/50 hover:text-indigo-200 hover:bg-slate-900/80 active:scale-95 transition-all cursor-pointer shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
            title="다음 문장"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 4. Audio Progress Bar (맨 하단 밀착) */}
      <div className="relative z-10 w-full mb-1">
        <div 
          ref={progressBarRef}
          onClick={handleProgressClick}
          className="h-1.5 w-full rounded-full bg-slate-700/80 overflow-hidden cursor-pointer group/progress relative"
        >
          {/* 재생 시간 진행도 */}
          <div 
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 group-hover/progress:from-indigo-300 group-hover/progress:to-purple-300 transition-all duration-150"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-slate-300 font-mono font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
