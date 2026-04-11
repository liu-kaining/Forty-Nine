/**
 * 校验 HEXAGRAM_TABLE：64 键齐全、无重复、与通行本「下卦+上卦」二进制约定一致。
 * 约定：六位键 = 下卦(初二三) + 上卦(四五上)，自下而上阳1阴0；八卦三位为 乾111 兑110 离101 震100 巽011 坎010 艮001 坤000。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hexPath = path.join(__dirname, '../src/engine/hexagrams.ts');
const src = fs.readFileSync(hexPath, 'utf8');
const tableBlock = src.split('export const HEXAGRAM_TABLE')[1]?.split('};')[0];
if (!tableBlock) {
  console.error('Could not find HEXAGRAM_TABLE in hexagrams.ts');
  process.exit(1);
}

const table = {};
const re = /'([01]{6})'\s*:\s*'([^']+)'/g;
let m;
while ((m = re.exec(tableBlock)) !== null) {
  table[m[1]] = m[2];
}

const T = { 乾: '111', 坤: '000', 震: '100', 坎: '010', 艮: '001', 巽: '011', 离: '101', 兑: '110' };
/** @type {Array<[number, string, keyof typeof T, keyof typeof T]>} */
const kingWen = [
  [1, '乾为天', '乾', '乾'],
  [2, '坤为地', '坤', '坤'],
  [3, '水雷屯', '坎', '震'],
  [4, '山水蒙', '艮', '坎'],
  [5, '水天需', '坎', '乾'],
  [6, '天水讼', '乾', '坎'],
  [7, '地水师', '坤', '坎'],
  [8, '水地比', '坎', '坤'],
  [9, '风天小畜', '巽', '乾'],
  [10, '天泽履', '乾', '兑'],
  [11, '地天泰', '坤', '乾'],
  [12, '天地否', '乾', '坤'],
  [13, '天火同人', '乾', '离'],
  [14, '火天大有', '离', '乾'],
  [15, '地山谦', '坤', '艮'],
  [16, '雷地豫', '震', '坤'],
  [17, '泽雷随', '兑', '震'],
  [18, '山风蛊', '艮', '巽'],
  [19, '地泽临', '坤', '兑'],
  [20, '风地观', '巽', '坤'],
  [21, '火雷噬嗑', '离', '震'],
  [22, '山火贲', '艮', '离'],
  [23, '山地剥', '艮', '坤'],
  [24, '地雷复', '坤', '震'],
  [25, '天雷无妄', '乾', '震'],
  [26, '山天大畜', '艮', '乾'],
  [27, '山雷颐', '艮', '震'],
  [28, '泽风大过', '兑', '巽'],
  [29, '坎为水', '坎', '坎'],
  [30, '离为火', '离', '离'],
  [31, '泽山咸', '兑', '艮'],
  [32, '雷风恒', '震', '巽'],
  [33, '天山遁', '乾', '艮'],
  [34, '雷天大壮', '震', '乾'],
  [35, '火地晋', '离', '坤'],
  [36, '地火明夷', '坤', '离'],
  [37, '风火家人', '巽', '离'],
  [38, '火泽睽', '离', '兑'],
  [39, '水山蹇', '坎', '艮'],
  [40, '雷水解', '震', '坎'],
  [41, '山泽损', '艮', '兑'],
  [42, '风雷益', '巽', '震'],
  [43, '泽天夬', '兑', '乾'],
  [44, '天风姤', '乾', '巽'],
  [45, '泽地萃', '兑', '坤'],
  [46, '地风升', '坤', '巽'],
  [47, '泽水困', '兑', '坎'],
  [48, '水风井', '坎', '巽'],
  [49, '泽火革', '兑', '离'],
  [50, '火风鼎', '离', '巽'],
  [51, '震为雷', '震', '震'],
  [52, '艮为山', '艮', '艮'],
  [53, '风山渐', '巽', '艮'],
  [54, '雷泽归妹', '震', '兑'],
  [55, '雷火丰', '震', '离'],
  [56, '火山旅', '离', '艮'],
  [57, '巽为风', '巽', '巽'],
  [58, '兑为泽', '兑', '兑'],
  [59, '风水涣', '巽', '坎'],
  [60, '水泽节', '坎', '兑'],
  [61, '风泽中孚', '巽', '兑'],
  [62, '雷山小过', '震', '艮'],
  [63, '水火既济', '坎', '离'],
  [64, '火水未济', '离', '坎'],
];

const expected = {};
for (const [, name, up, lo] of kingWen) {
  const key = T[lo] + T[up];
  expected[key] = name;
}

const keysTable = Object.keys(table).sort();
const keysExpected = Object.keys(expected).sort();
const wrong = keysExpected.filter(k => table[k] !== expected[k]);
const missing = keysExpected.filter(k => table[k] === undefined);
const extra = keysTable.filter(k => expected[k] === undefined);

const rawKeys = [];
const reDup = /'([01]{6})'\s*:\s*'([^']+)'/g;
while ((m = reDup.exec(tableBlock)) !== null) rawKeys.push(m[1]);
const dup = rawKeys.filter((k, i) => rawKeys.indexOf(k) !== i);

const all = new Set();
for (const a of Object.keys(T)) {
  for (const b of Object.keys(T)) {
    all.add(T[a] + T[b]);
  }
}
const notInExpected = [...all].filter(k => !expected[k]);
const notInTable = [...all].filter(k => table[k] === undefined);

let ok = true;
if (keysTable.length !== 64) {
  console.error('FAIL: HEXAGRAM_TABLE must have exactly 64 entries, got', keysTable.length);
  ok = false;
}
if (dup.length) {
  console.error('FAIL: duplicate keys:', dup);
  ok = false;
}
if (missing.length || extra.length) {
  console.error('FAIL: missing', missing, 'extra', extra);
  ok = false;
}
if (wrong.length) {
  console.error('FAIL: wrong entries:', wrong.map(k => ({ k, expected: expected[k], got: table[k] })));
  ok = false;
}
if (notInExpected.length || notInTable.length) {
  console.error('FAIL: 8x8 coverage', { notInExpected, notInTable });
  ok = false;
}

if (ok) {
  console.log('OK: HEXAGRAM_TABLE — 64 keys, no duplicates, matches King Wen (通行本) binary naming.');
  process.exit(0);
}
process.exit(1);
