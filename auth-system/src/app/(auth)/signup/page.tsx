"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { ErrorMessage } from '@/components/ErrorMessage';
import { PasswordStrength } from '@/components/PasswordStrength';
import { UserIcon, MailIcon, LockIcon } from '@/components/icons';
import { signupSchema } from '@/lib/validations/auth';
import styles from './page.module.css';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
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

    // Client-side validation using shared schema
    const validationResult = signupSchema.safeParse(formData);

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
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setServerError(`Too many requests. Please try again later.`);
        } else {
          setServerError(data.error || 'Something went wrong. Please try again.');
        }
        return;
      }

      // Success, redirect to verify email
      const searchParams = new URLSearchParams({ email: formData.email });
      router.push(`/verify-email?${searchParams.toString()}`);
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create an account"
      description="Get started in less than a minute"
      footer={
        <span>
          Already have an account?{' '}
          <Link href="/signin">Sign in</Link>
        </span>
      }
    >
      <ErrorMessage message={serverError} />

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="name"
          name="name"
          type="text"
          label="Full name"
          placeholder="John Doe"
          leadingIcon={<UserIcon />}
          autoComplete="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          disabled={isLoading}
          autoFocus
        />

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
        />

        <FormField
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="Create a strong password"
          leadingIcon={<LockIcon />}
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          disabled={isLoading}
          hint="Use at least 8 characters with uppercase, lowercase and a number."
        />

        <PasswordStrength password={formData.password} />

        <Button
          type="submit"
          isLoading={isLoading}
          className={styles.submit}
        >
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}