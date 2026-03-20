'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@ai-craft/ui';

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
    <Button type="button" onClick={handleClick} disabled={pending}>
      {pending ? 'Выходим...' : 'Выйти'}
    </Button>
  );
}
