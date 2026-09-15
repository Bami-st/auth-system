"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { ErrorMessage } from '@/components/ErrorMessage';
import { MailIcon } from '@/components/icons';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import styles from './page.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setError('');

    const validationResult = forgotPasswordSchema.safeParse({ email });

    if (!validationResult.success) {
      setError(validationResult.error.issues[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setServerError('Too many requests. Please try again later.');
        } else {
          setServerError(data.error || 'Something went wrong.');
        }
        return;
      }

      // Always show success message even if email wasn't found (prevents enumeration)
      setIsSubmitted(true);
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthCard
        title="Check your email"
        footer={<Link href="/signin">Return to sign in</Link>}
      >
        <div className={styles.sent}>
          <div className={styles.sentIcon}>
            <MailIcon className={styles.sentIconSvg} />
          </div>
          <p className={styles.sentTitle}>
            We&apos;ve sent you a password reset link if the email exists in
            our system.
          </p>
          <p className={styles.sentText}>
            Check your inbox and click the link to reset your password. The
            link will expire in 1 hour.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email address and we&apos;ll send you a link to reset your password."
      footer={<Link href="/signin">Return to sign in</Link>}
    >
      <ErrorMessage message={serverError} />

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="name@example.com"
          leadingIcon={<MailIcon />}
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          error={error}
          disabled={isLoading}
          autoFocus
        />

        <Button
          type="submit"
          isLoading={isLoading}
          className={styles.submit}
        >
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}