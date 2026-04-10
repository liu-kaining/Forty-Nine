import { motion } from 'framer-motion';
import type { HexagramDetails } from '../engine/divination';
import styles from './HexagramDetail.module.css';

interface HexagramDetailProps {
  details: HexagramDetails;
  onClose: () => void;
}

export default function HexagramDetail({ details, onClose }: HexagramDetailProps) {
  const hasChangingYao = details.yaos.some(y => y.isChanging);
  // 展示从上爻到初爻（上在上，初在下）
  const yaosForDisplay = [...details.yaos].reverse();

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
    >
      <motion.div
        className={styles.panel}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 2, delay: 0.3 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
          <h2 className={styles.title}>{details.name}</h2>
          <div className={styles.symbols}>
            <span className={styles.trigram}>{details.upperSymbol}</span>
            <span className={styles.trigramSeparator}>/</span>
            <span className={styles.trigram}>{details.lowerSymbol}</span>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Trigram meanings */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>卦象</h3>
            <div className={styles.trigramGrid}>
              <div className={styles.trigramCard}>
                <div className={styles.trigramName}>{details.upperName}</div>
                <div className={styles.trigramMeanings}>
                  {details.upperMeanings.slice(0, 4).map((m, i) => (
                    <span key={i} className={styles.trigramMeaning}>{m}</span>
                  ))}
                </div>
              </div>
              <div className={styles.trigramCard}>
                <div className={styles.trigramName}>{details.lowerName}</div>
                <div className={styles.trigramMeanings}>
                  {details.lowerMeanings.slice(0, 4).map((m, i) => (
                    <span key={i} className={styles.trigramMeaning}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Yao details */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>爻象</h3>
            <div className={styles.yaoList}>
              {yaosForDisplay.map(yao => (
                <div
                  key={yao.position}
                  className={`${styles.yaoItem} ${yao.isChanging ? styles.changing : ''}`}
                >
                  <span className={styles.yaoPosition}>{yao.positionName}</span>
                  <div className={styles.yaoLine}>
                    {yao.isYang ? (
                      <div className={styles.yangLine} />
                    ) : (
                      <div className={styles.yinLine} />
                    )}
                    {yao.isChanging && <span className={styles.changeMark}>*</span>}
                  </div>
                  <span className={styles.yaoValue}>{yao.valueName}</span>
                  <span className={styles.yaoType}>
                    {yao.isChanging ? '动' : ''}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Changed hexagram */}
          {hasChangingYao && details.changedHexagram && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>之卦</h3>
              <div className={styles.changedHexagram}>
                <span className={styles.changedName}>{details.changedHexagram.name}</span>
                <span className={styles.changedBinary}>
                  {details.changedHexagram.binary}
                </span>
              </div>
            </section>
          )}

          {/* Hexagram text */}
          {details.text && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>卦辞</h3>
              <p className={styles.hexagramText}>{details.text.base}</p>
            </section>
          )}

          {/* AI Interpretation placeholder */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>易象</h3>
            <div className={styles.interpretation}>
              <p className={styles.interpText}>
                {details.upperName}重而{details.lowerName}随，
                {details.upperMeanings[0]}
                {details.lowerMeanings[0]}。
                {hasChangingYao && '其中有变爻，宜静心观象。'}
              </p>
              <p className={styles.interpSub}>
                此为AI辅助解读，仅供参考
              </p>
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}
