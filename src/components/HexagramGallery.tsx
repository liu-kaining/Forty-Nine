import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import styles from './HexagramGallery.module.css';
import { HEXAGRAM_TABLE } from '../engine/hexagrams';

const TRIGRAM_SYMBOLS: Record<string, string> = {
  '111': '☰', '000': '☷', '100': '☳', '010': '☵',
  '001': '☶', '011': '☴', '101': '☲', '110': '☱',
};

const TRIGRAM_NAMES: Record<string, string> = {
  '111': '乾', '000': '坤', '100': '震', '010': '坎',
  '001': '艮', '011': '巽', '101': '离', '110': '兑',
};

// 先天八卦常用顺序（更像“表”而不是随机铺满）
const TRIGRAM_ORDER: string[] = ['111', '110', '101', '100', '011', '010', '001', '000']; // 乾 兑 离 震 巽 坎 艮 坤

interface HexagramGalleryProps {
  onComplete: () => void;
}

export default function HexagramGallery({ onComplete }: HexagramGalleryProps) {
  const [isExiting, setIsExiting] = useState(false);

  const matrix = useMemo(() => {
    return TRIGRAM_ORDER.map(lower => {
      return TRIGRAM_ORDER.map(upper => {
        const binary = `${lower}${upper}`; // 初爻在前：下卦(0-2) + 上卦(3-5)
        const name = HEXAGRAM_TABLE[binary] ?? '—';
        return { binary, name, lower, upper };
      });
    });
  }, []);

  const handleClick = () => {
    if (isExiting) return;
    setIsExiting(true);
    // 先淡出，再进入主流程
    setTimeout(() => onComplete(), 900);
  };

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
    >
      {/* Header (non-blocking) */}
      <div className={styles.topBar}>
        <div className={styles.topTitle}>六十四卦</div>
        <div className={styles.topSub}>上卦为列，下卦为行</div>
      </div>

      {/* Scrolling gallery */}
      <motion.div
        className={styles.gallery}
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
      >
        <div className={styles.matrixWrap}>
          <div className={styles.matrixGrid}>
            {/* 左上角空白 */}
            <div className={styles.cornerCell} />

            {/* 顶部：上卦标题 */}
            {TRIGRAM_ORDER.map(upper => (
              <div key={`col-${upper}`} className={styles.headerCell}>
                <div className={styles.headerSymbol}>{TRIGRAM_SYMBOLS[upper]}</div>
                <div className={styles.headerName}>{TRIGRAM_NAMES[upper]}</div>
                <div className={styles.headerHint}>上卦</div>
              </div>
            ))}

            {/* 行：下卦标题 + 8 个卦 */}
            {matrix.map((row, rowIdx) => {
              const lower = TRIGRAM_ORDER[rowIdx];
              return (
                <div key={`row-${lower}`} className={styles.rowGroup}>
                  <div className={styles.rowHeaderCell}>
                    <div className={styles.headerSymbol}>{TRIGRAM_SYMBOLS[lower]}</div>
                    <div className={styles.headerName}>{TRIGRAM_NAMES[lower]}</div>
                    <div className={styles.headerHint}>下卦</div>
                  </div>

                  {row.map(cell => (
                    <div key={cell.binary} className={styles.hexagramCell}>
                      <div className={styles.cellSymbols}>
                        <span className={styles.cellTrigram}>{TRIGRAM_SYMBOLS[cell.upper]}</span>
                        <span className={styles.cellTrigram}>{TRIGRAM_SYMBOLS[cell.lower]}</span>
                      </div>
                      <div className={styles.hexagramName}>{cell.name}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Start action (does not block viewing the table) */}
      <div className={styles.startDock}>
        <button className={styles.startButton} onClick={handleClick} disabled={isExiting}>
          开始占卜
        </button>
      </div>
    </motion.div>
  );
}
