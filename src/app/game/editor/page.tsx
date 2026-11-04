"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Save,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Layers,
  Eye,
  EyeOff,
  Grid,
  CheckCircle,
  AlertCircle,
  Copy,
  Search,
  MousePointer,
  Square,
} from 'lucide-react';

interface MapObjectProperty {
  name: string;
  type: string;
  value: unknown;
}

interface MapObject {
  id: number;
  name: string;
  type?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  visible?: boolean;
  point?: boolean;
  properties?: MapObjectProperty[];
}

interface MapLayer {
  id: number;
  name: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  visible?: boolean;
  opacity?: number;
  data?: number[];
  objects?: MapObject[];
}

interface TiledMapData {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: MapLayer[];
  nextobjectid: number;
  [key: string]: unknown;
}

type EditorTool = 'select' | 'draw_collision' | 'draw_interact';
type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

const MAP_WIDTH = 1536;
const MAP_HEIGHT = 1024;

export default function GameMapEditorPage() {
  const [mapData, setMapData] = useState<TiledMapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Editor viewport & interaction state
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [zoom, setZoom] = useState<number>(0.8);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 30 });
  const [cursorCoord, setCursorCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer visibility toggles
  const [showCollision, setShowCollision] = useState<boolean>(true);
  const [showInteract, setShowInteract] = useState<boolean>(true);
  const [showSpawn, setShowSpawn] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);

  // Selection & Inspector
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [selectedLayerName, setSelectedLayerName] = useState<string>('Collision');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dragging / Resizing / Drawing State
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawRect, setCurrentDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [isDraggingObject, setIsDraggingObject] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandle | null>(null);
  const [resizeInitialRect, setResizeInitialRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null);

  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // 1. Fetch Map Data on component mount
  useEffect(() => {
    let isSubscribed = true;

    async function loadInitialMap() {
      try {
        const res = await fetch('/api/game/map');
        if (!res.ok) throw new Error('Gagal memuat peta');
        const data: TiledMapData = await res.json();
        if (isSubscribed) {
          setMapData(data);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (isSubscribed) {
          setLoading(false);
          setToastMessage({ text: 'Gagal memuat data peta school_map.json', type: 'error' });
        }
      }
    }

    loadInitialMap();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Helper getters
  const collisionLayer = mapData?.layers.find(l => l.name === 'Collision');
  const interactLayer = mapData?.layers.find(l => l.name === 'Interact');
  const spawnLayer = mapData?.layers.find(l => l.name === 'Spawn');

  const selectedObject = (() => {
    if (!mapData || selectedObjectId === null) return null;
    for (const layer of mapData.layers) {
      if (layer.objects) {
        const found = layer.objects.find(o => o.id === selectedObjectId);
        if (found) return { object: found, layerName: layer.name };
      }
    }
    return null;
  })();

  // 2. Save Updated Map Data to API
  const handleSaveMap = useCallback(async () => {
    if (!mapData) return;
    try {
      setSaving(true);
      const res = await fetch('/api/game/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan');

      showToast('✅ Berhasil disimpan ke school_map.json!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan file peta', 'error');
    } finally {
      setSaving(false);
    }
  }, [mapData, showToast]);

  // 3. Coordinate conversion helper
  const getMapCoordinates = (e: React.MouseEvent): { x: number; y: number } => {
    if (!mapCanvasRef.current) return { x: 0, y: 0 };
    const rect = mapCanvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / zoom;
    const rawY = (e.clientY - rect.top) / zoom;
    const clampedX = Math.round(Math.max(0, Math.min(MAP_WIDTH, rawX)));
    const clampedY = Math.round(Math.max(0, Math.min(MAP_HEIGHT, rawY)));
    return { x: clampedX, y: clampedY };
  };

  // 4. Mouse Down on Workspace
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or Space+click for panning
    if (e.button === 1 || e.altKey || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return; // Only primary button

    const pos = getMapCoordinates(e);

    if (activeTool === 'draw_collision' || activeTool === 'draw_interact') {
      setIsDrawing(true);
      setDrawStart(pos);
      setCurrentDrawRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
      setSelectedObjectId(null);
    } else if (activeTool === 'select') {
      // If clicked empty area, deselect
      const target = e.target as HTMLElement;
      if (target.dataset.mapRoot === 'true') {
        setSelectedObjectId(null);
      }
    }
  };

  // 5. Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMapCoordinates(e);
    setCursorCoord(pos);

    // Pan handling
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // Drawing new box
    if (isDrawing && drawStart) {
      const minX = Math.min(drawStart.x, pos.x);
      const minY = Math.min(drawStart.y, pos.y);
      const width = Math.abs(pos.x - drawStart.x);
      const height = Math.abs(pos.y - drawStart.y);
      setCurrentDrawRect({ x: minX, y: minY, w: width, h: height });
      return;
    }

    // Dragging selected object
    if (isDraggingObject && selectedObject && mapData) {
      const newX = Math.max(0, Math.min(MAP_WIDTH - selectedObject.object.width, Math.round(pos.x - dragOffset.x)));
      const newY = Math.max(0, Math.min(MAP_HEIGHT - selectedObject.object.height, Math.round(pos.y - dragOffset.y)));

      updateObjectInState(selectedObject.object.id, { x: newX, y: newY });
      return;
    }

    // Resizing selected object
    if (activeResizeHandle && resizeInitialRect && resizeStartPos && selectedObject) {
      const dx = pos.x - resizeStartPos.x;
      const dy = pos.y - resizeStartPos.y;
      let { x, y, w, h } = resizeInitialRect;

      if (activeResizeHandle.includes('e')) w = Math.max(16, resizeInitialRect.w + dx);
      if (activeResizeHandle.includes('s')) h = Math.max(16, resizeInitialRect.h + dy);
      if (activeResizeHandle.includes('w')) {
        const potentialW = resizeInitialRect.w - dx;
        if (potentialW >= 16) {
          x = resizeInitialRect.x + dx;
          w = potentialW;
        }
      }
      if (activeResizeHandle.includes('n')) {
        const potentialH = resizeInitialRect.h - dy;
        if (potentialH >= 16) {
          y = resizeInitialRect.y + dy;
          h = potentialH;
        }
      }

      updateObjectInState(selectedObject.object.id, {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
      });
    }
  };

  // 6. Mouse Up
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    // Finish Drawing
    if (isDrawing && currentDrawRect && mapData) {
      setIsDrawing(false);
      setDrawStart(null);

      // Only create if rectangle has reasonable dimension (>= 12px)
      if (currentDrawRect.w >= 12 && currentDrawRect.h >= 12) {
        const targetLayerName = activeTool === 'draw_collision' ? 'Collision' : 'Interact';
        const newId = mapData.nextobjectid || Date.now();

        const newObj: MapObject = {
          id: newId,
          name: targetLayerName === 'Collision' ? `Kotak Tabrakan #${newId}` : `Zona Interaksi #${newId}`,
          x: currentDrawRect.x,
          y: currentDrawRect.y,
          width: currentDrawRect.w,
          height: currentDrawRect.h,
          rotation: 0,
          visible: true,
        };

        if (targetLayerName === 'Interact') {
          newObj.properties = [
            { name: 'label', type: 'string', value: `Fasilitas #${newId}` },
            { name: 'interactionId', type: 'string', value: `fasilitas_${newId}` },
          ];
        }

        const updatedLayers = mapData.layers.map(layer => {
          if (layer.name === targetLayerName) {
            return {
              ...layer,
              objects: [...(layer.objects || []), newObj],
            };
          }
          return layer;
        });

        setMapData({
          ...mapData,
          nextobjectid: newId + 1,
          layers: updatedLayers,
        });

        setSelectedObjectId(newId);
        setSelectedLayerName(targetLayerName);
        setActiveTool('select');
        showToast(`Dibuat objek baru: ${newObj.name}`, 'success');
      }

      setCurrentDrawRect(null);
    }

    if (isDraggingObject) {
      setIsDraggingObject(false);
    }

    if (activeResizeHandle) {
      setActiveResizeHandle(null);
      setResizeInitialRect(null);
      setResizeStartPos(null);
    }
  };

  // Update object properties in state
  const updateObjectInState = (id: number, updates: Partial<MapObject>) => {
    if (!mapData) return;
    const updatedLayers = mapData.layers.map(layer => {
      if (!layer.objects) return layer;
      const updatedObjects = layer.objects.map(obj => {
        if (obj.id === id) {
          return { ...obj, ...updates };
        }
        return obj;
      });
      return { ...layer, objects: updatedObjects };
    });

    setMapData({ ...mapData, layers: updatedLayers });
  };

  // Delete object
  const handleDeleteObject = useCallback((id: number) => {
    if (!mapData) return;
    const updatedLayers = mapData.layers.map(layer => {
      if (!layer.objects) return layer;
      return {
        ...layer,
        objects: layer.objects.filter(obj => obj.id !== id),
      };
    });

    setMapData({ ...mapData, layers: updatedLayers });
    if (selectedObjectId === id) setSelectedObjectId(null);
    showToast('Objek berhasil dihapus', 'success');
  }, [mapData, selectedObjectId, showToast]);

  // Duplicate object
  const handleDuplicateObject = (obj: MapObject, layerName: string) => {
    if (!mapData) return;
    const newId = (mapData.nextobjectid || 100) + 1;
    const duplicatedObj: MapObject = {
      ...obj,
      id: newId,
      name: `${obj.name} (Salinan)`,
      x: obj.x + 24,
      y: obj.y + 24,
    };

    const updatedLayers = mapData.layers.map(layer => {
      if (layer.name === layerName) {
        return {
          ...layer,
          objects: [...(layer.objects || []), duplicatedObj],
        };
      }
      return layer;
    });

    setMapData({
      ...mapData,
      nextobjectid: newId + 1,
      layers: updatedLayers,
    });

    setSelectedObjectId(newId);
    showToast(`Objek disalin: ${duplicatedObj.name}`, 'success');
  };

  // Keyboard shortcut listener (Delete, Esc, Ctrl+S)
  const saveMapRef = useRef(handleSaveMap);
  const deleteObjectRef = useRef(handleDeleteObject);

  useEffect(() => {
    saveMapRef.current = handleSaveMap;
    deleteObjectRef.current = handleDeleteObject;
  }, [handleSaveMap, handleDeleteObject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId !== null) {
          deleteObjectRef.current(selectedObjectId);
        }
      } else if (e.key === 'Escape') {
        setSelectedObjectId(null);
        setActiveTool('select');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveMapRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId]);

  // Object list filtering
  const allObjects = (() => {
    if (!mapData) return [];
    const list: Array<{ obj: MapObject; layer: string }> = [];
    if (showCollision && collisionLayer?.objects) {
      collisionLayer.objects.forEach(o => list.push({ obj: o, layer: 'Collision' }));
    }
    if (showInteract && interactLayer?.objects) {
      interactLayer.objects.forEach(o => list.push({ obj: o, layer: 'Interact' }));
    }
    if (showSpawn && spawnLayer?.objects) {
      spawnLayer.objects.forEach(o => list.push({ obj: o, layer: 'Spawn' }));
    }
    return list.filter(item =>
      item.obj.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  })();

  if (loading) {
    return (
      <div className="w-full h-dvh bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-black tracking-tight font-outfit">Memuat Visual Map Editor...</h2>
        <p className="text-xs text-slate-400 mt-1">Mengambil koordinat school_map.json</p>
      </div>
    );
  }

  return (
    <div className="w-full h-dvh bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      {/* ═══════════════════════════════════════════════════════════
          TOP TOOLBAR / HEADER
         ═══════════════════════════════════════════════════════════ */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-3 z-30 shrink-0">
        {/* Left: Brand & Return */}
        <div className="flex items-center gap-3">
          <Link
            href="/game"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
            title="Kembali ke Permainan"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Ke Game</span>
          </Link>
          <div className="h-5 w-[1px] bg-slate-800" />
          <div>
            <h1 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <span>Visual Collision Editor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-400 font-mono">
                SMP Al-Ittihadiyah
              </span>
            </h1>
          </div>
        </div>

        {/* Center: Tool Selector & Toggles */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTool('select')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTool === 'select'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Pilih & Ubah Ukuran Objek (V)"
          >
            <MousePointer size={14} />
            <span className="hidden md:inline">Pilih & Geser</span>
          </button>

          <button
            onClick={() => setActiveTool('draw_collision')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTool === 'draw_collision'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-rose-400'
            }`}
            title="Gambar Kotak Tabrakan Merah (Tembok, Atap, Pohon)"
          >
            <Square size={14} />
            <span className="hidden md:inline">+ Tabrakan (Merah)</span>
          </button>

          <button
            onClick={() => setActiveTool('draw_interact')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTool === 'draw_interact'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
            title="Gambar Zona Interaksi Hijau (Pintu, Fasilitas)"
          >
            <Layers size={14} />
            <span className="hidden md:inline">+ Interaksi (Hijau)</span>
          </button>
        </div>

        {/* Right: Zoom, Grid & Save Action */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden lg:flex items-center bg-slate-800/80 rounded-xl border border-slate-700/60 p-0.5 text-xs text-slate-300">
            <button
              onClick={() => setZoom(prev => Math.max(0.4, Number((prev - 0.15).toFixed(2))))}
              className="p-1.5 hover:text-white"
              title="Perkecil"
            >
              <ZoomOut size={14} />
            </button>
            <span className="px-2 font-mono font-bold text-[11px]">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(prev => Math.min(2.0, Number((prev + 0.15).toFixed(2))))}
              className="p-1.5 hover:text-white"
              title="Perbesar"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => {
                setZoom(0.85);
                setPan({ x: 40, y: 30 });
              }}
              className="p-1.5 hover:text-white border-l border-slate-700"
              title="Reset Tampilan"
            >
              <Maximize2 size={13} />
            </button>
          </div>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(prev => !prev)}
            className={`p-2 rounded-xl text-xs font-bold border transition-all ${
              showGrid
                ? 'bg-cyan-950 border-cyan-500/50 text-cyan-400'
                : 'bg-slate-800 border-slate-700/80 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Grid 32x32 Tile"
          >
            <Grid size={16} />
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveMap}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
          >
            <Save size={15} />
            <span>{saving ? 'Menyimpan...' : 'Simpan Peta'}</span>
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          MAIN WORKSPACE LAYOUT (CANVAS + SIDEBAR)
         ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div
              className={`px-4 py-2 rounded-2xl border text-xs font-bold shadow-2xl flex items-center gap-2 ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                  : 'bg-rose-950/90 border-rose-500/60 text-rose-300'
              }`}
            >
              {toastMessage.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* ── Left / Center Canvas Area ── */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 bg-slate-950 overflow-hidden relative cursor-crosshair select-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Floating Coordinate & Hint Bar */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 backdrop-blur-md shadow-lg pointer-events-none">
            <span>X: {cursorCoord.x}px</span>
            <span>Y: {cursorCoord.y}px</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 font-sans">
              {activeTool === 'select'
                ? 'Klik objek untuk geser/ubah ukuran'
                : 'Klik & tarik mouse untuk membuat kotak baru'}
            </span>
          </div>

          {/* The Zoomable / Pannable Map Container */}
          <div
            ref={mapCanvasRef}
            data-map-root="true"
            className="absolute origin-top-left transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: `${MAP_WIDTH}px`,
              height: `${MAP_HEIGHT}px`,
            }}
          >
            {/* Background School Map Atlas Image */}
            <img
              src="/assets/maps/school_atlas.png"
              alt="School Map Atlas"
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              draggable={false}
              className="absolute inset-0 pointer-events-none shadow-2xl rounded-sm"
            />

            {/* Optional 32x32 Grid Overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none opacity-25"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />
            )}

            {/* ── 1. COLLISION OBJECTS LAYER (Red Box) ── */}
            {showCollision &&
              collisionLayer?.objects?.map(obj => {
                const isSelected = selectedObjectId === obj.id;
                return (
                  <div
                    key={obj.id}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedObjectId(obj.id);
                      setSelectedLayerName('Collision');
                    }}
                    onMouseDown={e => {
                      if (activeTool !== 'select') return;
                      e.stopPropagation();
                      setSelectedObjectId(obj.id);
                      setSelectedLayerName('Collision');
                      setIsDraggingObject(true);
                      const pos = getMapCoordinates(e);
                      setDragOffset({ x: pos.x - obj.x, y: pos.y - obj.y });
                    }}
                    className={`absolute transition-colors cursor-move flex items-center justify-center text-center ${
                      isSelected
                        ? 'bg-rose-500/40 border-2 border-rose-400 ring-2 ring-rose-400/80 z-20 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                        : 'bg-rose-600/25 hover:bg-rose-600/35 border border-rose-500/80 z-10'
                    }`}
                    style={{
                      left: `${obj.x}px`,
                      top: `${obj.y}px`,
                      width: `${obj.width}px`,
                      height: `${obj.height}px`,
                    }}
                  >
                    <span className="text-[9px] font-black text-white px-1 py-0.5 bg-rose-950/80 rounded border border-rose-600/50 truncate max-w-[90%] pointer-events-none">
                      {obj.name}
                    </span>

                    {/* Resize Handles for Selected Object */}
                    {isSelected && (
                      <>
                        {(['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'] as ResizeHandle[]).map(handle => (
                          <div
                            key={handle}
                            onMouseDown={e => {
                              e.stopPropagation();
                              setActiveResizeHandle(handle);
                              setResizeInitialRect({ x: obj.x, y: obj.y, w: obj.width, h: obj.height });
                              setResizeStartPos(getMapCoordinates(e));
                            }}
                            className="absolute w-3 h-3 bg-white border-2 border-rose-600 rounded-sm z-30"
                            style={{
                              top: handle.includes('n') ? '-6px' : handle.includes('s') ? 'calc(100% - 6px)' : 'calc(50% - 6px)',
                              left: handle.includes('w') ? '-6px' : handle.includes('e') ? 'calc(100% - 6px)' : 'calc(50% - 6px)',
                            }}
                          />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}

            {/* ── 2. INTERACTION ZONES LAYER (Green Box) ── */}
            {showInteract &&
              interactLayer?.objects?.map(obj => {
                const isSelected = selectedObjectId === obj.id;
                return (
                  <div
                    key={obj.id}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedObjectId(obj.id);
                      setSelectedLayerName('Interact');
                    }}
                    onMouseDown={e => {
                      if (activeTool !== 'select') return;
                      e.stopPropagation();
                      setSelectedObjectId(obj.id);
                      setSelectedLayerName('Interact');
                      setIsDraggingObject(true);
                      const pos = getMapCoordinates(e);
                      setDragOffset({ x: pos.x - obj.x, y: pos.y - obj.y });
                    }}
                    className={`absolute transition-colors cursor-move flex items-center justify-center text-center ${
                      isSelected
                        ? 'bg-emerald-500/40 border-2 border-emerald-400 ring-2 ring-emerald-400/80 z-20 shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                        : 'bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-500/80 z-10'
                    }`}
                    style={{
                      left: `${obj.x}px`,
                      top: `${obj.y}px`,
                      width: `${obj.width}px`,
                      height: `${obj.height}px`,
                    }}
                  >
                    <span className="text-[9px] font-black text-white px-1 py-0.5 bg-emerald-950/80 rounded border border-emerald-600/50 truncate max-w-[90%] pointer-events-none">
                      {obj.properties?.find(p => p.name === 'label')?.value as string || obj.name}
                    </span>

                    {/* Resize Handles */}
                    {isSelected && (
                      <>
                        {(['nw', 'ne', 'se', 'sw'] as ResizeHandle[]).map(handle => (
                          <div
                            key={handle}
                            onMouseDown={e => {
                              e.stopPropagation();
                              setActiveResizeHandle(handle);
                              setResizeInitialRect({ x: obj.x, y: obj.y, w: obj.width, h: obj.height });
                              setResizeStartPos(getMapCoordinates(e));
                            }}
                            className="absolute w-3 h-3 bg-white border-2 border-emerald-600 rounded-sm z-30"
                            style={{
                              top: handle.includes('n') ? '-6px' : 'calc(100% - 6px)',
                              left: handle.includes('w') ? '-6px' : 'calc(100% - 6px)',
                            }}
                          />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}

            {/* ── 3. SPAWN POINT (Blue Marker) ── */}
            {showSpawn &&
              spawnLayer?.objects?.map(obj => (
                <div
                  key={obj.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-25 flex flex-col items-center pointer-events-none"
                  style={{ left: `${obj.x}px`, top: `${obj.y}px` }}
                >
                  <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[10px] text-white shadow-lg animate-pulse">
                    ★
                  </div>
                  <span className="text-[9px] font-bold bg-blue-950/90 text-blue-200 px-1 rounded border border-blue-500/40 mt-1 whitespace-nowrap">
                    Pemain Muncul ({obj.x}, {obj.y})
                  </span>
                </div>
              ))}

            {/* ── 4. LIVE DRAWING RECTANGLE PREVIEW ── */}
            {isDrawing && currentDrawRect && (
              <div
                className={`absolute border-2 border-dashed z-40 pointer-events-none ${
                  activeTool === 'draw_collision'
                    ? 'bg-rose-500/40 border-rose-300'
                    : 'bg-emerald-500/40 border-emerald-300'
                }`}
                style={{
                  left: `${currentDrawRect.x}px`,
                  top: `${currentDrawRect.y}px`,
                  width: `${currentDrawRect.w}px`,
                  height: `${currentDrawRect.h}px`,
                }}
              >
                <span className="absolute top-1 left-1 text-[9px] font-mono text-white bg-slate-900/90 px-1 rounded">
                  {currentDrawRect.w} × {currentDrawRect.h}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar: Object Inspector & List ── */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-20">
          {/* Layer Visibility Toggles */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/50">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">
              Lapisan Tampilan
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                onClick={() => setShowCollision(prev => !prev)}
                className={`px-2 py-1.5 rounded-xl border flex items-center justify-between font-bold transition-all ${
                  showCollision
                    ? 'bg-rose-950/60 border-rose-600/50 text-rose-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-500'
                }`}
                title="Tampilkan / Sembunyikan Kotak Tabrakan"
              >
                <span className="text-[11px]">🔴 Tabrak</span>
                {showCollision ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>

              <button
                onClick={() => setShowInteract(prev => !prev)}
                className={`px-2 py-1.5 rounded-xl border flex items-center justify-between font-bold transition-all ${
                  showInteract
                    ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-500'
                }`}
                title="Tampilkan / Sembunyikan Zona Interaksi"
              >
                <span className="text-[11px]">🟢 Interaksi</span>
                {showInteract ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>

              <button
                onClick={() => setShowSpawn(prev => !prev)}
                className={`px-2 py-1.5 rounded-xl border flex items-center justify-between font-bold transition-all ${
                  showSpawn
                    ? 'bg-blue-950/60 border-blue-600/50 text-blue-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-500'
                }`}
                title="Tampilkan / Sembunyikan Titik Spawn"
              >
                <span className="text-[11px]">🔵 Spawn</span>
                {showSpawn ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </div>
          </div>

          {/* Selected Object Inspector */}
          {selectedObject ? (
            <div className="p-4 border-b border-slate-800 bg-slate-850 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                  {selectedLayerName === 'Collision' ? 'Tabrakan Terpilih' : 'Interaksi Terpilih'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">ID #{selectedObject.object.id}</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Nama Objek</label>
                <input
                  type="text"
                  value={selectedObject.object.name}
                  onChange={e => updateObjectInState(selectedObject.object.id, { name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">X (px)</label>
                  <input
                    type="number"
                    value={selectedObject.object.x}
                    onChange={e => updateObjectInState(selectedObject.object.id, { x: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Y (px)</label>
                  <input
                    type="number"
                    value={selectedObject.object.y}
                    onChange={e => updateObjectInState(selectedObject.object.id, { y: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Lebar (W)</label>
                  <input
                    type="number"
                    value={selectedObject.object.width}
                    onChange={e => updateObjectInState(selectedObject.object.id, { width: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Tinggi (H)</label>
                  <input
                    type="number"
                    value={selectedObject.object.height}
                    onChange={e => updateObjectInState(selectedObject.object.id, { height: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleDuplicateObject(selectedObject.object, selectedObject.layerName)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Copy size={13} />
                  <span>Duplikat</span>
                </button>
                <button
                  onClick={() => handleDeleteObject(selectedObject.object.id)}
                  className="flex-1 py-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash2 size={13} />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-slate-800 text-center py-6 text-slate-500">
              <MousePointer size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">Pilih salah satu kotak di peta untuk mengedit ukuran dan posisinya.</p>
            </div>
          )}

          {/* List of All Objects */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-800">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari pohon, atap, kelas..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {allObjects.map(item => {
                const isSelected = selectedObjectId === item.obj.id;
                return (
                  <button
                    key={item.obj.id}
                    onClick={() => {
                      setSelectedObjectId(item.obj.id);
                      setSelectedLayerName(item.layer);
                      // Center pan to object
                      setPan({
                        x: Math.round(containerRef.current ? containerRef.current.clientWidth / 2 - item.obj.x * zoom : 0),
                        y: Math.round(containerRef.current ? containerRef.current.clientHeight / 2 - item.obj.y * zoom : 0),
                      });
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'hover:bg-slate-800/70 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.layer === 'Collision'
                            ? 'bg-rose-400'
                            : item.layer === 'Interact'
                            ? 'bg-emerald-400'
                            : 'bg-blue-400'
                        }`}
                      />
                      <span className="truncate">{item.obj.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                      {item.obj.width}×{item.obj.height}
                    </span>
                  </button>
                );
              })}

              {allObjects.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-6">Tidak ada objek yang cocok</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
