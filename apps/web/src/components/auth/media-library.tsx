'use client';

import Image from 'next/image';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Banner, Button, SectionHeader, TabButton } from '@ai-craft/ui';
import styles from './workspace-shell.module.css';

type MediaEntry = {
  name: string;
  file: string;
  key?: string;
  size?: number;
  visibility?: string;
  folder1: string;
  folder2: string;
};

export type MediaLibraryEntry = MediaEntry;

type MediaGroup = {
  id: string;
  title: string;
  entries: MediaEntry[];
};

type Props = {
  onUseAsset?: (asset: MediaEntry, target: 'background' | 'logo' | 'kv') => void;
};

export function MediaLibrary({ onUseAsset }: Props) {
  const [groups, setGroups] = useState<MediaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/media/manifest');
        const payload = (await response.json().catch(() => null)) as { groups?: MediaGroup[]; error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error || 'Не удалось загрузить медиа');
        }
        if (!cancelled) {
          const nextGroups = Array.isArray(payload?.groups) ? payload.groups : [];
          setGroups(nextGroups);
          setSelectedGroupId((current) => current || nextGroups[0]?.id || '');
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Не удалось загрузить медиа');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || groups[0] || null,
    [groups, selectedGroupId]
  );

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedGroup) return;

    setUploading(true);
    setError('');
    setNotice('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder1', selectedGroup.entries[0]?.folder1 || selectedGroup.id.split('/')[0] || '');
      formData.append('folder2', selectedGroup.entries[0]?.folder2 || selectedGroup.id.split('/')[1] || '');

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось загрузить файл');
      }

      setNotice(`Файл ${file.name} загружен. После обновления manifest он появится в библиотеке.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось загрузить файл');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.stack}>
        <SectionHeader eyebrow="Media" title="Командная медиатека" />
        {notice ? (
          <Banner className={styles.notice} tone="notice">
            {notice}
          </Banner>
        ) : null}
        {error ? (
          <Banner className={styles.error} tone="error">
            {error}
          </Banner>
        ) : null}
        {loading ? <div className={styles.empty}>Загружаем медиа...</div> : null}
        {!loading ? (
          <>
            <div className={styles.groupTabs}>
              {groups.map((group) => (
                <TabButton
                  key={group.id}
                  type="button"
                  className={`${styles.groupTab} ${group.id === selectedGroup?.id ? styles.groupTabActive : ''}`}
                  active={group.id === selectedGroup?.id}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  {group.title}
                </TabButton>
              ))}
            </div>
            {selectedGroup ? (
              <>
                <div className={styles.actionsRow}>
                  <label className={styles.button} style={{ position: 'relative' }}>
                    {uploading ? 'Загружаем...' : 'Загрузить в эту папку'}
                    <input
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: uploading ? 'default' : 'pointer' }}
                      type="file"
                      onChange={handleUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
                <div className={styles.mediaGrid}>
                  {selectedGroup.entries.map((entry) => (
                    <article className={styles.mediaCard} key={entry.key || entry.file}>
                      <div className={styles.mediaThumbWrap}>
                        <Image
                          className={styles.mediaThumb}
                          src={entry.file}
                          alt={entry.name}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 100vw, 240px"
                        />
                      </div>
                      <div className={styles.memberName}>{entry.name}</div>
                      <div className={styles.memberEmail}>{entry.folder1} / {entry.folder2}</div>
                      {onUseAsset ? (
                        <div className={styles.actionsRow}>
                          <Button type="button" onClick={() => onUseAsset(entry, 'background')}>
                            Как фон
                          </Button>
                          <Button type="button" onClick={() => onUseAsset(entry, 'logo')}>
                            Как лого
                          </Button>
                          <Button type="button" onClick={() => onUseAsset(entry, 'kv')}>
                            Как KV
                          </Button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.empty}>Папок в manifest пока нет.</div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
