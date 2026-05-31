import { createClient } from '@/utils/supabase/server';

/**
 * ElevenLabs TTS (Text-to-Speech) API Route Handler
 * 클라이언트로부터 텍스트를 전달받아 ElevenLabs API를 통해 음성(Base64) 및 글자별 싱크 데이터(alignment)를 생성합니다.
 */

// Voice ID 설정 (필요에 따라 성우 ID를 손쉽게 변경할 수 있습니다)
// '21m00Tcm4TlvDq8ikWAM' - Rachel (기본 성우 ID)
const NARRATOR_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export async function POST(req) {
  try {
    // 1. 클라이언트 요청 바디로부터 텍스트 및 제목 데이터 추출
    const body = await req.json();
    const { text, title } = body;

    // 1-1. 요청 데이터 정합성 검증
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return Response.json(
        { error: '음성 제목이 입력되지 않았거나 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return Response.json(
        { error: '변환할 텍스트가 유효하지 않거나 비어 있습니다.' },
        { status: 400 }
      );
    }

    // 1-2. 환경변수 API 키 유효성 검증
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return Response.json(
        { error: 'ElevenLabs API 키가 설정되지 않았습니다. .env.local 파일을 확인해 주세요.' },
        { status: 500 }
      );
    }

    // 2. ElevenLabs /with-timestamps API 엔드포인트 구성 및 호출
    // 텍스트 하이라이팅(싱크) 구현을 위해 일반 TTS가 아닌 /with-timestamps 엔드포인트를 사용합니다.
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${NARRATOR_VOICE_ID}/with-timestamps`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2', // 다국어를 고품질로 지원하는 모델 사용
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    });

    // 3. 외부 API 응답 예외 처리
    if (!response.ok) {
      const errorData = await response.text();
      console.error('ElevenLabs API Error Response:', errorData);
      return Response.json(
        { error: `ElevenLabs API 호출 실패: ${response.statusText}` },
        { status: response.status }
      );
    }

    // 4. ElevenLabs 응답 데이터 가공
    const data = await response.json();

    // Base64 오디오 데이터를 바이너리 Buffer로 변환
    const audioBuffer = Buffer.from(data.audio_base64, 'base64');

    // 5. Supabase 서버 클라이언트 초기화
    const supabase = await createClient();

    // 현재 사용자 정보 조회 및 인증 여부 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json(
        { error: '인증이 만료되었거나 로그인이 필요한 요청입니다.' },
        { status: 401 }
      );
    }

    // 6. Supabase Storage 업로드 (audio_files 버킷)
    // 파일명 충돌 및 특수문자 에러 방지를 위해 제목 정제 및 타임스탬프 결합
    const safeTitle = title.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const filename = `${safeTitle}-${Date.now()}.mp3`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio_files')
      .upload(filename, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase Storage Upload Error:', uploadError);
      return Response.json(
        { error: `Supabase Storage 업로드 실패: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 7. 업로드된 파일의 Public URL 획득
    const { data: { publicUrl } } = supabase.storage
      .from('audio_files')
      .getPublicUrl(filename);

    // 8. DB(tts_history 테이블)에 음성 메타데이터 저장
    const { data: dbData, error: dbError } = await supabase
      .from('tts_history')
      .insert([
        {
          user_id: user.id, // 사용자 식별자 저장
          text: text,
          title: title,
          audio_url: publicUrl,
          alignment: data.alignment,
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Supabase DB Insert Error:', dbError);
      return Response.json(
        { error: `Supabase 데이터베이스 저장 실패: ${dbError.message}` },
        { status: 500 }
      );
    }

    // 9. 저장된 DB 레코드 정보 반환
    return Response.json({
      id: dbData.id,
      text: dbData.text,
      title: dbData.title,
      audioUrl: dbData.audio_url,
      alignment: dbData.alignment,
      createdAt: dbData.created_at,
    });

  } catch (error) {
    // 5. 서버 네트워크 또는 예상치 못한 런타임 에러 처리
    console.error('TTS API Route Error:', error);
    return Response.json(
      { error: '서버 내부 에러로 인해 TTS 음성 변환을 처리할 수 없습니다.' },
      { status: 500 }
    );
  }
}
