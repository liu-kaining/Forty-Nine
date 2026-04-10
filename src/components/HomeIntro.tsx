import { motion } from 'framer-motion';
import styles from './HomeIntro.module.css';

interface HomeIntroProps {
  onEnterGallery: () => void;
}

export default function HomeIntro({ onEnterGallery }: HomeIntroProps) {
  return (
    <div className={styles.page}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        <div className={styles.title}>四 十 九 蓍</div>
        <div className={styles.subtitle}>占以明心，静以观象</div>

        <div className={styles.method}>
          <div className={styles.methodTitle}>大衍筮法</div>
          <ol className={styles.steps}>
            <li>大衍之数五十，取一蓍置于高阁，以象太极</li>
            <li>余四十九，分而为二，以象两仪</li>
            <li>挂一以象三才，揲之以四，以象四时，归奇于扐</li>
            <li>三变成一爻，六爻成卦；动爻取变，得之卦</li>
          </ol>
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} onClick={onEnterGallery}>
            观六十四卦
          </button>
        </div>

        <div className={styles.hint}>在卦表页点击“开始占卜”继续</div>
      </motion.div>
    </div>
  );
}

