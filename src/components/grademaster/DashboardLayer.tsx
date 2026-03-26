"use client";

import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  Plus,
  User,
  Download,
} from 'lucide-react';
import { GradedStudent, AnalyticsResult } from '@/lib/grademaster/types';
import { getCsiLabel, getLpsLabel } from '@/lib/grademaster/scoring';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import InsightPanel from './InsightPanel';
import { ShieldCheck, ThumbsUp, ThumbsDown } from 'lucide-react';

interface BehaviorRecord {
  student_name: string;
  total_points: number;
  behavior_logs: { reason: string; points: number; type: string; date: string }[];
}

interface DashboardLayerProps {
  teacherName: string;
  subject: string;
  studentClass: string;
  schoolLevel: string;
  gradedStudents: GradedStudent[];
  analytics: AnalyticsResult;
  isPublicView?: boolean;
  sessionName?: string;
  kkm: number;
  remedialEssayCount: number;
  onGradeStudent: () => void;
  onStudentRemedial?: (name: string) => void;
  onBack: () => void;
  academicYear?: string;
}

const CHART_COLORS = ['#e2e8f0', '#94a3b8', '#6366f1', '#818cf8', '#4f46e5'];
const PIE_COLORS = ['#10b981', '#f43f5e'];

export default function DashboardLayer({
  teacherName,
  subject,
  studentClass,
  schoolLevel,
  gradedStudents,
  analytics,
  isPublicView,
  sessionName,
  kkm,
  remedialEssayCount,
  onGradeStudent,
  onStudentRemedial,
  onBack,
  academicYear,
}: DashboardLayerProps) {
  const [behaviorMap, setBehaviorMap] = useState<Record<string, BehaviorRecord>>({});

  useEffect(() => {
    if (!studentClass || !isPublicView) return;
    const year = academicYear || '2025/2026';
    fetch(`/api/grademaster/behaviors?class=${encodeURIComponent(studentClass)}&year=${encodeURIComponent(year)}`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, BehaviorRecord> = {};
        (data.students || []).forEach((s: BehaviorRecord) => {
          map[s.student_name.toLowerCase()] = s;
        });
        setBehaviorMap(map);
      })
      .catch(() => {});
  }, [studentClass, academicYear, isPublicView]);

  const getBehavior = (name: string): BehaviorRecord | null => {
    return behaviorMap[name.toLowerCase()] || null;
  };

  const getBehaviorLabel = (points: number): string => {
    if (points >= 100) return 'Sangat Baik';
    if (points >= 80) return 'Baik';
    if (points >= 60) return 'Cukup';
    if (points >= 40) return 'Kurang';
    return 'Sangat Kurang';
  };

  const getBehaviorSummary = (logs: BehaviorRecord['behavior_logs']): { good: string[]; bad: string[] } => {
    const good: string[] = [];
    const bad: string[] = [];
    const seen = new Set<string>();
    for (const log of logs) {
      if (seen.has(log.reason)) continue;
      seen.add(log.reason);
      if (log.points > 0) good.push(log.reason);
      else bad.push(log.reason);
    }
    return { good: good.slice(0, 3), bad: bad.slice(0, 3) };
  };
  const handleExportXML = () => {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<Report>\n`;
    
    let xml = xmlHeader + `  <SchoolIdentity>\n`;
    xml += `    <SessionName>${sessionName || 'Sesi'}</SessionName>\n`;
    const tagMatch = (sessionName || '').match(/UTS|UAS|USBN|UN|PAT|PAS/i);
    const tag = tagMatch ? tagMatch[0].toUpperCase() : 'UJIAN';
    xml += `    <Tag>${tag}</Tag>\n`;
    xml += `    <SchoolLevel>${schoolLevel}</SchoolLevel>\n`;
    xml += `    <Teacher>${teacherName}</Teacher>\n`;
    xml += `    <Subject>${subject}</Subject>\n`;
    xml += `    <Class>${studentClass}</Class>\n`;
    xml += `  </SchoolIdentity>\n`;

    xml += `  <Statistics>\n`;
    xml += `    <Mean>${analytics.avgScore}</Mean>\n`;
    xml += `    <Median>${analytics.median}</Median>\n`;
    xml += `    <Max>${analytics.highestScore}</Max>\n`;
    xml += `    <Min>${analytics.lowestScore}</Min>\n`;
    xml += `  </Statistics>\n`;

    xml += `  <Students>\n`;
    gradedStudents.forEach(s => {
      xml += `    <Student>\n`;
      xml += `      <Name>${s.name}</Name>\n`;
      xml += `      <Score>${s.finalScore}</Score>\n`;
      xml += `    </Student>\n`;
    });
    xml += `  </Students>\n`;

    xml += `  <DistributionGraph>\n`;
    analytics.distribution.forEach(d => {
      xml += `    <Range name="${d.range}" count="${d.count}" />\n`;
    });
    xml += `  </DistributionGraph>\n`;
    
    xml += `</Report>`;

    const blob = new Blob([xml], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Nilai_${tag}_${studentClass}_${subject.replace(/\\s+/g, '_')}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-6xl mx-auto animate-in">
      <header className="mb-8 md:mb-10 text-center">
        <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1 md:px-4 md:py-1.5 bg-indigo-100 text-indigo-600 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-3 md:mb-4 border border-indigo-200">
          <LayoutGrid size={12} className="md:w-3.5 md:h-3.5" /> Dashboard Analitik
        </div>
        <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight font-outfit mb-2 md:mb-3">Ikhtisar Kelas</h1>
        <p className="text-xs md:text-sm text-slate-500 font-bold">Halo, {teacherName} • {subject} • Kelas {studentClass} ({schoolLevel})</p>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <StatCard label="Rata-rata" value={analytics.avgScore} suffix="%" color="indigo" />
        <StatCard label={isPublicView ? "Rata Rata Pemahaman" : "CSI Avg"} value={analytics.avgCsi} suffix="" sublabel={isPublicView ? "" : getCsiLabel(analytics.avgCsi)} color="sky" />
        <StatCard label={isPublicView ? "Performa Belajar" : "LPS Avg"} value={analytics.avgLps} suffix="" sublabel={isPublicView ? "" : getLpsLabel(analytics.avgLps)} color="purple" />
        <StatCard label={isPublicView ? "Varietas Penguasaan" : "Std Deviasi"} value={analytics.standardDeviation} suffix="" color="slate" />
      </div>

      {/* Charts Row */}
      {gradedStudents.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Distribution Histogram */}
          <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Distribusi Nilai</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.distribution}>
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Bar dataKey="count" name="Siswa" radius={[6, 6, 0, 0]}>
                  {analytics.distribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart: Correct vs Wrong */}
          <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Rasio Benar / Salah (Total)</h4>
            <div className="flex items-center justify-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Benar', value: analytics.correctVsWrong.correct },
                      { name: 'Salah', value: analytics.correctVsWrong.wrong },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={35} outerRadius={60}
                    paddingAngle={3} dataKey="value"
                  >
                    {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-600">Benar: {analytics.correctVsWrong.correct}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-slate-600">Salah: {analytics.correctVsWrong.wrong}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <InsightPanel insights={analytics.insights} />
      )}

      {/* Ranking Table */}
      <div className="mt-4 md:mt-6 bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h3 className="text-base md:text-lg font-black text-slate-800 font-outfit">Ranking Siswa</h3>
            <p className="text-[10px] md:text-xs font-bold text-slate-400">
              {gradedStudents.length} siswa • Rata-rata: {analytics.avgScore}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportXML}
              className="px-3 md:px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 md:gap-2"
            >
              <Download size={12} className="md:w-3.5 md:h-3.5" /> Export XML
            </button>
            {!isPublicView && (
              <button
                onClick={onGradeStudent}
                className="px-3 md:px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 md:gap-2"
              >
                <Plus size={12} className="md:w-3.5 md:h-3.5" /> Koreksi Siswa
              </button>
            )}
          </div>
        </div>

        {gradedStudents.length === 0 ? (
          <div className="text-center py-6 md:py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <User size={24} className="mx-auto text-slate-300 mb-2 md:mb-3" />
            <p className="text-slate-500 font-bold text-xs md:text-sm">Belum ada nilai tersimpan.</p>
            {!isPublicView && (
              <p className="text-slate-400 text-[10px] md:text-xs mt-1">Klik &quot;Koreksi Siswa&quot; untuk memulai evaluasi.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">#</th>
                  <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Siswa</th>
                  <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Nilai Akhir</th>
                  <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{isPublicView ? "Keterangan" : "CSI"}</th>
                  {!isPublicView && <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">LPS</th>}
                </tr>
              </thead>
              <tbody>
                {analytics.ranking.map(r => (
                  <tr key={r.rank} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${r.finalScore < kkm ? 'bg-rose-50/30' : ''}`}>
                    <td className="py-3 text-xs font-black text-slate-400">{r.rank}</td>
                    <td className="py-3 text-xs font-bold text-slate-700">{r.name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-black ${r.finalScore >= kkm ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {r.finalScore}
                      </span>
                    </td>
                    <td className="py-3 text-xs font-bold text-sky-600">
                      {isPublicView ? (
                        r.finalScore < kkm ? (
                          <button onClick={() => onStudentRemedial?.(r.name)} className="px-3 py-1 text-[10px] bg-rose-500 text-white rounded shadow-sm font-black uppercase tracking-wider hover:bg-rose-600 transition-colors active:scale-95">Remedial</button>
                        ) : (
                          <span className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">Tuntas</span>
                        )
                      ) : (r.csi)}
                    </td>
                    {!isPublicView && (
                      <td className="py-3 text-xs font-bold text-purple-600">
                        {gradedStudents.find(s => s.name === r.name)?.lps ?? '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Behavior Section (Public View Only) */}
      {isPublicView && Object.keys(behaviorMap).length > 0 && (
        <div className="mt-4 md:mt-6 bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <ShieldCheck size={18} className="text-indigo-600" />
            <h3 className="text-base md:text-lg font-black text-slate-800 font-outfit">Rapor Perilaku Siswa</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {analytics.ranking.map(r => {
              const b = getBehavior(r.name);
              if (!b) return null;
              const summary = getBehaviorSummary(b.behavior_logs || []);
              const label = getBehaviorLabel(b.total_points);
              return (
                <div key={r.name} className="border border-slate-100 rounded-2xl p-4 md:p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-sm text-slate-700 truncate mr-4">{r.name}</h4>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        b.total_points >= 100 ? 'bg-emerald-50 text-emerald-600' :
                        b.total_points >= 60 ? 'bg-amber-50 text-amber-600' :
                        'bg-rose-50 text-rose-600'
                      }`}>{b.total_points} Poin</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        b.total_points >= 80 ? 'text-emerald-500' :
                        b.total_points >= 60 ? 'text-amber-500' :
                        'text-rose-500'
                      }`}>{label}</span>
                    </div>
                  </div>

                  {(summary.good.length > 0 || summary.bad.length > 0) && (
                    <div className="space-y-2">
                      {summary.good.length > 0 && (
                        <div className="flex items-start gap-2">
                          <ThumbsUp size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-emerald-700 font-bold leading-relaxed">{summary.good.join(', ')}</p>
                        </div>
                      )}
                      {summary.bad.length > 0 && (
                        <div className="flex items-start gap-2">
                          <ThumbsDown size={12} className="text-rose-500 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-rose-700 font-bold leading-relaxed">{summary.bad.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {summary.good.length === 0 && summary.bad.length === 0 && (
                    <p className="text-[11px] text-slate-400 font-bold">Belum ada catatan perilaku.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Question Difficulty */}
      {analytics.questionDifficulties.length > 0 && (
        <div className="mt-4 md:mt-6 bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Tingkat Kesulitan Soal</h4>
          <ResponsiveContainer width="100%" height={Math.max(150, analytics.questionDifficulties.length * 8)}>
            <BarChart data={analytics.questionDifficulties} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis dataKey="questionNumber" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={30} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12 }}
                formatter={(value: unknown) => [`${value}% salah`, 'Kesulitan']}
              />
              <Bar dataKey="difficultyPercent" name="% Salah" radius={[0, 6, 6, 0]}>
                {analytics.questionDifficulties.map((d, i) => (
                  <Cell key={i} fill={d.difficultyPercent >= 75 ? '#f43f5e' : d.difficultyPercent >= 50 ? '#f59e0b' : d.difficultyPercent <= 15 ? '#10b981' : '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button onClick={onBack} className="py-3 px-6 text-slate-400 font-bold hover:text-indigo-600 transition-colors uppercase tracking-widest text-xs flex items-center gap-2">
          <ArrowLeft size={14} /> Kembali
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix, sublabel, color }: { label: string; value: number; suffix: string; sublabel?: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    sky: 'bg-sky-50 text-sky-600',
    purple: 'bg-purple-50 text-purple-600',
    slate: 'bg-slate-50 text-slate-600',
  };

  return (
    <div className={`${colorMap[color] || colorMap.slate} rounded-2xl p-4 md:p-5 text-center`}>
      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
      <p className="text-2xl md:text-3xl font-black">{value}{suffix}</p>
      {sublabel && <p className="text-[9px] md:text-[10px] font-bold opacity-60 mt-1">{sublabel}</p>}
    </div>
  );
}
