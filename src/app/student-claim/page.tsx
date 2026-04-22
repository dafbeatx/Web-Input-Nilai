"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentClaimRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function smartRedirect() {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      
      const email = user?.email?.toLowerCase() || '';
      const adminDomains = ['@guru.smp.belajar.id', '@guru.belajar.id', '@smp.belajar.id', '@admin.belajar.id'];
      const isAdmin = adminDomains.some(domain => email.endsWith(domain)) || email === 'dafbeatx@gmail.com';

      // If the user is an admin/teacher, bypass student_claim and go home
      if (isAdmin) {
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
