import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const PRINCIPLES = [
  { title: '不诚不占', desc: '心不诚则占不灵' },
  { title: '不疑不占', desc: '心不疑则占无意义' },
  { title: '不义不占', desc: '心不义则占招祸' },
];

export default function ConfirmDialog({ onConfirm, onCancel }: ConfirmDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    // 依次显示三不占原则
    const timers: ReturnType<typeof setTimeout>[] = [];
    PRINCIPLES.forEach((_, i) => {
      timers.push(setTimeout(() => setCurrentIndex(i), 220 + i * 240));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleSwipeConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className={styles.card}>
        <motion.h2
          className={styles.title}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          三不占
        </motion.h2>

        <div className={styles.principles}>
          {PRINCIPLES.map((p, i) => (
            <motion.div
              key={p.title}
              className={styles.principle}
              initial={{ opacity: 0, x: -20 }}
              animate={currentIndex >= i ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
            >
              <span className={styles.principleTitle}>{p.title}</span>
              <span className={styles.principleDesc}>{p.desc}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          className={styles.confirmArea}
          initial={{ opacity: 0 }}
          animate={currentIndex >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className={styles.hint}>请以手代心，确认以上三则</p>
          <motion.div
            className={styles.swipeHint}
            animate={{ x: [0, 30, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            &#8594; 划动确认
          </motion.div>
          <div
            className={styles.swipeArea}
            onPointerDown={(e) => {
              const startX = e.clientX;
              const handleMove = (moveE: PointerEvent) => {
                if (moveE.clientX - startX > 50) {
                  handleSwipeConfirm();
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                }
              };
              const handleUp = () => {
                window.removeEventListener('pointermove', handleMove);
                window.removeEventListener('pointerup', handleUp);
              };
              window.addEventListener('pointermove', handleMove);
              window.addEventListener('pointerup', handleUp);
            }}
          >
            <div className={styles.swipeTrack}>
              <div className={styles.swipeText}>向右确认</div>
              <motion.div
                className={styles.swipeThumb}
                drag="x"
                dragConstraints={{ left: 0, right: 120 }}
                dragElastic={0.08}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 72) {
                  handleSwipeConfirm();
                }
                }}
                whileTap={{ scale: 0.96 }}
              />
            </div>
          </div>
        </motion.div>

        <button className={styles.cancelBtn} onClick={onCancel}>
          重新酝酿
        </button>
      </div>
    </motion.div>
  );
}
