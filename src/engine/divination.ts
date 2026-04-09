import type { ChangeResult, YaoValue, YaoInfo, YaoType, HexagramInfo } from '../types';

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

// 八卦基础符号
const TRIGRAM_NAMES: Record<string, string> = {
  '111': '乾', '000': '坤', '100': '震', '010': '坎',
  '001': '艮', '011': '巽', '101': '离', '110': '兑',
};

// 64卦表：上卦(外卦) + 下卦(内卦) → 卦名
const HEXAGRAM_TABLE: Record<string, string> = {
  '111111': '乾为天', '000000': '坤为地',
  '100010': '水雷屯', '010001': '山水蒙',
  '111010': '水天需', '010111': '天水讼',
  '010000': '地水师', '000010': '水地比',
  '111011': '风天小畜', '110111': '天泽履',
  '111000': '地天泰', '000111': '天地否',
  '101111': '天火同人', '111101': '火天大有',
  '001000': '地山谦', '000100': '雷地豫',
  '100110': '泽雷随', '011001': '山风蛊',
  '110000': '地泽临', '000011': '风地观',
  '100101': '火雷噬嗑', '101001': '山火贲',
  '000001': '山地剥', '100000': '地雷复',
  '100111': '天雷无妄', '111100': '山天大畜',
  '100001': '山雷颐', '011110': '泽风大过',
  '010010': '坎为水', '101101': '离为火',
  '001110': '泽山咸', '011100': '雷风恒',
  '001111': '天山遯', '111001': '雷天大壮',
  '000101': '火地晋', '101000': '地火明夷',
  '101011': '风火家人', '110101': '火泽睽',
  '001010': '水山蹇', '010100': '雷水解',
  '110001': '山泽损', '100011': '风雷益',
  '111110': '泽天夬', '011111': '天风姤',
  '000110': '泽地萃', '011000': '地风升',
  '010110': '泽水困', '011010': '水风井',
  '101110': '泽火革', '011101': '火风鼎',
  '100100': '震为雷', '001001': '艮为山',
  '001011': '风山渐', '110100': '雷泽归妹',
  '101100': '雷火丰', '001101': '火山旅',
  '011011': '巽为风', '110110': '兑为泽',
  '010011': '风水涣', '110010': '水泽节',
  '110011': '风泽中孚', '001100': '雷山小过',
  '101010': '水火既济', '010101': '火水未济',
};

/**
 * 将6个爻转为二进制字符串（初爻在前）
 * 阳=1, 阴=0
 */
function yaosToBinary(yaos: YaoInfo[]): string {
  return yaos.map(y => y.isYang ? '1' : '0').join('');
}

/**
 * 获取变卦：变爻取反
 */
function getChangedBinary(yaos: YaoInfo[]): string | null {
  const hasChanging = yaos.some(y => y.isChanging);
  if (!hasChanging) return null;
  return yaos.map(y => {
    if (y.isChanging) return y.isYang ? '0' : '1';
    return y.isYang ? '1' : '0';
  }).join('');
}

export function getHexagramInfo(yaos: YaoInfo[]): {
  original: HexagramInfo;
  changed: HexagramInfo | null;
} {
  const binary = yaosToBinary(yaos);
  const originalName = HEXAGRAM_TABLE[binary] || '未知卦';

  // 上下卦拆分（初爻在index 0，即下卦为0-2，上卦为3-5）
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

  return {
    original: { name: originalName, symbol: originalSymbol },
    changed,
  };
}
