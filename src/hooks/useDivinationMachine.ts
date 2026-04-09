import { useState, useCallback, useRef } from 'react';
import type { DivinationState, AnimationPhase } from '../types';
import { performChange, yaoFromTotal } from '../engine/divination';

/** 每个动画阶段的停留时长（ms）——从容、舒缓 */
const PHASE_TIMING: Record<string, number> = {
  SPLIT:       3000,
  HANG_ONE:    2800,
  COUNT_LEFT:  2000,
  COUNT_RIGHT: 2000,
  GATHER:      3500,
  REGROUP:     3200,
  PAUSE:       2500,
};

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
  const [state, setState] = useState<DivinationState>(initialState);
  const animatingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const removeTaiChi = useCallback(() => {
    setState(prev => {
      if (prev.machineState !== 'PREPARE') return prev;
      return { ...prev, total: 49, machineState: 'AWAITING_SPLIT', changeNumber: 1 };
    });
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

      // HANG_ONE → COUNT_LEFT (开始逐组揲四)
      if (phase === 'HANG_ONE') {
        return { ...prev, animationPhase: 'COUNT_LEFT' as AnimationPhase, leftGroupsRemoved: 1 };
      }

      // COUNT_LEFT: 逐组拿走
      if (phase === 'COUNT_LEFT') {
        const totalLeftGroups = Math.floor(cr.leftPile / 4);
        if (prev.leftGroupsRemoved < totalLeftGroups) {
          return { ...prev, leftGroupsRemoved: prev.leftGroupsRemoved + 1 };
        }
        // 左堆完了 → 右堆
        return { ...prev, animationPhase: 'COUNT_RIGHT' as AnimationPhase, rightGroupsRemoved: 1 };
      }

      // COUNT_RIGHT: 逐组拿走
      if (phase === 'COUNT_RIGHT') {
        const totalRightGroups = Math.floor(cr.rightPile / 4);
        if (prev.rightGroupsRemoved < totalRightGroups) {
          return { ...prev, rightGroupsRemoved: prev.rightGroupsRemoved + 1 };
        }
        // 右堆完了 → GATHER
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
        const delay = PHASE_TIMING[phase || 'SPLIT'] ?? 3000;

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
    setState(initialState);
  }, []);

  return { state, removeTaiChi, split, advanceAnimation, runAnimation, reset };
}
