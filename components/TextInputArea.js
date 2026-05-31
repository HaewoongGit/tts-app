'use client';

import { useState } from 'react';
import useTtsStore from '@/store/useTtsStore';

/**
 * 텍스트 입력 영역 컴포넌트
 * 사용자가 음성으로 변환하고 싶은 텍스트를 입력하는 곳입니다.
 */
export default function TextInputArea() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const addHistoryItem = useTtsStore((state) => state.addHistoryItem);
  const setCurrentTrack = useTtsStore((state) => state.setCurrentTrack);

  const handleGenerateVoice = async () => {
    if (!title.trim()) {
      setError('음성 파일 제목을 입력해 주세요.');
      return;
    }

    if (!text.trim()) {
      setError('변환할 텍스트를 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    setError(null); // 새로운 요청 전 에러 상태 초기화

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, title }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '음성 생성 중 오류가 발생했습니다.');
      }

      // Zustand 스토어에 기록 추가
      addHistoryItem(data);

      // 방금 생성된 최신 항목을 현재 트랙으로 설정
      setCurrentTrack(data.id);

      // 입력 값 초기화
      setTitle('');
      setText('');
    } catch (err) {
      console.error('Failed to generate voice:', err);
      setError(err.message || '음성 변환 과정에서 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full rounded-none sm:rounded-2xl border-0 sm:border border-slate-700/80 bg-slate-900/60 p-4 sm:p-6 backdrop-blur-md shadow-2xl relative overflow-hidden group">
      {/* Subtle border glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Error Alert Banner */}
      {error && (
        <div className="relative z-10 mb-4 p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/40 text-xs text-rose-200 flex items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
          <button 
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-rose-500/20 text-rose-400 active:scale-90 transition-all cursor-pointer"
            title="에러 지우기"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Title Input */}
      <div className="relative z-10 mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            // 영문 대소문자, 숫자, 공백(\s)을 제외한 모든 문자를 빈 문자열로 치환하여 필터링
            const filteredValue = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '');
            setTitle(filteredValue);
          }}
          disabled={isLoading}
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all font-normal"
          placeholder="Enter title (English and numbers only)"
          maxLength={50}
        />
      </div>

      {/* Label and Character Count */}
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <label className="text-xs font-bold tracking-wider text-slate-300 uppercase">
          Text Input
        </label>
        <span className="text-xs text-slate-400 font-mono font-medium">{text.length} / 1000</span>
      </div>

      {/* Input Textarea */}
      <div className="relative z-10">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isLoading}
          className="w-full min-h-[140px] resize-y rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all font-normal leading-relaxed disabled:opacity-50"
          placeholder="여기에 영어 또는 한국어 문장을 입력해 주세요. ElevenLabs의 고품질 인공지능 음성으로 변환됩니다..."
          maxLength={1000}
        />
      </div>

      {/* Action Button */}
      <div className="relative z-10 mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleGenerateVoice}
          disabled={isLoading}
          className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/15 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              {/* Spinner SVG */}
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              음성 생성 중...
            </>
          ) : (
            <>
              {/* Sound Wave Icon (SVG) */}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
              음성 생성하기
            </>
          )}
        </button>
      </div>
    </div>
  );
}
