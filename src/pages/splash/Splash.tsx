/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Volume2, VolumeX, BookOpen } from 'lucide-react';

interface SplashProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onShowHowToPlay: () => void;
}

export default function Splash({ onStart, isMuted, onToggleMute, onShowHowToPlay }: SplashProps) {
  return (
    <div className="relative max-h-screen h-screen w-full flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FCDCB5]/10 via-[#FEF8F0] to-[#FEF8F0] selection:bg-indigo-500/30 font-sans leading-relaxed">
      {/* Top Left Logo */}
      <div className="absolute top-6 left-6 flex items-center gap-3 animate-fade-in select-none">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center border border-indigo-400 shadow-md">
          <span className="text-2xl">🤖</span>
        </div>
        <div className="text-left hidden sm:block">
          <span className="font-extrabold text-sm sm:text-base text-gray-900 tracking-wider font-sans block leading-none">SUKA SORTER</span>
          <span className="text-[10px] text-gray-500 tracking-tight block mt-0.5">Pemilah Sampah Pintar</span>
        </div>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-2 animate-fade-in">
        <button
          onClick={onToggleMute}
          className="p-2.5 rounded-xl border border-[#EED4B7] bg-white hover:bg-stone-50 text-stone-600 transition-all cursor-pointer shadow-sm"
          title={isMuted ? 'Nyalakan Audio' : 'Matikan Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
        </button>

        <button
          onClick={onShowHowToPlay}
          className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 hover:bg-indigo-100 transition-colors cursor-pointer shadow-sm"
        >
          <BookOpen className="w-3.5 h-3.5" /> Cara Bermain
        </button>
      </div>

      {/* Background Decorative Glow Circles */}
      <div className="absolute -top-[20%] -left-[20%] w-[60%] aspect-square rounded-full bg-[#FCDCB5]/15 blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-[20%] -right-[20%] w-[60%] aspect-square rounded-full bg-[#00ADEF]/5 blur-[120px] pointer-events-none"></div>

      {/* Centered Splash Hero Panel */}
      <div className="z-10 max-w-xl flex flex-col items-center">
        {/* Tech Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#FCDCB5]/30 border border-[#E9BE91]/40 rounded-full text-[11px] sm:text-xs font-bold text-amber-950 mb-6 uppercase tracking-widest animate-scale-up">
          <span className="w-2 h-2 rounded-full bg-[#00ADEF] animate-pulse"></span>
          Computational Thinking Puzzle
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-amber-950 leading-tight mb-5 animate-scale-up" style={{ animationDelay: '100ms' }}>
          Pilah Sampah,<br className="sm:hidden" /> Kuasai Logika!
        </h1>

        {/* Subtext description */}
        <p className="text-xs sm:text-sm md:text-base text-gray-500 max-w-md sm:max-w-lg leading-relaxed mb-8 px-4 animate-scale-up" style={{ animationDelay: '200ms' }}>
          Bantu robot pintar Sorter membersihkan taman kota. Rancang urutan algoritme gerakan, ambil sampah organik/anorganik, dan pilah ke wadah yang serasi untuk menguji keterampilan logika Anda!
        </p>

        {/* Start Button */}
        <div className="animate-scale-up" style={{ animationDelay: '300ms' }}>
          <button
            onClick={onStart}
            className="px-8 py-4 bg-[#00ADEF] hover:bg-[#009CD7] border border-[#009CD7] text-white font-bold text-sm sm:text-base rounded-2xl cursor-pointer shadow-lg active:scale-98 hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            Mulai Petualangan <ArrowRight className="w-5 h-5 animate-bounce-horizontal" />
          </button>
        </div>
      </div>

      {/* Decorative Bottom Slogan */}
      <div className="absolute bottom-6 text-[10px] sm:text-xs text-gray-400 font-mono animate-fade-in tracking-wider select-none">
        KATEGORI: SAINS KOMPUTER • ALGORITME • ABSTRAKSI
      </div>
    </div>
  );
}
