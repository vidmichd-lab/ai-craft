'use client';

import styles from './workspace-shell.module.css';

export function LegacyStudioFrame() {
  return (
    <section className={styles.panel}>
      <div className={styles.stack}>
        <div>
          <div className={styles.sectionLabel}>Legacy Studio</div>
          <h2 className={styles.sectionTitle}>Полный editor runtime внутри Next</h2>
        </div>
        <div className={styles.legacyFrameWrap}>
          <iframe
            className={styles.legacyFrame}
            src="/legacy-app/index.html?embedded=1"
            title="AI-Craft Legacy Studio"
          />
        </div>
      </div>
    </section>
  );
}
