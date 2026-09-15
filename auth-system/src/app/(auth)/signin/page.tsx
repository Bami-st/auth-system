"use client";

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { ErrorMessage } from '@/components/ErrorMessage';
import { SuccessMessage } from '@/components/SuccessMessage';
import { MailIcon, LockIcon } from '@/components/icons';
import { signinSchema } from '@/lib/validations/auth';
import styles from './page.module.css';

function SigninForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const validationResult = signinSchema.safeParse(formData);

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || 'Invalid credentials');
        return;
      }

      router.push('/dashboard');
      router.refresh(); // Refresh to ensure layout catches session changes
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to access your account"
      footer={
        <span>
          Don&apos;t have an account?{' '}
          <Link href="/signup">Sign up</Link>
        </span>
      }
    >
      {registered && (
        <SuccessMessage message="Password reset successfully. You can now sign in." />
      )}

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
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          disabled={isLoading}
          autoFocus
        />

        <FormField
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          leadingIcon={<LockIcon />}
          autoComplete="current-password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          disabled={isLoading}
          labelHint={
            <Link href="/forgot-password">Forgot password?</Link>
          }
        />

        <Button
          type="submit"
          isLoading={isLoading}
          className={styles.submit}
        >
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={<AuthCard title="Loading..."><div /></AuthCard>}>
      <SigninForm />
    </Suspense>
  );
}