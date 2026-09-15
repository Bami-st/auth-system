"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { ErrorMessage } from '@/components/ErrorMessage';
import { SuccessMessage } from '@/components/SuccessMessage';
import { ShieldCheckIcon } from '@/components/icons';
import { verifyEmailSchema } from '@/lib/validations/auth';
import styles from './page.module.css';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Resend cooldown state
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submitVerification = useCallback(async () => {
    if (!email) {
      setServerError('Email parameter is missing.');
      return;
    }

    const validationResult = verifyEmailSchema.safeParse({ code });

    if (!validationResult.success) {
      setError(validationResult.error.issues[0].message);
      return;
    }

    setServerError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || 'Invalid or expired code.');
        return;
      }

      // Success, redirect to sign in
      router.push('/signin');
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, code, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitVerification();
  };

  // Auto-submit once the full 6-digit code has been entered
  const submittedCodeRef = useRef('');
  useEffect(() => {
    if (code.length === 6 && submittedCodeRef.current !== code) {
      submittedCodeRef.current = code;
      submitVerification();
    }
  }, [code, submitVerification]);

  const handleResend = async () => {
    if (cooldown > 0) return;

    setServerError('');
    setSuccessMsg('');
    setIsResending(true);

    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          // Parse retry-after from header or response
          const retryAfter = res.headers.get('Retry-After');
          if (retryAfter) {
            setCooldown(parseInt(retryAfter, 10));
          } else {
            setCooldown(60); // Default fallback
          }
          setServerError(data.error || 'Please wait before requesting a new code.');
        } else {
          setServerError(data.error || 'Failed to resend code.');
        }
        return;
      }

      setSuccessMsg('A new verification code has been sent to your email.');
      setCooldown(60); // Start 60s cooldown in UI
    } catch {
      setServerError('An unexpected error occurred while resending.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthCard
      title="Verify your email"
      description={`Enter the 6-digit code we sent to ${email}`}
    >
      <div className={styles.badge}>
        <ShieldCheckIcon className={styles.badgeIcon} />
        <span>Your account has been created — just one more step.</span>
      </div>

      <ErrorMessage message={serverError} />
      <SuccessMessage message={successMsg} />

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="code"
          name="code"
          type="text"
          label="Verification code"
          placeholder="123456"
          className={styles.codeInput}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); // Only digits, max 6
            if (error) setError('');
          }}
          error={error}
          disabled={isLoading}
          maxLength={6}
          autoFocus
        />

        <Button
          type="submit"
          isLoading={isLoading}
          className={styles.submit}
        >
          Verify email
        </Button>
      </form>

      <div className={styles.resend}>
        <p>Didn&apos;t receive the code?</p>
        <Button
          variant="secondary"
          onClick={handleResend}
          disabled={cooldown > 0 || isResending}
          isLoading={isResending}
        >
          {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend code'}
        </Button>
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthCard title="Loading..."><div /></AuthCard>}>
      <VerifyEmailForm />
    </Suspense>
  );
}