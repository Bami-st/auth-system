import React, { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive';
  fullWidth?: boolean;
}

export function Button({ 
  children, 
  isLoading, 
  variant = 'primary', 
  fullWidth = true,
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const rootClass = `${styles.button} ${styles[variant]} ${fullWidth ? styles.fullWidth : ''} ${className}`;
  
  return (
    <button 
      className={rootClass} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className={styles.spinner}></span>
      ) : (
        children
      )}
    </button>
  );
}
