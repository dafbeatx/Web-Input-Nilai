"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  ArrowLeft, 
  Book, 
  ChevronRight, 
  ChevronLeft,
  Layout,
  RefreshCw,
  Image as ImageIcon,
  Flame,
  Star,
  Globe,
  ExternalLink,
  AlertCircle
} from "lucide-react";

interface MangaItem {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  status: string;
  year: number | string;
}

interface ChapterItem {
  id: string;
  chapter: string;
  title: string;
  volume: string;
  publishedAt: string;
  externalUrl?: string;
  pages: number;
}

interface ChapterImage {
  url: string;
}

export default function ComicReader() {
  const [view, setView] = useState<'list' | 'detail' | 'reader'>('list');
  const [mangas, setMangas] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedManga, setSelectedManga] = useState<MangaItem | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<ChapterItem | null>(null);
  const [chapterImages, setChapterImages] = useState<string[]>([]);
  const [readerLoading, setReaderLoading] = useState(false);
  const [currentMangaTitle, setCurrentMangaTitle] = useState("");

  useEffect(() => {
    fetchMangaList();
  }, []);

  const fetchMangaList = async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch latest updated manga with Indonesian translation
      let path = `manga?limit=30&availableTranslatedLanguage[]=id&includes[]=cover_art`;
      if (query) {
        path += `&title=${encodeURIComponent(query)}`;
      } else {
        path += `&order[followedCount]=desc`; // Popular
      }
      
      const response = await fetch(`/api/manga?path=${encodeURIComponent(path)}`);
      const result = await response.json();
      
      if (result.result === 'ok') {
        const formattedMangas = result.data.map((m: any) => {
          const title = m.attributes.title.en || m.attributes.title['ja-ro'] || Object.values(m.attributes.title)[0] || 'Unknown Title';
          const desc = m.attributes.description.en || m.attributes.description.id || '';
          
          let coverFileName = '';
          const coverRel = m.relationships.find((r: any) => r.type === 'cover_art');
          if (coverRel && coverRel.attributes) {
            coverFileName = coverRel.attributes.fileName;
          }
          const coverUrl = coverFileName ? `https://uploads.mangadex.org/covers/${m.id}/${coverFileName}.256.jpg` : '';

          return {
            id: m.id,
            title,
            description: desc,
            coverUrl,
            status: m.attributes.status,
            year: m.attributes.year || 'N/A'
          };
        });
        setMangas(formattedMangas);
      } else {
        throw new Error(result.message || "Gagal mengambil data manga");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMangaList(searchQuery);
  };

  const openDetail = async (manga: MangaItem) => {
    setView('detail');
    setSelectedManga(manga);
    setLoading(true);
    setCurrentMangaTitle(manga.title);
    try {
      // Fetch chapters in Indonesian
      const path = `manga/${manga.id}/feed?limit=100&translatedLanguage[]=id&order[chapter]=desc&order[volume]=desc`;
      const response = await fetch(`/api/manga?path=${encodeURIComponent(path)}`);
      const result = await response.json();
      
      if (result.result === 'ok') {
         const formattedChapters = result.data.map((c: any) => ({
             id: c.id,
             chapter: c.attributes.chapter || 'Oneshot',
             title: c.attributes.title || '',
             volume: c.attributes.volume || '',
             publishedAt: new Date(c.attributes.publishAt).toLocaleDateString(),
             externalUrl: c.attributes.externalUrl,
             pages: c.attributes.pages || 0
         }));
         setChapters(formattedChapters);
      }
    } catch (err) {
      setError("Gagal memuat detail chapter");
    } finally {
      setLoading(false);
    }
  };

  const openChapter = async (chapter: ChapterItem) => {
    if (chapter.externalUrl) {
        window.open(chapter.externalUrl, '_blank');
        return;
    }

    setView('reader');
    setSelectedChapter(chapter);
    setReaderLoading(true);
    setChapterImages([]);
    
    try {
      // 1. Get AtHome Server for chapter
      const path = `at-home/server/${chapter.id}`;
      const response = await fetch(`/api/manga?path=${encodeURIComponent(path)}`);
      const result = await response.json();
      
      if (result.result === 'ok') {
          const baseUrl = result.baseUrl;
          const hash = result.chapter.hash;
          const images = result.chapter.data.map((filename: string) => `${baseUrl}/data/${hash}/${filename}`);
          setChapterImages(images);
      } else {
          throw new Error("Gagal mengambil gambar chapter dari server at-home");
      }
    } catch (err) {
      console.error(err);
      setError("Gagal memuat gambar chapter");
    } finally {
      setReaderLoading(false);
    }
  };

  const goBack = () => {
    if (view === 'reader') setView('detail');
    else if (view === 'detail') setView('list');
  };

  if (view === 'list') {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-in">
        <header className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-orange-200 shadow-sm">
                <Globe size={12} /> Powered by MangaDex
            </div>
          <h2 className="text-4xl font-black text-slate-800 mb-6 font-outfit tracking-tight">Baca Komik Online</h2>
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group">
            <input 
              type="text" 
              placeholder="Cari judul komik (One Piece, Solo Leveling...)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 rounded-[2rem] py-5 pl-14 pr-8 text-sm font-bold text-slate-700 shadow-xl shadow-slate-200/50 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-slate-300"
            />
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-6 py-2.5 rounded-full text-xs font-bold hover:bg-orange-600 transition-colors">Cari</button>
          </form>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4"></div>
            <p className="font-bold uppercase tracking-widest text-[10px]">Menembus Gerbang Komik...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-rose-500">
            <AlertCircle size={48} className="mb-4 opacity-20" />
            <p className="font-bold mb-4">{error}</p>
            <button onClick={() => fetchMangaList()} className="px-6 py-2 bg-rose-100 rounded-xl text-xs font-black uppercase tracking-widest">Coba Lagi</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {mangas.map((manga, idx) => (
              <div 
                key={idx} 
                onClick={() => openDetail(manga)}
                className="group relative bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:border-orange-500 transition-all cursor-pointer flex flex-col"
              >
                <div className="aspect-[3/4] overflow-hidden relative bg-slate-100 flex items-center justify-center">
                  {manga.coverUrl ? (
                      <img 
                        src={manga.coverUrl} 
                        alt={manga.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                  ) : (
                      <Book size={48} className="text-slate-300 opacity-50" />
                  )}
                  <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                    {manga.status}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                     <span className="text-white text-xs font-bold shadow-sm">Baca Sekarang</span>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h4 className="font-bold text-slate-800 text-sm line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors" title={manga.title}>{manga.title}</h4>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold">{manga.year}</span>
                    <Star size={12} className="text-yellow-400" fill="currentColor" />
                  </div>
                </div>
              </div>
            ))}
            {mangas.length === 0 && !loading && (
                 <div className="col-span-full py-20 text-center text-slate-400">
                     <Book size={48} className="mx-auto mb-4 opacity-20" />
                     <p className="font-bold">Komik tidak ditemukan.</p>
                 </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (view === 'detail' && selectedManga) {
    return (
      <div className="animate-in pb-20">
        <div className="relative h-64 md:h-80 w-full overflow-hidden bg-slate-900 border-b border-white/10">
            {selectedManga.coverUrl && (
                <img src={selectedManga.coverUrl} alt="blur" className="w-full h-full object-cover blur-3xl opacity-40 scale-125 saturate-200" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/40 to-slate-50"></div>
            <button 
                onClick={goBack}
                className="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full text-slate-800 font-bold text-xs shadow-lg hover:bg-orange-600 hover:text-white transition-all ring-1 ring-black/5"
            >
                <ArrowLeft size={16} /> Kembali
            </button>
        </div>

        <div className="max-w-5xl mx-auto px-6 -mt-32 relative z-10">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="w-48 md:w-64 shrink-0 mx-auto md:mx-0">
                    <div className="aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
                        {selectedManga.coverUrl ? (
                            <img src={selectedManga.coverUrl} alt={selectedManga.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center"><Book size={64} className="text-slate-300" /></div>
                        )}
                    </div>
                </div>
                <div className="flex-1 pt-4 text-center md:text-left">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 font-outfit tracking-tight leading-tight">{selectedManga.title}</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <DetailStat label="Status" value={selectedManga.status} />
                        <DetailStat label="Year" value={selectedManga.year.toString()} />
                        <DetailStat label="Source" value="MangaDex" />
                        <DetailStat label="Chapters" value={chapters.length.toString()} />
                    </div>
                </div>
            </div>

            <div className="mt-12 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 blur-3xl mix-blend-multiply"></div>
                <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-3 relative z-10">
                    <Layout size={20} className="text-orange-500" /> Sinopsis
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm md:text-base whitespace-pre-line relative z-10">{selectedManga.description || 'Tidak ada sinopsis tersedia.'}</p>
            </div>

            <div className="mt-12">
                <h3 className="text-xl font-black text-slate-800 mb-6 px-4 flex items-center gap-3">
                    <Book size={20} className="text-orange-500" /> Daftar Chapter (Indonesia)
                </h3>
                
                {loading ? (
                     <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-orange-500" /></div>
                ) : chapters.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-20">
                        {chapters.map((ch, i) => (
                            <div 
                                key={i} 
                                onClick={() => openChapter(ch)}
                                className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-orange-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                            >
                                <div>
                                    <span className="font-bold text-slate-700 group-hover:text-orange-600 transition-colors uppercase tracking-tight text-sm flex items-center gap-2">
                                        Ch. {ch.chapter} {ch.title && <span className="hidden md:inline text-slate-400 capitalize truncate max-w-[150px]">- {ch.title}</span>}
                                        {ch.externalUrl && <span className="px-2 py-0.5 bg-sky-100 text-sky-600 rounded text-[8px] font-black uppercase tracking-widest ml-2 flex items-center gap-1"><ExternalLink size={10} /> Official</span>}
                                    </span>
                                    {ch.volume && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Vol. {ch.volume}</p>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-400">{ch.publishedAt}</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-orange-500 group-hover:text-white transition-all">
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                        <AlertCircle className="mx-auto mb-4 text-slate-300" size={48} />
                        <p className="text-slate-500 font-bold">Belum ada chapter terjemahan bahasa Indonesia.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    );
  }

  if (view === 'reader' && selectedChapter) {
    return (
      <div className="bg-slate-950 min-h-screen animate-in flex flex-col text-slate-200">
        <header className="fixed top-14 inset-x-0 h-16 bg-black/80 backdrop-blur-xl z-[70] flex items-center justify-between px-6 border-b border-white/5 shadow-2xl">
            <button 
                onClick={goBack}
                className="flex items-center gap-2 text-white/70 hover:text-orange-500 font-bold text-xs uppercase tracking-widest transition-all bg-white/5 px-4 py-2 rounded-full hover:bg-white/10"
            >
                <ArrowLeft size={16} /> Exit
            </button>
            <div className="flex flex-col items-center">
                <span className="text-white text-xs font-black uppercase tracking-widest truncate max-w-[200px] md:max-w-md">{currentMangaTitle}</span>
                <span className="text-orange-500 text-[10px] font-bold mt-0.5">Chapter {selectedChapter.chapter}</span>
            </div>
            <div className="w-20"></div>
        </header>

        <div className="flex-1 pt-[104px] pb-10 flex flex-col items-center gap-1 overflow-auto custom-scrollbar">
            {readerLoading ? (
                <div className="flex flex-col items-center justify-center py-40">
                    <div className="w-12 h-12 border-4 border-white/10 border-t-orange-500 rounded-full animate-spin mb-6"></div>
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest animate-pulse">Memuat Panel...</p>
                </div>
            ) : chapterImages.length > 0 ? (
                chapterImages.map((imgUrl, i) => (
                    <div key={i} className="relative w-full max-w-3xl lg:max-w-4xl min-h-[50vh] bg-slate-900/50 flex flex-col items-center justify-center">
                        <img 
                          src={imgUrl} 
                          alt={`Page ${i+1}`} 
                          className="w-full object-contain shadow-2xl"
                          loading="lazy" 
                        />
                        <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[10px] font-bold text-white/50">{i + 1} / {chapterImages.length}</div>
                    </div>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center py-40">
                    <ImageIcon className="text-white/10 mb-6" size={64} />
                    <p className="text-white/40 font-bold uppercase tracking-widest">Gambar tidak tersedia</p>
                    <p className="text-white/30 text-xs mt-2 text-center max-w-sm">Mungkin ada masalah dengan server MangaDex At-Home.</p>
                </div>
            )}
        </div>

        {/* Floating Reader Navigation Map */}
        {!readerLoading && chapterImages.length > 0 && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2.5 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl z-[70]">
                <button className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-white/70 hover:bg-orange-600 hover:text-white transition-all" title="Chapter Sebelumnya">
                     <ChevronLeft size={20} />
                </button>
                <div className="h-6 w-px bg-white/10"></div>
                <div className="flex flex-col items-center px-2">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Bab {selectedChapter.chapter}</span>
                    <span className="text-[8px] font-bold text-white/40">{chapterImages.length} Halaman</span>
                </div>
                <div className="h-6 w-px bg-white/10"></div>
                <button className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-white/70 hover:bg-orange-600 hover:text-white transition-all" title="Chapter Selanjutnya">
                     <ChevronRight size={20} />
                </button>
            </div>
        )}
      </div>
    );
  }

  return null;
}

function DetailStat({ label, value }: { label: string, value: string }) {
    return (
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-orange-200 hover:bg-orange-50/50 transition-colors">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">{label}</p>
            <p className="text-xs font-bold text-slate-800 truncate capitalize relative z-10">{value}</p>
        </div>
    );
}
