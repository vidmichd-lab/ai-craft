import { getScopedStorageKey } from './appConfig.js';
import { saveWorkspaceTeamDefaults } from './workspaceApi.js';
import { resetMediaSourcesCache } from './mediaConfig.js';

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
  return saveWorkspaceTeamDefaults(payload);
};

export const applyWorkspaceTeamDefaultsLocally = (defaultsPayload, mediaSourcesPayload) => {
  const defaults = defaultsPayload && typeof defaultsPayload === 'object' ? defaultsPayload : {};
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
