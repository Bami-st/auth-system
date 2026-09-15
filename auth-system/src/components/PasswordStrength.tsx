"use client";

import React from 'react';
import styles from './PasswordStrength.module.css';

interface PasswordStrengthProps {
  password: string;
}

function getScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  return score; // 0-4
}

const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const score = getScore(password);

  return (
    <div className={styles.container} aria-hidden="true">
      <div className={styles.bars}>
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={`${styles.bar} ${
              segment <= score ? styles[`level${score}`] : ''
            }`}
          />
        ))}
      </div>
      <span className={`${styles.label} ${styles[`label${score}`]}`}>
        {labels[score]}
      </span>
    </div>
  );
}