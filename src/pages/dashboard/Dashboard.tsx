/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameLevel, LevelHighScore } from '../../types';
import { Trophy, Star, ArrowLeft, Play, CheckCircle2, Volume2, VolumeX } from 'lucide-react';

interface DashboardProps {
  levels: GameLevel[];
  highScores: { [key: number]: LevelHighScore };
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function Dashboard({
  levels,
  highScores,
  onSelectLevel,
  onBack,
  isMuted,
  onToggleMute
}: DashboardProps) {
  const completedCount = Object.values(highScores).filter(s => s.completed).length;
  const totalStars = Object.values(highScores).reduce((sum, s) => sum + (s.stars || 0), 0);
  const maxStars = levels.length * 3;

  return (
    <div className="min-h-screen bg-[#FEF8F0] text-stone-900 flex flex-col selection:bg-indigo-500/30 font-sans leading-relaxed">
      {/* Dashboard Top Header Bar */}
      <header className="border-b border-[#EED4B7] bg-white sticky top-0 z-40 px-6 py-4 flex items-center justify-between" id="dashboard-header">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-[#EED4B7] bg-white hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer shadow-sm"
            title="Kembali ke Splash Screen"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-amber-950 flex items-center gap-2">
              Menu Pemilihan Misi
            </h1>
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Pilih level untuk menguji Computational Thinking Anda</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mute button */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl border border-[#EED4B7] bg-white hover:bg-stone-50 text-stone-600 transition-all cursor-pointer shadow-sm animate-fade-in"
            title={isMuted ? 'Nyalakan Audio' : 'Matikan Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-8">
        {/* Progress Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="stats-banner">
          {/* Card 1: Total Progress */}
          <div className="bg-white border border-[#EED4B7] rounded-3xl p-5 flex items-center gap-4 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl text-indigo-600">
              🏆
            </div>
            <div>
              <span className="text-[10px] text-stone-500 uppercase font-mono tracking-wider block font-bold">Misi Terselesaikan</span>
              <span className="text-xl font-bold font-sans text-stone-850">
                {completedCount} <span className="text-xs text-stone-400 font-normal">/ {levels.length} Level</span>
              </span>
            </div>
          </div>

          {/* Card 2: Star statistics */}
          <div className="bg-white border border-[#EED4B7] rounded-3xl p-5 flex items-center gap-4 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl text-amber-500">
              ⭐
            </div>
            <div>
              <span className="text-[10px] text-stone-500 uppercase font-mono tracking-wider block font-bold">Total Bintang</span>
              <span className="text-xl font-bold font-sans text-stone-850">
                {totalStars} <span className="text-xs text-stone-400 font-normal">/ {maxStars} Bintang</span>
              </span>
            </div>
          </div>

          {/* Card 3: Status Badge */}
          <div className="bg-white border border-[#EED4B7] rounded-3xl p-5 flex items-center gap-4 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl text-emerald-600">
              🧠
            </div>
            <div>
              <span className="text-[10px] text-stone-500 uppercase font-mono tracking-wider block font-bold">Predikat Berpikir</span>
              <span className="text-sm font-bold font-sans text-stone-855 block">
                {totalStars >= levels.length * 2.5
                  ? 'Master Algoritme'
                  : totalStars >= levels.length * 1.5
                  ? 'Logikawan Berbakat'
                  : completedCount > 0
                  ? 'Pemula Komputasional'
                  : 'Siap Belajar'}
              </span>
            </div>
          </div>
        </div>

        {/* Level List Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest font-mono">
            Daftar Misi Pemilahan Sampah
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {levels.map((level) => {
              const score = highScores[level.id];
              const isCompleted = score?.completed;
              const stars = score?.stars || 0;

              return (
                <div
                  key={level.id}
                  className="bg-white border border-[#EED4B7] transition-all rounded-3xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-indigo-400 hover:scale-[1.01]"
                  id={`dashboard-level-card-${level.id}`}
                >
                  {/* Decorative background glow on group hover */}
                  <div className="absolute -top-[50%] -right-[30%] w-[60%] aspect-square rounded-full bg-indigo-50/50 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                  <div className="space-y-4 z-10">
                    {/* Top Level Info */}
                    <div className="flex justify-between items-start gap-2">
                      <span className="px-2.5 py-1 bg-[#FEF8F0] border border-[#EED4B7]/70 rounded-lg text-[10px] font-bold text-indigo-700 tracking-wider font-mono uppercase">
                        Level {level.id}
                      </span>
                      {isCompleted && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/10" />
                          Selesai
                        </div>
                      )}
                    </div>

                    {/* Level Name */}
                    <div>
                      <h3 className="text-base font-extrabold text-amber-955 font-sans tracking-tight group-hover:text-indigo-600 transition-colors">
                        {level.name.split('. ').slice(1).join('. ') || level.name}
                      </h3>
                      <p className="text-xs text-stone-500 mt-1.5 leading-relaxed line-clamp-2">
                        {level.description}
                      </p>
                    </div>

                    {/* Level Details Specs */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-stone-500 border-t border-b border-[#FEF8F0] py-2.5">
                      <div>
                        Ukuran Peta: <span className="text-stone-800 font-bold">{level.gridSize.width} × {level.gridSize.height}</span>
                      </div>
                      <div>
                        Kapasitas Tas: <span className="text-stone-800 font-bold">{level.maxCapacity} Sampah</span>
                      </div>
                      <div>
                        Batas Blok: <span className="text-stone-800 font-bold">{level.maxInstructions} Baris</span>
                      </div>
                      {isCompleted && score.minSteps && (
                        <div>
                          Skor Terbaik: <span className="text-emerald-600 font-extrabold">{score.minSteps} lgh</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stars Rating & Main Action Button */}
                  <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-[#FEF8F0] z-10">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= stars
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-stone-200'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => onSelectLevel(level.id)}
                      className="px-4 py-2 bg-[#00ADEF] hover:bg-[#009CD7] text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 border border-[#009CD7]"
                    >
                      {isCompleted ? 'Main Ulang' : 'Mulai Misi'}
                      <Play className="w-3 h-3 fill-white" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
