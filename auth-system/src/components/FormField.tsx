"use client";

import React, { InputHTMLAttributes, ReactNode, useState } from 'react';
import styles from './FormField.module.css';
import { EyeIcon, EyeOffIcon } from './icons';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
  hint?: string;
  labelHint?: ReactNode;
  leadingIcon?: ReactNode;
  autoComplete?: string;
}

export function FormField({
  label,
  error,
  id,
  hint,
  labelHint,
  leadingIcon,
  autoComplete,
  className = '',
  ...props
}: FormFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = props.type === 'password';
  const inputType = isPassword && isPasswordVisible ? 'text' : props.type;

  return (
    <div className={styles.container}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {labelHint && <div className={styles.labelHint}>{labelHint}</div>}
      </div>
      <div
        className={`${styles.inputWrapper} ${
          leadingIcon ? styles.hasLeadingIcon : ''
        } ${isPassword ? styles.hasPasswordToggle : ''} ${
          error ? styles.inputWrapperError : ''
        }`}
      >
        {leadingIcon && (
          <span className={styles.leadingIcon} aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          id={id}
          className={`${styles.input} ${className}`.trim()}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          {...props}
          type={inputType}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setIsPasswordVisible((v) => !v)}
            aria-label={
              isPasswordVisible ? 'Hide password' : 'Show password'
            }
            aria-pressed={isPasswordVisible}
            disabled={props.disabled}
          >
            {isPasswordVisible ? (
              <EyeOffIcon className={styles.toggleIcon} />
            ) : (
              <EyeIcon className={styles.toggleIcon} />
            )}
          </button>
        )}
      </div>
      {hint && !error && (
        <span className={styles.hint} id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span
          className={styles.errorMessage}
          id={`${id}-error`}
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}