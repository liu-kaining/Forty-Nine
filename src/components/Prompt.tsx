import { motion, AnimatePresence } from 'framer-motion';
import styles from './Prompt.module.css';

interface PromptProps {
  text: string;
  subText?: string;
}

export default function Prompt({ text, subText }: PromptProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={text}
        className={styles.container}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <p className={styles.mainText}>{text}</p>
        {subText && <p className={styles.subText}>{subText}</p>}
      </motion.div>
    </AnimatePresence>
  );
}
