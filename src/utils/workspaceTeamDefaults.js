import { getScopedStorageKey } from './appConfig.js';
import { saveAdminWorkspaceTeamDefaults, saveWorkspaceTeamDefaults } from './workspaceApi.js';
import { resetMediaSourcesCache } from './mediaConfig.js';

const WORKSPACE_DEFAULTS_META_KEY = '__workspace';
const WORKSPACE_DEFAULT_DEPARTMENT_ID = 'general';
const WORKSPACE_DEPARTMENT_EDITOR_CONTEXT_KEY = 'workspace-department-editor-context';
const WORKSPACE_TEAM_BUNDLE_STORAGE_KEY = 'workspace-team-bundle';
const WORKSPACE_SELECTED_DEPARTMENT_STORAGE_KEY = 'workspace-selected-department';

const safeParse = (value, fallback = null) => {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const safeSet = (key, value) => {
  if (value === undefined || value === null) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
};

const cloneJson = (value) => JSON.parse(JSON.stringify(value ?? {}));

const deepMerge = (baseValue, overrideValue) => {
  if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
    return overrideValue === undefined ? cloneJson(baseValue) : cloneJson(overrideValue);
  }

  if (
    baseValue
    && typeof baseValue === 'object'
    && overrideValue
    && typeof overrideValue === 'object'
  ) {
    const merged = { ...cloneJson(baseValue) };
    Object.keys(overrideValue).forEach((key) => {
      merged[key] = deepMerge(baseValue?.[key], overrideValue[key]);
    });
    return merged;
  }

  return overrideValue === undefined ? cloneJson(baseValue) : cloneJson(overrideValue);
};

const buildOverridePatch = (baseValue, targetValue) => {
  if (JSON.stringify(baseValue) === JSON.stringify(targetValue)) {
    return undefined;
  }

  if (Array.isArray(baseValue) || Array.isArray(targetValue)) {
    return cloneJson(targetValue);
  }

  if (
    baseValue
    && typeof baseValue === 'object'
    && targetValue
    && typeof targetValue === 'object'
  ) {
    const patch = {};
    const keys = new Set([...Object.keys(baseValue), ...Object.keys(targetValue)]);
    keys.forEach((key) => {
      const diff = buildOverridePatch(baseValue?.[key], targetValue?.[key]);
      if (diff !== undefined) {
        patch[key] = diff;
      }
    });
    return Object.keys(patch).length ? patch : undefined;
  }

  return cloneJson(targetValue);
};

const sanitizeDepartmentName = (value, fallback = 'Новый отдел') => {
  const next = typeof value === 'string' ? value.trim() : '';
  return next || fallback;
};

const sanitizeDepartmentSlug = (value, fallback = 'department') => {
  const next = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return next || fallback;
};

const createGeneralDepartment = (raw = {}) => ({
  id: WORKSPACE_DEFAULT_DEPARTMENT_ID,
  name: sanitizeDepartmentName(raw?.name, 'Общий'),
  slug: sanitizeDepartmentSlug(raw?.slug, 'common')
});

const normalizeDepartmentItem = (raw = {}, index = 0) => {
  const slug = sanitizeDepartmentSlug(raw?.slug, `department-${index + 1}`);
  const id = typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : `department-${slug}`;
  return {
    id,
    name: sanitizeDepartmentName(raw?.name, `Отдел ${index + 1}`),
    slug,
    defaults: raw?.defaults && typeof raw.defaults === 'object' ? cloneJson(raw.defaults) : {},
    mediaSources: raw?.mediaSources && typeof raw.mediaSources === 'object' ? cloneJson(raw.mediaSources) : {}
  };
};

const normalizeDepartmentCollection = (raw = {}) => {
  const general = createGeneralDepartment(raw?.general);
  const seen = new Set([WORKSPACE_DEFAULT_DEPARTMENT_ID]);
  const items = Array.isArray(raw?.items)
    ? raw.items
      .map((item, index) => normalizeDepartmentItem(item, index))
      .filter((item) => {
        if (!item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
    : [];

  return { general, items };
};

const extractWorkspaceMeta = (defaultsPayload = {}) => {
  const meta = defaultsPayload?.[WORKSPACE_DEFAULTS_META_KEY];
  return meta && typeof meta === 'object' ? meta : {};
};

const stripWorkspaceMeta = (defaultsPayload = {}) => {
  const next = cloneJson(defaultsPayload || {});
  delete next[WORKSPACE_DEFAULTS_META_KEY];
  return next;
};

const embedWorkspaceMeta = (defaultsPayload = {}, departments = normalizeDepartmentCollection()) => ({
  ...cloneJson(defaultsPayload || {}),
  [WORKSPACE_DEFAULTS_META_KEY]: {
    departments: normalizeDepartmentCollection(departments)
  }
});

export const getWorkspaceDepartments = (defaultsPayload = {}) => normalizeDepartmentCollection(
  extractWorkspaceMeta(defaultsPayload)?.departments
);

export const getWorkspaceDepartmentEntries = (defaultsPayload = {}) => {
  const departments = getWorkspaceDepartments(defaultsPayload);
  return [
    { ...departments.general, isGeneral: true },
    ...departments.items.map((item) => ({ ...item, isGeneral: false }))
  ];
};

export const buildWorkspaceDepartmentPayload = ({ defaultsPayload = {}, mediaSourcesPayload = {}, departmentId = WORKSPACE_DEFAULT_DEPARTMENT_ID } = {}) => {
  const baseDefaults = stripWorkspaceMeta(defaultsPayload);
  const baseMediaSources = mediaSourcesPayload && typeof mediaSourcesPayload === 'object' ? cloneJson(mediaSourcesPayload) : {};
  const departments = getWorkspaceDepartments(defaultsPayload);

  if (!departmentId || departmentId === WORKSPACE_DEFAULT_DEPARTMENT_ID) {
    return {
      department: { ...departments.general, isGeneral: true },
      departments,
      defaults: baseDefaults,
      mediaSources: baseMediaSources
    };
  }

  const currentDepartment = departments.items.find((item) => item.id === departmentId);
  if (!currentDepartment) {
    return {
      department: { ...departments.general, isGeneral: true },
      departments,
      defaults: baseDefaults,
      mediaSources: baseMediaSources
    };
  }

  return {
    department: { ...currentDepartment, isGeneral: false },
    departments,
    defaults: deepMerge(baseDefaults, currentDepartment.defaults || {}),
    mediaSources: deepMerge(baseMediaSources, currentDepartment.mediaSources || {})
  };
};

const getWorkspaceTeamBundleStorageKey = () => getScopedStorageKey(WORKSPACE_TEAM_BUNDLE_STORAGE_KEY);
const getWorkspaceSelectedDepartmentStorageKey = () => getScopedStorageKey(WORKSPACE_SELECTED_DEPARTMENT_STORAGE_KEY);

export const cacheWorkspaceTeamBundleLocally = (defaultsPayload = {}, mediaSourcesPayload = {}) => {
  safeSet(getWorkspaceTeamBundleStorageKey(), {
    defaults: cloneJson(defaultsPayload || {}),
    mediaSources: cloneJson(mediaSourcesPayload || {})
  });
};

export const readWorkspaceTeamBundleLocally = () => {
  const parsed = safeParse(localStorage.getItem(getWorkspaceTeamBundleStorageKey()), null);
  if (!parsed || typeof parsed !== 'object') return null;
  return {
    defaults: parsed.defaults && typeof parsed.defaults === 'object' ? cloneJson(parsed.defaults) : {},
    mediaSources: parsed.mediaSources && typeof parsed.mediaSources === 'object' ? cloneJson(parsed.mediaSources) : {}
  };
};

export const getWorkspaceLayoutDepartmentEntries = (defaultsPayload = {}) => {
  const departments = getWorkspaceDepartments(defaultsPayload);
  if (departments.items.length) {
    return departments.items.map((item) => ({ ...item, isGeneral: false }));
  }
  return [{ ...departments.general, isGeneral: true }];
};

export const getWorkspaceLayoutDepartmentEntriesFromLocalBundle = () => {
  const bundle = readWorkspaceTeamBundleLocally();
  return getWorkspaceLayoutDepartmentEntries(bundle?.defaults || {});
};

export const getSelectedWorkspaceDepartmentId = () => {
  const stored = localStorage.getItem(getWorkspaceSelectedDepartmentStorageKey()) || '';
  return stored.trim() || '';
};

export const setSelectedWorkspaceDepartmentId = (departmentId = '') => {
  const normalized = String(departmentId || '').trim();
  safeSet(getWorkspaceSelectedDepartmentStorageKey(), normalized || null);
};

export const resolveWorkspaceDepartmentBundleLocally = (departmentId = '') => {
  const bundle = readWorkspaceTeamBundleLocally();
  if (!bundle) return null;

  const available = getWorkspaceLayoutDepartmentEntries(bundle.defaults || {});
  const fallbackDepartmentId = available[0]?.id || WORKSPACE_DEFAULT_DEPARTMENT_ID;
  const requestedDepartmentId = String(departmentId || '').trim() || getSelectedWorkspaceDepartmentId() || fallbackDepartmentId;

  return buildWorkspaceDepartmentPayload({
    defaultsPayload: bundle.defaults || {},
    mediaSourcesPayload: bundle.mediaSources || {},
    departmentId: requestedDepartmentId || fallbackDepartmentId
  });
};

const readDepartmentEditorContext = () => safeParse(localStorage.getItem(WORKSPACE_DEPARTMENT_EDITOR_CONTEXT_KEY), null);

const writeDepartmentEditorContext = (value) => {
  if (!value) {
    localStorage.removeItem(WORKSPACE_DEPARTMENT_EDITOR_CONTEXT_KEY);
    return;
  }
  localStorage.setItem(WORKSPACE_DEPARTMENT_EDITOR_CONTEXT_KEY, JSON.stringify(value));
};

export const clearWorkspaceDepartmentEditorContext = () => {
  writeDepartmentEditorContext(null);
};

export const prepareWorkspaceDepartmentEditor = ({
  teamId = '',
  defaultsPayload = {},
  mediaSourcesPayload = {},
  departmentId = WORKSPACE_DEFAULT_DEPARTMENT_ID,
  adminScope = false
} = {}) => {
  const resolved = buildWorkspaceDepartmentPayload({
    defaultsPayload,
    mediaSourcesPayload,
    departmentId
  });

  writeDepartmentEditorContext({
    teamId,
    adminScope: adminScope === true,
    departmentId: resolved.department?.id || WORKSPACE_DEFAULT_DEPARTMENT_ID,
    baseDefaults: stripWorkspaceMeta(defaultsPayload),
    baseMediaSources: mediaSourcesPayload && typeof mediaSourcesPayload === 'object' ? cloneJson(mediaSourcesPayload) : {},
    departments: resolved.departments
  });

  applyWorkspaceTeamDefaultsLocally(resolved.defaults, resolved.mediaSources);
  return resolved;
};

export const buildWorkspaceTeamDefaultsBundle = ({ defaults = {}, mediaSources = {}, departments } = {}) => ({
  defaults: embedWorkspaceMeta(stripWorkspaceMeta(defaults), departments),
  mediaSources: mediaSources && typeof mediaSources === 'object' ? cloneJson(mediaSources) : {}
});

export const collectWorkspaceTeamDefaultsPayload = () => {
  const defaults = safeParse(localStorage.getItem(getScopedStorageKey('default-values')), {}) || {};
  const mediaSources = safeParse(localStorage.getItem(getScopedStorageKey('media-sources')), {}) || {};
  const sizesConfig = safeParse(localStorage.getItem('sizes-config'), null);
  const formatMultipliers = safeParse(localStorage.getItem('format-multipliers'), null);
  const adminBackgrounds = safeParse(localStorage.getItem('adminBackgrounds'), null);
  const logoSizeMultipliers = safeParse(localStorage.getItem('logoSizeMultipliers'), null);
  const safeAreas = safeParse(localStorage.getItem('user-safe-areas'), null);
  const brandName = localStorage.getItem('brandName') || '';

  return {
    defaults: {
      ...defaults,
      ...(brandName ? { brandName } : {}),
      ...(sizesConfig ? { sizesConfig } : {}),
      ...(formatMultipliers ? { formatMultipliers } : {}),
      ...(adminBackgrounds ? { adminBackgrounds } : {}),
      ...(logoSizeMultipliers ? { logoSizeMultipliers } : {}),
      ...(safeAreas ? { safeAreas } : {})
    },
    mediaSources
  };
};

export const syncWorkspaceTeamDefaults = async () => {
  const payload = collectWorkspaceTeamDefaultsPayload();
  const editorContext = readDepartmentEditorContext();

  if (!editorContext) {
    return saveWorkspaceTeamDefaults(payload);
  }

  const departments = normalizeDepartmentCollection(editorContext.departments);
  const baseDefaults = editorContext.baseDefaults && typeof editorContext.baseDefaults === 'object' ? cloneJson(editorContext.baseDefaults) : {};
  const baseMediaSources = editorContext.baseMediaSources && typeof editorContext.baseMediaSources === 'object' ? cloneJson(editorContext.baseMediaSources) : {};
  const departmentId = editorContext.departmentId || WORKSPACE_DEFAULT_DEPARTMENT_ID;

  let nextBaseDefaults = baseDefaults;
  let nextBaseMediaSources = baseMediaSources;
  let nextDepartments = departments;

  if (departmentId === WORKSPACE_DEFAULT_DEPARTMENT_ID) {
    nextBaseDefaults = cloneJson(payload.defaults);
    nextBaseMediaSources = cloneJson(payload.mediaSources);
  } else {
    nextDepartments = {
      ...departments,
      items: departments.items.map((item) => {
        if (item.id !== departmentId) return item;
        return {
          ...item,
          defaults: buildOverridePatch(baseDefaults, payload.defaults) || {},
          mediaSources: buildOverridePatch(baseMediaSources, payload.mediaSources) || {}
        };
      })
    };
  }

  const nextPayload = buildWorkspaceTeamDefaultsBundle({
    defaults: nextBaseDefaults,
    mediaSources: nextBaseMediaSources,
    departments: nextDepartments
  });

  if (editorContext.adminScope && editorContext.teamId) {
    return saveAdminWorkspaceTeamDefaults({
      teamId: editorContext.teamId,
      ...nextPayload
    });
  }

  return saveWorkspaceTeamDefaults(nextPayload);
};

export const applyWorkspaceTeamDefaultsLocally = (defaultsPayload, mediaSourcesPayload) => {
  const defaults = stripWorkspaceMeta(defaultsPayload && typeof defaultsPayload === 'object' ? defaultsPayload : {});
  const mediaSources = mediaSourcesPayload && typeof mediaSourcesPayload === 'object' ? mediaSourcesPayload : {};

  const {
    brandName,
    sizesConfig,
    formatMultipliers,
    adminBackgrounds,
    logoSizeMultipliers,
    safeAreas,
    ...defaultValues
  } = defaults;

  safeSet(getScopedStorageKey('default-values'), defaultValues);
  safeSet(getScopedStorageKey('media-sources'), mediaSources);
  resetMediaSourcesCache();

  if (brandName !== undefined) {
    safeSet('brandName', brandName || '');
  }
  if (sizesConfig !== undefined) {
    safeSet('sizes-config', sizesConfig);
  }
  if (formatMultipliers !== undefined) {
    safeSet('format-multipliers', formatMultipliers);
  }
  if (adminBackgrounds !== undefined) {
    safeSet('adminBackgrounds', adminBackgrounds);
  }
  if (logoSizeMultipliers !== undefined) {
    safeSet('logoSizeMultipliers', logoSizeMultipliers);
  }
  if (safeAreas !== undefined) {
    safeSet('user-safe-areas', safeAreas);
  }

  return defaultValues;
};
