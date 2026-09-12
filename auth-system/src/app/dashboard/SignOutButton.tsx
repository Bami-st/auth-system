"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';

export default function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      router.push('/signin');
      router.refresh();
    } catch (error) {
      console.error("Sign out failed", error);
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="secondary" 
      onClick={handleSignOut} 
      isLoading={isLoading}
      style={{ maxWidth: '200px' }}
    >
      Sign out
    </Button>
  );
}
