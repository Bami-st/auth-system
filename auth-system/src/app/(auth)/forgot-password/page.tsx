"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { ErrorMessage } from '@/components/ErrorMessage';
import { forgotPasswordSchema } from '@/lib/validations/auth';

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
    } catch (err) {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthCard 
        title="Check your email" 
        description="We've sent you a password reset link if the email exists in our system."
        footer={<Link href="/signin">Return to sign in</Link>}
      >
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ color: 'var(--secondary-foreground)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            Please check your inbox and click the link to reset your password. The link will expire in 1 hour.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard 
      title="Reset password" 
      description="Enter your email address and we'll send you a link to reset your password."
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
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          error={error}
          disabled={isLoading}
        />
        
        <Button type="submit" isLoading={isLoading} style={{ marginTop: '0.5rem' }}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
