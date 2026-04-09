import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDivinationMachine } from './hooks/useDivinationMachine';
import { getHexagramInfo } from './engine/divination';
import StalkBundle from './components/StalkBundle';
import SplitArea from './components/SplitArea';
import YaoDisplay from './components/YaoDisplay';
import Prompt from './components/Prompt';
import styles from './App.module.css';

const CHANGE_NAMES = ['第一变', '第二变', '第三变'];
const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

export default function App() {
  const { state, removeTaiChi, split, runAnimation, reset } = useDivinationMachine();
  const { machineState, animationPhase, total, currentYao, currentChange, changeNumber, yaoResults, currentChangeResult, splitRatio } = state;

  // 分割回调
  const handleSplit = useCallback(
    (ratio: number) => {
      split(ratio);
    },
    [split]
  );

  // 分割后自动播放动画
  useEffect(() => {
    if (machineState === 'ANIMATING' && animationPhase === 'SPLIT') {
      runAnimation();
    }
  }, [machineState, animationPhase, runAnimation]);

  // 生成提示文字
  const getPromptText = (): { text: string; subText?: string } => {
    switch (machineState) {
      case 'PREPARE':
        return {
          text: '大衍之数五十',
          subText: '请取一蓍置于高阁，以象太极',
        };
      case 'AWAITING_SPLIT':
        return {
          text: `${YAO_NAMES[currentYao]} ${CHANGE_NAMES[currentChange]}`,
          subText: `分而为二，以象两仪 (${total} 根)`,
        };
      case 'ANIMATING': {
        const phaseText: Record<string, string> = {
          SPLIT: '分而为二，以象两仪',
          HANG_ONE: '挂一以象三才',
          COUNT_LEFT: '揲之以四，以象四时',
          COUNT_RIGHT: '揲之以四，以象四时',
          GATHER: '归奇于扐',
          REGROUP: '再扐而后挂',
          PAUSE: '——',
        };
        const phaseSubText = animationPhase === 'PAUSE'
          ? '静息'
          : `第 ${changeNumber} 变 / 共 18 变`;
        return {
          text: phaseText[animationPhase || 'SPLIT'],
          subText: phaseSubText,
        };
      }
      case 'HEXAGRAM_COMPLETE':
        return { text: '卦成' };
      default:
        return { text: '' };
    }
  };

  const prompt = getPromptText();

  // 成卦信息
  const hexagramInfo = machineState === 'HEXAGRAM_COMPLETE' && yaoResults.length === 6
    ? getHexagramInfo(yaoResults)
    : null;

  return (
    <div className={styles.app}>
      {/* 顶部提示 */}
      <header className={styles.header}>
        <Prompt text={prompt.text} subText={prompt.subText} />
      </header>

      {/* 主区域 */}
      <main className={styles.main}>
        <AnimatePresence mode="wait">
          {machineState !== 'HEXAGRAM_COMPLETE' ? (
            <motion.div
              key="stalks"
              className={styles.stalkArea}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
            >
              {/* 太极之蓍（准备态点击取走） */}
              {machineState === 'PREPARE' && (
                <motion.div
                  className={styles.taichiStalk}
                  onClick={removeTaiChi}
                  whileHover={{ scale: 1.2, y: -5 }}
                  whileTap={{ scale: 0.9 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                >
                  <div className={styles.singleStalk} />
                  <span className={styles.taichiLabel}>太极</span>
                </motion.div>
              )}

              {/* 蓍草堆 */}
              <StalkBundle
                total={total}
                splitRatio={splitRatio}
                animationPhase={animationPhase}
                changeResult={currentChangeResult}
                isSplit={machineState === 'ANIMATING'}
                leftGroupsRemoved={state.leftGroupsRemoved}
                rightGroupsRemoved={state.rightGroupsRemoved}
              />

              {/* 分割交互层 */}
              <SplitArea
                enabled={machineState === 'AWAITING_SPLIT'}
                onSplit={handleSplit}
              />
            </motion.div>
          ) : (
            <motion.div
              key="hexagram"
              className={styles.hexagramArea}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 2, ease: 'easeOut' }}
            >
              <YaoDisplay yaos={yaoResults} large />
              {hexagramInfo && (
                <motion.div
                  className={styles.hexagramInfo}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.5, delay: 1 }}
                >
                  <h2 className={styles.hexagramName}>{hexagramInfo.original.name}</h2>
                  {hexagramInfo.changed && (
                    <p className={styles.changedName}>
                      之 {hexagramInfo.changed.name}
                    </p>
                  )}
                </motion.div>
              )}
              <motion.button
                className={styles.resetBtn}
                onClick={reset}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
              >
                再起一卦
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 底部爻象进度 */}
      {machineState !== 'HEXAGRAM_COMPLETE' && yaoResults.length > 0 && (
        <footer className={styles.footer}>
          <YaoDisplay yaos={yaoResults} />
        </footer>
      )}

      {/* 进度指示 */}
      {machineState !== 'PREPARE' && machineState !== 'HEXAGRAM_COMPLETE' && (
        <div className={styles.progress}>
          <div
            className={styles.progressBar}
            style={{ width: `${(changeNumber / 18) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
