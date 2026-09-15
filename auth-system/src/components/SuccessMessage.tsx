import React from 'react';
import styles from './SuccessMessage.module.css';
import { CheckCircleIcon } from './icons';

interface SuccessMessageProps {
  message: string;
}

export function SuccessMessage({ message }: SuccessMessageProps) {
  if (!message) return null;

  return (
    <div className={styles.container} role="status">
      <CheckCircleIcon className={styles.icon} />
      <span>{message}</span>
    </div>
  );
}