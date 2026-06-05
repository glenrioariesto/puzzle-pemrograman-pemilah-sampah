/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrashItem } from '../../../types';
import { Backpack as BackpackIcon, Sparkles } from 'lucide-react';

interface BackpackProps {
  items: TrashItem[];
  capacity: number;
}

export default function Backpack({ items, capacity }: BackpackProps) {
  // Pad the array with nulls to show empty slots up to capacity
  const slots = Array.from({ length: capacity }, (_, i) => items[i] || null);

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'ORGANIC': return 'border-emerald-350 bg-emerald-50';
      case 'RECYCLABLE': return 'border-amber-350 bg-amber-50';
      case 'RESIDUE': return 'border-rose-350 bg-rose-50';
      default: return 'border-[#EED4B7]';
    }
  };

  const getLabelColor = (type: string) => {
    switch (type) {
      case 'ORGANIC': return 'text-emerald-700 bg-emerald-50 border-emerald-250';
      case 'RECYCLABLE': return 'text-amber-700 bg-amber-50 border-amber-250';
      case 'RESIDUE': return 'text-rose-700 bg-rose-50 border-rose-250';
      default: return 'text-gray-500';
    }
  };

  const getTypeNameInIndonesian = (type: string) => {
    switch (type) {
      case 'ORGANIC': return 'Organik';
      case 'RECYCLABLE': return 'Daur Ulang';
      case 'RESIDUE': return 'Residu';
      default: return '';
    }
  };

  return (
    <div className="bg-white border border-[#EED4B7] rounded-3xl p-6 shadow-xl space-y-4" id="backpack-container">
      <div className="flex items-center justify-between border-b border-[#EED4B7] pb-3">
        <div className="flex items-center gap-2">
          <BackpackIcon className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-extrabold text-amber-955 font-sans tracking-tight">Tas Punggung Sorter</h2>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
          Kapasitas: {items.length} / {capacity}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2.5">
        {slots.map((item, idx) => {
          if (item) {
            return (
              <div
                key={`${item.id}-${idx}`}
                className={`relative flex flex-col items-center justify-center rounded-xl p-2 border aspect-square hover:scale-105 transition-all duration-300 ${getBorderColor(item.type)}`}
                id={`backpack-slot-filled-${idx}`}
              >
                <span className="text-2xl filter drop-shadow group-hover:scale-110 transition-transform">
                  {item.emoji}
                </span>
                <span className={`absolute -bottom-1 px-1 py-0.1 border rounded text-[6px] tracking-wider font-extrabold uppercase truncate max-w-full ${getLabelColor(item.type)}`}>
                  {getTypeNameInIndonesian(item.type)}
                </span>
              </div>
            );
          }

          return (
            <div
              key={`empty-${idx}`}
              className="flex items-center justify-center rounded-xl border border-dashed border-[#EED4B7] bg-[#FEF8F0] aspect-square text-gray-400 font-mono text-[11px]"
              id={`backpack-slot-empty-${idx}`}
            >
              {idx + 1}
            </div>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="text-center p-2.5 text-[11px] text-gray-500 italic bg-[#FEF8F0] border border-[#EED4B7]/45 rounded-xl">
          Tas kosong. Ambil sampah di sekitarmu!
        </div>
      ) : (
        <div className="text-[10px] text-stone-600 flex items-center gap-1.5 bg-indigo-55 bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 animate-pulse" />
          <span>Robot sedang mengangkut {items.length} jenis sampah. Pergi ke tong sampah yang serasi lalu gunakan block <b>Buang Sampah</b> (🗑️).</span>
        </div>
      )}
    </div>
  );
}
