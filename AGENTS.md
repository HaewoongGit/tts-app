<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🎙️ English TTS Voice Generator (AI Voice Synthesizer)

인공지능 성우 서비스인 **ElevenLabs API**와 실시간 자막 싱크 알고리즘을 결합한 고품질 웹 기반 영어/다국어 TTS(Text-to-Speech) 음성 합성 솔루션입니다. 

---

## 🛠️ 핵심 기술 스택 (Technology Stack)

* **프레임워크**: Next.js 16 (App Router, Turbopack 컴파일 환경)
* **상태 관리**: Zustand v5 (스토리지 영속화 미들웨어 `persist` 활용)
* **스타일링**: Tailwind CSS v4 (vanilla-css 모던 글래스모피즘 디자인 가이드)
* **핵심 API**: ElevenLabs `/text-to-speech/{voice_id}/with-timestamps`
* **패키지 매니저**: pnpm v10

---

## ✨ 주요 기능 (Core Features)

1. **고품질 인공지능 음성 합성 (AI Speech Synthesis)**
   * ElevenLabs의 최신 다국어 학습 모델인 `eleven_multilingual_v2`를 연동하여 실제 원어민과 다름없는 음향 및 감정을 표현합니다.
   * 로딩 스피너 및 유연한 비동기 버튼 피드백을 통해 쾌적한 합성 경험을 선사합니다.

2. **실시간 자막 싱크 하이라이팅 (Real-time Subtitle Sync & Word Highlighting)**
   * API 응답 구조 속 글자 단위 타임스탬프(`alignment`) 데이터를 수신하여 실시간 단어별 범위(`start`, `end`)로 재조합하는 독자적인 프론트엔드 알고리즘이 탑재되었습니다.
   * 브라우저의 고주파 주기율을 활용하는 `requestAnimationFrame` 루프를 연동해 낭독하고 있는 정확한 타이밍에 단어가 시각적으로 강조(Highlighting)됩니다.

3. **지능형 문장 단위 네비게이션 (Intelligent Sentence Navigation)**
   * 마침표(`.`), 물음표(`?`), 느낌표(`!`) 및 공백 패턴을 분석해 전체 텍스트의 문장 단위 경계를 실시간으로 산출합니다.
   * **Next**: 다음 문장의 처음으로 즉시 스킵합니다.
   * **Prev**: 재생 시점이 문장 시작 후 1.5초 이내일 때는 이전 문장으로 백트랙킹하고, 1.5초 이상 지났을 때는 현재 문장의 머리로 안전하게 이동합니다.

4. **로컬스토리지 영구 보관 (Local Storage Persistence)**
   * 생성했던 음성 이력 파일들을 브라우저 디스크(`localStorage`)에 저장하여 브라우저 재시작 및 새로고침 후에도 이력 조회 및 무제한 재재생을 보장합니다.
   * Next.js 특유의 SSR 환경에서 발생하는 마크업 불일치(`Hydration Mismatch`) 문제를 완벽히 차단하는 마운트 세이프티 가드가 설계되어 있습니다.

5. **다크 모드 프리미엄 UI 디자인 (Premium Immersive Glassmorphism UI)**
   * 심해 테마의 부드러운 그라데이션 백그라운드 및 네온 야광 글로우 효과.
   * 글자 크기나 길이 제약으로 인해 디자인이 무너지는 현상을 막기 위해 vertical 스크롤 세이프존 설계 완료.
   * 브라우저 기본 경고 얼럿(`window.alert`)을 영롱한 컴포넌트형 인라인 피드백 배너로 고급화 대체.
