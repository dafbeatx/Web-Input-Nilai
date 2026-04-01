import React from 'react';
import BottomNav from '@/components/grademaster/behavior/BottomNav';

export default function BehaviorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh flex flex-col bg-slate-950 overflow-hidden relative">
      <main className="flex-1 overflow-y-auto pb-24 md:pb-32 custom-scrollbar scroll-smooth">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
