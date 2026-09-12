"use client";

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { ErrorMessage } from '@/components/ErrorMessage';
import { signinSchema } from '@/lib/validations/auth';

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
    } catch (err) {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard 
      title="Welcome back" 
      description="Enter your email to sign in to your account"
      footer={
        <span>
          Don't have an account?{' '}
          <Link href="/signup">Sign up</Link>
        </span>
      }
    >
      {registered && (
        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Password reset successfully. You can now sign in.
        </div>
      )}
      
      <ErrorMessage message={serverError} />
      
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="name@example.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          disabled={isLoading}
        />
        
        <div style={{ position: 'relative' }}>
          <FormField
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            disabled={isLoading}
          />
          <Link 
            href="/forgot-password" 
            style={{ 
              position: 'absolute', 
              top: '0', 
              right: '0', 
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            Forgot password?
          </Link>
        </div>
        
        <Button type="submit" isLoading={isLoading} style={{ marginTop: '0.5rem' }}>
          Sign In
        </Button>
      </form>
    </AuthCard>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={<AuthCard title="Loading..." children={<div />} />}>
      <SigninForm />
    </Suspense>
  );
}
