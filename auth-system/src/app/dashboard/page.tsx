import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth/session';
import SignOutButton from './SignOutButton';
import styles from './page.module.css';

export default async function DashboardPage() {
  // Read session cookie
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;

  if (!sessionId) {
    redirect('/signin');
  }

  // Validate session against DB (Server-side enforcement)
  const user = await validateSession(sessionId);

  if (!user) {
    redirect('/signin');
  }

  // The brief explicitly asks to show ONLY the signed-in user's name and a sign-out button.
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.greeting}>Welcome, {user.name}!</h1>
        <p className={styles.subtitle}>You have successfully authenticated.</p>
        <div className={styles.action}>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
