/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RotateDevicePrompt — Detects portrait orientation on mobile/tablet and
 * shows a fullscreen overlay asking the user to rotate to landscape.
 * Also attempts to lock the screen orientation via the Screen Orientation API.
 */

import React, { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

export default function RotateDevicePrompt() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect if this is a mobile/tablet device
    const checkIsMobile = () => {
      const hasTouch = 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0;
      const hasTouchEvent = 'ontouchstart' in window;
      const smallScreen = window.innerWidth < 1024;
      const hasOrientation = 'orientation' in window || typeof screen.orientation !== 'undefined';
      // Consider it mobile if: touch capable AND (small screen OR has orientation API)
      return (hasTouch || hasTouchEvent) && (smallScreen || hasOrientation);
    };
    setIsMobile(checkIsMobile());

    // Detect initial orientation
    const mql = window.matchMedia('(orientation: portrait)');
    setIsPortrait(mql.matches);

    // Attempt to lock to landscape
    const tryLockOrientation = async () => {
      try {
        const orientation = (screen as any).orientation;
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('landscape');
        }
      } catch {
        // Orientation lock not supported or denied — fall back to prompt overlay
      }
    };
    tryLockOrientation();

    // Listen for orientation changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsPortrait(e.matches);
      if (!e.matches) {
        tryLockOrientation();
      }
    };
    mql.addEventListener('change', handleChange);

    return () => {
      mql.removeEventListener('change', handleChange);
    };
  }, []);

  // Only show on mobile/tablet in portrait mode
  if (!isMobile || !isPortrait) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#1C1917] flex flex-col items-center justify-center p-8 select-none"
      id="rotate-device-prompt"
    >
      {/* Rotate icon with animation */}
      <div className="animate-rotate-device mb-8">
        <Smartphone className="w-24 h-24 sm:w-32 sm:h-32 text-amber-400" />
      </div>

      {/* Message */}
      <h2 className="text-white text-xl sm:text-2xl font-bold text-center mb-3">
        Putar Perangkat
      </h2>
      <p className="text-stone-400 text-sm sm:text-base text-center max-w-xs leading-relaxed">
        Arena ini lebih optimal dalam mode <span className="text-amber-400 font-semibold">landscape</span>.
        <br />
        Putar ponsel atau tablet Anda ke posisi horizontal.
      </p>

      {/* Hint arrow */}
      <div className="mt-8 flex items-center gap-3 text-stone-500 text-xs">
        <span>⬆️</span>
        <span className="text-stone-600">—</span>
        <span>➡️</span>
        <span className="text-stone-600">—</span>
        <span>⬇️</span>
      </div>

      {/* Keep trying button */}
      <button
        onClick={async () => {
          try {
            const orientation = (screen as any).orientation;
            if (orientation && typeof orientation.lock === 'function') {
              await orientation.lock('landscape');
            }
          } catch {
            // ignore
          }
        }}
        className="mt-6 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold text-sm rounded-xl transition-colors cursor-pointer"
      >
        Coba Lock Landscape
      </button>
    </div>
  );
}
