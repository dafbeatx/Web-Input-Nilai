"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentClaimRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect the browser to the root SPA with the student_claim hash
    router.replace('/#student_claim');
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
