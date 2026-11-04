"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import { DeviceMode, InteractiveTrigger, CharacterProfile, CHARACTER_PROFILES } from '@/lib/game/types';
import {
  Wallet,
  MapPin,
  Maximize2,
  Minimize2,
  Monitor,
  Smartphone,
  Tv,
  ArrowLeft,
  X,
  ShoppingBag,
  School,
  Building,
  Info,
  CheckCircle,
  ChevronDown,
  User,
  Check,
} from 'lucide-react';
import Link from 'next/link';

interface ShopItem {
  name: string;
  price: number;
  desc: string;
}

interface GameHUDProps {
  deviceMode: DeviceMode;
  onDeviceModeChange: (mode: DeviceMode) => void;
  currentZone: string;
  nearTrigger: InteractiveTrigger | null;
  activeModalTrigger: InteractiveTrigger | null;
  onCloseModal: () => void;
  walletBalance: number;
  onBuyItem: (item: { name: string; price: number }) => void;
  currentCharacter?: CharacterProfile;
  onSelectCharacter?: (char: CharacterProfile) => void;
}

export default function GameHUD({
  deviceMode,
  onDeviceModeChange,
  currentZone,
  nearTrigger,
  activeModalTrigger,
  onCloseModal,
  walletBalance,
  onBuyItem,
  currentCharacter = CHARACTER_PROFILES[0],
  onSelectCharacter,
}: GameHUDProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handlePurchase = (item: { name: string; price: number }) => {
    if (walletBalance >= item.price) {
      onBuyItem(item);
      setPurchaseSuccess(`Berhasil membeli ${item.name}!`);
      setTimeout(() => setPurchaseSuccess(null), 2500);
    } else {
      alert("Saldo tunai tidak mencukupi!");
    }
  };

  const isBoard = deviceMode === 'interactive_board';

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          TOP BAR HUD (Compact, clean, responsive)
         ═══════════════════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-40 p-3 sm:p-4 pointer-events-none flex items-start justify-between gap-3">
        {/* Left: Identity & Wallet */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* Back to LMS Button */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-700/80 backdrop-blur-md shadow-lg transition-all"
            title="Kembali ke Dashboard Utama"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Keluar</span>
          </Link>

          {/* Player Badge & Character Switcher */}
          <button
            onClick={() => setIsCharacterModalOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl border border-slate-700/80 backdrop-blur-md shadow-lg cursor-pointer transition-colors active:scale-95 text-left"
            title="Klik atau Ketuk untuk Ganti Karakter"
          >
            <div className={`w-8 h-8 rounded-lg ${currentCharacter.avatarBg} flex items-center justify-center overflow-hidden border border-white/20 shadow-sm relative flex-shrink-0`}>
              {currentCharacter.avatarUrl ? (
                <img
                  src={currentCharacter.avatarUrl}
                  alt={currentCharacter.name}
                  className="w-10 h-10 object-contain translate-y-1"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <span className="font-black text-xs text-white">
                  {currentCharacter.name.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black leading-tight flex items-center gap-1">
                {currentCharacter.name}
                <ChevronDown size={11} className="text-slate-400" />
              </span>
              <span className="text-[9px] font-bold text-cyan-400 leading-none">{currentCharacter.role}</span>
            </div>
          </button>

          {/* Wallet Balance */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 text-emerald-400 rounded-xl border border-slate-700/80 backdrop-blur-md shadow-lg font-mono font-bold text-xs">
            <Wallet size={14} className="text-emerald-400" />
            <span>Rp {walletBalance.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Center / Right: Zone & Device Selector & Fullscreen */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Current Zone Location Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 text-slate-200 rounded-xl border border-slate-700/70 backdrop-blur-md shadow-md text-xs font-semibold">
            <MapPin size={13} className="text-rose-400" />
            <span>{currentZone}</span>
          </div>

          {/* Multiplatform Device Mode Switcher (Essential for Section 5 & Interactive Board) */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 backdrop-blur-md shadow-lg">
            <button
              onClick={() => onDeviceModeChange('desktop')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                deviceMode === 'desktop'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Desktop Mode (WASD + Mouse)"
            >
              <Monitor size={14} />
              <span className="hidden lg:inline text-[11px]">PC</span>
            </button>
            <button
              onClick={() => onDeviceModeChange('android')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                deviceMode === 'android'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Android Smartphone Mode (Virtual Joystick)"
            >
              <Smartphone size={14} />
              <span className="hidden lg:inline text-[11px]">Android</span>
            </button>
            <button
              onClick={() => onDeviceModeChange('interactive_board')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                deviceMode === 'interactive_board'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive Flat Panel / Smart Board Mode (Target sentuh besar >=64px)"
            >
              <Tv size={14} />
              <span className="hidden lg:inline text-[11px]">Smart Board</span>
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700/80 backdrop-blur-md shadow-lg transition-all"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          FLOATING INTERACTION PROMPT (Appears near interactive zones)
         ═══════════════════════════════════════════════════════════ */}
      {nearTrigger && !activeModalTrigger && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-bounce">
          <div className="px-5 py-2.5 bg-indigo-950/90 border-2 border-indigo-400/80 text-white rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.5)] backdrop-blur-xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <p className="text-xs sm:text-sm font-black tracking-wide">
              {nearTrigger.promptText}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          INTERACTIVE MODAL DIALOG (Warung, School, Smart Board, Balai)
         ═══════════════════════════════════════════════════════════ */}
      {activeModalTrigger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-white relative ${isBoard ? 'scale-105' : ''}`}>
            {/* Close button */}
            <button
              onClick={onCloseModal}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 overflow-hidden">
                {typeof activeModalTrigger.data?.avatarUrl === 'string' ? (
                  <img
                    src={activeModalTrigger.data.avatarUrl as string}
                    alt={activeModalTrigger.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    {activeModalTrigger.type === 'shop' && <ShoppingBag size={24} />}
                    {activeModalTrigger.type === 'building_entrance' && <School size={24} />}
                    {activeModalTrigger.type === 'interactive_board' && <Tv size={24} />}
                    {activeModalTrigger.type === 'npc' && <Building size={24} />}
                  </>
                )}
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
                  {typeof activeModalTrigger.data?.role === 'string'
                    ? (activeModalTrigger.data.role as string)
                    : 'SMP Terpadu Al-Ittihadiyah'}
                </span>
                <h3 className="text-lg font-black tracking-tight">{activeModalTrigger.name}</h3>
              </div>
            </div>

            {/* Notification Toast inside Modal */}
            {purchaseSuccess && (
              <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle size={16} />
                <span>{purchaseSuccess}</span>
              </div>
            )}

            {/* Modal Body Content */}
            {activeModalTrigger.type === 'shop' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 mb-2">
                  Pilih jajanan dan makanan khas warung Indonesia untuk memulihkan stamina karakter:
                </p>
                <div className="space-y-2">
                  {(activeModalTrigger.data?.items as ShopItem[] | undefined)?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-100">{item.name}</p>
                        <p className="text-[11px] text-slate-400">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          Rp {item.price.toLocaleString('id-ID')}
                        </span>
                        <button
                          onClick={() => handlePurchase(item)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md"
                        >
                          Beli
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeModalTrigger.type === 'building_entrance' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {typeof activeModalTrigger.data?.desc === 'string'
                    ? activeModalTrigger.data.desc
                    : 'Selamat datang di area SMP Terpadu Al-Ittihadiyah.'}
                </p>
                {Array.isArray(activeModalTrigger.data?.features) && (
                  <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs space-y-1.5 text-slate-300">
                    <p className="font-bold text-indigo-300">Fasilitas Unggulan:</p>
                    {activeModalTrigger.data.features.map((feat, i) => (
                      <p key={i}>• {String(feat)}</p>
                    ))}
                  </div>
                )}
                <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs space-y-1 text-slate-300">
                  <p className="font-bold text-indigo-300">Status Operasional:</p>
                  <p>• Jam Pembelajaran: 07.00 - 15.30 WIB</p>
                  <p>• Akses: Guru, Siswa, dan Tenaga Kependidikan</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={onCloseModal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                  >
                    Masuk Fasilitas
                  </button>
                </div>
              </div>
            )}

            {activeModalTrigger.type === 'interactive_board' && (
              <div className="space-y-4">
                <div className="p-4 bg-cyan-950/40 border border-cyan-500/40 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2 text-cyan-300 font-bold text-xs">
                    <Info size={16} />
                    <span>{typeof activeModalTrigger.data?.title === 'string' ? activeModalTrigger.data.title : 'Papan Interaktif Digital (PID)'}</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    {typeof activeModalTrigger.data?.desc === 'string'
                      ? activeModalTrigger.data.desc
                      : 'Pusat interaksi dan modul edukasi interaktif sekolah.'}
                  </p>
                  {Array.isArray(activeModalTrigger.data?.features) && (
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                      {activeModalTrigger.data.features.map((feat, i) => (
                        <li key={i}>{String(feat)}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={onCloseModal}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                  >
                    Tutup Papan Informasi
                  </button>
                </div>
              </div>
            )}

            {activeModalTrigger.type === 'npc' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {typeof activeModalTrigger.data?.desc === 'string'
                    ? activeModalTrigger.data.desc
                    : 'Petugas sekolah menyapa Anda dengan ramah:'}
                </p>
                <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 text-xs italic text-slate-200">
                  {typeof activeModalTrigger.data?.quote === 'string'
                    ? activeModalTrigger.data.quote
                    : '“Selamat beraktivitas di lingkungan SMP Terpadu Al-Ittihadiyah. Jaga sopan santun, ketertiban, dan kebersihan lingkungan sekolah!”'}
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={onCloseModal}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                  >
                    Siap, Mengerti!
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CHARACTER SELECTION MODAL (Touch Friendly for PID & Mobile)
         ═══════════════════════════════════════════════════════════ */}
      {isCharacterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black font-outfit text-white">Pilih Karakter Warga</h3>
                  <p className="text-[11px] text-slate-400">Pilih profesi dan identitas di Indonesian Life RP</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCharacterModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Character Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
              {CHARACTER_PROFILES.map((char) => {
                const isSelected = char.id === currentCharacter.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => {
                      if (onSelectCharacter) onSelectCharacter(char);
                      setIsCharacterModalOpen(false);
                    }}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer min-h-[56px] relative group ${
                      isSelected
                        ? 'bg-indigo-950/50 border-indigo-500 shadow-md shadow-indigo-500/20'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl ${char.avatarBg} flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/20 shadow-md relative mt-0.5`}>
                      {char.avatarUrl ? (
                        <img
                          src={char.avatarUrl}
                          alt={char.name}
                          className="w-14 h-14 object-contain translate-y-1.5"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <span className="font-black text-sm text-white">
                          {char.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white truncate">{char.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700/70 text-slate-300">
                          {char.tag}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-cyan-400 block truncate mt-0.5">{char.role}</span>
                      <p className="text-[10px] text-slate-400 leading-snug line-clamp-2 mt-1">{char.description}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>Mode: <strong className="text-white">{deviceMode.toUpperCase()}</strong></span>
              <button
                type="button"
                onClick={() => setIsCharacterModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer min-h-[40px]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
