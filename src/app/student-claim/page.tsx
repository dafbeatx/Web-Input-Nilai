"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentClaimRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function smartRedirect() {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      
      // If the user is the super admin, bypass student_claim and go home
      if (user?.email === 'dafbeatx@gmail.com') {
        router.replace('/#home');
      } else {
        router.replace('/#student_claim');
      }
    }
    smartRedirect();
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center font-outfit">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin mb-4" />
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
        Menghubungkan Portal...
      </p>
    </div>
  );
}
