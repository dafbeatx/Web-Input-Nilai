"use client";

import React, { useState, useEffect } from "react";
import { 
  Waves, 
  CloudSun, 
  MapPin, 
  Clock, 
  Wind, 
  Droplets, 
  AlertTriangle,
  RefreshCw,
  Search
} from "lucide-react";

interface Lokasi {
  kecamatan: string;
  provinsi: string;
}

interface WeatherCurrent {
  weather: string;
  image: string;
  t: string;
  weather_desc: string;
  hu: string;
  ws: string;
  wd: string;
  local_datetime: string;
}

interface WeatherForecast {
  local_datetime: string;
  image: string;
  t: string;
}

interface WeatherData {
  lokasi: Lokasi;
  current: WeatherCurrent;
  forecast: WeatherForecast[];
}

interface QuakeData {
  magnitude: string;
  kedalaman: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  potensi: string;
  potentials?: string;
  shakemap: string;
}

export default function WeatherApp() {
  const [activeTab, setActiveTab] = useState<'quake' | 'weather'>('quake');
  const [quakeData, setQuakeData] = useState<QuakeData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [province, setProvince] = useState('indonesia');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'quake') {
      fetchQuake();
    } else {
      fetchWeather(province);
    }
  }, [activeTab, province]);

  const fetchQuake = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/quake');
      const result = await resp.json();
      if (result.success) setQuakeData(result.data);
      else throw new Error(result.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (prov: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/weather?path=${prov}`);
      const result = await resp.json();
      if (result.success) setWeatherData(result.data);
      else throw new Error(result.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-in">
      <header className="mb-8 p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl flex gap-1.5 border border-slate-200">
        <TabButton 
          active={activeTab === 'quake'} 
          onClick={() => setActiveTab('quake')} 
          label="Gempa Terkini" 
          icon={<Waves size={14} />} 
        />
        <TabButton 
          active={activeTab === 'weather'} 
          onClick={() => setActiveTab('weather')} 
          label="Prakiraan Cuaca" 
          icon={<CloudSun size={14} />} 
        />
      </header>

      {activeTab === 'weather' && (
        <div className="mb-8 relative group">
          <select 
            value={province}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProvince(e.target.value)}
            className="w-full bg-white border-2 border-slate-100 rounded-[1.5rem] py-4 pl-12 pr-6 text-sm font-bold text-slate-700 shadow-lg shadow-slate-200/50 appearance-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
          >
            <option value="indonesia">Indonesia (Umum)</option>
            <option value="aceh">Aceh</option>
            <option value="bali">Bali</option>
            <option value="banten">Banten</option>
            <option value="bengkulu">Bengkulu</option>
            <option value="jawa-barat">Jawa Barat</option>
            <option value="jawa-tengah">Jawa Tengah</option>
            <option value="jawa-timur">Jawa Timur</option>
            <option value="jakarta">DKI Jakarta</option>
          </select>
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold uppercase tracking-widest text-[10px]">Menghubungkan BMKG...</p>
        </div>
      ) : error ? (
        <div className="py-10 text-center text-rose-500 bg-white rounded-3xl border border-rose-100 shadow-sm p-8">
            <AlertTriangle className="mx-auto mb-4 opacity-20" size={48} />
            <p className="font-bold">Gagal memuat data.</p>
            <p className="text-xs mt-2 opacity-70">{error}</p>
            <button onClick={activeTab === 'quake' ? fetchQuake : () => fetchWeather(province)} className="mt-6 px-6 py-2 bg-rose-100 rounded-xl text-xs font-black uppercase tracking-widest">Coba Lagi</button>
        </div>
      ) : (
        <>
          {activeTab === 'quake' && quakeData && <QuakeDisplay quake={quakeData} />}
          {activeTab === 'weather' && weatherData && <WeatherDisplay weather={weatherData} />}
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${active ? 'bg-white text-slate-800 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
    >
      {icon} {label}
    </button>
  );
}

function QuakeDisplay({ quake }: { quake: QuakeData }) {
  return (
    <div className="animate-in space-y-6">
      <div className="relative overflow-hidden bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-rose-500/10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="p-6 sm:p-8 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Gempa Bumi Terkini</span>
            </div>
            <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400">BMKG RI</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="flex flex-col items-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Magnitudo</span>
              <span className="text-4xl font-black text-rose-500">{quake.magnitude}</span>
            </div>
            <div className="flex flex-col items-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Kedalaman</span>
              <span className="text-2xl font-black text-slate-800">{quake.kedalaman}</span>
            </div>
          </div>

          <div className="space-y-4">
            <InfoRow icon={<MapPin size={18} />} title="Lokasi" value={quake.wilayah} />
            <InfoRow icon={<Clock size={18} />} title="Waktu" value={`${quake.tanggal} • ${quake.jam}`} />
            
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3">
              <AlertTriangle className="text-rose-500 shrink-0" size={20} />
              <p className="text-xs font-bold text-rose-600">{quake.potensi || quake.potentials}</p>
            </div>
          </div>
        </div>
        <div className="h-64 relative bg-slate-50 border-t border-slate-100">
            <img src={quake.shakemap} alt="Map" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
        </div>
      </div>
    </div>
  );
}

function WeatherDisplay({ weather }: { weather: WeatherData }) {
  const current = weather.current;
  const theme = getWeatherTheme(current.weather);

  return (
    <div className="animate-in space-y-6 pb-10">
      <div className={`relative overflow-hidden p-6 sm:p-8 rounded-[3rem] text-white shadow-2xl ${theme.gradient}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">Kondisi Terkini</p>
              <h3 className="font-bold flex items-center gap-2">
                <MapPin size={16} /> {weather.lokasi.kecamatan}, {weather.lokasi.provinsi}
              </h3>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/50">{current.local_datetime.split(' ')[1].substring(0, 5)} WIB</p>
          </div>

          <div className="flex flex-col items-center mb-10 text-center">
            <img src={current.image} alt="weather" className="w-32 h-32 mb-4 drop-shadow-2xl" />
            <div className="flex items-start">
              <span className="text-8xl font-black tracking-tighter">{current.t}</span>
              <span className="text-3xl font-black mt-4 ml-1">°C</span>
            </div>
            <p className="text-lg font-bold opacity-90">{current.weather_desc}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 p-1 bg-black/10 rounded-3xl">
             <WeatherStat label="Lembab" value={`${current.hu}%`} />
             <WeatherStat label="Angin" value={`${current.ws} km/j`} bg />
             <WeatherStat label="Arah" value={current.wd} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Prakiraan Selanjutnya</h4>
        <div className="flex gap-4 overflow-x-auto pb-4 px-2 custom-scrollbar">
          {weather.forecast.map((f: WeatherForecast, i: number) => (
            <div key={i} className="flex-shrink-0 w-24 sm:w-28 p-4 sm:p-5 bg-white rounded-[2rem] border border-slate-100 shadow-md text-center">
              <p className="text-[9px] font-black text-slate-300 uppercase mb-3">{f.local_datetime.split(' ')[1].substring(0, 5)}</p>
              <img src={f.image} alt="weather" className="w-10 h-10 mx-auto mb-2" />
              <p className="text-base font-black text-slate-800">{f.t}°</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeatherStat({ label, value, bg }: { label: string, value: string, bg?: boolean }) {
  return (
    <div className={`flex flex-col items-center py-4 rounded-2xl ${bg ? 'bg-white/10 border border-white/5' : ''}`}>
      <span className="text-[8px] font-black uppercase tracking-widest text-white/50 mb-1">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function InfoRow({ icon, title, value }: { icon: React.ReactNode, title: string, value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">{title}</p>
        <p className="text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function getWeatherTheme(code: string) {
  const c = parseInt(code);
  if (c === 0 || c === 100) return { gradient: "bg-gradient-to-br from-amber-400 to-orange-600" };
  if ([1, 2, 101, 102].includes(c)) return { gradient: "bg-gradient-to-br from-sky-400 to-blue-600" };
  if ([3, 4, 103, 104].includes(c)) return { gradient: "bg-gradient-to-br from-slate-400 to-slate-700" };
  if ([60, 61, 63, 80, 201, 202, 203, 204].includes(c)) return { gradient: "bg-gradient-to-br from-blue-600 to-indigo-900" };
  if ([95, 97].includes(c)) return { gradient: "bg-gradient-to-br from-indigo-700 to-slate-900" };
  return { gradient: "bg-gradient-to-br from-sky-500 to-blue-700" };
}
