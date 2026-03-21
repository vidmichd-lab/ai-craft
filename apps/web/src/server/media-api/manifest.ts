type MediaEntry = {
  name: string;
  file: string;
  key?: string;
  size?: number;
  visibility?: string;
  folder1: string;
  folder2: string;
};

type MediaGroup = {
  id: string;
  title: string;
  entries: MediaEntry[];
};

export const flattenMediaManifest = (manifest: Record<string, unknown> | null) => {
  const assets = (manifest?.assets && typeof manifest.assets === 'object' ? manifest.assets : manifest) as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!assets || typeof assets !== 'object') return [];

  const groups: MediaGroup[] = [];
  const appendGroup = (folder1: string, folder2: string, entries: Array<Record<string, unknown>>) => {
    const normalizedEntries = entries
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        name: String(entry.name || 'asset'),
        file: String(entry.file || ''),
        key: typeof entry.key === 'string' ? entry.key : '',
        size: typeof entry.size === 'number' ? entry.size : 0,
        visibility: typeof entry.visibility === 'string' ? entry.visibility : 'published',
        folder1,
        folder2
      }))
      .filter((entry) => entry.file);

    if (!normalizedEntries.length) return;

    groups.push({
      id: `${folder1}/${folder2}`,
      title: `${folder1} / ${folder2}`,
      entries: normalizedEntries
    });
  };

  Object.entries(assets).forEach(([folder1, level1]) => {
    if (!level1 || typeof level1 !== 'object') return;

    Object.entries(level1).forEach(([folder2, branch]) => {
      if (Array.isArray(branch)) {
        appendGroup(folder1, folder2, branch as Array<Record<string, unknown>>);
        return;
      }
      if (!branch || typeof branch !== 'object') return;

      const files = Array.isArray((branch as { __files?: unknown }).__files)
        ? ((branch as { __files: Array<Record<string, unknown>> }).__files)
        : [];

      appendGroup(folder1, folder2, files);
    });
  });

  return groups.filter((group) => group.entries.length);
};
