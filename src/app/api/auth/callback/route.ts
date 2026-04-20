import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error.message)
      // Redirect to login with error
      return NextResponse.redirect(`${requestUrl.origin}?layer=login&error=${encodeURIComponent(error.message)}`)
    }
  }

  // URL to redirect to after sign in process completes
  // Redirect to /#home so GradeMasterContext picks up the hash
  // and checkAdmin() can properly detect & route the session
  return NextResponse.redirect(`${requestUrl.origin}/#home`)
}
