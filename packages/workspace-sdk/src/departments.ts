export const WORKSPACE_META_KEY = '__workspace';
export const GENERAL_DEPARTMENT_ID = 'general';

type JsonRecord = Record<string, unknown>;

export type WorkspaceDepartmentItem = {
  id: string;
  name: string;
  slug: string;
  defaults?: JsonRecord;
  mediaSources?: JsonRecord;
};

export type WorkspaceDepartmentCollection = {
  general: {
    id: string;
    name: string;
    slug: string;
  };
  items: WorkspaceDepartmentItem[];
};

export type WorkspaceDepartmentEntry = {
  id: string;
  name: string;
  slug: string;
  isGeneral: boolean;
};

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? {}));

const sanitizeName = (value: unknown, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};

const sanitizeSlug = (value: unknown, fallback: string) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

export const getDepartmentCollection = (defaultsPayload: JsonRecord = {}): WorkspaceDepartmentCollection => {
  const meta = (defaultsPayload?.[WORKSPACE_META_KEY] as JsonRecord | undefined) || {};
  const departments = (meta.departments as JsonRecord | undefined) || {};
  const general = (departments.general as JsonRecord | undefined) || {};
  const items = Array.isArray(departments.items) ? departments.items : [];

  return {
    general: {
      id: GENERAL_DEPARTMENT_ID,
      name: sanitizeName(general.name, 'Общий'),
      slug: sanitizeSlug(general.slug, 'common')
    },
    items: items.map((item, index) => {
      const value = (item || {}) as JsonRecord;
      const slug = sanitizeSlug(value.slug, `department-${index + 1}`);
      return {
        id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : `department-${slug}`,
        name: sanitizeName(value.name, `Отдел ${index + 1}`),
        slug,
        defaults: value.defaults && typeof value.defaults === 'object' ? cloneJson(value.defaults as JsonRecord) : {},
        mediaSources: value.mediaSources && typeof value.mediaSources === 'object' ? cloneJson(value.mediaSources as JsonRecord) : {}
      };
    })
  };
};

export const listDepartmentEntries = (defaultsPayload: JsonRecord = {}): WorkspaceDepartmentEntry[] => {
  const departments = getDepartmentCollection(defaultsPayload);
  return [
    { ...departments.general, isGeneral: true },
    ...departments.items.map((item) => ({ id: item.id, name: item.name, slug: item.slug, isGeneral: false }))
  ];
};

export const embedDepartmentCollection = (
  defaultsPayload: JsonRecord = {},
  departments: WorkspaceDepartmentCollection
) => {
  const next = cloneJson(defaultsPayload);
  next[WORKSPACE_META_KEY] = {
    departments: {
      general: departments.general,
      items: departments.items
    }
  };
  return next;
};

export const upsertDepartment = (
  defaultsPayload: JsonRecord,
  input: { id?: string; name: string; slug: string }
) => {
  const departments = getDepartmentCollection(defaultsPayload);
  const normalizedId = String(input.id || '').trim();
  const name = sanitizeName(input.name, 'Новый отдел');
  const slug = sanitizeSlug(input.slug, 'department');

  if (normalizedId === GENERAL_DEPARTMENT_ID) {
    departments.general = {
      id: GENERAL_DEPARTMENT_ID,
      name,
      slug
    };
    return embedDepartmentCollection(defaultsPayload, departments);
  }

  const existing = normalizedId ? departments.items.find((item) => item.id === normalizedId) : null;
  if (existing) {
    existing.name = name;
    existing.slug = slug;
    return embedDepartmentCollection(defaultsPayload, departments);
  }

  departments.items.push({
    id: `department-${slug}`,
    name,
    slug,
    defaults: {},
    mediaSources: {}
  });

  return embedDepartmentCollection(defaultsPayload, departments);
};

export const removeDepartment = (defaultsPayload: JsonRecord, departmentId: string) => {
  const normalizedId = String(departmentId || '').trim();
  if (!normalizedId || normalizedId === GENERAL_DEPARTMENT_ID) {
    return defaultsPayload;
  }

  const departments = getDepartmentCollection(defaultsPayload);
  departments.items = departments.items.filter((item) => item.id !== normalizedId);
  return embedDepartmentCollection(defaultsPayload, departments);
};
