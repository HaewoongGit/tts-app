'use client';

import { useState, useEffect, useMemo } from 'react';
import useTtsStore from '@/store/useTtsStore';
import { createClient } from '@/utils/supabase/client';

/**
 * TTS 변환 내역 목록 컴포넌트
 * 이전에 생성했던 텍스트와 변환 상태의 목록을 보여줍니다.
 */
export default function HistoryList() {
  const supabase = useMemo(() => createClient(), []);

  const history = useTtsStore((state) => state.history);
  const currentTrackId = useTtsStore((state) => state.currentTrackId);
  const setCurrentTrack = useTtsStore((state) => state.setCurrentTrack);
  const setHistory = useTtsStore((state) => state.setHistory);
  const deleteHistoryItem = useTtsStore((state) => state.deleteHistoryItem);

  const handleDelete = async (id) => {
    console.log('[handleDelete 시작] 삭제 요청 ID:', id);

    // 1. 삭제할 아이템 찾기
    const itemToDelete = history.find(item => item.id === id);
    console.log('[1. 삭제할 아이템 정보]:', itemToDelete);
    
    if (!itemToDelete) {
      console.warn('[경고] 상태 목록(history)에서 해당 ID를 찾을 수 없습니다.');
      return;
    }

    try {
      // 2. URL에서 실제 스토리지 파일명 추출
      console.log('[2. 원본 오디오 URL]:', itemToDelete.audioUrl);
      
      // URL에 쿼리 파라미터(?t=...)가 있을 수 있으므로 ? 앞부분만 추출 후 파일명 파싱
      const urlWithoutQuery = itemToDelete.audioUrl.split('?')[0];
      let fileName = urlWithoutQuery.split('/').pop();
      
      // 파일명이 URL 인코딩(예: 공백이 %20 등) 되어있을 수 있으므로 디코딩
      fileName = decodeURIComponent(fileName);
      console.log('[2-1. 추출 및 디코딩된 최종 파일명]:', fileName);

      // 3. Supabase Storage에서 물리적 mp3 파일 삭제
      if (fileName) {
        console.log(`[3. Storage 삭제 시도] 버킷: audio_files, 파일명: ${fileName}`);
        
        const { data: storageData, error: storageError } = await supabase.storage
          .from('audio_files')
          .remove([fileName]);
          
        if (storageError) {
          console.error('[🚨 Storage 삭제 실패 상세 에러]:', storageError);
          // RLS 정책 문제일 경우 여기서 에러 메시지가 명확하게 찍힙니다.
        } else {
          console.log('[✅ Storage 삭제 성공 반환 데이터]:', storageData);
        }
      } else {
        console.warn('[경고] 파일명을 추출하지 못해 Storage 삭제를 건너뜁니다.');
      }

      // 4. Supabase DB 레코드 삭제
      console.log('[4. DB 레코드 삭제 시도] ID:', id);
      const { error: dbError } = await supabase
        .from('tts_history')
        .delete()
        .eq('id', id);

      if (dbError) {
         console.error('[🚨 DB 레코드 삭제 실패 상세 에러]:', dbError);
         throw dbError;
      }
      
      console.log('[✅ DB 레코드 삭제 성공]');

      // 5. 프론트엔드 UI 상태 업데이트
      deleteHistoryItem(id);
      console.log('[✅ 프론트엔드 상태 업데이트 완료]');
      
    } catch (error) {
      console.error('[🚨 handleDelete catch 블록 에러]:', error);
      alert('삭제 중 문제가 발생했습니다. 콘솔 창을 확인하세요.');
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error } = await supabase
        .from('tts_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) { console.error('Error fetching TTS history:', error); return; }

      setHistory(data.map((row) => ({
        id: row.id,
        text: row.text,
        title: row.title,
        audioUrl: row.audio_url,
        alignment: row.alignment,
        createdAt: row.created_at,
      })));
    };

    console.log('[HistoryList] useEffect 실행');
    fetchHistory();
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col rounded-2xl border border-slate-700/80 bg-slate-900/60 p-6 backdrop-blur-md shadow-2xl relative overflow-hidden min-h-[280px]">
      
      {/* Title & Count */}
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <label className="text-xs font-bold tracking-wider text-slate-300 uppercase">
          History
        </label>
        <span className="text-xs bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 rounded-full text-indigo-200 font-mono font-semibold">
          {history.length} items
        </span>
      </div>

      {/* History Items Box */}
      <div className="relative z-10 flex-1 overflow-y-auto max-h-[320px] space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {history.length === 0 ? (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-700 rounded-xl">
            <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="text-xs text-slate-350 font-normal leading-relaxed">
              생성된 TTS 변환 내역이 없습니다.<br />위 입력 필드에 텍스트를 적어 음성을 생성해 보세요.
            </p>
          </div>
        ) : (
          /* Items List */
          history.map((item) => {
            const isActive = item.id === currentTrackId;
            return (
              <div
                key={item.id}
                onClick={() => setCurrentTrack(item.id)}
                className={`group relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-500/15'
                    : 'border-slate-700/80 bg-slate-950/40 hover:border-indigo-500/50 hover:bg-slate-950/70 hover:shadow-lg hover:shadow-indigo-500/5'
                }`}
              >
                {/* Title Snippet */}
                <p className={`text-xs sm:text-sm line-clamp-2 font-medium leading-relaxed transition-colors ${
                  isActive ? 'text-indigo-200 font-semibold' : 'text-slate-200 group-hover:text-white'
                }`}>
                  {item.title}
                </p>

                {/* Footer (Timestamp and Action) */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono font-medium">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {/* Delete Button */}
                  <button
                    type="button"
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    title="내역 삭제"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
