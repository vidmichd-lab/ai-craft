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
    | Record<string, Record<string, Array<Record<string, unknown>>>>
    | undefined;

  if (!assets || typeof assets !== 'object') return [];

  const groups: MediaGroup[] = [];
  Object.entries(assets).forEach(([folder1, level1]) => {
    if (!level1 || typeof level1 !== 'object') return;

    Object.entries(level1).forEach(([folder2, entries]) => {
      if (!Array.isArray(entries)) return;

      groups.push({
        id: `${folder1}/${folder2}`,
        title: `${folder1} / ${folder2}`,
        entries: entries
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
          .filter((entry) => entry.file)
      });
    });
  });

  return groups.filter((group) => group.entries.length);
};
