import { FlaskConical } from 'lucide-react'
import { STUDY } from '../data/studyConfig'
import glass from './glass.module.css'
import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <div>
          <h1 className={styles.title}>Trial Flow</h1>
          <p className={styles.subtitle}>
            <span className="num">{STUDY.code}</span>
            <span className={styles.dot} />
            {STUDY.phase} · 52 weeks · double-blind
          </p>
        </div>
      </div>
      <div className={`${glass.glass} ${styles.badge}`} role="note">
        <FlaskConical size={14} aria-hidden />
        Synthetic data — for demonstration only
      </div>
    </header>
  )
}
