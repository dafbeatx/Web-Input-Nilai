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
      const email = user.email.toLowerCase();
      const adminDomains = ['@guru.smp.belajar.id', '@guru.belajar.id', '@smp.belajar.id', '@admin.belajar.id'];
      const isWhitelisted = adminDomains.some(domain => email.endsWith(domain)) || email === 'dafbeatx@gmail.com';
      
      // Get existing profile to avoid overwriting a manually set admin role
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Priority: 
      // 1. If existing profile is 'admin', keep it 'admin'.
      // 2. If email is whitelisted, make 'admin'.
      // 3. Otherwise 'user'.
      let finalRole = 'user';
      if (existingProfile?.role === 'admin') {
        finalRole = 'admin';
      } else if (isWhitelisted) {
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
