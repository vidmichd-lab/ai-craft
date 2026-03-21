'use client';

import Image from 'next/image';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Banner, Button, Input, SectionHeader, TabButton } from '@ai-craft/ui';
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

const resolveEntryFileName = (entry: MediaEntry) => {
  if (entry.key) {
    return entry.key.split('/').filter(Boolean).pop() || entry.key;
  }

  try {
    return new URL(entry.file).pathname.split('/').filter(Boolean).pop() || entry.file;
  } catch {
    return entry.file;
  }
};

const loadMediaGroups = async () => {
  const response = await fetch('/api/media/manifest', { cache: 'no-store' });
  const payload = (await response.json().catch(() => null)) as { groups?: MediaGroup[]; error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || 'Не удалось загрузить медиа');
  }

  return Array.isArray(payload?.groups) ? payload.groups : [];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function MediaLibrary({ onUseAsset }: Props) {
  const [groups, setGroups] = useState<MediaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const nextGroups = await loadMediaGroups();
        if (!cancelled) {
          setGroups(nextGroups);
          setSelectedGroupId((current) =>
            nextGroups.some((group) => group.id === current) ? current : nextGroups[0]?.id || ''
          );
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
  }, [reloadKey]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || groups[0] || null,
    [groups, selectedGroupId]
  );

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const entries = selectedGroup?.entries || [];

    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) =>
      [entry.name, entry.folder1, entry.folder2, entry.file]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, selectedGroup]);

  const totalEntries = useMemo(
    () => groups.reduce((sum, group) => sum + group.entries.length, 0),
    [groups]
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
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            uploaded?: {
              key?: string;
              name?: string;
              folder1?: string;
              folder2?: string;
            };
          }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось загрузить файл');
      }

      const targetGroupId = [payload?.uploaded?.folder1, payload?.uploaded?.folder2].filter(Boolean).join('/');
      if (targetGroupId) {
        setSelectedGroupId(targetGroupId);
      }
      setNotice(`Файл ${file.name} загружен. Синхронизируем медиатеку...`);

      let synced = false;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const nextGroups = await loadMediaGroups();
        setGroups(nextGroups);
        setSelectedGroupId((current) => {
          if (targetGroupId && nextGroups.some((group) => group.id === targetGroupId)) {
            return targetGroupId;
          }
          return nextGroups.some((group) => group.id === current) ? current : nextGroups[0]?.id || '';
        });

        synced = nextGroups.some((group) =>
          group.entries.some((entry) =>
            payload?.uploaded?.key ? entry.key === payload.uploaded.key : entry.name === file.name || entry.file.includes(file.name)
          )
        );

        if (synced) break;
        await sleep(1000);
      }

      setNotice(
        synced
          ? `Файл ${file.name} загружен и уже доступен в медиатеке.`
          : `Файл ${file.name} загружен. Если карточка еще не появилась, обновите медиатеку через секунду.`
      );
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
        <div className={styles.toolbarRow}>
          <Input
            className={`${styles.input} ${styles.toolbarInput}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию, папке или URL"
          />
          <Button type="button" onClick={() => setReloadKey((current) => current + 1)} disabled={loading || uploading}>
            {loading ? 'Обновляем...' : 'Обновить'}
          </Button>
        </div>
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
            <div className={styles.libraryLayout}>
              <div className={styles.stack}>
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
                    <div className={styles.heroStats}>
                      <div className={styles.heroStat}>
                        <div className={styles.heroStatLabel}>Папка</div>
                        <div className={styles.heroStatValue}>{selectedGroup.title}</div>
                        <div className={styles.heroStatHint}>
                          {selectedGroup.entries[0]?.folder1 || 'media'} / {selectedGroup.entries[0]?.folder2 || 'shared'}
                        </div>
                      </div>
                      <div className={styles.heroStat}>
                        <div className={styles.heroStatLabel}>Файлы</div>
                        <div className={styles.heroStatValue}>{selectedGroup.entries.length}</div>
                        <div className={styles.heroStatHint}>Всего в активной папке</div>
                      </div>
                      <div className={styles.heroStat}>
                        <div className={styles.heroStatLabel}>В выдаче</div>
                        <div className={styles.heroStatValue}>{filteredEntries.length}</div>
                        <div className={styles.heroStatHint}>После текущего поиска</div>
                      </div>
                      <div className={styles.heroStat}>
                        <div className={styles.heroStatLabel}>Библиотека</div>
                        <div className={styles.heroStatValue}>{totalEntries}</div>
                        <div className={styles.heroStatHint}>Всего файлов во всех папках</div>
                      </div>
                    </div>
                    <div className={styles.mediaGrid}>
                      {filteredEntries.map((entry) => (
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
                          <div className={styles.memberEmail}>
                            {entry.folder1} / {entry.folder2}
                          </div>
                          <div className={styles.description}>{resolveEntryFileName(entry)}</div>
                          {onUseAsset ? (
                            <div className={styles.templateActions}>
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
                    {!filteredEntries.length ? (
                      <div className={styles.emptyRich}>
                        По текущему фильтру в этой папке ничего не найдено. Очисти поиск или переключись на другую папку.
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className={styles.emptyRich}>Папок в manifest пока нет.</div>
                )}
              </div>
              <aside className={`${styles.sidebarColumn} ${styles.stickyPanel}`}>
                <div className={styles.sidebarCard}>
                  <div className={styles.sidebarLabel}>Загрузка</div>
                  <div className={styles.sidebarTitle}>
                    {selectedGroup ? `В папку ${selectedGroup.title}` : 'Выбери папку'}
                  </div>
                  <div className={styles.sidebarHint}>
                    Новые ассеты сразу попадают в командную библиотеку и после синхронизации доступны для фона, лого и KV.
                  </div>
                  {selectedGroup ? (
                    <label className={`${styles.button} ${styles.uploadLabel}`}>
                      {uploading ? 'Загружаем...' : 'Загрузить файл'}
                      <input
                        className={styles.uploadInput}
                        type="file"
                        onChange={handleUpload}
                        disabled={uploading}
                      />
                    </label>
                  ) : null}
                </div>
                <div className={styles.sidebarCard}>
                  <div className={styles.sidebarLabel}>Применение</div>
                  <div className={styles.sidebarList}>
                    <div className={styles.sidebarListItem}>
                      <span>Как фон</span>
                      <span>Background</span>
                    </div>
                    <div className={styles.sidebarListItem}>
                      <span>Как лого</span>
                      <span>Logo</span>
                    </div>
                    <div className={styles.sidebarListItem}>
                      <span>Как KV</span>
                      <span>Key Visual</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
