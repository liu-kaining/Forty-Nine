export type YaoValue = 6 | 7 | 8 | 9;

export type YaoType = 'oldYin' | 'youngYang' | 'youngYin' | 'oldYang';

export interface YaoInfo {
  value: YaoValue;
  type: YaoType;
  isChanging: boolean;
  isYang: boolean;
}

export interface ChangeResult {
  leftPile: number;
  rightPile: number;
  leftRemainder: number;
  rightRemainder: number;
  hung: number;
  removed: number;
  nextTotal: number;
}

export type MachineState =
  | 'PREPARE'
  | 'AWAITING_SPLIT'
  | 'ANIMATING'
  | 'CHANGE_COMPLETE'
  | 'HEXAGRAM_COMPLETE';

export type AnimationPhase =
  | 'SPLIT'
  | 'HANG_ONE'
  | 'COUNT_LEFT'
  | 'COUNT_RIGHT'
  | 'GATHER'
  | 'REGROUP'
  | 'PAUSE';

export interface DivinationState {
  machineState: MachineState;
  animationPhase: AnimationPhase | null;
  total: number;
  currentYao: number;
  currentChange: number;
  changeNumber: number;
  yaoResults: YaoInfo[];
  currentChangeResult: ChangeResult | null;
  splitRatio: number;
  // 揲四动画：当前已拿走几组4
  leftGroupsRemoved: number;
  rightGroupsRemoved: number;
}

export interface HexagramInfo {
  name: string;
  symbol: string;
}
