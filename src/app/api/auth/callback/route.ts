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

    // Role assignment and profile upsert
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.email) {
      const isGuru = user.email.endsWith('@guru.smp.belajar.id') || user.email === 'dafbeatx@gmail.com'
      const role = isGuru ? 'admin' : 'user'
      
      const identityData = user.user_metadata || {}
      const fullName = identityData.full_name || user.email
      const avatarUrl = identityData.avatar_url || ''

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          avatar_url: avatarUrl,
          role: role
        }, { onConflict: 'id' })
        
      if (upsertError) {
        console.error('Error upserting profile:', upsertError.message)
      }
    }
  }

  // URL to redirect to after sign in process completes
  // Redirect to /#home so GradeMasterContext picks up the hash
  // and checkAdmin() can properly detect & route the session
  return NextResponse.redirect(`${requestUrl.origin}/#home`)
}
