import { create } from 'zustand';

/**
 * TTS(Text-to-Speech) 전역 상태 관리를 위한 Zustand 스토어
 */
const useTtsStore = create((set) => ({
  // ==========================================
  // 1. 상태 (State)
  // ==========================================
  
  /**
   * @type {Array<{id: string, text: string, title: string, audioUrl: string, alignment: any, createdAt: string}>}
   * 사용자가 생성한 TTS 변환 기록 리스트 (최신 항목이 맨 앞으로 정렬됨)
   */
  history: [],

  /**
   * @type {string|null}
   * 현재 오디오 플레이어에 로드되어 재생 중이거나 선택된 TTS 기록의 고유 ID
   */
  currentTrackId: null,

  /**
   * @type {boolean}
   * 현재 오디오가 재생 중인지 여부 (재생 중: true, 일시정지/정지: false)
   */
  isPlaying: false,

  // ==========================================
  // 2. 액션 (Actions)
  // ==========================================

  /**
   * Supabase DB 등 외부에서 불러온 기록 리스트 전체를 스토어에 세팅합니다.
   * @param {Array} historyList - 세팅할 내역 목록
   */
  setHistory: (historyList) => set({
    history: historyList
  }),

  /**
   * 새로운 TTS 변환 기록을 기록 목록의 맨 처음에 추가합니다.
   * @param {object} item - 새로 추가할 DB 레코드 객체
   */
  addHistoryItem: (item) => set((state) => ({
    history: [item, ...state.history],
  })),

  /**
   * 특정 TTS 기록을 현재 활성화된 트랙으로 설정합니다.
   * @param {string|null} id - 선택할 트랙의 ID
   */
  setCurrentTrack: (id) => set({ 
    currentTrackId: id 
  }),

  /**
   * 오디오 플레이어의 재생 및 정지 상태를 설정합니다.
   * @param {boolean} isPlaying - 재생 여부
   */
  setIsPlaying: (isPlaying) => set({ 
    isPlaying 
  }),

  /**
   * 특정 TTS 기록을 목록에서 삭제합니다.
   * 삭제하려는 트랙이 현재 선택되어 재생 중인 트랙일 경우 재생을 정지하고 선택을 초기화합니다.
   * @param {string} id - 삭제하려는 기록의 고유 ID
   */
  deleteHistoryItem: (id) => set((state) => {
    const isCurrentTrack = state.currentTrackId === id;
    
    return {
      history: state.history.filter((item) => item.id !== id),
      // 현재 재생 중인 트랙을 삭제하는 경우에 대한 안전 장치 처리
      currentTrackId: isCurrentTrack ? null : state.currentTrackId,
      isPlaying: isCurrentTrack ? false : state.isPlaying,
    };
  }),
}));

export default useTtsStore;
