import { useState, useCallback, useRef, useEffect } from 'react';
import type { DivinationState, AnimationPhase } from '../types';
import { performChange, yaoFromTotal } from '../engine/divination';

const STORAGE_KEY = 'divination_state';
const ANIM_SPEED_STORAGE_KEY = 'divination_anim_speed';

export type DivinationAnimSpeed = 'fast' | 'normal' | 'slow';

/**
 * 三档语义（相对下方 BASE）：
 * - 慢 = 1.0，即「当前完整节奏」基准
 * - 中 ≈ 快慢之间
 * - 快 = 明显压缩，整变更省时间
 */
const ANIM_SPEED_FACTOR: Record<DivinationAnimSpeed, number> = {
  fast: 0.26,
  normal: 0.52,
  slow: 1,
};

function readStoredAnimSpeed(): DivinationAnimSpeed {
  if (typeof window === 'undefined') return 'slow';
  try {
    const v = localStorage.getItem(ANIM_SPEED_STORAGE_KEY);
    if (v === 'fast' || v === 'normal' || v === 'slow') return v;
  } catch {
    /* ignore */
  }
  return 'slow';
}

/**
 * 各阶段基准停留（ms）——对应「慢」档（×1）。
 * COUNT_LEFT/RIGHT 在一变中会走很多步，基准略低于 SPLIT/HANG，避免整变过长。
 */
const BASE_PHASE_TIMING: Record<string, number> = {
  SPLIT:       950,
  HANG_ONE:    620,
  COUNT_LEFT:  300,
  COUNT_RIGHT: 300,
  GATHER:      520,
  REGROUP:     380,
  PAUSE:       220,
};

function tickDelayMs(phase: string | null, speed: DivinationAnimSpeed): number {
  const p = phase || 'SPLIT';
  const base = BASE_PHASE_TIMING[p] ?? 3000;
  const factor = ANIM_SPEED_FACTOR[speed];
  return Math.max(32, Math.round(base * factor));
}

const initialState: DivinationState = {
  machineState: 'PREPARE',
  animationPhase: null,
  total: 50,
  currentYao: 0,
  currentChange: 0,
  changeNumber: 0,
  yaoResults: [],
  currentChangeResult: null,
  splitRatio: 0.5,
  leftGroupsRemoved: 0,
  rightGroupsRemoved: 0,
};

export function useDivinationMachine() {
  const animSpeedRef = useRef<DivinationAnimSpeed>('slow');
  const [animSpeed, setAnimSpeedState] = useState<DivinationAnimSpeed>(() => {
    const s = readStoredAnimSpeed();
    animSpeedRef.current = s;
    return s;
  });

  const setAnimSpeed = useCallback((speed: DivinationAnimSpeed) => {
    animSpeedRef.current = speed;
    setAnimSpeedState(speed);
    try {
      localStorage.setItem(ANIM_SPEED_STORAGE_KEY, speed);
    } catch {
      /* ignore */
    }
  }, []);

  const [state, setState] = useState<DivinationState>(() => {
    if (typeof window === 'undefined') return initialState;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 有保存的状态且不是 PREPARE 或 HEXAGRAM_COMPLETE，才算恢复
        if (parsed.machineState && parsed.machineState !== 'PREPARE' && parsed.machineState !== 'HEXAGRAM_COMPLETE') {
          return { ...initialState, ...parsed, machineState: 'RECOVERING' };
        }
      }
    } catch {}
    return initialState;
  });
  const [isResuming, setIsResuming] = useState(false);
  const animatingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 持久化状态到 localStorage
  useEffect(() => {
    if (state.machineState === 'PREPARE' || state.machineState === 'HEXAGRAM_COMPLETE') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const removeTaiChi = useCallback(() => {
    setState(prev => {
      if (prev.machineState !== 'PREPARE') return prev;
      return { ...prev, total: 49, machineState: 'CONFIRMING', changeNumber: 1 };
    });
  }, []);

  const confirmStart = useCallback(() => {
    setState(prev => {
      if (prev.machineState !== 'CONFIRMING') return prev;
      return { ...prev, machineState: 'CONTEMPLATING' };
    });
  }, []);

  const startContemplation = useCallback(() => {
    setState(prev => {
      if (prev.machineState !== 'CONTEMPLATING') return prev;
      return { ...prev, machineState: 'AWAITING_SPLIT' };
    });
  }, []);

  const resumeFromStorage = useCallback(() => {
    setIsResuming(true);
    setState(prev => {
      if (prev.machineState !== 'RECOVERING') return prev;
      return { ...prev, machineState: 'AWAITING_SPLIT' };
    });
  }, []);

  const discardAndRestart = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsResuming(false);
    setState(initialState);
  }, []);

  const split = useCallback((ratio: number) => {
    setState(prev => {
      if (prev.machineState !== 'AWAITING_SPLIT') return prev;
      const clampedRatio = Math.max(0.1, Math.min(0.9, ratio));
      const result = performChange(prev.total, clampedRatio);
      return {
        ...prev,
        machineState: 'ANIMATING',
        animationPhase: 'SPLIT' as AnimationPhase,
        splitRatio: clampedRatio,
        currentChangeResult: result,
        leftGroupsRemoved: 0,
        rightGroupsRemoved: 0,
      };
    });
  }, []);

  // 推进动画 — 核心调度
  const advanceAnimation = useCallback(() => {
    setState(prev => {
      if (prev.machineState !== 'ANIMATING' || !prev.animationPhase) return prev;
      const cr = prev.currentChangeResult!;
      const phase = prev.animationPhase;

      // SPLIT → HANG_ONE
      if (phase === 'SPLIT') {
        return { ...prev, animationPhase: 'HANG_ONE' as AnimationPhase };
      }

      // HANG_ONE → COUNT_LEFT（揲四从 0 组已移开始，与算法「总数 − 余数」再除以 4 一致）
      if (phase === 'HANG_ONE') {
        return { ...prev, animationPhase: 'COUNT_LEFT' as AnimationPhase };
      }

      // COUNT_LEFT：只移走「能整除进四」的部分，余数（含整除时余 4）留在桌上，供归奇
      if (phase === 'COUNT_LEFT') {
        const totalLeftGroups = Math.max(0, (cr.leftPile - cr.leftRemainder) / 4);
        if (prev.leftGroupsRemoved < totalLeftGroups) {
          return { ...prev, leftGroupsRemoved: prev.leftGroupsRemoved + 1 };
        }
        return { ...prev, animationPhase: 'COUNT_RIGHT' as AnimationPhase };
      }

      // COUNT_RIGHT：同上
      if (phase === 'COUNT_RIGHT') {
        const totalRightGroups = Math.max(0, (cr.rightPile - cr.rightRemainder) / 4);
        if (prev.rightGroupsRemoved < totalRightGroups) {
          return { ...prev, rightGroupsRemoved: prev.rightGroupsRemoved + 1 };
        }
        return { ...prev, animationPhase: 'GATHER' as AnimationPhase };
      }

      // GATHER → REGROUP
      if (phase === 'GATHER') {
        return { ...prev, animationPhase: 'REGROUP' as AnimationPhase };
      }

      // REGROUP → PAUSE（呼吸间隙）
      if (phase === 'REGROUP') {
        return { ...prev, animationPhase: 'PAUSE' as AnimationPhase };
      }

      // PAUSE → 状态转移
      const result = cr;
      const nextChange = prev.currentChange + 1;

      if (nextChange < 3) {
        return {
          ...prev,
          machineState: 'AWAITING_SPLIT',
          animationPhase: null,
          total: result.nextTotal,
          currentChange: nextChange,
          changeNumber: prev.changeNumber + 1,
          currentChangeResult: null,
          leftGroupsRemoved: 0,
          rightGroupsRemoved: 0,
        };
      }

      const yaoInfo = yaoFromTotal(result.nextTotal);
      const newYaoResults = [...prev.yaoResults, yaoInfo];

      if (newYaoResults.length >= 6) {
        return {
          ...prev,
          machineState: 'HEXAGRAM_COMPLETE',
          animationPhase: null,
          yaoResults: newYaoResults,
          currentChangeResult: null,
        };
      }

      return {
        ...prev,
        machineState: 'AWAITING_SPLIT',
        animationPhase: null,
        total: 49,
        currentYao: prev.currentYao + 1,
        currentChange: 0,
        changeNumber: prev.changeNumber + 1,
        yaoResults: newYaoResults,
        currentChangeResult: null,
        leftGroupsRemoved: 0,
        rightGroupsRemoved: 0,
      };
    });
  }, []);

  // 自动播放：根据阶段动态决定间隔
  const runAnimation = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    const tick = () => {
      setState(current => {
        if (current.machineState !== 'ANIMATING') {
          animatingRef.current = false;
          return current;
        }

        const phase = current.animationPhase;
        const delay = tickDelayMs(phase, animSpeedRef.current);

        timerRef.current = setTimeout(() => {
          advanceAnimation();
          tick();
        }, delay);

        return current;
      });
    };

    tick();
  }, [advanceAnimation]);

  const reset = useCallback(() => {
    animatingRef.current = false;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    localStorage.removeItem(STORAGE_KEY);
    setIsResuming(false);
    setState(initialState);
  }, []);

  return {
    state,
    animSpeed,
    setAnimSpeed,
    isResuming,
    removeTaiChi,
    confirmStart,
    startContemplation,
    resumeFromStorage,
    discardAndRestart,
    split,
    advanceAnimation,
    runAnimation,
    reset,
  };
}
