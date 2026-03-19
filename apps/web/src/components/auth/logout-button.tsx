'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './workspace-shell.module.css';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <button className={styles.button} type="button" onClick={handleClick} disabled={pending}>
      {pending ? 'Выходим...' : 'Выйти'}
    </button>
  );
}
