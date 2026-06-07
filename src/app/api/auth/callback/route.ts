import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isEmailBlacklisted } from '@/lib/grademaster/security'

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
      const email = user.email.toLowerCase();
      if (isEmailBlacklisted(email)) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${requestUrl.origin}?layer=login&error=${encodeURIComponent('Akses ditolak! Email Anda telah diblokir/blacklist dari sistem.')}`)
      }
      const adminDomains = ['@guru.smp.belajar.id', '@guru.belajar.id', '@smp.belajar.id', '@admin.belajar.id'];
      const isWhitelisted = adminDomains.some(domain => email.endsWith(domain)) || email === 'dafbeatx@gmail.com';
      
      let finalRole = 'user';
      if (isWhitelisted) {
        finalRole = 'admin';
      }
      
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
          role: finalRole,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        
      if (upsertError) {
        console.error('Error upserting profile:', upsertError.message)
      } else {
        console.log(`Profile synced for ${email} with role: ${finalRole}`);
      }
    }
  }

  // URL to redirect to after sign in process completes
  // Redirect to /#home so GradeMasterContext picks up the hash
  // and checkAdmin() can properly detect & route the session
  return NextResponse.redirect(`${requestUrl.origin}/#home`)
}
