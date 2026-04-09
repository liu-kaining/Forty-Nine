import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChangeResult, AnimationPhase } from '../types';
import styles from './StalkBundle.module.css';

const ANIM = { duration: 2.4, ease: [0.25, 0.1, 0.25, 1] as const };

interface StalkBundleProps {
  total: number;
  splitRatio: number;
  animationPhase: AnimationPhase | null;
  changeResult: ChangeResult | null;
  isSplit: boolean;
  leftGroupsRemoved: number;
  rightGroupsRemoved: number;
}

interface StalkData {
  id: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

function generateStalks(count: number, seed: number): StalkData[] {
  const stalks: StalkData[] = [];
  for (let i = 0; i < count; i++) {
    const hash = Math.sin((i + seed) * 2654.435 + 0.1) * 10000;
    stalks.push({
      id: seed * 10000 + i,
      offsetX: (hash % 3) - 1.5,
      offsetY: (Math.sin(hash) * 5) - 2.5,
      rotation: (Math.cos(hash) * 2.5) - 1.25,
    });
  }
  return stalks;
}

/**
 * 将一堆蓍草按4个一组分组，返回 [groups[], remainder[]]
 */
function splitIntoGroups(stalks: StalkData[], pileSize: number): [StalkData[][], StalkData[]] {
  const fullGroups = Math.floor(pileSize / 4);
  const groups: StalkData[][] = [];
  let idx = 0;
  for (let g = 0; g < fullGroups; g++) {
    groups.push(stalks.slice(idx, idx + 4));
    idx += 4;
  }
  // 注意：余数为4时已算入groups，remainderCount对应的也是4
  // 实际 remainder 是 pileSize - fullGroups * 4
  const actualRemainder = pileSize - fullGroups * 4;
  const remainder = stalks.slice(idx, idx + actualRemainder);
  return [groups, remainder];
}

export default function StalkBundle({
  total,
  splitRatio,
  animationPhase,
  changeResult,
  isSplit,
  leftGroupsRemoved,
  rightGroupsRemoved,
}: StalkBundleProps) {
  const computed = useMemo(() => {
    if (!isSplit || !changeResult) {
      return {
        allStalks: generateStalks(total, 0),
        leftAll: [] as StalkData[],
        rightAll: [] as StalkData[],
        hungStalk: null as StalkData | null,
        leftGroups: [] as StalkData[][],
        leftRemainder: [] as StalkData[],
        rightGroups: [] as StalkData[][],
        rightRemainder: [] as StalkData[],
      };
    }
    const cr = changeResult;
    const leftAll = generateStalks(cr.leftPile, 1);
    const rightAllWithHung = generateStalks(cr.rightPile + 1, 2);
    const hung = rightAllWithHung[0];
    const rightAll = rightAllWithHung.slice(1);

    const [leftGroups, leftRem] = splitIntoGroups(leftAll, cr.leftPile);
    const [rightGroups, rightRem] = splitIntoGroups(rightAll, cr.rightPile);

    return {
      allStalks: [] as StalkData[],
      leftAll,
      rightAll,
      hungStalk: hung,
      leftGroups,
      leftRemainder: leftRem,
      rightGroups,
      rightRemainder: rightRem,
    };
  }, [total, isSplit, changeResult, splitRatio]);

  const phase = animationPhase;
  const isAfterHang = phase !== 'SPLIT';
  const isCountingLeft = phase === 'COUNT_LEFT' || phase === 'COUNT_RIGHT' || phase === 'GATHER' || phase === 'REGROUP' || phase === 'PAUSE';
  const isCountingRight = phase === 'COUNT_RIGHT' || phase === 'GATHER' || phase === 'REGROUP' || phase === 'PAUSE';
  const isGather = phase === 'GATHER' || phase === 'REGROUP' || phase === 'PAUSE';
  const isRegroup = phase === 'REGROUP' || phase === 'PAUSE';

  // 左堆可见蓍草：揲四时逐组移除
  const leftVisible = useMemo(() => {
    if (!isCountingLeft) return computed.leftAll;
    const remaining = computed.leftAll.slice(leftGroupsRemoved * 4);
    return remaining;
  }, [isCountingLeft, computed.leftAll, leftGroupsRemoved]);

  // 右堆可见蓍草
  const rightVisible = useMemo(() => {
    if (!isCountingRight) return computed.rightAll;
    const remaining = computed.rightAll.slice(rightGroupsRemoved * 4);
    return remaining;
  }, [isCountingRight, computed.rightAll, rightGroupsRemoved]);

  // 当前正被拿走的一组（用于飘走动画）
  const leftCurrentGroup = useMemo(() => {
    if (phase !== 'COUNT_LEFT' || leftGroupsRemoved === 0) return [];
    const start = (leftGroupsRemoved - 1) * 4;
    return computed.leftAll.slice(start, start + 4);
  }, [phase, leftGroupsRemoved, computed.leftAll]);

  const rightCurrentGroup = useMemo(() => {
    if (phase !== 'COUNT_RIGHT' || rightGroupsRemoved === 0) return [];
    const start = (rightGroupsRemoved - 1) * 4;
    return computed.rightAll.slice(start, start + 4);
  }, [phase, rightGroupsRemoved, computed.rightAll]);

  // 未分割：居中一堆
  if (!isSplit) {
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.pile}
          layout
          transition={{ duration: ANIM.duration, ease: ANIM.ease }}
        >
          {computed.allStalks.map(s => (
            <Stalk key={s.id} data={s} />
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.splitView}>
        {/* 左堆 */}
        <motion.div
          className={styles.pileWrapper}
          initial={{ x: 0 }}
          animate={{ x: '-10vw' }}
          transition={{ duration: ANIM.duration, ease: ANIM.ease }}
        >
          {/* 揲四计数标签 */}
          {phase === 'COUNT_LEFT' && leftGroupsRemoved > 0 && (
            <motion.div
              key={`lcount-${leftGroupsRemoved}`}
              className={styles.countLabel}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              {leftGroupsRemoved * 4}
            </motion.div>
          )}
          <div className={styles.pile}>
            <AnimatePresence mode="popLayout">
              {leftVisible.map(s => (
                <Stalk key={s.id} data={s} />
              ))}
            </AnimatePresence>
          </div>
          {/* 飘走的一组 */}
          <AnimatePresence>
            {leftCurrentGroup.length > 0 && (
              <motion.div
                key={`lg-${leftGroupsRemoved}`}
                className={styles.flyingGroup}
                initial={{ opacity: 1, y: 0, x: 0 }}
                animate={{ opacity: 0, y: -80, x: -40 }}
                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              >
                {leftCurrentGroup.map(s => (
                  <div key={s.id} className={styles.stalk} style={{ height: '40px' }} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 挂一 */}
        <AnimatePresence>
          {isAfterHang && computed.hungStalk && (
            <motion.div
              className={styles.hungArea}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: -30 }}
              transition={{ duration: ANIM.duration, ease: ANIM.ease }}
            >
              <div className={styles.stalk} style={{ height: '35vh', minHeight: '140px', maxHeight: '280px' }} />
              <span className={styles.hungLabel}>挂一</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 右堆 */}
        <motion.div
          className={styles.pileWrapper}
          initial={{ x: 0 }}
          animate={{ x: '10vw' }}
          transition={{ duration: ANIM.duration, ease: ANIM.ease }}
        >
          {phase === 'COUNT_RIGHT' && rightGroupsRemoved > 0 && (
            <motion.div
              key={`rcount-${rightGroupsRemoved}`}
              className={styles.countLabel}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              {rightGroupsRemoved * 4}
            </motion.div>
          )}
          <div className={styles.pile}>
            <AnimatePresence mode="popLayout">
              {rightVisible.map(s => (
                <Stalk key={s.id} data={s} />
              ))}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {rightCurrentGroup.length > 0 && (
              <motion.div
                key={`rg-${rightGroupsRemoved}`}
                className={styles.flyingGroup}
                initial={{ opacity: 1, y: 0, x: 0 }}
                animate={{ opacity: 0, y: -80, x: 40 }}
                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              >
                {rightCurrentGroup.map(s => (
                  <div key={s.id} className={styles.stalk} style={{ height: '40px' }} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* 归拢提示 */}
      <AnimatePresence>
        {isGather && (
          <motion.div
            className={styles.gatherArea}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.7, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.0, ease: 'easeInOut' }}
          >
            <span className={styles.gatherText}>
              归余 {changeResult ? changeResult.removed : 0} 根
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRegroup && changeResult && (
          <motion.div
            className={styles.remainText}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
          >
            余 {changeResult.nextTotal} 根
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stalk({ data }: { data: StalkData }) {
  return (
    <motion.div
      className={styles.stalk}
      style={{
        transform: `translateX(${data.offsetX}px) translateY(${data.offsetY}px) rotate(${data.rotation}deg)`,
      }}
      initial={{ opacity: 0, scaleY: 0.5 }}
      animate={{ opacity: 1, scaleY: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.7 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      layout
    />
  );
}
