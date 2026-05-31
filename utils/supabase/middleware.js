// utils/supabase/middleware.js
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  // 1. NextResponse.next()를 통해 기본 응답 객체를 준비합니다.
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. 서버 사이드 Supabase 클라이언트를 미들웨어 환경에 맞춰 초기화합니다.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 요청 쿠키 갱신
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          // 응답 객체 새로 빌드 및 응답 쿠키 설정
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. 만료된 로그인 세션을 새로고침하기 위해 Supabase 유저 정보를 가져옵니다.
  // 이 과정을 생략하면 쿠키 세션 리프레시가 작동하지 않아 예기치 않은 로그아웃이 발생할 수 있습니다.
  await supabase.auth.getUser()

  return supabaseResponse
}
