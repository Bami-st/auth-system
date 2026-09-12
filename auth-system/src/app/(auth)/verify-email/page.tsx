"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { ErrorMessage } from '@/components/ErrorMessage';
import { verifyEmailSchema } from '@/lib/validations/auth';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setError('');
    
    if (!email) {
      setServerError('Email parameter is missing.');
      return;
    }

    const validationResult = verifyEmailSchema.safeParse({ code });
    
    if (!validationResult.success) {
      setError(validationResult.error.issues[0].message);
      return;
    }

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

      // Success, redirect to dashboard or sign in
      // Assuming they need to sign in after verifying for safety, 
      // though we could log them in directly. Let's redirect to dashboard which will redirect to signin.
      router.push('/signin');
    } catch (err) {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch (err) {
      setServerError('An unexpected error occurred while resending.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthCard 
      title="Verify your email" 
      description={`We sent a 6-digit code to ${email}`}
    >
      <ErrorMessage message={serverError} />
      {successMsg && (
        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {successMsg}
        </div>
      )}
      
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="code"
          name="code"
          type="text"
          label="Verification Code"
          placeholder="123456"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); // Only digits, max 6
            if (error) setError('');
          }}
          error={error}
          disabled={isLoading}
          maxLength={6}
        />
        
        <Button type="submit" isLoading={isLoading} style={{ marginTop: '0.5rem' }}>
          Verify Email
        </Button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          Didn't receive the code?
        </p>
        <Button 
          variant="secondary" 
          onClick={handleResend} 
          disabled={cooldown > 0 || isResending}
          isLoading={isResending}
        >
          {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend Code'}
        </Button>
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthCard title="Loading..." children={<div />} />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
