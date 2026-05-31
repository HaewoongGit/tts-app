import TextInputArea from '@/components/TextInputArea';
import HistoryList from '@/components/HistoryList';
import AudioPlayer from '@/components/AudioPlayer';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 text-white px-0 py-6 sm:p-6 selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Grid Wrapper */}
      <div className="relative z-10 w-full max-w-6xl flex flex-col gap-6 sm:gap-8 my-auto py-4 sm:py-8">
        
        {/* Header Branding */}
        <header className="flex flex-col items-center text-center gap-3 mb-2 px-4 sm:px-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-400/40 bg-indigo-500/10 text-[10px] sm:text-xs font-semibold text-indigo-200 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-350 animate-pulse" />
            ElevenLabs AI Voice Synthesizer
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-indigo-50 to-purple-100 leading-tight">
            English TTS Voice Generator
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-normal max-w-md">
            텍스트를 고품질 AI 음성으로 변환하고 실시간 싱크 하이라이팅을 체험해 보세요.
          </p>
        </header>

        {/* Responsive Flex Layout */}
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-stretch w-full">
          {/* Left Column: Inputs & History logs */}
          <div className="flex-1 flex flex-col gap-6">
            <TextInputArea />
            <HistoryList />
          </div>

          {/* Right Column: Player & Caption highlighter */}
          <div className="flex-1 flex">
            <AudioPlayer />
          </div>
        </div>

      </div>
    </main>
  );
}

