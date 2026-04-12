import React from 'react';
import BottomNav from '@/components/grademaster/behavior/BottomNav';

export default function BehaviorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-slate-950 relative">
      <main className="flex-1 pb-24 md:pb-32 custom-scrollbar scroll-smooth">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
