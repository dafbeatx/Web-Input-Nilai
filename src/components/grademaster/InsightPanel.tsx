"use client";

import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { ClassInsight } from '@/lib/grademaster/types';

interface InsightPanelProps {
  insights: ClassInsight[];
}

export default function InsightPanel({ insights }: InsightPanelProps) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 md:mb-8">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Auto Insights</h4>
      {insights.map((insight, idx) => {
        const iconMap = {
          warning: <AlertCircle size={16} className="text-amber-500 shrink-0" />,
          success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
          info: <Info size={16} className="text-sky-500 shrink-0" />,
        };
        const bgMap = {
          warning: 'bg-amber-50 border-amber-100',
          success: 'bg-emerald-50 border-emerald-100',
          info: 'bg-sky-50 border-sky-100',
        };

        return (
          <div key={idx} className={`flex items-start gap-3 p-3 md:p-4 rounded-xl border ${bgMap[insight.type]}`}>
            {iconMap[insight.type]}
            <div>
              <h5 className="text-xs font-black text-slate-700 mb-0.5">{insight.title}</h5>
              <p className="text-[10px] md:text-xs font-bold text-on-surface-variant leading-relaxed">{insight.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
