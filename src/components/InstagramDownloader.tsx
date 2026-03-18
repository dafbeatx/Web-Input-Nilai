"use client";

import React, { useState } from "react";
import { Download, Loader2, AlertCircle, Link2, Image, Film, ClipboardPaste } from "lucide-react";

interface MediaResult {
  url: string;
  type: "video" | "image";
  thumbnail?: string;
}

export default function InstagramDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [media, setMedia] = useState<MediaResult | null>(null);

  const isValidInstagramUrl = (link: string) => {
    return /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv|stories)\/[\w-]+/i.test(link);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {
      // Fallback — user can type manually
    }
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      setError("Masukkan link Instagram terlebih dahulu");
      return;
    }

    if (!isValidInstagramUrl(url.trim())) {
      setError("Link Instagram tidak valid. Gunakan link post, reel, atau video.");
      return;
    }

    setLoading(true);
    setError("");
    setMedia(null);

    try {
      const res = await fetch(`/api/igdl?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengambil media dari Instagram");
      }

      setMedia({
        url: data.url,
        type: data.type || "video",
        thumbnail: data.thumbnail,
      });
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan. Coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMedia = () => {
    if (!media) return;
    const a = document.createElement("a");
    a.href = media.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = `instagram_${Date.now()}.${media.type === "video" ? "mp4" : "jpg"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-purple-950/30 to-slate-950 flex flex-col items-center px-4 py-8">
      {/* App Card */}
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Download size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-outfit">Instagram Downloader</h1>
          <p className="text-slate-400 text-sm mt-1">Download foto & video dari Instagram</p>
        </div>

        {/* Input Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5 mb-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
            Link Instagram
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(""); }}
                placeholder="Paste Instagram link here"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleDownload()}
              />
            </div>
            <button
              onClick={handlePaste}
              className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shrink-0"
              title="Paste from clipboard"
            >
              <ClipboardPaste size={16} />
            </button>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-rose-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Mengambil media...
            </>
          ) : (
            <>
              <Download size={18} />
              Download
            </>
          )}
        </button>

        {/* Error State */}
        {error && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 flex items-start gap-3 animate-in">
            <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            <p className="text-rose-300 text-sm">{error}</p>
          </div>
        )}

        {/* Result Section */}
        {media && (
          <div className="mt-6 animate-in">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
              {/* Media Preview */}
              <div className="relative">
                {media.type === "video" ? (
                  <div className="relative">
                    <video
                      src={media.url}
                      controls
                      playsInline
                      preload="metadata"
                      poster={media.thumbnail}
                      className="w-full max-h-[400px] object-contain bg-black"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Film size={12} /> Video
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={media.url}
                      alt="Instagram media"
                      className="w-full max-h-[400px] object-contain bg-black"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Image size={12} /> Image
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="p-4">
                <button
                  onClick={handleSaveMedia}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Save {media.type === "video" ? "Video" : "Image"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-slate-600 text-xs">
            Supports: Post • Reel • IGTV • Video
          </p>
        </div>
      </div>
    </div>
  );
}
