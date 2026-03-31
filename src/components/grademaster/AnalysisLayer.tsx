"use client";

import React from 'react';
import {
  GradedStudent,
  AnalyticsResult,
  Layer
} from '@/lib/grademaster/types';

interface AnalysisLayerProps {
  teacherName: string;
  subject: string;
  studentClass: string;
  analytics: AnalyticsResult;
  gradedStudents: GradedStudent[];
  activeLayer: Layer;
  onNavigate: (layer: Layer) => void;
}

export default function AnalysisLayer({
  teacherName,
  subject,
  studentClass,
  analytics,
  gradedStudents,
  activeLayer,
  onNavigate
}: AnalysisLayerProps) {
  
  // Mapping categories to distribution colors
  const getDistColor = (range: string) => {
    if (range.includes('Sangat Baik')) return 'bg-emerald-500';
    if (range.includes('Baik')) return 'bg-blue-500';
    if (range.includes('Cukup')) return 'bg-amber-500';
    return 'bg-rose-600';
  };

  // 8-column heatmap logic
  const heatmapQuestions = analytics.questionDifficulties.slice(0, 40);

  return (
    <div className="bg-slate-950 font-body text-analysis-on-surface antialiased min-h-screen pb-32 selection:bg-primary/30">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center px-6 py-4 w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>grid_view</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tighter font-headline">Analisis Nilai</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-analysis-on-surface-variant">Administrator</p>
                <p className="text-xs font-bold text-white">{teacherName}</p>
             </div>
             <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 hover:scale-105 transition-transform duration-200">
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-black uppercase">
                   {teacherName.charAt(0)}
                </div>
             </div>
          </div>
        </div>
      </header>

      <main className="pt-24 px-5 space-y-8 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* KPI Cards Section */}
        <section className="grid grid-cols-1 gap-4">
          {/* Rata-rata Kelas */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 relative overflow-hidden group active:scale-95 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-analysis-on-surface-variant text-[10px] font-black uppercase tracking-widest">Rata-rata Kelas</span>
              <span className="text-emerald-400 text-xs font-bold">Aktif</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black font-headline tracking-tighter">{analytics.avgScore}</span>
              <div className="flex-1 h-12 flex items-end gap-1 pb-1">
                {[0.2, 0.4, 0.6, 1.0].map((opacity, i) => (
                  <div 
                    key={i} 
                    className={`w-full bg-primary rounded-t-sm transition-all duration-1000`} 
                    style={{ 
                      height: `${(i + 1) * 20}%`, 
                      opacity,
                      boxShadow: i === 3 ? '0 0 15px rgba(46, 91, 255, 0.3)' : 'none'
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* CSI Index */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <span className="text-analysis-on-surface-variant text-[10px] font-black uppercase tracking-widest block mb-1">Indeks Konsistensi (CSI)</span>
              <span className="text-2xl font-black font-headline">{analytics.avgCsi}</span>
              <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full ml-2 font-bold uppercase tracking-wider">Stabil</span>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle className="stroke-white/5" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                <circle 
                  className="stroke-primary" 
                  cx="18" cy="18" fill="none" r="16" strokeWidth="3"
                  strokeDasharray={`${analytics.avgCsi}, 100`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1.5s ease-out' }}
                ></circle>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-sm">analytics</span>
              </div>
            </div>
          </div>

          {/* LPS Index */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5">
            <span className="text-analysis-on-surface-variant text-[10px] font-black uppercase tracking-widest block mb-1">Performa Belajar (LPS)</span>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black font-headline">{analytics.avgLps}%</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full shadow-[0_0_10px_rgba(46,91,255,0.5)] transition-all duration-1000" 
                  style={{ width: `${analytics.avgLps}%` }}
                ></div>
              </div>
            </div>
            <p className="text-[10px] text-analysis-on-surface-variant mt-2 italic font-bold">Dihitung otomatis berdasarkan akurasi & waktu pengerjaan.</p>
          </div>
        </section>

        {/* Score Distribution Bar Chart */}
        <section>
          <h2 className="text-lg font-black font-headline mb-4 px-1 tracking-tight">Distribusi Skor</h2>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-5">
            {analytics.distribution.map((item, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                  <span className="text-analysis-on-surface-variant">{item.range}</span>
                  <span className="text-white">{item.count} Siswa</span>
                </div>
                <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getDistColor(item.range)} rounded-full transition-all duration-1000`} 
                    style={{ width: `${(item.count / Math.max(...analytics.distribution.map(d => d.count), 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Question Difficulty Heatmap */}
        <section>
          <div className="flex justify-between items-end mb-4 px-1">
            <h2 className="text-lg font-black font-headline leading-tight tracking-tight">Peta Kesulitan<br/><span className="text-[10px] font-black uppercase tracking-widest text-analysis-on-surface-variant">Grid Soal 1-40</span></h2>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10"></div>
              <div className="w-3 h-3 rounded-sm bg-primary/30"></div>
              <div className="w-3 h-3 rounded-sm bg-primary/60"></div>
              <div className="w-3 h-3 rounded-sm bg-primary"></div>
            </div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4">
            <div className="grid grid-cols-8 gap-2">
              {heatmapQuestions.map((q, i) => {
                let intensity = 'bg-white/5';
                if (q.difficultyPercent >= 75) intensity = 'bg-primary ring-1 ring-white/20 shadow-lg shadow-primary/20';
                else if (q.difficultyPercent >= 50) intensity = 'bg-primary/80';
                else if (q.difficultyPercent >= 25) intensity = 'bg-primary/40';
                else if (q.difficultyPercent > 0) intensity = 'bg-primary/20';
                
                return (
                  <div 
                    key={i} 
                    className={`aspect-square rounded-lg ${intensity} flex items-center justify-center text-[8px] font-black tracking-tight ${q.difficultyPercent >= 25 ? 'text-white' : 'text-analysis-on-surface-variant'}`}
                    title={`Soal ${q.questionNumber}: ${q.difficultyPercent}% Salah`}
                  >
                    {q.questionNumber}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-between text-[10px] text-analysis-on-surface-variant font-black uppercase tracking-widest">
              <span>Mudah</span>
              <span>Sangat Sulit</span>
            </div>
          </div>
        </section>

        {/* AI Auto-Insights */}
        <section>
          <h2 className="text-lg font-black font-headline mb-4 px-1 flex items-center gap-2 tracking-tight">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            AI Auto-Insights
          </h2>
          <div className="space-y-3">
            {analytics.insights.length > 0 ? (
              analytics.insights.map((insight, idx) => {
                const border = insight.type === 'warning' ? 'border-l-amber-500' : insight.type === 'success' ? 'border-l-emerald-500' : 'border-l-primary';
                const icon = insight.type === 'warning' ? 'warning' : insight.type === 'success' ? 'check_circle' : 'info';
                const iconColor = insight.type === 'warning' ? 'text-amber-500' : insight.type === 'success' ? 'text-emerald-500' : 'text-primary';

                return (
                  <div key={idx} className={`bg-slate-900/40 backdrop-blur-xl border border-white/10 border-l-4 ${border} p-4 rounded-2xl flex gap-3 items-start animate-in slide-in-from-left duration-500`} style={{ animationDelay: `${idx * 150}ms` }}>
                    <span className={`material-symbols-outlined ${iconColor} text-xl mt-0.5`}>{icon}</span>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest mb-1">{insight.title}</h4>
                      <p className="text-[11px] text-analysis-on-surface-variant leading-relaxed font-medium">{insight.description}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-analysis-on-surface-variant">Belum ada insight yang terdeteksi</p>
              </div>
            )}
          </div>
        </section>

        {/* Student Ranking Table */}
        <section className="pb-10">
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-lg font-black font-headline tracking-tight">Peringkat Siswa</h2>
            <button className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
              Lihat Statistik
              <span className="material-symbols-outlined text-xs">chevron_right</span>
            </button>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="p-4 text-[9px] font-black text-analysis-on-surface-variant uppercase tracking-widest">Siswa</th>
                    <th className="p-4 text-[9px] font-black text-analysis-on-surface-variant uppercase tracking-widest">Skor</th>
                    <th className="p-4 text-[9px] font-black text-analysis-on-surface-variant uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {analytics.ranking.slice(0, 10).map((r, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${i === 0 ? 'bg-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/10' : 'bg-primary/20 text-primary'}`}>
                             {r.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-white group-hover:text-primary transition-colors">{r.name}</p>
                            <p className="text-[9px] font-bold text-analysis-on-surface-variant uppercase tracking-widest">CSI: {r.csi}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-xs font-black">{r.finalScore} <span className="text-[9px] font-black text-analysis-on-surface-variant">/ 100</span></p>
                        <div className="flex gap-1 mt-1.5 h-1 w-16 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${r.finalScore >= 75 ? 'bg-emerald-500' : r.finalScore >= 60 ? 'bg-amber-500' : 'bg-rose-600'}`} 
                            style={{ width: `${r.finalScore}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                          r.finalScore >= 75 ? 'bg-emerald-500/10 text-emerald-500' : 
                          r.finalScore >= 60 ? 'bg-amber-500/10 text-amber-500' : 
                          'bg-rose-500/10 text-rose-500'
                        }`}>
                          {r.finalScore >= 75 ? 'Tuntas' : 'Remedial'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center p-3 pb-8 bg-slate-950/90 backdrop-blur-2xl rounded-t-3xl border-t border-white/5 z-50">
        <button 
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center transition-all rounded-xl active:scale-90 px-4 py-1.5 ${activeLayer === 'home' ? 'text-primary bg-primary/10' : 'text-analysis-on-surface-variant hover:text-white'}`}
        >
          <span className="material-symbols-outlined mb-1">home</span>
          <span className="text-[9px] font-black uppercase tracking-widest">Beranda</span>
        </button>
        <button 
          onClick={() => onNavigate('analysis')}
          className={`flex flex-col items-center justify-center transition-all rounded-xl active:scale-90 px-4 py-1.5 ${activeLayer === 'analysis' ? 'text-primary bg-primary/10' : 'text-analysis-on-surface-variant hover:text-white'}`}
        >
          <span className="material-symbols-outlined mb-1">analytics</span>
          <span className="text-[9px] font-black uppercase tracking-widest">Analisis</span>
        </button>
        <button 
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center transition-all rounded-xl active:scale-90 px-4 py-1.5 ${activeLayer === 'dashboard' ? 'text-primary bg-primary/10' : 'text-analysis-on-surface-variant hover:text-white'}`}
        >
          <span className="material-symbols-outlined mb-1">description</span>
          <span className="text-[9px] font-black uppercase tracking-widest">Laporan</span>
        </button>
      </nav>

      <style jsx global>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>
    </div>
  );
}
