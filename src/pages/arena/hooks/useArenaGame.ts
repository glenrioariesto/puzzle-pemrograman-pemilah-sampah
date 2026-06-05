/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import {
  GameLevel,
  Instruction,
  CommandAction,
  RobotId,
  GridPos,
  TrashOnGrid
} from '../../../types';

import clickSfx from '../../../../assets/click.mp3';

// Per-robot execution state
interface RobotState {
  pos: GridPos;
  facingDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  instructions: Instruction[];
  compiledSteps: { instructionId: string; action: CommandAction }[];
  playbackIndex: number;
  activeInstructionId: string | null;
  backpack: any[]; // using simplified representation
  trailPositions: GridPos[];
  finished: boolean;
  hasErrored: boolean;
}

const uuid = () => Math.random().toString(36).substring(2, 9);

export function useArenaGame(
  level: GameLevel,
  isMuted: boolean,
  onSaveHighScore: (levelId: number, stars: number, minSteps: number) => void
) {
  // --- Initial Robot States Helper ---
  const createInitialRobotStates = (): Record<RobotId, RobotState> => {
    const states: Record<string, RobotState> = {};
    for (const robot of level.robots) {
      states[robot.id] = {
        pos: { ...robot.startPos },
        facingDir: 'RIGHT',
        instructions: [],
        compiledSteps: [],
        playbackIndex: 0,
        activeInstructionId: null,
        backpack: [],
        trailPositions: [{ ...robot.startPos }],
        finished: false,
        hasErrored: false,
      };
    }
    return states as Record<RobotId, RobotState>;
  };

  const [activeRobot, setActiveRobot] = useState<RobotId>('ORGANIC');
  const [robotStates, setRobotStates] = useState<Record<RobotId, RobotState>>(createInitialRobotStates);

  // Simulation execution tracking states
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTrash, setActiveTrash] = useState<TrashOnGrid[]>([]);

  // Logs for console terminal
  const [logs, setLogs] = useState<string[]>([]);

  // Results State
  const [gameResult, setGameResult] = useState<'SUCCESS' | 'FAILED' | null>(null);
  const [resultStars, setResultStars] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);

  // Guide overlay states
  const [showHintsModal, setShowHintsModal] = useState(false);

  // Execution refs — mutable state during interval to avoid stale closures
  const robotStatesRef = useRef<Record<RobotId, RobotState>>(robotStates);
  robotStatesRef.current = robotStates;
  const activeTrashRef = useRef<TrashOnGrid[]>(activeTrash);
  activeTrashRef.current = activeTrash;
  const logsRef = useRef<string[]>(logs);
  logsRef.current = logs;

  // Simulation Timer Ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [execSpeed, setExecSpeed] = useState(1);

  // Initialize level upon load
  useEffect(() => {
    const initial = createInitialRobotStates();
    setRobotStates(initial);
    robotStatesRef.current = initial;
    const trash = level.trashItems.map(t => ({ ...t, collected: false }));
    setActiveTrash(trash);
    activeTrashRef.current = trash;
    setLogs([
      `[Sistem] Memuat Level ${level.id}: ${level.name}`,
      `[Sistem] 3 Robot siap: Organik 🤖, Daur Ulang 🤖, B3 🤖`,
      `[Sistem] Klik tab robot untuk berganti, susun program masing-masing.`
    ]);
    setGameResult(null);
    setShowResultModal(false);
    setShowHintsModal(true);
  }, [level.id]);

  // Helper labels
  const getIndonesianLabel = (action: CommandAction) => {
    switch (action) {
      case 'UP': return 'Maju ⬆️';
      case 'DOWN': return 'Mundur ⬇️';
      case 'LEFT': return 'Belok Kiri ⬅️';
      case 'RIGHT': return 'Belok Kanan ➡️';
      case 'PICK': return 'Ambil Sampah 👐';
      case 'DROP': return 'Buang Sampah 🗑️';
      default: return '';
    }
  };

  // --- Robot Program Handlers ---
  const handleAddCommand = (action: CommandAction) => {
    playSound('click');
    setRobotStates(prev => {
      const state = prev[activeRobot];
      const newInst: Instruction = { id: uuid(), type: action };
      return {
        ...prev,
        [activeRobot]: {
          ...state,
          instructions: [...state.instructions, newInst]
        }
      };
    });
    setLogs(prev => [...prev, `[Sistem] ${activeRobot}: Menambahkan blok: ${getIndonesianLabel(action)}`]);
  };

  const handleClearInstructions = () => {
    playSound('click');
    setRobotStates(prev => ({
      ...prev,
      [activeRobot]: { ...prev[activeRobot], instructions: [] }
    }));
    setLogs(prev => [...prev, `[Sistem] ${activeRobot}: Program dikosongkan.`]);
  };

  const handleDeleteCommand = (id: string) => {
    playSound('click');
    setRobotStates(prev => ({
      ...prev,
      [activeRobot]: { ...prev[activeRobot], instructions: prev[activeRobot].instructions.filter(item => item.id !== id) }
    }));
  };

  const handleMoveCommandUp = (index: number) => {
    if (index === 0) return;
    playSound('click');
    setRobotStates(prev => {
      const copy = [...prev[activeRobot].instructions];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return { ...prev, [activeRobot]: { ...prev[activeRobot], instructions: copy } };
    });
  };

  const handleMoveCommandDown = (index: number) => {
    if (index >= robotStates[activeRobot].instructions.length - 1) return;
    playSound('click');
    setRobotStates(prev => {
      const copy = [...prev[activeRobot].instructions];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return { ...prev, [activeRobot]: { ...prev[activeRobot], instructions: copy } };
    });
  };

  // --- Audio ---
  const playSound = (type: 'click' | 'jump' | 'collect' | 'success' | 'fail' | 'dump' | 'crash') => {
    if (isMuted) return;
    try {
      if (type === 'click') {
        const audio = new Audio(clickSfx);
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === 'jump') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
      } else if (type === 'collect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      } else if (type === 'dump') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        osc.frequency.setValueAtTime(1046.50, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.55);
        osc.start(now); osc.stop(now + 0.55);
      } else if (type === 'fail' || type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
      }
    } catch (e) { /* audio not available */ }
  };

  // --- Compilation ---
  const compileInstructions = (instList: Instruction[]): { instructionId: string; action: CommandAction }[] => {
    return instList.map(item => ({ instructionId: item.id, action: item.type }));
  };

  // --- Execution Control ---
  const handleStartExecution = () => {
    // Check if any robot has a program
    const hasProgram = Object.values(robotStatesRef.current).some(r => r.instructions.length > 0);
    if (!hasProgram) return;
    playSound('click');

    const newRobots: Record<RobotId, RobotState> = {} as Record<RobotId, RobotState>;
    for (const robot of level.robots) {
      const state = robotStatesRef.current[robot.id] || robotStates[robot.id];
      newRobots[robot.id] = {
        pos: { ...robot.startPos },
        facingDir: 'RIGHT',
        instructions: state?.instructions || [],
        compiledSteps: compileInstructions(state?.instructions || []),
        playbackIndex: 0,
        activeInstructionId: null,
        backpack: [],
        trailPositions: [{ ...robot.startPos }],
        finished: false,
        hasErrored: false,
      };
    }

    setRobotStates(newRobots);
    robotStatesRef.current = newRobots;
    const trash = level.trashItems.map(t => ({ ...t, collected: false }));
    setActiveTrash(trash);
    activeTrashRef.current = trash;
    setIsExecuting(true);

    const totalCmds = Object.values(newRobots).reduce((s, r) => s + r.compiledSteps.length, 0);
    setLogs([
      `[Sistem] Menghidupkan 3 Sorter...`,
      `[Sistem] Total ${Object.keys(newRobots).length} robot, ${totalCmds} langkah terkompilasi.`
    ]);
  };

  const handleStopExecution = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    playSound('fail');
    setIsExecuting(false);
    setLogs(prev => [...prev, `[Sistem] Eksekusi dihentikan oleh pengguna.`]);
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsExecuting(false);
    // Preserve user programs, reset only positions/backpacks/trails
    setRobotStates(prev => {
      const updated: Record<string, RobotState> = {};
      for (const robot of level.robots) {
        const existing = prev[robot.id];
        updated[robot.id] = {
          pos: { ...robot.startPos },
          facingDir: 'RIGHT',
          instructions: existing?.instructions || [],
          compiledSteps: [],
          playbackIndex: 0,
          activeInstructionId: null,
          backpack: [],
          trailPositions: [{ ...robot.startPos }],
          finished: false,
          hasErrored: false,
        };
      }
      return updated as Record<RobotId, RobotState>;
    });
    const trash = level.trashItems.map(t => ({ ...t, collected: false }));
    setActiveTrash(trash);
    activeTrashRef.current = trash;
    setGameResult(null);
    setShowResultModal(false);
    setLogs(prev => [...prev, `[Sistem] Semua robot dan sampah direset.`]);
  };

  // --- Collision detection ---
  const checkCollision = (
    targetX: number, targetY: number,
    robots: Record<RobotId, RobotState>,
    currentRobotId: RobotId
  ): 'OK' | 'WALL' | 'OBSTACLE' | 'ROBOT' => {
    if (targetX < 0 || targetX >= level.gridSize.width || targetY < 0 || targetY >= level.gridSize.height) {
      return 'WALL';
    }
    const obstacle = level.obstacles.find(o => o.pos.x === targetX && o.pos.y === targetY);
    if (obstacle) return 'OBSTACLE';
    // Check if another robot is already at target position (active, finished, or errored)
    const otherRobot = Object.entries(robots).find(([id, r]) => id !== currentRobotId && r.pos.x === targetX && r.pos.y === targetY);
    if (otherRobot) return 'ROBOT';
    return 'OK';
  };

  // Clone robot states for React state (avoids mutation issues)
  const cloneRobotStates = (states: Record<RobotId, RobotState>): Record<RobotId, RobotState> => {
    const cloned: Record<string, RobotState> = {};
    for (const [id, s] of Object.entries(states)) {
      cloned[id] = {
        ...s,
        pos: { ...s.pos },
        instructions: [...s.instructions],
        compiledSteps: [...s.compiledSteps],
        backpack: [...s.backpack],
        trailPositions: [...s.trailPositions],
      };
    }
    return cloned as Record<RobotId, RobotState>;
  };

  // --- Result Evaluation ---
  const evaluateGameResult = (finalRobots: Record<RobotId, RobotState>, finalTrash: TrashOnGrid[]) => {
    const someTrashLeaking = finalTrash.some(t => !t.collected);
    const backpackNotEmpty = Object.values(finalRobots).some(r => r.backpack.length > 0);
    const anyError = Object.values(finalRobots).some(r => r.hasErrored);

    if (someTrashLeaking || backpackNotEmpty || anyError) {
      playSound('fail');
      setLogs(prev => [
        ...prev,
        `[Kesalahan] Misi gagal! Beberapa sampah masih berserakan atau robot membawa sampah di tas.`
      ]);
      setGameResult('FAILED');
      setShowResultModal(true);
    } else {
      playSound('success');
      const codeSizeUsed = Object.values(finalRobots).reduce((sum, r) => sum + r.compiledSteps.length, 0);

      let stars = 1;
      if (codeSizeUsed <= level.starsThreshold.three) {
        stars = 3;
      } else if (codeSizeUsed <= level.starsThreshold.two) {
        stars = 2;
      }

      setResultStars(stars);
      setTotalSteps(codeSizeUsed);
      setGameResult('SUCCESS');
      setShowResultModal(true);
      setLogs(prev => [
        ...prev, '',
        `[Pilah Sukses] SELAMAT! Taman bersih! Total ${codeSizeUsed} langkah dari 3 robot! 🎉`,
        `[Pilah Sukses] Peringkat: ${stars} / 3 Bintang.`
      ]);
      onSaveHighScore(level.id, stars, codeSizeUsed);
    }
  };

  // --- Parallel Execution Loop ---
  useEffect(() => {
    if (!isExecuting) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const intervalTime = 650 / execSpeed;

    intervalRef.current = setInterval(() => {
      const currentRobots = { ...robotStatesRef.current };
      const currentTrash = [...activeTrashRef.current];
      const newLogs: string[] = [];
      let allFinished = true;
      let hasError = false;

      // Process each robot's next step
      for (const robotId of Object.keys(currentRobots) as RobotId[]) {
        const robot = { ...currentRobots[robotId] };
        if (robot.finished || robot.hasErrored) continue;

        if (robot.playbackIndex >= robot.compiledSteps.length) {
          robot.finished = true;
          currentRobots[robotId] = robot;
          continue;
        }

        allFinished = false;
        const step = robot.compiledSteps[robot.playbackIndex];
        robot.activeInstructionId = step.instructionId;

        const robotLabel = `${robotId}`;
        const stepNum = robot.playbackIndex + 1;

        switch (step.action) {
          case 'UP': {
            playSound('jump');
            const targetX = robot.pos.x;
            const targetY = robot.pos.y - 1;
            robot.facingDir = 'UP';

            const collision = checkCollision(targetX, targetY, currentRobots, robotId);
            if (collision === 'WALL') {
              playSound('crash'); robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
              newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Bergerak ke atas...`);
              newLogs.push(`[Kesalahan] ${robotLabel} menabrak dinding taman di (${targetX}, ${targetY})! 💥`);
              break;
            }
            if (collision === 'OBSTACLE') {
              playSound('crash'); robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
              newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Bergerak ke atas...`);
              const obs = level.obstacles.find(o => o.pos.x === targetX && o.pos.y === targetY);
              newLogs.push(`[Kesalahan] ${robotLabel} menabrak rintangan ${obs?.emoji || '?'} di (${targetX}, ${targetY})! 💥`);
              break;
            }
            if (collision === 'ROBOT') {
              playSound('crash'); robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
              newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Bergerak ke atas...`);
              newLogs.push(`[Kesalahan] ${robotLabel} bertabrakan dengan robot lain di (${targetX}, ${targetY})! 💥`);
              break;
            }

            robot.pos = { x: targetX, y: targetY };
            robot.trailPositions = [...robot.trailPositions, { x: targetX, y: targetY }];
            newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Melangkah ke (${targetX}, ${targetY}).`);
            break;
          }

          case 'DOWN': {
            playSound('jump');
            const targetX = robot.pos.x;
            const targetY = robot.pos.y + 1;
            robot.facingDir = 'DOWN';

            const collision = checkCollision(targetX, targetY, currentRobots, robotId);
            if (collision === 'WALL') {
              playSound('crash'); robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
              newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Bergerak ke bawah...`);
              newLogs.push(`[Kesalahan] ${robotLabel} menabrak dinding taman di (${targetX}, ${targetY})! 💥`);
              break;
            }
            if (collision === 'OBSTACLE') {
              playSound('crash'); robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
              newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Bergerak ke bawah...`);
              const obs = level.obstacles.find(o => o.pos.x === targetX && o.pos.y === targetY);
              newLogs.push(`[Kesalahan] ${robotLabel} menabrak rintangan ${obs?.emoji || '?'} di (${targetX}, ${targetY})! 💥`);
              break;
            }
            if (collision === 'ROBOT') {
              playSound('crash'); robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
              newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Bergerak ke bawah...`);
              newLogs.push(`[Kesalahan] ${robotLabel} bertabrakan dengan robot lain di (${targetX}, ${targetY})! 💥`);
              break;
            }

            robot.pos = { x: targetX, y: targetY };
            robot.trailPositions = [...robot.trailPositions, { x: targetX, y: targetY }];
            newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Melangkah ke (${targetX}, ${targetY}).`);
            break;
          }

          case 'LEFT': {
            playSound('jump');
            const targetX = robot.pos.x - 1;
            const targetY = robot.pos.y;
            robot.facingDir = 'LEFT';

            const collision = checkCollision(targetX, targetY, currentRobots, robotId);
            if (collision === 'WALL') {
              playSound('crash'); robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
              newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Bergerak ke kiri...`);
              newLogs.push(`[Kesalahan] ${robotLabel} menabrak dinding taman di (${targetX}, ${targetY})! 💥`);
              break;
            }
            if (collision === 'OBSTACLE') {
              playSound('crash'); robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
              newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Bergerak ke kiri...`);
              const obs = level.obstacles.find(o => o.pos.x === targetX && o.pos.y === targetY);
              newLogs.push(`[Kesalahan] ${robotLabel} menabrak rintangan ${obs?.emoji || '?'} di (${targetX}, ${targetY})! 💥`);
              break;
            }
            if (collision === 'ROBOT') {
              playSound('crash'); robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
              newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Bergerak ke kiri...`);
              newLogs.push(`[Kesalahan] ${robotLabel} bertabrakan dengan robot lain di (${targetX}, ${targetY})! 💥`);
              break;
            }

            robot.pos = { x: targetX, y: targetY };
            robot.trailPositions = [...robot.trailPositions, { x: targetX, y: targetY }];
            newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Melangkah ke (${targetX}, ${targetY}).`);
            break;
          }

          case 'RIGHT': {
            playSound('jump');
            const targetX = robot.pos.x + 1;
            const targetY = robot.pos.y;
            robot.facingDir = 'RIGHT';

            const collision = checkCollision(targetX, targetY, currentRobots, robotId);
            if (collision === 'WALL') {
              playSound('crash'); robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
              newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Bergerak ke kanan...`);
              newLogs.push(`[Kesalahan] ${robotLabel} menabrak dinding taman di (${targetX}, ${targetY})! 💥`);
              break;
            }
            if (collision === 'OBSTACLE') {
              playSound('crash'); robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
              newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Bergerak ke kanan...`);
              const obs = level.obstacles.find(o => o.pos.x === targetX && o.pos.y === targetY);
              newLogs.push(`[Kesalahan] ${robotLabel} menabrak rintangan ${obs?.emoji || '?'} di (${targetX}, ${targetY})! 💥`);
              break;
            }
            if (collision === 'ROBOT') {
              playSound('crash'); robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
              newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Bergerak ke kanan...`);
              newLogs.push(`[Kesalahan] ${robotLabel} bertabrakan dengan robot lain di (${targetX}, ${targetY})! 💥`);
              break;
            }

            robot.pos = { x: targetX, y: targetY };
            robot.trailPositions = [...robot.trailPositions, { x: targetX, y: targetY }];
            newLogs.push(`[Gerakan] ${robotLabel} langkah ${stepNum}: Melangkah ke (${targetX}, ${targetY}).`);
            break;
          }

          case 'PICK': {
            const foundIdx = currentTrash.findIndex(
              t => t.pos.x === robot.pos.x && t.pos.y === robot.pos.y && !t.collected && t.item.type === robotId
            );
            if (foundIdx !== -1) {
              const targetTrash = currentTrash[foundIdx];
              if (robot.backpack.length >= level.maxCapacity) {
                playSound('fail');
                robot.hasErrored = true; currentRobots[robotId] = robot; hasError = true;
                newLogs.push(`[Aksi] ${robotLabel} langkah ${stepNum}: Ingin mengambil ${targetTrash.item.name} di (${robot.pos.x}, ${robot.pos.y}).`);
                newLogs.push(`[Kesalahan] ${robotLabel} gagal! Tas penuh! Kapasitas maksimal ${level.maxCapacity}.`);
                break;
              }
              playSound('collect');
              currentTrash[foundIdx] = { ...targetTrash, collected: true };
              robot.backpack = [...robot.backpack, targetTrash.item];
              newLogs.push(`[Aksi] ${robotLabel} langkah ${stepNum}: Mengambil "${targetTrash.item.name}" ${targetTrash.item.emoji} di (${robot.pos.x}, ${robot.pos.y}).`);
            } else {
              newLogs.push(`[Perhatian] ${robotLabel} langkah ${stepNum}: Tidak ada sampah di (${robot.pos.x}, ${robot.pos.y})!`);
            }
            break;
          }

          case 'DROP': {
            const foundCan = level.trashCans.find(
              tc => tc.pos.x === robot.pos.x && tc.pos.y === robot.pos.y
            );
            if (foundCan) {
              const matchingItems = robot.backpack.filter(item => item.type === foundCan.type);
              if (matchingItems.length > 0) {
                playSound('dump');
                robot.backpack = robot.backpack.filter(item => item.type !== foundCan.type);
                newLogs.push(`[Pilah Sukses] ${robotLabel} langkah ${stepNum}: ${matchingItems.length} sampah ${foundCan.label} dibuang ke tong ${foundCan.emoji}!`);
              } else {
                playSound('fail');
                newLogs.push(`[Aksi] ${robotLabel} langkah ${stepNum}: Robot di atas Tong ${foundCan.label} ${foundCan.emoji} tapi tidak membawa sampah jenis ini!`);
              }
            } else {
              playSound('click');
              newLogs.push(`[Perhatian] ${robotLabel} langkah ${stepNum}: Robot buang sampah di tanah kosong!`);
            }
            break;
          }
        }

        robot.playbackIndex++;
        currentRobots[robotId] = robot;
      }

      robotStatesRef.current = currentRobots;
      activeTrashRef.current = currentTrash;

      setRobotStates(cloneRobotStates(currentRobots));
      setActiveTrash([...currentTrash]);
      if (newLogs.length > 0) {
        setLogs(prev => [...prev, ...newLogs]);
      }

      if (allFinished || hasError) {
        clearInterval(intervalRef.current!);
        setIsExecuting(false);

        if (hasError) {
          setGameResult('FAILED');
          setShowResultModal(true);
        } else {
          evaluateGameResult(cloneRobotStates(currentRobots), currentTrash);
        }
      }
    }, intervalTime);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isExecuting, execSpeed, level]);

  // Total blocks programmed across all robots
  const totalBlockCount = Object.values(robotStates).reduce((sum, r) => sum + r.instructions.length, 0);

  return {
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
  };
}
