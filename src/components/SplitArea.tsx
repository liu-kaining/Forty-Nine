import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './SplitArea.module.css';

interface SplitAreaProps {
  enabled: boolean;
  onSplit: (ratio: number) => void;
}

export default function SplitArea({ enabled, onSplit }: SplitAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [cursorX, setCursorX] = useState(0);
  const [cursorRatio, setCursorRatio] = useState(0.5);
  const [trail, setTrail] = useState<number[]>([]);

  const getRelativeX = useCallback((clientX: number) => {
    if (!containerRef.current) return { x: 0, ratio: 0.5 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.max(0.1, Math.min(0.9, x / rect.width));
    return { x, ratio };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      draggingRef.current = true;
      setIsDragging(true);
      const { x, ratio } = getRelativeX(e.clientX);
      setCursorX(x);
      setCursorRatio(ratio);
      startXRef.current = x;
      setTrail([x]);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [enabled, getRelativeX]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      const { x, ratio } = getRelativeX(e.clientX);
      setCursorX(x);
      setCursorRatio(ratio);
      // 保留轨迹（最近几个点，做扩散效果）
      setTrail(prev => [...prev.slice(-6), x]);
    },
    [getRelativeX]
  );

  /** 抬手时用当前指针位置算 ratio，避免 setState 未刷完用上一次的 cursorRatio */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const { x, ratio } = getRelativeX(e.clientX);
      setIsDragging(false);
      setTrail([]);
      if (Math.abs(x - startXRef.current) > 20) {
        onSplit(ratio);
      }
    },
    [getRelativeX, onSplit]
  );

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      className={styles.splitArea}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 提示 */}
      <AnimatePresence>
        {!isDragging && (
          <motion.div
            className={styles.hint}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, delay: 0.3 }}
          >
            <motion.span
              className={styles.handIcon}
              animate={{ x: [0, 20, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              &#9995;
            </motion.span>
            <span className={styles.hintText}>以手拨开蓍草</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 拨开的扩散痕迹 */}
      {isDragging && trail.map((tx, i) => (
        <motion.div
          key={i}
          className={styles.trailDot}
          style={{ left: tx }}
          initial={{ opacity: 0.5, scaleX: 1 }}
          animate={{ opacity: 0, scaleX: 3 }}
          transition={{ duration: 0.8 }}
        />
      ))}

      {/* 分割指示线 */}
      {isDragging && (
        <motion.div
          className={styles.splitLine}
          style={{ left: cursorX }}
          initial={{ opacity: 0, scaleY: 0.3 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.8 }}
        />
      )}
    </div>
  );
}
