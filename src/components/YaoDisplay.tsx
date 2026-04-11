import { motion, AnimatePresence } from 'framer-motion';
import type { YaoInfo } from '../types';
import styles from './YaoDisplay.module.css';

interface YaoDisplayProps {
  yaos: YaoInfo[];
  large?: boolean;
}

const YAO_LABELS: Record<number, string> = {
  0: '初', 1: '二', 2: '三', 3: '四', 4: '五', 5: '上',
};

const VALUE_LABELS: Record<number, string> = {
  6: '老阴', 7: '少阳', 8: '少阴', 9: '老阳',
};

export default function YaoDisplay({ yaos, large = false }: YaoDisplayProps) {
  // 从上爻到初爻的顺序显示（上在上，初在下）
  const reversed = [...yaos].reverse();

  return (
    <div className={`${styles.container} ${large ? styles.large : ''}`}>
      <AnimatePresence>
        {reversed.map((yao, displayIndex) => {
          const yaoIndex = yaos.length - 1 - displayIndex;
          return (
            <motion.div
              key={yaoIndex}
              className={styles.yaoRow}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: displayIndex * 0.06, ease: 'easeOut' }}
            >
              {large && (
                <span className={styles.label}>{YAO_LABELS[yaoIndex]}</span>
              )}
              <div className={styles.yaoLine}>
                {yao.isYang ? (
                  <YangLine changing={yao.isChanging} />
                ) : (
                  <YinLine changing={yao.isChanging} />
                )}
              </div>
              {large && (
                <span className={`${styles.valueLabel} ${yao.isChanging ? styles.changing : ''}`}>
                  {VALUE_LABELS[yao.value]}
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function YangLine({ changing }: { changing: boolean }) {
  return (
    <div className={styles.yangContainer}>
      <div className={styles.yangLine} />
      {changing && <span className={styles.changeMark}>&#9675;</span>}
    </div>
  );
}

function YinLine({ changing }: { changing: boolean }) {
  return (
    <div className={styles.yinContainer}>
      <div className={styles.yinLeft} />
      <div className={styles.yinGap} />
      <div className={styles.yinRight} />
      {changing && <span className={styles.changeMark}>&#215;</span>}
    </div>
  );
}
