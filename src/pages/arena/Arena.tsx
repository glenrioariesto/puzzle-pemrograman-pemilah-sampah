/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameLevel, LevelHighScore, RobotId } from '../../types';

// Import subcomponents
import GridMap, { RobotRenderData } from './components/GridMap';
import CommandPanel from './components/CommandPanel';
import RotateDevicePrompt from './components/RotateDevicePrompt';

// Import custom hook
import { useArenaGame } from './hooks/useArenaGame';

// Icons
import { X } from 'lucide-react';

interface ArenaProps {
  level: GameLevel;
  highScores: { [key: number]: LevelHighScore };
  onSaveHighScore: (levelId: number, stars: number, minSteps: number) => void;
  onBackToDashboard: () => void;
  onNextLevel: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const ROBOT_COLORS: Record<RobotId, { bg: string; border: string }> = {
  ORGANIC: { bg: '#10B981', border: '#059669' },
  RECYCLABLE: { bg: '#F59E0B', border: '#D97706' },
  B3: { bg: '#8B5CF6', border: '#7C3AED' },
};

export default function Arena({
  level,
  highScores,
  onSaveHighScore,
  onBackToDashboard,
  onNextLevel,
  isMuted,
  onToggleMute
}: ArenaProps) {
  // Use custom hook to manage simulation states and event handlers
  const {
    activeRobot,
    setActiveRobot,
    robotStates,
    isExecuting,
    activeTrash,
    logs,
    gameResult,
    resultStars,
    totalSteps,
    showResultModal,
    setShowResultModal,
    showHintsModal,
    setShowHintsModal,
    execSpeed,
    setExecSpeed,
    totalBlockCount,
    handleAddCommand,
    handleClearInstructions,
    handleDeleteCommand,
    handleMoveCommandUp,
    handleMoveCommandDown,
    handleStartExecution,
    handleStopExecution,
    handleReset,
    playSound
  } = useArenaGame(level, isMuted, onSaveHighScore);

  // Build render data for GridMap
  const robotRenderData: RobotRenderData[] = (level.robots || []).map(robot => {
    const state = robotStates[robot.id];
    return {
      id: robot.id,
      pos: state?.pos || robot.startPos,
      facingDir: state?.facingDir || 'RIGHT',
      trailPositions: state?.trailPositions || [],
      backpack: state?.backpack || [],
      backpackCapacity: level.maxCapacity,
    };
  });

  return (
    <div className="h-dvh overflow-hidden bg-[#FEF8F0] text-[#1C1917] flex flex-col selection:bg-indigo-500/30 font-sans leading-relaxed">
      <RotateDevicePrompt />

      {/* Main Core Layout Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 flex flex-col min-h-0">
        {/* Main Grid: Canvas responsive */}
        <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
          {/* Left workspace: Command builder */}
          <div className="col-span-5 flex flex-col min-h-0" id="left-workspace">
            <CommandPanel
              level={level}
              activeRobot={activeRobot}
              instructions={robotStates[activeRobot]?.instructions || []}
              onAddCommand={handleAddCommand}
              onClearInstructions={handleClearInstructions}
              onDeleteCommand={handleDeleteCommand}
              onMoveCommandUp={handleMoveCommandUp}
              onMoveCommandDown={handleMoveCommandDown}
              onSelectRobot={setActiveRobot}
              isExecuting={isExecuting}
              onStartExecution={handleStartExecution}
              onStopExecution={handleStopExecution}
              activeInstructionId={robotStates[activeRobot]?.activeInstructionId || null}
              execSpeed={execSpeed}
              onSetExecSpeed={setExecSpeed}
              onReset={handleReset}
              totalBlockCount={totalBlockCount}
            />
          </div>

          {/* Right workspace: Canvas map */}
          <div className="col-span-7 flex flex-col min-h-0" id="right-workspace">
            <GridMap
              width={level.gridSize.width}
              height={level.gridSize.height}
              robots={robotRenderData}
              trashItems={activeTrash}
              trashCans={level.trashCans}
              obstacles={level.obstacles}
              isExecuting={isExecuting}
            />
          </div>
        </div>
      </main>

      {/* Modal: Game Results */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto animate-fade-in" id="game-results-modal-backdrop">
          <div className="bg-white border border-[#EED4B7] rounded-3xl p-6 sm:p-8 max-w-sm w-full max-h-[90vh] sm:max-h-[85vh] shadow-2xl relative text-center flex flex-col my-auto animate-scale-up" id="game-results-modal">
            <div className="flex-1 overflow-y-auto custom-scrollbar-light pr-1 py-1 space-y-6">
              {gameResult === 'SUCCESS' ? (
                <div className="space-y-4" id="modal-success-screen">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-md animate-bounce-slow">
                    🎉
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold font-sans text-emerald-600">Misi Selesai!</h3>
                    <p className="text-xs text-gray-500 font-medium">Semua sampah terpilah sempurna!</p>
                  </div>
                  {/* Stars */}
                  <div className="flex justify-center items-center gap-2" id="star-rewards">
                    {[1, 2, 3].map((star) => (
                      <div key={star} className="relative group">
                        <StarIcon className={`w-9 h-9 transition-all ${star <= resultStars ? 'text-amber-500 fill-amber-500 scale-110' : 'text-stone-200'}`} />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-stone-700 font-bold px-4 py-2.5 bg-[#FEF8F0] rounded-xl border border-[#EED4B7]">
                    Total langkah 3 robot: <b>{totalSteps} langkah</b>
                    <br />
                    <span className="text-[10px] text-stone-500 font-mono italic">
                      (Target Bintang 3: ≤ {level.starsThreshold.three} lgh)
                    </span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button onClick={() => { playSound('click'); handleReset(); setShowResultModal(false); }}
                      className="flex-1 py-3 border border-[#EED4B7] bg-white text-stone-700 text-xs font-bold rounded-xl cursor-pointer hover:bg-stone-50 shadow-sm">
                      Ulangi Rute 🔄
                    </button>
                    <button onClick={() => { playSound('click'); setShowResultModal(false); onNextLevel(); }}
                      className="flex-1 py-3 bg-[#00ADEF] hover:bg-[#009CD7] border border-[#009CD7] font-bold text-xs text-white rounded-xl shadow-sm cursor-pointer transition-colors">
                      Misi Berikutnya ➡️
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4" id="modal-failed-screen">
                  <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-500 text-rose-500 flex items-center justify-center mx-auto text-3xl shadow-md">
                    💥
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold font-sans text-rose-500">Robot Berhenti!</h3>
                    <p className="text-xs text-stone-500 font-medium">Eksekusi gagal — periksa program robot.</p>
                  </div>
                  <div className="p-3 bg-[#FEF8F0] rounded-xl border border-[#EED4B7] text-left text-xs space-y-1">
                    <span className="font-bold text-rose-700">Catatan Sorter:</span>
                    <p className="text-stone-600 leading-normal text-[11px]">
                      {logs[logs.length - 1] || 'Pastikan setiap robot mengambil sampah yang benar dan membuang ke tong yang sesuai.'}
                    </p>
                  </div>
                  <div className="flex gap-2.5 pt-2">
                    <button onClick={() => { playSound('click'); setShowResultModal(false); }}
                      className="flex-1 py-3 border border-[#EED4B7] bg-white rounded-xl text-xs font-bold text-stone-500 hover:text-stone-700 cursor-pointer hover:bg-stone-50 shadow-sm">
                      Kembali Kode
                    </button>
                    <button onClick={() => { playSound('click'); handleReset(); setShowResultModal(false); }}
                      className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                      Coba Lagi 🔄
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Hints */}
      {showHintsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto animate-fade-in" id="level-hints-modal-backdrop">
          <div className="bg-white border border-[#EED4B7] rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] shadow-2xl relative flex flex-col my-auto animate-scale-up" id="level-hints-modal">
            <div className="flex items-center justify-between border-b border-[#EED4B7] pb-3 pr-8 relative">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💡</span>
                <div>
                  <h3 className="text-lg font-bold text-amber-955 font-sans tracking-tight">Detail Misi & Petunjuk</h3>
                  <p className="text-xs text-amber-800 font-bold">Level {level.id}: {level.name.split('. ').slice(1).join('. ') || level.name}</p>
                </div>
              </div>
              <button onClick={() => { playSound('click'); setShowHintsModal(false); }}
                className="absolute top-0 right-0 p-1.5 hover:bg-stone-100 rounded-lg text-stone-500 hover:text-stone-800 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar-light pr-1 py-4 space-y-4 text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
              <div className="space-y-1.5 bg-[#FEF8F0] p-4 rounded-2xl border border-[#EED4B7]/70">
                <span className="font-bold text-indigo-700 flex items-center gap-1">🎯 TUJUAN MISI</span>
                <p className="text-stone-700">{level.description}</p>
                {/* Robot info */}
                <div className="mt-2 pt-2 border-t border-[#EED4B7]/50 space-y-1">
                  <span className="font-bold text-indigo-700 flex items-center gap-1 text-[11px]">🤖 KARAKTER ROBOT</span>
                  {level.robots?.map(r => {
                    const colors = ROBOT_COLORS[r.id];
                    return (
                      <div key={r.id} className="flex items-center gap-2 text-[11px]">
                        <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: colors.bg }} />
                        <span className="font-bold">{r.name}</span>
                        <span className="text-stone-500">mulai di ({r.startPos.x}, {r.startPos.y})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2 bg-[#FEF8F0] p-4 rounded-2xl border border-[#EED4B7]/70">
                <span className="font-bold text-indigo-700 flex items-center gap-1 text-[11px] tracking-wider uppercase font-mono">
                  ⭐ TARGET EFISIENSI BINTANG
                </span>
                <div className="text-xs font-mono text-stone-600 mt-1">
                  <div className="flex justify-between border-b border-[#FEF8F0] pb-1.5">
                    <span>⭐⭐⭐ Bintang 3:</span>
                    <span className="text-amber-600 font-extrabold">≤ {level.starsThreshold.three} Langkah (total)</span>
                  </div>
                  <div className="flex justify-between border-b border-[#FEF8F0] pb-1.5 mt-1">
                    <span>⭐⭐ Bintang 2:</span>
                    <span className="text-stone-600">≤ {level.starsThreshold.two} Langkah (total)</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <span className="font-bold text-indigo-700 flex items-center gap-1">🧠 PETUNJUK PENYELESAIAN</span>
                <ul className="space-y-2 pl-1">
                  {level.hints.map((hint, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-stone-500 text-xs leading-normal">
                      <span className="text-indigo-600 font-bold mt-0.5">•</span>
                      <span>{hint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="pt-3 border-t border-[#EED4B7]/50">
              <button onClick={() => { playSound('click'); setShowHintsModal(false); }}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 border border-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1">
                Mulai Selesaikan Misi!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StarIcon({ className }: { className: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.195-.572 1.045-.572 1.24 0l1.98 5.8 6.13.43c.613.043.86.82.387 1.218l-4.577 3.82 1.488 5.75c.149.576-.484 1.037-1.026.712L12 18.16l-5.02 2.87c-.542.325-1.175-.136-1.026-.712l1.488-5.75L2.865 10.95c-.473-.399-.226-1.175.387-1.218l6.13-.43 1.98-5.8z" />
    </svg>
  );
}
