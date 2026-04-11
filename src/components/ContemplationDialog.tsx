import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import styles from './ContemplationDialog.module.css';

interface ContemplationDialogProps {
  onConfirm: () => void;
}

export default function ContemplationDialog({ onConfirm }: ContemplationDialogProps) {
  const [phase, setPhase] = useState(0);
  const [showTimer, setShowTimer] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase(1), 180));
    timers.push(setTimeout(() => setPhase(2), 760));
    timers.push(setTimeout(() => setPhase(3), 1320));
    timers.push(setTimeout(() => setShowTimer(true), 1760));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleConfirm = useCallback(() => {
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
        <motion.div
          className={styles.content}
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className={styles.title}>占卜之道</h2>
        </motion.div>

        <motion.div
          className={styles.verse}
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p>「蓍之诚，诚之至」</p>
          <p>「心有所疑，事有所见」</p>
          <p>「义之所存，道之所存」</p>
        </motion.div>

        <motion.div
          className={styles.warning}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.warningIcon}>!</div>
          <p>占卜非儿戏</p>
          <p>此乃通天彻地之事</p>
          <p>不可不慎</p>
        </motion.div>

        <motion.div
          className={styles.prompt}
          initial={{ opacity: 0 }}
          animate={showTimer ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className={styles.promptText}>静心凝神</p>
          <p className={styles.promptText}>默念所问之事</p>
          <p className={styles.promptTextSub}>待心定神清，方可开始</p>
        </motion.div>

        <motion.button
          className={styles.confirmBtn}
          onClick={handleConfirm}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          心已定，开始占卜
        </motion.button>
      </div>
    </motion.div>
  );
}
