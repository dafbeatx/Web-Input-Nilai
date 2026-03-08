"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
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
  AlertCircle,
  Filter,
  XCircle
} from "lucide-react";

interface MangaItem {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  status: string;
  year: number | string;
  author?: string;
  genres?: string[];
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

  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const ALPHABETS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  
  const TAGS = [
    { id: '391b0423-d847-456f-aff0-8b0cfc03066b', name: 'Action' },
    { id: '87cc87cd-a395-47af-b27a-93258283bbc6', name: 'Adventure' },
    { id: '4d32cc48-9f00-4cca-9b5a-a839f0764984', name: 'Comedy' },
    { id: 'b9af3a63-f058-46de-a9a0-e0c13906197a', name: 'Drama' },
    { id: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', name: 'Fantasy' },
    { id: 'cdad7e68-1419-41dd-bdce-27753074a640', name: 'Horror' },
    { id: '423e2eae-a7a2-4a8b-ac03-a8351462d71d', name: 'Romance' },
    { id: 'caaa44eb-cd40-4177-b930-79d3ef2afe87', name: 'School' },
    { id: 'e5301a23-ebd9-49dd-a0cb-2add944c7fe9', name: 'Slice of Life' }
  ];

  // Fetch when filters change
  useEffect(() => {
    fetchMangaList(searchQuery, selectedLetter, selectedTag);
  }, [selectedLetter, selectedTag]);

  // Initial fetch
  useEffect(() => {
    fetchMangaList();
  }, []);

  const fetchMangaList = async (query?: string, letter?: string | null, tag?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams([
        ['includes[]', 'cover_art'],
        ['limit', '30'],
        ['contentRating[]', 'safe'],
        ['contentRating[]', 'suggestive']
      ]);

      if (query && letter) {
        params.append('title', `${letter} ${query}`);
        params.append('order[relevance]', 'desc');
      } else if (query) {
        params.append('title', query);
        params.append('order[relevance]', 'desc');
      } else if (letter) {
        params.append('title', letter);
        params.append('order[relevance]', 'desc');
      } else {
        // If no text search, order by latest updates
        params.append('hasAvailableChapters', 'true');
        params.append('order[latestUploadedChapter]', 'desc');
      }

      if (tag) {
        params.append('includedTags[]', tag);
      }
      
      const url = `/api/mangalist?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal mengambil data manga dari server");
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);
      
      const list = result.data || [];
      const formattedMangas = list.map((m: any) => {
        const coverRel = m.relationships?.find((r: any) => r.type === 'cover_art');
        const fileName = coverRel?.attributes?.fileName;
        const rawCoverUrl = fileName ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.256.jpg` : '';
        const coverUrl = rawCoverUrl ? `/api/manga/image?url=${encodeURIComponent(rawCoverUrl)}` : '';
        
        return {
          id: m.id,
          title: m.attributes.title.en || Object.values(m.attributes.title)[0] || 'Unknown',
          description: m.attributes.description?.en || m.attributes.description?.id || '',
          coverUrl,
          status: m.attributes.status || 'Unknown',
          year: m.attributes.year || 'N/A'
        };
      });
      setMangas(formattedMangas);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMangaList(searchQuery, selectedLetter, selectedTag);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLetter(null);
    setSelectedTag(null);
    fetchMangaList();
  };

  const openDetail = async (manga: MangaItem) => {
    setView('detail');
    setSelectedManga(manga);
    setLoading(true);
    setCurrentMangaTitle(manga.title);
    window.history.pushState({ app: 'komik', comicView: 'detail' }, '');
    try {
      // Fetch chapter feed from local API Proxy
      const response = await fetch(`/api/mangadetail?id=${manga.id}`);
      if (!response.ok) throw new Error("Gagal mengambil detail chapater");
      const result = await response.json();

      if (result.error) throw new Error(result.error);

      const list = result.data || [];
      const formattedChapters = list.map((c: any) => ({
          id: c.id,
          chapter: c.attributes.chapter || 'Oneshot',
          title: c.attributes.title || `Chapter ${c.attributes.chapter || ''}`,
          volume: c.attributes.volume || '',
          publishedAt: new Date(c.attributes.publishAt).toLocaleDateString('id-ID'),
          pages: c.attributes.pages || 0,
          externalUrl: c.attributes.externalUrl
      }));
      setChapters(formattedChapters);
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
    window.history.pushState({ app: 'komik', comicView: 'reader' }, '');
    
    try {
      const response = await fetch(`/api/mangachapter?id=${chapter.id}`);
      if (!response.ok) throw new Error("Gagal mengambil gambar chapter");
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);
      
      if (result.chapter && result.chapter.data) {
          const baseUrl = result.baseUrl;
          const hash = result.chapter.hash;
          const images = result.chapter.data.map((filename: string) => {
              const rawUrl = `${baseUrl}/data/${hash}/${filename}`;
              return `/api/manga/image?url=${encodeURIComponent(rawUrl)}`;
          });
          setChapterImages(images);
      } else {
          throw new Error("Format gambar tidak sesuai dari server");
      }
    } catch (err) {
      console.error(err);
      setError("Gagal memuat gambar chapter");
    } finally {
      setReaderLoading(false);
    }
  };

  const goBack = () => {
    window.history.back();
  };

  // Handle browser back button within ComicReader
  useEffect(() => {
    const handlePopState = () => {
      if (view === 'reader') {
        (window as any).__popstateHandled = true;
        setView('detail');
      } else if (view === 'detail') {
        (window as any).__popstateHandled = true;
        setView('list');
      }
    };

    // Use capture phase to run BEFORE the parent's handler
    window.addEventListener('popstate', handlePopState, true);
    return () => window.removeEventListener('popstate', handlePopState, true);
  }, [view]);

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

          {/* Filters Area */}
          <div className="max-w-4xl mx-auto mt-6 flex flex-col gap-4">
            
            {/* Alphabet Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              <span className="text-[10px] font-black uppercase text-slate-400 mr-2 shrink-0">A-Z</span>
              {ALPHABETS.map(letter => (
                <button
                  key={letter}
                  onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    selectedLetter === letter 
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-500/30' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-500 hover:text-orange-600'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>

            {/* Tags Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              <span className="text-[10px] font-black uppercase text-slate-400 mr-2 shrink-0 flex items-center gap-1"><Filter size={12}/> Genre</span>
              {TAGS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTag(selectedTag === t.id ? null : t.id)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedTag === t.id 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {t.name}
                </button>
              ))}
              
              {/* Clear Filters Button */}
              {(selectedLetter || selectedTag || searchQuery) && (
                <button 
                  onClick={clearFilters}
                  className="shrink-0 ml-auto px-3 py-1.5 flex items-center gap-1 text-rose-500 hover:bg-rose-50 rounded-full text-xs font-bold transition-colors"
                >
                  <XCircle size={14} /> Clear
                </button>
              )}
            </div>

          </div>
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
                      <Image 
                        src={manga.coverUrl} 
                        alt={manga.title} 
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          // Hide the broken image and let the Book icon fallback show behind it (or just hide it)
                          e.currentTarget.style.display = 'none';
                        }}
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
                <Image 
                  src={selectedManga.coverUrl} 
                  alt="blur background" 
                  fill
                  sizes="100vw"
                  className="object-cover blur-3xl opacity-40 scale-125 saturate-200" 
                />
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
                    <div className="aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-100 relative">
                        {selectedManga.coverUrl ? (
                            <Image 
                              src={selectedManga.coverUrl} 
                              alt={selectedManga.title} 
                              fill
                              sizes="(max-width: 768px) 250px, 300px"
                              className="object-cover" 
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center"><Book size={64} className="text-slate-300" /></div>
                        )}
                    </div>
                </div>
                <div className="flex-1 pt-4 text-center md:text-left">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 font-outfit tracking-tight leading-tight">{selectedManga.title}</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <DetailStat label="Status" value={selectedManga.status} />
                        <DetailStat label="Author" value={selectedManga.author || '-'} />
                        <DetailStat label="Source" value="MangaDex" />
                        <DetailStat label="Chapters" value={chapters.length.toString()} />
                    </div>
                    {selectedManga.genres && selectedManga.genres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start">
                        {selectedManga.genres.slice(0, 5).map(g => (
                          <span key={g} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{g}</span>
                        ))}
                      </div>
                    )}
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
                    <Book size={20} className="text-orange-500" /> Daftar Chapter
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
                                        {ch.title}
                                        {ch.externalUrl && <span className="px-2 py-0.5 bg-sky-100 text-sky-600 rounded text-[8px] font-black uppercase tracking-widest ml-2 flex items-center gap-1"><ExternalLink size={10} /> Official</span>}
                                    </span>
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
