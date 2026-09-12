"use client";

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { ErrorMessage } from '@/components/ErrorMessage';
import { resetPasswordSchema } from '@/lib/validations/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <AuthCard title="Invalid Link" footer={<Link href="/signin">Return to sign in</Link>}>
        <ErrorMessage message="This password reset link is invalid or missing the token." />
      </AuthCard>
    );
  }

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
    
    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    const validationResult = resetPasswordSchema.safeParse({ 
      token, 
      password: formData.password 
    });
    
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
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: formData.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || 'Something went wrong. The link may have expired or already been used.');
        return;
      }

      // Success, redirect to sign in
      router.push('/signin?registered=true');
    } catch (err) {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard 
      title="Set new password" 
      description="Please enter your new password below."
    >
      <ErrorMessage message={serverError} />
      
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="password"
          name="password"
          type="password"
          label="New Password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          disabled={isLoading}
        />
        
        <FormField
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirm Password"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          disabled={isLoading}
        />
        
        <Button type="submit" isLoading={isLoading} style={{ marginTop: '0.5rem' }}>
          Reset password
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthCard title="Loading..." children={<div />} />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
