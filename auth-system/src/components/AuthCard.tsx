import React, { ReactNode } from 'react';
import styles from './AuthCard.module.css';
import { LockIcon } from './icons';

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className={`${styles.card} animate-fade-in`}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>
          <LockIcon className={styles.brandIcon} />
        </span>
      </div>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div className={styles.content}>
        {children}
      </div>
      {footer && (
        <div className={styles.footer}>
          {footer}
        </div>
      )}
    </div>
  );
}