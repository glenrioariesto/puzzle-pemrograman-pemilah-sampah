/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Instruction } from '../../../types';
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface InstructionBlockProps {
  instruction: Instruction;
  onDelete: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  activeInstructionId?: string | null;
}

export default function InstructionBlock({
  instruction,
  onDelete,
  onMoveUp,
  onMoveDown,
  activeInstructionId,
}: InstructionBlockProps) {
  const isExecutingCurrent = activeInstructionId === instruction.id;

  // Render visual block depending on command type
  const getBlockConfig = (type: string) => {
    switch (type) {
      case 'UP':
        return { bg: 'bg-[#00ADEF] border-[#009CD7] text-white shadow-sm font-semibold', emoji: '⬆️', label: 'Maju' };
      case 'DOWN':
        return { bg: 'bg-[#00ADEF] border-[#009CD7] text-white shadow-sm font-semibold', emoji: '⬇️', label: 'Mundur' };
      case 'LEFT':
        return { bg: 'bg-[#00ADEF] border-[#009CD7] text-white shadow-sm font-semibold', emoji: '⬅️', label: 'Belok Kiri' };
      case 'RIGHT':
        return { bg: 'bg-[#00ADEF] border-[#009CD7] text-white shadow-sm font-semibold', emoji: '➡️', label: 'Belok Kanan' };
      case 'PICK':
        return { bg: 'bg-[#00B050] border-[#009E48] text-white shadow-sm font-bold', emoji: '👐', label: 'Ambil Sampah' };
      case 'DROP':
        return { bg: 'bg-[#FF5252] border-[#E04040] text-white shadow-sm font-bold', emoji: '🗑️', label: 'Buang Sampah' };
      default:
        return { bg: 'bg-stone-200 border-stone-300 text-stone-700', emoji: '❓', label: 'Blok' };
    }
  };

  const config = getBlockConfig(instruction.type);

  return (
    <div
      className={`rounded-lg sm:rounded-xl border-2 flex items-center justify-between p-1 sm:p-2.5 transition-all outline-none ${
        isExecutingCurrent
          ? 'border-amber-500 bg-amber-50 shadow-md scale-[1.01] text-amber-950 font-bold'
          : config.bg
      }`}
      id={`block-flat-${instruction.id}`}
    >
      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        <span className="text-[10px] sm:text-sm select-none">{config.emoji}</span>
        <span className="font-bold text-[8px] sm:text-xs tracking-tight font-sans truncate">
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 opacity-90 flex-shrink-0">
        {onMoveUp && (
          <button
            type="button"
            onClick={onMoveUp}
            className="p-0.5 sm:p-1 hover:bg-white/10 rounded cursor-pointer text-current"
            title="Pindah Ke Atas"
          >
            <ChevronUp className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
          </button>
        )}
        {onMoveDown && (
          <button
            type="button"
            onClick={onMoveDown}
            className="p-0.5 sm:p-1 hover:bg-white/10 rounded cursor-pointer text-current"
            title="Pindah Ke Bawah"
          >
            <ChevronDown className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(instruction.id)}
          className="p-0.5 sm:p-1 hover:bg-white/15 hover:text-red-200 transition-colors rounded cursor-pointer ml-0.5 sm:ml-1 text-current"
          title="Hapus Perintah"
        >
          <Trash2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>
    </div>
  );
}
