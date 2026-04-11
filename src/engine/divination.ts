import type { ChangeResult, YaoValue, YaoInfo, YaoType, HexagramInfo } from '../types';
import { HEXAGRAM_TABLE, TRIGRAM_NAMES, TRIGRAM_MEANINGS, HEXAGRAM_TEXTS } from './hexagrams';

/**
 * 执行"一变"的推演逻辑
 * @param total 当前草数
 * @param splitRatio 用户划动位置比例 (0.1-0.9)
 */
export function performChange(total: number, splitRatio: number): ChangeResult {
  // 象两：分而为二
  const leftPile = Math.floor(total * splitRatio);
  let rightPile = total - leftPile;

  // 挂一：右堆减一
  const hung = 1;
  rightPile -= hung;

  // 揲四归奇
  const leftRemainder = leftPile % 4 === 0 ? 4 : leftPile % 4;
  const rightRemainder = rightPile % 4 === 0 ? 4 : rightPile % 4;

  // 拿走的草数
  const removed = hung + leftRemainder + rightRemainder;

  // 下一变的草数
  const nextTotal = total - removed;

  return {
    leftPile: leftPile,
    rightPile: rightPile,
    leftRemainder,
    rightRemainder,
    hung,
    removed,
    nextTotal,
  };
}

/**
 * 三变后根据剩余草数映射爻象
 * 剩余必为 24, 28, 32, 36
 */
export function yaoFromTotal(total: number): YaoInfo {
  const value = (total / 4) as YaoValue;
  const map: Record<YaoValue, { type: YaoType; isChanging: boolean; isYang: boolean }> = {
    6: { type: 'oldYin', isChanging: true, isYang: false },
    7: { type: 'youngYang', isChanging: false, isYang: true },
    8: { type: 'youngYin', isChanging: false, isYang: false },
    9: { type: 'oldYang', isChanging: true, isYang: true },
  };
  return { value, ...map[value] };
}

/**
 * 将 6 个爻转为 `HEXAGRAM_TABLE` 的 6 位键：初爻…上爻依次拼接（阳=1 阴=0），
 * 即「下卦三位（初、二、三）+ 上卦三位（四、五、上）」——与本文件 `HEXAGRAM_TABLE` 的键一致。
 */
function yaosToTableBinary(yaos: YaoInfo[]): string {
  return yaos.map(y => (y.isYang ? '1' : '0')).join('');
}

/**
 * 获取变卦：变爻取反
 */
function getChangedBinary(yaos: YaoInfo[]): string | null {
  const hasChanging = yaos.some(y => y.isChanging);
  if (!hasChanging) return null;
  const flipped = yaos.map(y => {
    if (y.isChanging) return { ...y, isYang: !y.isYang };
    return y;
  });
  return yaosToTableBinary(flipped);
}

/** 之卦六爻：老阴→少阳，老阳→少阴，其余不变（用于成卦页展示） */
export function yaosAfterChange(yaos: YaoInfo[]): YaoInfo[] {
  return yaos.map(y => {
    if (y.type === 'oldYang') {
      return { value: 8, type: 'youngYin', isChanging: false, isYang: false };
    }
    if (y.type === 'oldYin') {
      return { value: 7, type: 'youngYang', isChanging: false, isYang: true };
    }
    return y;
  });
}

export function getHexagramInfo(yaos: YaoInfo[]): {
  original: HexagramInfo;
  changed: HexagramInfo | null;
  details: HexagramDetails;
} {
  const binary = yaosToTableBinary(yaos);
  const originalName = HEXAGRAM_TABLE[binary] || '未知卦';

  const lowerTrigram = binary.slice(0, 3);
  const upperTrigram = binary.slice(3, 6);
  const originalSymbol = `${TRIGRAM_NAMES[upperTrigram] || '?'}/${TRIGRAM_NAMES[lowerTrigram] || '?'}`;

  const changedBinary = getChangedBinary(yaos);
  let changed: HexagramInfo | null = null;
  if (changedBinary) {
    const changedName = HEXAGRAM_TABLE[changedBinary] || '未知卦';
    const cLower = changedBinary.slice(0, 3);
    const cUpper = changedBinary.slice(3, 6);
    changed = {
      name: changedName,
      symbol: `${TRIGRAM_NAMES[cUpper] || '?'}/${TRIGRAM_NAMES[cLower] || '?'}`,
    };
  }

  const changedHexagramDetails: HexagramDetails['changedHexagram'] = changedBinary && changed
    ? {
      name: changed.name,
      binary: changedBinary,
      upperTrigram: changedBinary.slice(3, 6),
      lowerTrigram: changedBinary.slice(0, 3),
    }
    : null;

  // 构建详细卦象信息
  const details: HexagramDetails = {
    name: originalName,
    binary,
    upperTrigram,
    lowerTrigram,
    upperName: TRIGRAM_NAMES[upperTrigram] || '?',
    lowerName: TRIGRAM_NAMES[lowerTrigram] || '?',
    upperSymbol: TRIGRAM_NAMES[upperTrigram] || '?',
    lowerSymbol: TRIGRAM_NAMES[lowerTrigram] || '?',
    upperMeanings: TRIGRAM_MEANINGS[upperTrigram] || [],
    lowerMeanings: TRIGRAM_MEANINGS[lowerTrigram] || [],
    yaos: yaos.map((y, i) => ({
      position: i,
      positionName: ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][i],
      value: y.value,
      valueName: ['', '少阳', '少阴', '', '老阳', '老阴'][y.value] || '',
      type: y.type,
      isYang: y.isYang,
      isChanging: y.isChanging,
    })),
    text: HEXAGRAM_TEXTS[binary] || null,
    changedHexagram: changedHexagramDetails,
  };

  return {
    original: { name: originalName, symbol: originalSymbol },
    changed,
    details,
  };
}

export interface HexagramDetails {
  name: string;
  binary: string;
  upperTrigram: string;
  lowerTrigram: string;
  upperName: string;
  lowerName: string;
  upperSymbol: string;
  lowerSymbol: string;
  upperMeanings: string[];
  lowerMeanings: string[];
  yaos: Array<{
    position: number;
    positionName: string;
    value: YaoValue;
    valueName: string;
    type: YaoType;
    isYang: boolean;
    isChanging: boolean;
  }>;
  text: { base: string; changed: string } | null;
  changedHexagram: {
    name: string;
    binary: string;
    upperTrigram: string;
    lowerTrigram: string;
  } | null;
}
