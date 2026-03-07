"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  ArrowLeft, 
  Play, 
  Pause,
  CloudOff
} from "lucide-react";

const QURAN_API_BASE = 'https://api.quran.gading.dev';

export default function Quran() {
  const [surahs, setSurahs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSurah, setSelectedSurah] = useState<any | null>(null);
  const [selectedSurahDetail, setSelectedSurahDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchSurahs();
  }, []);

  const fetchSurahs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${QURAN_API_BASE}/surah`);
      const result = await response.json();
      if (result.code === 200) {
        setSurahs(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSurahDetail = async (number: number) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`${QURAN_API_BASE}/surah/${number}`);
      const result = await response.json();
      if (result.code === 200) {
        setSelectedSurahDetail(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSurahClick = (surah: any) => {
    setSelectedSurah(surah);
    fetchSurahDetail(surah.number);
  };

  const handleBack = () => {
    setSelectedSurah(null);
    setSelectedSurahDetail(null);
    if (audioRef.current) {
        audioRef.current.pause();
        setPlayingAudio(null);
    }
  };

  const toggleAudio = (url: string) => {
    if (playingAudio === url) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingAudio(url);
      }
    }
  };

  const filteredSurahs = surahs.filter(s => 
    s.name.transliteration.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.number.toString() === searchQuery
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p className="font-bold uppercase tracking-widest text-[10px]">Memuat Al-Qur'an...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-rose-500 p-6 text-center">
        <CloudOff size={48} className="mb-4 opacity-20" />
        <p className="font-bold mb-4">Gagal menghubungkan ke server Al-Qur'an</p>
        <button onClick={fetchSurahs} className="px-6 py-2 bg-rose-100 rounded-xl text-xs font-black uppercase tracking-widest">Coba Lagi</button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-in">
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingAudio(null)}
        className="hidden"
      />

      {!selectedSurah ? (
        <>
          <header className="mb-8">
            <h2 className="text-3xl font-black text-slate-800 mb-6 font-outfit">Al-Qur'an Indonesia</h2>
            <div className="relative group">
              <input 
                type="text" 
                placeholder="Cari surah atau nomor..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-[2rem] py-5 pl-14 pr-8 text-sm font-bold text-slate-700 shadow-xl shadow-slate-200/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-300"
              />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSurahs.map((surah) => (
              <div 
                key={surah.number} 
                onClick={() => handleSurahClick(surah)}
                className="group p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    {surah.number}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{surah.name.transliteration.id}</h4>
                    <p className="text-xs text-slate-400 font-medium">{surah.name.translation.id} • {surah.numberOfVerses} Ayat</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-arabic text-xl text-emerald-700">{surah.name.short}</div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">{surah.revelation.id}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="animate-in">
          <button 
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 text-slate-400 hover:text-emerald-600 font-bold text-xs uppercase tracking-widest transition-colors"
          >
            <ArrowLeft size={16} /> Kembali ke Daftar
          </button>

          {detailLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
               <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
               <p className="font-medium text-sm">Memuat ayat-ayat...</p>
            </div>
          ) : selectedSurahDetail && (
            <>
              <div className="bg-emerald-600 rounded-3xl p-8 text-white mb-8 relative overflow-hidden shadow-xl shadow-emerald-900/10 text-center">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <h2 className="text-3xl font-bold mb-1">{selectedSurahDetail.name.transliteration.id}</h2>
                <p className="text-emerald-100 text-sm font-medium mb-4">{selectedSurahDetail.name.translation.id} • {selectedSurahDetail.numberOfVerses} Ayat</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-full text-xs font-bold ring-1 ring-white/20">
                    <span className="uppercase tracking-widest">{selectedSurahDetail.revelation.id}</span>
                </div>
              </div>

              {selectedSurahDetail.preBismillah && (
                <div className="text-center mb-10 py-6">
                  <div className="font-arabic text-3xl text-slate-800">{selectedSurahDetail.preBismillah.text.arab}</div>
                </div>
              )}

              <div className="space-y-6 pb-10">
                {selectedSurahDetail.verses.map((verse: any) => (
                  <div key={verse.number.inSurah} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center text-xs font-bold border border-slate-100">
                        {verse.number.inSurah}
                      </div>
                      <button 
                        onClick={() => toggleAudio(verse.audio.primary)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${playingAudio === verse.audio.primary ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                      >
                        {playingAudio === verse.audio.primary ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                    </div>
                    <div className="text-right font-arabic text-3xl leading-[2.5] text-slate-800 mb-6" dir="rtl">
                      {verse.text.arab}
                    </div>
                    <div className="text-emerald-600 font-medium text-sm mb-2 italic">
                      {verse.text.transliteration.en}
                    </div>
                    <div className="text-slate-600 text-sm leading-relaxed">
                      {verse.translation.id}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
