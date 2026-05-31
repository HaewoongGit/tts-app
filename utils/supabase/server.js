// utils/supabase/server.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  // Next.js 15/16 App Router에서는 cookies() 함수가 비동기(Promise)이므로 await가 필수적입니다.
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component 내에서 setAll이 호출되는 경우, 쿠키 세팅을 무시해도 안전합니다.
            // proxy.js에서 세션을 정상적으로 갱신하고 쿠키를 설정하기 때문입니다.
          }
        },
      },
    }
  )
}
