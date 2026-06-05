/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canvas-based grid renderer — multi-robot version.
 * Supports zoom (scroll wheel), pan (drag), responsive sizing,
 * and renders all game elements (obstacles, trash, trash cans, 3 robots, trails)
 * with high performance for grids of any size.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Backpack } from 'lucide-react';
import { GridPos, TrashOnGrid, TrashCanOnGrid, ObstacleOnGrid, TrashItem, RobotId } from '../../../types';

export interface RobotRenderData {
  id: RobotId;
  pos: GridPos;
  facingDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  trailPositions: GridPos[];
  backpack: TrashItem[];
  backpackCapacity: number;
}

interface GridMapProps {
  width: number;
  height: number;
  robots: RobotRenderData[];
  trashItems: TrashOnGrid[];
  trashCans: TrashCanOnGrid[];
  obstacles: ObstacleOnGrid[];
  isExecuting: boolean;
}

const ROBOT_COLORS: Record<RobotId, { bg: string; border: string; eye: string; label: string }> = {
  ORGANIC: { bg: '#10B981', border: '#059669', eye: '#A7F3D0', label: 'Organik' },
  RECYCLABLE: { bg: '#F59E0B', border: '#D97706', eye: '#FDE68A', label: 'Daur Ulang' },
  B3: { bg: '#8B5CF6', border: '#7C3AED', eye: '#C4B5FD', label: 'B3' },
};

const ROBOT_EMOJIS: Record<RobotId, string> = {
  ORGANIC: '🤖',
  RECYCLABLE: '🤖',
  B3: '🤖',
};

// Colors
const COLORS = {
  bg: '#FEF8F0',
  cellBorder: '#EED4B7',
  cellBg: '#FFFFFF',
  cellActive: '#EEF2FF',
  cellActiveBorder: '#818CF8',
  cellObstacle: '#FFF5EB',
  cellCan: '#FFFFFF',
  trail: '#A5B4FC',
  trailAlpha: 0.3,
  canLabelBg: '#FEF8F0',
  canLabelBorder: '#EED4B7',
  canLabelText: '#78716C',
};

// roundRect polyfill for older browsers
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default function GridMap(props: GridMapProps) {
  const {
    width, height, robots,
    trashItems, trashCans, obstacles,
    isExecuting
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetAtDragStart = useRef({ x: 0, y: 0 });

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Backpack overlay visibility state
  const [showBackpack, setShowBackpack] = useState(true);

  // Cell size calculation
  const getCellSize = useCallback((containerW: number, containerH: number) => {
    const padding = 16;
    const availW = containerW - padding * 2;
    const availH = containerH - padding * 2;
    const cellFromW = availW / width;
    const cellFromH = availH / height;
    return Math.max(24, Math.min(cellFromW, cellFromH));
  }, [width, height]);

  // Drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    const baseCellSize = getCellSize(w, h);
    const cellSize = baseCellSize * zoom;
    const gridW = cellSize * width;
    const gridH = cellSize * height;
    const padX = (w - gridW) / 2 + offset.x;
    const padY = (h - gridH) / 2 + offset.y;

    const toScreen = (gx: number, gy: number) => ({
      x: padX + gx * cellSize,
      y: padY + gy * cellSize,
    });

    // Collect all occupied positions (by players)
    const occupiedPositions = new Set(robots.map(r => `${r.pos.x},${r.pos.y}`));

    // Helper: find items
    const findTrash = (x: number, y: number) =>
      trashItems.find(t => t.pos.x === x && t.pos.y === y && !t.collected);
    const findTrashCan = (x: number, y: number) =>
      trashCans.find(tc => tc.pos.x === x && tc.pos.y === y);
    const findObstacle = (x: number, y: number) =>
      obstacles.find(o => o.pos.x === x && o.pos.y === y);
    const isTrail = (x: number, y: number) =>
      robots.some(r => r.trailPositions.some(p => p.x === x && p.y === y));
    const getTrailRobots = (x: number, y: number) =>
      robots.filter(r => r.trailPositions.some(p => p.x === x && p.y === y));

    // Draw grid cells
    for (let gy = 0; gy < height; gy++) {
      for (let gx = 0; gx < width; gx++) {
        const cellW = cellSize;
        const cellH = cellSize;
        const gap = 0;
        const { x: cx, y: cy } = toScreen(gx, gy);

        const robotHere = robots.find(r => r.pos.x === gx && r.pos.y === gy);
        const hasCan = findTrashCan(gx, gy);
        const hasObs = findObstacle(gx, gy);

        // Cell background
        let bg = COLORS.cellBg;
        let border = COLORS.cellBorder;

        if (robotHere) { bg = COLORS.cellActive; border = COLORS.cellActiveBorder; }
        else if (hasCan) { bg = COLORS.cellCan; border = COLORS.cellBorder; }
        else if (hasObs) { bg = COLORS.cellObstacle; border = COLORS.cellBorder; }

        ctx.fillStyle = bg;
        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        const r = 6;
        const rx = cx + gap / 2;
        const ry = cy + gap / 2;
        const rw = cellW - gap;
        const rh = cellH - gap;

        // Rounded rect
        ctx.beginPath();
        roundRectPath(ctx, rx, ry, rw, rh, r);
        ctx.fill();
        ctx.stroke();

        const cx2 = cx + cellW / 2;
        const cy2 = cy + cellH / 2;

        // Trail dot (only if no robot/can/obstacle is here)
        if (!robotHere && !hasCan && !hasObs) {
          const trailRobots = getTrailRobots(gx, gy);
          if (trailRobots.length > 0) {
            // Draw trail as small colored dots
            trailRobots.forEach((_, idx) => {
              const offsetX = (idx - (trailRobots.length - 1) / 2) * 6;
              ctx.beginPath();
              ctx.arc(cx2 + offsetX, cy2, 3, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
              ctx.fill();
            });
          }
        }

        // Obstacle emoji
        if (hasObs) {
          ctx.font = `${Math.min(cellSize * 0.55, 28)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(hasObs.emoji, cx2, cy2);
        }

        // Trash item emoji (only if no robot is standing here)
        const hasTrash = findTrash(gx, gy);
        if (hasTrash && !robotHere) {
          ctx.font = `${Math.min(cellSize * 0.5, 24)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(hasTrash.item.emoji, cx2, cy2);
        }

        // Trash can
        if (hasCan) {
          ctx.font = `${Math.min(cellSize * 0.45, 24)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(hasCan.emoji, cx2, cy2 - cellSize * 0.08);

          if (cellSize > 32) {
            const labelSize = Math.max(6, cellSize * 0.16);
            const labelW = cellSize * 0.55;
            const labelH = labelSize * 1.3;
            const labelX = cx2 - labelW / 2;
            const labelY = cy2 + cellSize * 0.28;

            ctx.fillStyle = COLORS.canLabelBg;
            ctx.strokeStyle = COLORS.canLabelBorder;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            roundRectPath(ctx, labelX, labelY, labelW, labelH, 3);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = COLORS.canLabelText;
            ctx.font = `bold ${labelSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hasCan.label, cx2, labelY + labelH / 2);
          }

          // Robot overlap glow — for any robot standing on the can
          robots.forEach(r => {
            if (r.pos.x === gx && r.pos.y === gy) {
              const colors = ROBOT_COLORS[r.id];
              ctx.beginPath();
              ctx.arc(cx2, cy2, cellW * 0.4, 0, Math.PI * 2);
              ctx.strokeStyle = hexToRgba(colors.bg, 0.35);
              ctx.lineWidth = 3;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          });
        }

        // Player robots
        robots.forEach(r => {
          if (r.pos.x === gx && r.pos.y === gy) {
            drawRobot(ctx, cx2, cy2, cellSize, r);
          }
        });
      }
    }
  }, [width, height, robots, trashItems, trashCans, obstacles, isExecuting, zoom, offset, getCellSize]);

  // Draw a single robot with its color
  const drawRobot = (ctx: CanvasRenderingContext2D, cx: number, cy: number, cellSize: number, robot: RobotRenderData) => {
    const colors = ROBOT_COLORS[robot.id];
    const robotSize = Math.min(cellSize * 0.55, 34);
    const rx = cx;
    const ry = cy;

    // Robot body
    ctx.save();
    ctx.translate(rx, ry);
    let angle = 0;
    switch (robot.facingDir) {
      case 'UP': angle = 0; break;
      case 'RIGHT': angle = Math.PI / 2; break;
      case 'DOWN': angle = Math.PI; break;
      case 'LEFT': angle = -Math.PI / 2; break;
    }
    ctx.rotate(angle);

    // Body rectangle
    const bw = robotSize;
    const bh = robotSize;
    ctx.fillStyle = colors.bg;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRectPath(ctx, -bw / 2, -bh / 2, bw, bh, 5);
    ctx.fill();
    ctx.stroke();

    // Eyes (simple dots)
    const eyeR = robotSize * 0.08;
    ctx.fillStyle = colors.eye;
    ctx.beginPath();
    ctx.arc(-bw * 0.18, -bh * 0.12, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bw * 0.18, -bh * 0.12, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Direction triangle
    ctx.fillStyle = colors.eye;
    ctx.font = `${robotSize * 0.25}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶', 0, bh * 0.35);

    ctx.restore();
  };

  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Keep latest draw in a ref so ResizeObserver always calls the current version
  const drawRef = useRef(draw);
  drawRef.current = draw;

  // Redraw on state changes
  useEffect(() => {
    drawRef.current();
  }, [draw]);

  // Resize observer — created once, calls latest draw via ref
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => drawRef.current());
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Manual wheel listener with { passive: false } to prevent browser warning
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.shiftKey || e.metaKey))) {
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      offsetAtDragStart.current = { ...offset };
      e.preventDefault();
    }
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setOffset({
        x: offsetAtDragStart.current.x + dx,
        y: offsetAtDragStart.current.y + dy,
      });
    }

    // Tooltip logic
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const baseCellSize = getCellSize(rect.width, rect.height);
    const cellSizeVal = baseCellSize * zoom;
    const gridW = cellSizeVal * width;
    const gridH = cellSizeVal * height;
    const padX = (rect.width - gridW) / 2 + offset.x;
    const padY = (rect.height - gridH) / 2 + offset.y;

    const gx = Math.floor((mx - padX) / cellSizeVal);
    const gy = Math.floor((my - padY) / cellSizeVal);

    if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
      const robotHere = robots.find(r => r.pos.x === gx && r.pos.y === gy);
      const hasTrash = trashItems.find(t => t.pos.x === gx && t.pos.y === gy && !t.collected);
      const hasCan = trashCans.find(tc => tc.pos.x === gx && tc.pos.y === gy);
      const hasObs = obstacles.find(o => o.pos.x === gx && o.pos.y === gy);

      let text = `(${gx}, ${gy})`;
      if (robotHere) text = `${ROBOT_COLORS[robotHere.id].label} 🤖 (${gx}, ${gy})`;
      else if (hasTrash) text = `${hasTrash.item.name} — ${hasTrash.item.emoji}`;
      else if (hasCan) text = `Tong ${hasCan.label} ${hasCan.emoji}`;
      else if (hasObs) text = `${hasObs.type} ${hasObs.emoji}`;

      // Position tooltip below cursor with safe bounds
      const tx = Math.min(e.clientX - rect.left + 12, rect.width - 160);
      const ty = Math.min(e.clientY - rect.top + 20, rect.height - 32);
      setTooltip({ text, x: tx, y: ty });
    } else {
      setTooltip(null);
    }
  }, [width, height, offset, zoom, robots, trashItems, trashCans, obstacles, getCellSize]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    setTooltip(null);
  }, []);

  // Reset zoom/pan on grid size change
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [width, height]);

  // Sum all backpacks for total count
  const totalBackpack = robots.reduce((sum, r) => sum + r.backpack.length, 0);
  const totalCapacity = robots.reduce((sum, r) => sum + r.backpackCapacity, 0);

  return (
    <div className="flex flex-col bg-white border border-[#EED4B7] rounded-2xl sm:rounded-3xl p-1 md:p-6 shadow-xl h-full select-none" id="grid-map-container">
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden rounded-2xl border border-[#EED4B7]/80"
        style={{ minHeight: 280, cursor: isDragging.current ? 'grabbing' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
        />

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
            className="w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white border border-[#EED4B7] rounded-lg text-sm font-bold text-stone-700 shadow-sm cursor-pointer transition-colors"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(prev => Math.max(0.3, prev / 1.2))}
            className="w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white border border-[#EED4B7] rounded-lg text-sm font-bold text-stone-700 shadow-sm cursor-pointer transition-colors"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
            className="w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white border border-[#EED4B7] rounded-lg text-[10px] font-bold text-stone-500 shadow-sm cursor-pointer transition-colors"
            title="Reset zoom"
          >
            ⟲
          </button>
          <button
            type="button"
            onClick={() => setShowBackpack(prev => !prev)}
            className="w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white border border-[#EED4B7] rounded-lg shadow-sm cursor-pointer transition-colors"
            title={showBackpack ? "Sembunyikan status tas" : "Tampilkan status tas"}
          >
            <Backpack className={`w-4 h-4 ${showBackpack ? 'text-indigo-650' : 'text-stone-400'}`} />
          </button>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 px-2.5 py-1.5 bg-gray-900/90 text-white text-[11px] font-mono rounded-lg pointer-events-none whitespace-nowrap shadow-lg"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.text}
          </div>
        )}

        {/* Multi-robot Backpack overlay */}
        {showBackpack && (
          <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-sm border border-[#EED4B7] rounded-xl px-3 py-2 shadow-lg" id="backpack-overlay">
            {robots.map(r => {
              const colors = ROBOT_COLORS[r.id];
              return (
                <div key={r.id} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: colors.bg }}
                  />
                  <span className="text-[9px] font-bold text-stone-600 uppercase font-mono tracking-wider">{colors.label}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: r.backpackCapacity }, (_, i) => {
                      const item = r.backpack[i];
                      return item ? (
                        <span key={item.id} className="text-xs">{item.emoji}</span>
                      ) : (
                        <span key={`empty-${r.id}-${i}`} className="w-3 h-3 rounded border border-dashed border-[#EED4B7] bg-[#FEF8F0]"></span>
                      );
                    })}
                  </div>
                  <span className={`text-[8px] font-mono font-bold ${r.backpack.length === 0 ? 'text-stone-400' : ''}`} style={{ color: r.backpack.length > 0 ? colors.border : undefined }}>
                    {r.backpack.length}/{r.backpackCapacity}
                  </span>
                </div>
              );
            })}
            {totalBackpack > 0 && (
              <div className="text-[8px] text-stone-500 font-mono text-right border-t border-[#EED4B7]/50 pt-1 mt-0.5">
                Total: {totalBackpack}/{totalCapacity}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
