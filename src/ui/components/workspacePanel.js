import {
  applySavedSettings,
  ensurePresetSelection,
  getState,
  saveSettingsSnapshot,
  setState
} from '../../state/store.js';
import { renderer } from '../../renderer.js';
import {
  refreshMediaPreviews,
  renderPresetSizes,
  syncFormFields,
  updatePreviewSizeSelect
} from '../ui.js';
import { renderFileManager, initFileManager } from './fileManager.js';
import {
  createAdminWorkspaceTeam,
  createAdminWorkspaceUser,
  createWorkspaceProject,
  getAdminWorkspaceTeamDefaults,
  getCurrentWorkspaceTeam,
  getWorkspaceHealth,
  getWorkspaceMe,
  isWorkspaceApiEnabled,
  listAdminWorkspaceTeams,
  listAdminWorkspaceUsers,
  listPublicWorkspaceTeams,
  listWorkspaceTeamMembers,
  listWorkspaceProjects,
  listWorkspaceSnapshots,
  loginWorkspace,
  logoutWorkspace,
  removeAdminWorkspaceUser,
  resetAdminWorkspaceUserPassword,
  saveWorkspaceSnapshot,
  saveWorkspaceTeamDefaults,
  saveAdminWorkspaceTeamDefaults,
  updateWorkspaceAccount,
  updateAdminWorkspaceUserRole,
  updateAdminWorkspaceTeam,
  updateWorkspaceProject
} from '../../utils/workspaceApi.js';
import {
  applyWorkspaceTeamDefaultsLocally,
  buildWorkspaceDepartmentPayload,
  buildWorkspaceTeamDefaultsBundle,
  cacheWorkspaceTeamBundleLocally,
  getWorkspaceDepartments,
  getWorkspaceDepartmentEntries,
  getSelectedWorkspaceDepartmentId,
  prepareWorkspaceDepartmentEditor,
  resolveWorkspaceDepartmentBundleLocally
} from '../../utils/workspaceTeamDefaults.js';
import { setWorkspaceAccessState } from '../../utils/workspaceAccess.js';
import { setLanguage, getLanguage } from '../../utils/i18n.js';

const STORAGE_PREFIX = 'workspace-current-project-id';
const SESSION_HINT_KEY = 'workspace-session-hint';
const PREFERRED_TEAM_KEY = 'workspace-preferred-team';
const LOCAL_DRAFT_PREFIX = 'workspace-local-draft';
const USER_PREFERENCES_PREFIX = 'workspace-user-preferences';
const AUTH_HERO_IMAGE = 'assets/pro/photo_env/14.webp';

const workspaceState = {
  enabled: false,
  ready: false,
  user: null,
  team: null,
  teamDefaults: null,
  currentProject: null,
  projects: [],
  templates: [],
  projectsLoading: false,
  templatesLoading: false,
  projectsModalLoadSeq: 0,
  projectActionPending: '',
  projectModalError: '',
  projectModalNotice: '',
  projectComposer: {
    mode: '',
    name: '',
    description: '',
    templateName: ''
  },
  modalView: '',
  settingsView: 'account',
  settingsScope: 'user',
  authScreenVisible: false,
  authLoading: false,
  authError: '',
  authDraft: {
    email: '',
    password: ''
  },
  publicTeams: [],
  preferredTeamSlug: '',
  hasLoadedTeams: false,
  adminTeams: [],
  adminTeamDefaults: null,
  adminUsers: [],
  teamMembers: [],
  teamMembersError: '',
  adminSelectedTeamId: '',
  adminError: '',
  adminNotice: '',
  adminSecret: null,
  adminTeamDraft: {
    mode: 'create',
    teamId: '',
    name: '',
    slug: '',
    status: 'active'
  },
  departmentDraft: {
    mode: 'create',
    id: 'general',
    name: '',
    slug: ''
  }
};

const getScopedProjectStorageKey = (teamSlug = '') => {
  const normalizedTeam = (teamSlug || 'default').trim().toLowerCase();
  return `${STORAGE_PREFIX}::${normalizedTeam}`;
};

const getLocalDraftStorageKey = (teamSlug = '') => {
  const normalizedTeam = (teamSlug || 'default').trim().toLowerCase();
  return `${LOCAL_DRAFT_PREFIX}::${normalizedTeam}`;
};

const getUserPreferencesStorageKey = (user = workspaceState.user) => {
  const identity = String(user?.email || user?.id || '').trim().toLowerCase();
  return identity ? `${USER_PREFERENCES_PREFIX}::${identity}` : '';
};

const getPersistedProjectId = (teamSlug = '') => {
  try {
    return localStorage.getItem(getScopedProjectStorageKey(teamSlug)) || '';
  } catch {
    return '';
  }
};

const setPersistedProjectId = (teamSlug = '', projectId = '') => {
  try {
    const key = getScopedProjectStorageKey(teamSlug);
    if (projectId) {
      localStorage.setItem(key, projectId);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // no-op
  }
};

const loadLocalDraftSnapshot = (teamSlug = '') => {
  try {
    const raw = localStorage.getItem(getLocalDraftStorageKey(teamSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const saveLocalDraftSnapshot = (teamSlug = '', snapshot = null) => {
  try {
    const key = getLocalDraftStorageKey(teamSlug);
    if (!snapshot) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // no-op
  }
};

const setWorkspaceSessionHint = (value) => {
  try {
    if (value) {
      localStorage.setItem(SESSION_HINT_KEY, '1');
    } else {
      localStorage.removeItem(SESSION_HINT_KEY);
    }
  } catch {
    // no-op
  }
};

const getPreferredTeamSlug = () => {
  try {
    return (localStorage.getItem(PREFERRED_TEAM_KEY) || '').trim().toLowerCase();
  } catch {
    return '';
  }
};

const setPreferredTeamSlug = (teamSlug = '') => {
  try {
    const normalized = (teamSlug || '').trim().toLowerCase();
    if (normalized) {
      localStorage.setItem(PREFERRED_TEAM_KEY, normalized);
    } else {
      localStorage.removeItem(PREFERRED_TEAM_KEY);
    }
  } catch {
    // no-op
  }
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const renderUiInputField = ({
  label = '',
  name = '',
  type = 'text',
  value = '',
  placeholder = '',
  required = false,
  readonly = false,
  disabled = false,
  autocomplete = '',
  className = ''
} = {}) => `
  <label class="ui-field-block ${escapeHtml(className)}">
    ${label ? `<span class="ui-field-head"><span class="ui-field-label-lg">${escapeHtml(label)}</span></span>` : ''}
    <span class="ui-control-shell${readonly ? ' is-readonly' : ''}">
      <input
        class="ui-input workspace-settings-input"
        name="${escapeHtml(name)}"
        type="${escapeHtml(type)}"
        value="${escapeHtml(value)}"
        placeholder="${escapeHtml(placeholder)}"
        ${required ? 'required' : ''}
        ${readonly ? 'readonly' : ''}
        ${disabled ? 'disabled' : ''}
        ${autocomplete ? `autocomplete="${escapeHtml(autocomplete)}"` : ''}
      >
    </span>
  </label>
`;

const renderUiSelectField = ({
  label = '',
  name = '',
  options = [],
  className = '',
  disabled = false
} = {}) => `
  <label class="ui-field-block ${escapeHtml(className)}">
    ${label ? `<span class="ui-field-head"><span class="ui-field-label-lg">${escapeHtml(label)}</span></span>` : ''}
    <span class="ui-control-shell ui-control-shell-select">
      <select class="ui-select workspace-settings-input" name="${escapeHtml(name)}" ${disabled ? 'disabled' : ''}>
        ${options.join('')}
      </select>
      <span class="ui-control-icon ui-control-icon-end" aria-hidden="true">
        <span class="material-icons">expand_more</span>
      </span>
    </span>
  </label>
`;

const renderUiReadonlyField = (label, value) => renderUiInputField({
  label,
  value: value || '—',
  readonly: true
});

const getCurrentTheme = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

const applyWorkspaceThemePreference = (theme = 'dark') => {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  try {
    localStorage.setItem('theme', theme === 'light' ? 'light' : 'dark');
  } catch {
    // no-op
  }
};

const getResolvedUserPreferences = (user = workspaceState.user) => {
  const fallback = {
    theme: getCurrentTheme(),
    language: getLanguage()
  };

  try {
    const key = getUserPreferencesStorageKey(user);
    if (!key) return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      theme: parsed?.theme === 'light' ? 'light' : fallback.theme,
      language: ['ru', 'en', 'tr'].includes(parsed?.language) ? parsed.language : fallback.language
    };
  } catch {
    return fallback;
  }
};

const persistUserPreferences = ({ theme, language } = {}, user = workspaceState.user) => {
  const next = {
    ...getResolvedUserPreferences(user),
    ...(theme ? { theme } : {}),
    ...(language ? { language } : {})
  };

  try {
    const key = getUserPreferencesStorageKey(user);
    if (key) {
      localStorage.setItem(key, JSON.stringify(next));
    }
    if (next.theme) localStorage.setItem('theme', next.theme);
    if (next.language) localStorage.setItem('language', next.language);
  } catch {
    // no-op
  }

  if (next.theme) {
    applyWorkspaceThemePreference(next.theme);
  }
  if (next.language && next.language !== getLanguage()) {
    setLanguage(next.language);
  }

  return next;
};

const restoreUserPreferences = (user = workspaceState.user) => {
  const preferences = getResolvedUserPreferences(user);
  if (preferences.theme) {
    applyWorkspaceThemePreference(preferences.theme);
  }
  if (preferences.language && preferences.language !== getLanguage()) {
    setLanguage(preferences.language);
  }
  return preferences;
};

const createImageFromSrc = (src) => new Promise((resolve, reject) => {
  if (!src || typeof src !== 'string') {
    resolve(null);
    return;
  }

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
  image.src = src;
});

const hydrateStateImages = async (snapshot) => {
  const next = {};
  const fields = [
    ['logo', snapshot.logoSelected],
    ['kv', snapshot.kvSelected],
    ['rsyaKV2', snapshot.rsyaKV2Selected],
    ['rsyaKV3', snapshot.rsyaKV3Selected]
  ];

  for (const [key, src] of fields) {
    if (!src || typeof src !== 'string') continue;
    try {
      next[key] = await createImageFromSrc(src);
    } catch (error) {
      console.warn(`Workspace hydrate skipped ${key}:`, error);
    }
  }

  const activePair = Array.isArray(snapshot.titleSubtitlePairs)
    ? snapshot.titleSubtitlePairs[snapshot.activePairIndex || 0]
    : null;
  const activeBg = activePair?.bgImageSelected;
  if (activeBg && typeof activeBg === 'string') {
    try {
      next.bgImage = await createImageFromSrc(activeBg);
    } catch (error) {
      console.warn('Workspace hydrate skipped bgImage:', error);
    }
  }

  if (Object.keys(next).length) {
    setState(next);
  }
};

const syncUiAfterStateApply = async (snapshot) => {
  applySavedSettings(snapshot);
  ensurePresetSelection();
  await hydrateStateImages(snapshot);
  syncFormFields();
  renderPresetSizes();
  updatePreviewSizeSelect();
  refreshMediaPreviews();
  renderer.render();
};

const createEmptyProjectComposer = () => ({
  mode: '',
  name: '',
  description: '',
  templateName: ''
});

const getProjectComposer = () => ({
  ...createEmptyProjectComposer(),
  ...(workspaceState.projectComposer || {})
});

const setProjectComposer = (next = {}) => {
  workspaceState.projectComposer = {
    ...createEmptyProjectComposer(),
    ...(next || {})
  };
};

const resetProjectComposer = () => {
  setProjectComposer(createEmptyProjectComposer());
};

const setActiveWorkspaceTeam = (teamSlug = '') => {
  if (!window.__APP_CONFIG) {
    window.__APP_CONFIG = {};
  }
  if (!window.__APP_CONFIG.__meta) {
    window.__APP_CONFIG.__meta = {};
  }
  window.__APP_CONFIG.__meta.activeTeam = teamSlug || '';
};

const persistTeamDefaultsLocally = (teamPayload) => {
  const teamSlug = teamPayload?.team?.slug || workspaceState.team?.slug || '';
  setActiveWorkspaceTeam(teamSlug);
  cacheWorkspaceTeamBundleLocally(teamPayload?.defaults?.defaults, teamPayload?.defaults?.mediaSources);
  const preferredDepartmentId = getSelectedWorkspaceDepartmentId();
  const resolved = resolveWorkspaceDepartmentBundleLocally(preferredDepartmentId) || buildWorkspaceDepartmentPayload({
    defaultsPayload: teamPayload?.defaults?.defaults,
    mediaSourcesPayload: teamPayload?.defaults?.mediaSources,
    departmentId: preferredDepartmentId
  });
  const appliedDefaults = applyWorkspaceTeamDefaultsLocally(resolved.defaults, resolved.mediaSources);
  return {
    ...(appliedDefaults || {}),
    departmentId: resolved.department?.id || preferredDepartmentId || ''
  };
};

const getEls = () => ({
  root: document.getElementById('workspaceControls'),
  status: document.getElementById('workspaceStatus'),
  teamBtn: document.getElementById('workspaceTeamBtn'),
  accountBtn: document.getElementById('workspaceAccountBtn'),
  projectsBtn: document.getElementById('workspaceProjectsBtn'),
  saveBtn: document.getElementById('workspaceSaveBtn'),
  templateBtn: document.getElementById('workspaceTemplateBtn'),
  modal: document.getElementById('workspaceModalOverlay'),
  modalTitle: document.getElementById('workspaceModalTitle'),
  modalBody: document.getElementById('workspaceModalBody'),
  modalClose: document.getElementById('workspaceModalCloseBtn'),
  authOverlay: document.getElementById('workspaceAuthOverlay')
});

const getSelectableTeams = () => {
  const uniqueTeams = new Map();
  const activeTeams = Array.isArray(workspaceState.publicTeams) ? workspaceState.publicTeams : [];

  activeTeams.forEach((team) => {
    if (team?.slug) uniqueTeams.set(team.slug, team);
  });
  if (workspaceState.team?.slug && !uniqueTeams.has(workspaceState.team.slug)) {
    uniqueTeams.set(workspaceState.team.slug, workspaceState.team);
  }

  return Array.from(uniqueTeams.values());
};

const resolveSelectedTeamSlug = () => {
  const teams = getSelectableTeams();
  const preferred = (workspaceState.preferredTeamSlug || '').trim().toLowerCase();
  if (preferred && teams.some((team) => team.slug === preferred)) {
    return preferred;
  }
  if (preferred && !teams.length) {
    return preferred;
  }
  if (workspaceState.team?.slug && teams.some((team) => team.slug === workspaceState.team.slug)) {
    return workspaceState.team.slug;
  }
  return teams[0]?.slug || '';
};

const updateSelectedTeamSlug = (teamSlug = '') => {
  const normalized = (teamSlug || '').trim().toLowerCase();
  workspaceState.preferredTeamSlug = normalized;
  setPreferredTeamSlug(normalized);
};

const getAuthDraft = () => ({
  email: String(workspaceState.authDraft?.email || ''),
  password: String(workspaceState.authDraft?.password || '')
});

const updateAuthDraftField = (field, value) => {
  if (!['email', 'password'].includes(field)) return;
  workspaceState.authDraft = {
    ...getAuthDraft(),
    [field]: typeof value === 'string' ? value : ''
  };
};

const getImplicitAuthTeamSlug = () => {
  const preferred = resolveSelectedTeamSlug();
  if (preferred) return preferred;

  const configDefaultTeam = String(window.__APP_CONFIG?.defaultTeam || '').trim().toLowerCase();
  if (configDefaultTeam) return configDefaultTeam;

  return String(workspaceState.publicTeams[0]?.slug || '').trim().toLowerCase();
};

const isAuthDraftComplete = () => {
  const draft = getAuthDraft();
  return Boolean(draft.email.trim() && draft.password.length > 0);
};

const syncAuthSubmitState = () => {
  const submitButton = document.querySelector('#workspaceAuthForm .workspace-auth-submit');
  if (!submitButton) return;
  submitButton.disabled = workspaceState.authLoading || !isAuthDraftComplete();
};

const isWorkspaceSuperadmin = () => !!workspaceState.user?.isSuperadmin;
const getWorkspaceRole = () => String(workspaceState.user?.role || '').trim().toLowerCase();
const canManageWorkspaceTeamDefaults = () => isWorkspaceSuperadmin() || ['admin', 'lead'].includes(getWorkspaceRole());
const canViewWorkspaceTeamTab = () => !isWorkspaceSuperadmin() && ['lead', 'admin'].includes(getWorkspaceRole());

const createEmptyAdminTeamDraft = () => ({
  mode: 'create',
  teamId: '',
  name: '',
  slug: '',
  status: 'active'
});

const getAdminTeamDraft = () => ({
  ...createEmptyAdminTeamDraft(),
  ...(workspaceState.adminTeamDraft || {})
});

const setAdminTeamDraft = (draft = {}) => {
  workspaceState.adminTeamDraft = {
    ...createEmptyAdminTeamDraft(),
    ...(draft || {})
  };
};

const resetAdminTeamDraft = () => {
  setAdminTeamDraft(createEmptyAdminTeamDraft());
};

const createEmptyDepartmentDraft = () => ({
  mode: 'create',
  id: 'general',
  name: '',
  slug: ''
});

const getDepartmentDraft = () => ({
  ...createEmptyDepartmentDraft(),
  ...(workspaceState.departmentDraft || {})
});

const setDepartmentDraft = (draft = {}) => {
  workspaceState.departmentDraft = {
    ...createEmptyDepartmentDraft(),
    ...(draft || {})
  };
};

const resetDepartmentDraft = () => {
  setDepartmentDraft(createEmptyDepartmentDraft());
};

const getAvailableSettingsViews = () => {
  if (workspaceState.settingsScope === 'team') {
    if (isWorkspaceSuperadmin()) {
      return [{ id: 'teams', label: 'Команды' }];
    }
    if (canViewWorkspaceTeamTab()) {
      return [{ id: 'team', label: 'Команда' }];
    }
    return [];
  }

  return [{ id: 'account', label: 'Пользователь' }];
};

const ensureSettingsView = () => {
  const views = getAvailableSettingsViews();
  if (!views.length) {
    workspaceState.settingsScope = 'user';
    workspaceState.settingsView = 'account';
    return workspaceState.settingsView;
  }
  if (!views.some((view) => view.id === workspaceState.settingsView)) {
    workspaceState.settingsView = views[0]?.id || 'account';
  }
  return workspaceState.settingsView;
};

const setSettingsScope = (scope = 'user') => {
  workspaceState.settingsScope = scope === 'team' ? 'team' : 'user';
  ensureSettingsView();
  return workspaceState.settingsScope;
};

const setSettingsView = (viewId = '') => {
  workspaceState.settingsView = viewId;
  return ensureSettingsView();
};

const copyTextToClipboard = async (text) => {
  const value = String(text || '');
  if (!value) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
};

const formatWorkspaceRoleLabel = (user = workspaceState.user) => {
  if (!user) return '';
  if (user.isSuperadmin) return 'admin';

  const role = String(user.role || '').trim().toLowerCase();
  if (role === 'lead') return 'lead';
  if (role === 'admin') return 'admin';
  return 'editor';
};

const formatWorkspaceTeamStatusLabel = (status = '') => {
  return String(status || '').trim().toLowerCase() === 'active' ? 'active' : 'inactive';
};

const getWorkspaceTeamBadgeLogo = () => {
  const resolved = buildWorkspaceDepartmentPayload({
    defaultsPayload: workspaceState.teamDefaults?.defaults,
    mediaSourcesPayload: workspaceState.teamDefaults?.mediaSources,
    departmentId: 'general'
  });

  const defaults = resolved?.defaults || {};
  return defaults.logoSelected
    || defaults.defaultLogoRU
    || defaults.defaultLogoKZ
    || defaults.defaultLogoPRO
    || '';
};

const syncWorkspaceAccessControls = () => {
  setWorkspaceAccessState({
    apiEnabled: workspaceState.enabled,
    ready: workspaceState.ready,
    user: workspaceState.user,
    team: workspaceState.team
  });

  const buttons = document.querySelectorAll('[data-function="showSizesAdmin"], [data-function="showLogoAssetsAdmin"]');
  const shouldLock = workspaceState.enabled && !canManageWorkspaceTeamDefaults();
  const hint = workspaceState.user
    ? 'Нужна роль lead или admin в текущей команде.'
    : 'Войдите в workspace с ролью lead или admin.';

  buttons.forEach((button) => {
    button.disabled = shouldLock;
    if (shouldLock) {
      button.title = hint;
      button.setAttribute('aria-disabled', 'true');
      return;
    }

    button.removeAttribute('title');
    button.setAttribute('aria-disabled', 'false');
  });
};

const resolveAdminTeamId = () => {
  if (workspaceState.adminSelectedTeamId && workspaceState.adminTeams.some((team) => team.id === workspaceState.adminSelectedTeamId)) {
    return workspaceState.adminSelectedTeamId;
  }

  const currentTeamId = workspaceState.team?.id || '';
  if (currentTeamId && workspaceState.adminTeams.some((team) => team.id === currentTeamId)) {
    return currentTeamId;
  }

  return workspaceState.adminTeams[0]?.id || '';
};

const setAdminTeamId = (teamId = '') => {
  workspaceState.adminSelectedTeamId = teamId;
};

const renderWorkspaceSummary = () => {
  const els = getEls();
  if (!els.root) return;

  const statusText = (() => {
    if (!workspaceState.enabled) return 'Workspace off';
    if (!workspaceState.ready) return 'Workspace...';
    if (workspaceState.projectActionPending) return workspaceState.projectActionPending;
    if (workspaceState.projectModalNotice) return workspaceState.projectModalNotice;
    if (!workspaceState.user || !workspaceState.team) return 'Нужен вход';
    if (workspaceState.currentProject?.name && String(workspaceState.currentProject.description || '').trim() !== 'system-template-project') {
      return `${workspaceState.team.name} / ${workspaceState.currentProject.name}`;
    }
    return `${workspaceState.team.name} / личный черновик`;
  })();

  els.status.textContent = statusText;
  const isBusy = Boolean(workspaceState.projectActionPending);
  els.projectsBtn.disabled = !workspaceState.ready || !workspaceState.user || isBusy;
  els.saveBtn.disabled = !workspaceState.ready || !workspaceState.user || isBusy;
  els.templateBtn.disabled = !workspaceState.ready || !workspaceState.user || isBusy;
  els.accountBtn.disabled = !workspaceState.ready || isBusy;
  if (els.teamBtn) {
    const canOpenTeamSettings = workspaceState.ready && !!workspaceState.user && !!workspaceState.team && (isWorkspaceSuperadmin() || canViewWorkspaceTeamTab());
    const teamBadgeLogo = getWorkspaceTeamBadgeLogo();
    els.teamBtn.disabled = !canOpenTeamSettings || isBusy;
    els.teamBtn.style.display = canOpenTeamSettings ? 'inline-flex' : 'none';
    els.teamBtn.innerHTML = workspaceState.team
      ? `${teamBadgeLogo ? `<span class="workspace-team-trigger-logo-wrap"><img class="workspace-team-trigger-logo" src="${escapeHtml(teamBadgeLogo)}" alt=""></span>` : ''}<span class="workspace-team-trigger-label">${escapeHtml(workspaceState.team.name || 'Команда')}</span><span class="material-icons" aria-hidden="true">settings</span>`
      : '<span class="workspace-team-trigger-label">Команда</span><span class="material-icons" aria-hidden="true">settings</span>';
  }
  els.accountBtn.innerHTML = workspaceState.user
    ? '<span class="material-icons" aria-hidden="true">person</span>'
    : 'Войти';
  els.accountBtn.classList.toggle('workspace-icon-button', Boolean(workspaceState.user));
  els.accountBtn.classList.toggle('primary', !workspaceState.user);
  els.accountBtn.setAttribute('aria-label', workspaceState.user ? 'Настройки пользователя' : 'Войти');
  syncWorkspaceAccessControls();
};

const closeModal = () => {
  const els = getEls();
  if (!els.modal) return;
  const previousView = workspaceState.modalView;
  workspaceState.modalView = '';
  if (previousView === 'settings') {
    workspaceState.adminSecret = null;
  }
  if (previousView === 'projects') {
    workspaceState.projectModalError = '';
    workspaceState.projectModalNotice = '';
    workspaceState.projectsLoading = false;
    workspaceState.templatesLoading = false;
    resetProjectComposer();
  }
  delete els.modal.dataset.modalView;
  els.modal.style.display = 'none';
};

const openModal = (title, html, modalView = '') => {
  const els = getEls();
  if (!els.modal || !els.modalBody || !els.modalTitle) return;
  workspaceState.modalView = modalView;
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = html;
  els.modal.dataset.modalView = modalView;
  els.modal.style.display = 'flex';
};

const rerenderProjectsModal = () => {
  if (workspaceState.modalView !== 'projects') return;
  const els = getEls();
  if (!els.modalBody || !els.modalTitle) return;
  els.modalTitle.textContent = 'Шаблоны';
  els.modalBody.innerHTML = renderProjectsModal();
  bindProjectsModalForms();
};

const setProjectsLoadingState = (loading) => {
  workspaceState.projectsLoading = loading;
  rerenderProjectsModal();
};

const setTemplatesLoadingState = (loading) => {
  workspaceState.templatesLoading = loading;
  rerenderProjectsModal();
};

const setProjectActionPending = (label = '') => {
  workspaceState.projectActionPending = String(label || '');
  renderWorkspaceSummary();
  rerenderProjectsModal();
};

const bindProjectsModalForms = () => {
  const templateForm = document.getElementById('workspaceTemplateComposerForm');
  if (templateForm && !templateForm.dataset.workspaceBound) {
    templateForm.dataset.workspaceBound = '1';
    templateForm.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.name !== 'templateName') return;
      workspaceState.projectComposer.templateName = target.value;
    });
    templateForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await handleTemplateComposerSubmit(event.currentTarget);
      } catch (error) {
        setProjectActionPending('');
        workspaceState.projectModalError = error.message || 'Не удалось сохранить шаблон';
        workspaceState.projectModalNotice = '';
        rerenderProjectsModal();
      }
    });
  }
};

const bindSettingsModalForms = () => {
  const accountProfileForm = document.getElementById('workspaceAccountProfileForm');
  if (accountProfileForm && !accountProfileForm.dataset.workspaceBound) {
    accountProfileForm.dataset.workspaceBound = '1';
    accountProfileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await handleAccountProfileForm(event.currentTarget);
      } catch (error) {
        workspaceState.adminError = error.message || 'Не удалось сохранить профиль';
        workspaceState.adminNotice = '';
        await openSettingsModal();
      }
    });
  }

  const createTeamForm = document.getElementById('workspaceAdminCreateTeamForm');
  if (createTeamForm && !createTeamForm.dataset.workspaceBound) {
    createTeamForm.dataset.workspaceBound = '1';
    createTeamForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await handleAdminCreateTeamForm(event.currentTarget);
      } catch (error) {
        workspaceState.adminError = error.message || 'Не удалось выполнить admin-операцию';
        workspaceState.adminNotice = '';
        workspaceState.adminSecret = null;
        await openSettingsModal();
      }
    });
  }

  const createUserForm = document.getElementById('workspaceAdminCreateUserForm');
  if (createUserForm && !createUserForm.dataset.workspaceBound) {
    createUserForm.dataset.workspaceBound = '1';
    createUserForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await handleAdminCreateUserForm(event.currentTarget);
      } catch (error) {
        workspaceState.adminError = error.message || 'Не удалось выполнить admin-операцию';
        workspaceState.adminNotice = '';
        workspaceState.adminSecret = null;
        await openSettingsModal();
      }
    });
  }

  const departmentForm = document.getElementById('workspaceDepartmentForm');
  if (departmentForm && !departmentForm.dataset.workspaceBound) {
    departmentForm.dataset.workspaceBound = '1';
    departmentForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await handleDepartmentForm(event.currentTarget);
      } catch (error) {
        workspaceState.adminError = error.message || 'Не удалось сохранить отдел';
        workspaceState.adminNotice = '';
        await openSettingsModal();
      }
    });
  }

  const embeddedMediaRoot = document.getElementById('workspaceEmbeddedMediaManager');
  if (embeddedMediaRoot && !embeddedMediaRoot.dataset.workspaceBound) {
    embeddedMediaRoot.dataset.workspaceBound = '1';
    initFileManager();
  }
};

const syncWorkspaceAppVisibility = () => {
  document.body.classList.remove('workspace-auth-active');
  document.documentElement.setAttribute('data-workspace-boot', 'ready');
};

const openAuthScreen = () => {
  workspaceState.authScreenVisible = true;
  renderAuthOverlay();
};

const closeAuthScreen = () => {
  workspaceState.authScreenVisible = false;
  workspaceState.authError = '';
  renderAuthOverlay();
};

const getCurrentStateSnapshot = () => {
  const snapshot = saveSettingsSnapshot();
  const state = getState();
  snapshot.brandName = state.brandName;
  snapshot.logoSelected = state.logoSelected;
  snapshot.kvSelected = state.kvSelected;
  snapshot.rsyaKV2Selected = state.rsyaKV2Selected || '';
  snapshot.rsyaKV3Selected = state.rsyaKV3Selected || '';
  snapshot.titleSubtitlePairs = state.titleSubtitlePairs;
  snapshot.activePairIndex = state.activePairIndex;
  return snapshot;
};

const applyProjectSelection = async (project) => {
  setProjectActionPending('Открываем проект...');
  workspaceState.currentProject = project;
  setPersistedProjectId(workspaceState.team?.slug, project?.id || '');

  if (project?.state) {
    await syncUiAfterStateApply(project.state);
  }

  workspaceState.templates = [];
  try {
    workspaceState.templatesLoading = true;
    const response = await listWorkspaceSnapshots({ kind: 'template' });
    workspaceState.templates = Array.isArray(response?.snapshots) ? response.snapshots : [];
  } catch (error) {
    console.warn('Не удалось загрузить шаблоны команды:', error);
  } finally {
    workspaceState.templatesLoading = false;
  }

  setProjectActionPending('');
  renderWorkspaceSummary();
};

const refreshWorkspaceProjects = async () => {
  const response = await listWorkspaceProjects();
  workspaceState.projects = Array.isArray(response?.projects) ? response.projects : [];

  const persistedId = getPersistedProjectId(workspaceState.team?.slug);
  const nextCurrent = workspaceState.projects.find((project) => project.id === workspaceState.currentProject?.id)
    || workspaceState.projects.find((project) => project.id === persistedId)
    || null;

  workspaceState.currentProject = nextCurrent;
  renderWorkspaceSummary();
};

const ensureTemplateProject = async () => {
  if (workspaceState.currentProject?.id) {
    return workspaceState.currentProject;
  }

  if (!workspaceState.projects.length) {
    await refreshWorkspaceProjects();
  }

  if (workspaceState.currentProject?.id) {
    return workspaceState.currentProject;
  }

  const fallbackName = workspaceState.user?.displayName
    ? `${workspaceState.user.displayName} template storage`
    : 'Template storage';
  const response = await createWorkspaceProject({
    name: fallbackName,
    description: 'system-template-project',
    state: getCurrentStateSnapshot()
  });
  const project = response?.project || null;
  if (project) {
    workspaceState.projects = [project, ...workspaceState.projects.filter((item) => item.id !== project.id)];
    workspaceState.currentProject = project;
    setPersistedProjectId(workspaceState.team?.slug, project.id);
  }
  return project;
};

const isSystemTemplateProject = (project = workspaceState.currentProject) => String(project?.description || '').trim() === 'system-template-project';

const buildWorkspaceProjectName = (snapshot = {}) => {
  const activeIndex = Number.isInteger(snapshot?.activePairIndex) ? snapshot.activePairIndex : 0;
  const activePair = Array.isArray(snapshot?.titleSubtitlePairs)
    ? snapshot.titleSubtitlePairs[activeIndex] || snapshot.titleSubtitlePairs[0]
    : null;
  const candidate = String(
    activePair?.title
    || activePair?.subtitle
    || snapshot?.title
    || snapshot?.brandName
    || (!isSystemTemplateProject(workspaceState.currentProject) ? workspaceState.currentProject?.name : '')
    || 'Личный проект'
  ).trim();
  return candidate.slice(0, 80) || 'Личный проект';
};

const buildWorkspaceSnapshotName = (timestamp = new Date()) => `Ручное сохранение ${timestamp.toLocaleString('ru-RU')}`;

const saveCurrentProject = async () => {
  if (!workspaceState.user) {
    openAuthScreen();
    return;
  }

  const snapshot = getCurrentStateSnapshot();
  const localDraft = {
    savedAt: new Date().toISOString(),
    state: snapshot
  };

  setProjectActionPending('Сохраняем в workspace...');
  workspaceState.projectModalError = '';
  workspaceState.projectModalNotice = '';
  saveLocalDraftSnapshot(workspaceState.team?.slug, {
    ...localDraft
  });

  try {
    let project = workspaceState.currentProject;
    if (!project?.id || isSystemTemplateProject(project)) {
      const created = await createWorkspaceProject({
        name: buildWorkspaceProjectName(snapshot),
        description: '',
        state: snapshot
      });
      project = created?.project || null;
      if (!project?.id) {
        throw new Error('Workspace не вернул проект после сохранения.');
      }
    } else {
      const updated = await updateWorkspaceProject({
        projectId: project.id,
        name: String(project.name || '').trim() || buildWorkspaceProjectName(snapshot),
        description: isSystemTemplateProject(project) ? '' : String(project.description || '').trim(),
        state: snapshot
      });
      project = updated?.project || {
        ...project,
        state: snapshot
      };
    }

    try {
      await saveWorkspaceSnapshot({
        projectId: project.id,
        name: buildWorkspaceSnapshotName(),
        kind: 'snapshot',
        state: snapshot
      });
    } catch (error) {
      console.warn('Не удалось записать snapshot проекта, основной save уже выполнен:', error);
    }

    workspaceState.currentProject = {
      ...project,
      state: snapshot
    };
    workspaceState.projects = [
      workspaceState.currentProject,
      ...workspaceState.projects.filter((item) => item.id !== project.id)
    ];
    setPersistedProjectId(workspaceState.team?.slug, project.id);
    saveLocalDraftSnapshot(workspaceState.team?.slug, null);
    workspaceState.projectModalNotice = `Сохранено в workspace${project.name ? `: ${project.name}` : ''}.`;
    renderWorkspaceSummary();
  } catch (error) {
    console.warn('Workspace save failed; local draft kept:', error);
    workspaceState.projectModalNotice = 'Сервер недоступен. Черновик сохранен только в браузере.';
  } finally {
    setProjectActionPending('');
    rerenderProjectsModal();
  }
};

const saveTemplateInteractively = async (templateName = '') => {
  const name = String(templateName || '').trim();
  if (!name) return;

  const project = await ensureTemplateProject();
  if (!project?.id) {
    workspaceState.projectModalError = 'Не удалось подготовить хранилище шаблонов.';
    rerenderProjectsModal();
    return;
  }

  const snapshot = getCurrentStateSnapshot();
  setProjectActionPending('Сохраняем шаблон...');
  const response = await saveWorkspaceSnapshot({
    projectId: project.id,
    name,
    kind: 'template',
    state: snapshot
  });

  if (response?.snapshot) {
    workspaceState.projectsModalLoadSeq += 1;
    workspaceState.templates = [response.snapshot, ...workspaceState.templates];
    workspaceState.projectModalError = '';
    workspaceState.projectModalNotice = `Шаблон "${response.snapshot.name}" сохранен.`;
    rerenderProjectsModal();
  }
  setProjectActionPending('');
};

const getProjectPreviewData = (snapshot = {}) => {
  const activeIndex = Number.isInteger(snapshot?.activePairIndex) ? snapshot.activePairIndex : 0;
  const activePair = Array.isArray(snapshot?.titleSubtitlePairs) ? snapshot.titleSubtitlePairs[activeIndex] || snapshot.titleSubtitlePairs[0] : null;
  return {
    title: activePair?.title || snapshot?.title || snapshot?.brandName || 'AI-Craft',
    subtitle: activePair?.subtitle || snapshot?.subtitle || '',
    backgroundColor: activePair?.bgColor || snapshot?.bgColor || '#111111',
    backgroundImage: activePair?.bgImageSelected || snapshot?.bgImageSelected || snapshot?.bgImage || snapshot?.kvSelected || '',
    logo: snapshot?.logoSelected || ''
  };
};

const renderProjectPreview = (snapshot = {}, label = '') => {
  const preview = getProjectPreviewData(snapshot);
  const imageHtml = preview.backgroundImage
    ? `<img class="workspace-project-preview-image" src="${escapeHtml(preview.backgroundImage)}" alt="">`
    : '';
  const logoHtml = preview.logo
    ? `<img class="workspace-project-preview-logo" src="${escapeHtml(preview.logo)}" alt="">`
    : '';

  return `
    <div class="workspace-project-preview" style="background:${escapeHtml(preview.backgroundColor)};">
      ${imageHtml}
      <div class="workspace-project-preview-overlay"></div>
      <div class="workspace-project-preview-content">
        ${logoHtml}
        <div class="workspace-project-preview-label">${escapeHtml(label)}</div>
        <div class="workspace-project-preview-title">${escapeHtml(preview.title)}</div>
        ${preview.subtitle ? `<div class="workspace-project-preview-subtitle">${escapeHtml(preview.subtitle)}</div>` : ''}
      </div>
    </div>
  `;
};

const renderProjectsFeedback = () => {
  if (workspaceState.projectModalError) {
    return `<div class="workspace-auth-error">${escapeHtml(workspaceState.projectModalError)}</div>`;
  }
  if (workspaceState.projectModalNotice) {
    return `<div class="workspace-note">${escapeHtml(workspaceState.projectModalNotice)}</div>`;
  }
  return '';
};

const renderTemplateComposer = () => {
  const composer = getProjectComposer();
  if (composer.mode !== 'template') return '';

  return `
    <div class="workspace-project-composer">
      <div class="workspace-project-composer-head">
        <div class="workspace-settings-surface-title">Сохранить как шаблон</div>
        <button class="btn btn-small ui-button ui-button-sm" type="button" data-workspace-action="cancel-project-composer">Отмена</button>
      </div>
      <form id="workspaceTemplateComposerForm" class="workspace-settings-form" novalidate>
        <label class="workspace-settings-field ui-field">
          <span class="workspace-settings-field-label ui-field-label">Название шаблона</span>
          <input class="workspace-settings-input ui-input" name="templateName" type="text" value="${escapeHtml(composer.templateName)}" placeholder="Например, Базовый KV" required>
        </label>
        <div class="workspace-settings-form-actions">
          <button class="btn primary ui-button ui-button-inverted" type="submit" ${workspaceState.projectActionPending ? 'disabled' : ''}>Сохранить шаблон</button>
        </div>
      </form>
    </div>
  `;
};

const renderProjectsModal = () => {
  const currentSnapshot = getCurrentStateSnapshot();
  const templatesHtml = workspaceState.templatesLoading
    ? '<div class="workspace-loader-card"><span class="refresh-spinner">⟳</span>Загружаем шаблоны...</div>'
    : workspaceState.templates.length
      ? workspaceState.templates.map((template) => `
        <article class="workspace-project-card workspace-project-card-template" data-workspace-template-id="${escapeHtml(template.id)}">
          ${renderProjectPreview(template.state || {}, template.name)}
          <div class="workspace-project-card-body">
            <div class="workspace-project-card-title">${escapeHtml(template.name)}</div>
            <div class="workspace-project-card-meta">Автор: ${escapeHtml(template.authorName || 'Неизвестно')}</div>
            <div class="workspace-project-card-meta">Доступ: вся команда</div>
            <div class="workspace-project-card-meta">${new Date(template.createdAt).toLocaleString('ru-RU')}</div>
            <div class="workspace-project-card-actions">
              <button class="btn btn-small ui-button ui-button-sm" data-workspace-action="apply-template" data-template-id="${escapeHtml(template.id)}">Применить</button>
            </div>
          </div>
        </article>
      `).join('')
      : '<div class="workspace-empty">Шаблонов пока нет. Сохраняй удачные варианты, и они станут доступны всей команде.</div>';

  return `
    <div class="workspace-modal-stack">
      <div class="workspace-projects-header">
        <div>
          <div class="workspace-settings-view-title">Шаблоны</div>
          <div class="workspace-settings-view-subtitle">Текущий проект сохраняется в workspace, а шаблоны становятся общей библиотекой команды.</div>
        </div>
        <div class="workspace-toolbar">
          <button class="btn primary ui-button ui-button-inverted" data-workspace-action="save-template" ${workspaceState.projectActionPending ? 'disabled' : ''}>Сохранить как шаблон</button>
          <button class="btn ui-button" data-workspace-action="refresh-projects" ${workspaceState.templatesLoading || workspaceState.projectActionPending ? 'disabled' : ''}>Обновить</button>
        </div>
      </div>
      ${renderProjectsFeedback()}
      <div class="workspace-projects-layout">
        <section class="workspace-projects-main">
          <div class="workspace-section">
            <div class="workspace-section-title">Библиотека шаблонов</div>
            <div class="workspace-project-grid workspace-project-grid-templates">${templatesHtml}</div>
          </div>
        </section>
        <aside class="workspace-projects-side">
          <div class="workspace-project-composer workspace-project-composer-current">
            <div class="workspace-project-composer-head">
              <div class="workspace-settings-surface-title">Текущий проект</div>
            </div>
            ${renderProjectPreview(currentSnapshot, 'Текущая версия')}
          </div>
          ${renderTemplateComposer()}
        </aside>
      </div>
    </div>
  `;
};

const loadProjectsModalData = async () => {
  if (!workspaceState.user) return;
  const loadSeq = ++workspaceState.projectsModalLoadSeq;
  workspaceState.projectModalError = '';
  setTemplatesLoadingState(true);
  try {
    if (!workspaceState.currentProject?.id) {
      await refreshWorkspaceProjects();
    }
    if (loadSeq !== workspaceState.projectsModalLoadSeq) return;
    const response = await listWorkspaceSnapshots({ kind: 'template' });
    if (loadSeq !== workspaceState.projectsModalLoadSeq) return;
    workspaceState.templates = Array.isArray(response?.snapshots) ? response.snapshots : [];
  } catch (error) {
    if (loadSeq !== workspaceState.projectsModalLoadSeq) return;
    workspaceState.projectModalError = error.message || 'Не удалось загрузить шаблоны';
  } finally {
    if (loadSeq !== workspaceState.projectsModalLoadSeq) return;
    setTemplatesLoadingState(false);
  }
};

const openProjectsModal = async ({ skipReload = false } = {}) => {
  if (!skipReload) {
    workspaceState.projectsLoading = true;
    workspaceState.templatesLoading = Boolean(workspaceState.user);
  }
  openModal('Шаблоны', renderProjectsModal(), 'projects');
  bindProjectsModalForms();
  if (!skipReload) {
    void loadProjectsModalData();
  }
};

const refreshAdminTeamsData = async () => {
  if (!isWorkspaceSuperadmin()) return;

  const response = await listAdminWorkspaceTeams();
  workspaceState.adminTeams = Array.isArray(response?.teams) ? response.teams : [];

  const nextTeamId = resolveAdminTeamId();
  setAdminTeamId(nextTeamId);
  const nextTeam = workspaceState.adminTeams.find((team) => team.id === nextTeamId);
  const teamDraft = getAdminTeamDraft();
  if (nextTeam && (teamDraft.mode !== 'create' || !teamDraft.teamId)) {
    setAdminTeamDraft({
      mode: 'edit',
      teamId: nextTeam.id,
      name: nextTeam.name || '',
      slug: nextTeam.slug || '',
      status: nextTeam.status || 'active'
    });
  }
};

const refreshAdminUsersData = async (teamId = resolveAdminTeamId()) => {
  if (!isWorkspaceSuperadmin() || !teamId) {
    workspaceState.adminUsers = [];
    return;
  }

  const response = await listAdminWorkspaceUsers({ teamId });
  workspaceState.adminUsers = Array.isArray(response?.users) ? response.users : [];
  setAdminTeamId(teamId);
};

const refreshAdminTeamDefaultsData = async (teamId = resolveAdminTeamId()) => {
  if (!isWorkspaceSuperadmin() || !teamId) {
    workspaceState.adminTeamDefaults = null;
    return;
  }

  const response = await getAdminWorkspaceTeamDefaults({ teamId });
  workspaceState.adminTeamDefaults = response?.defaults || null;
};

const refreshAdminWorkspaceData = async ({ preserveSecret = true } = {}) => {
  if (!isWorkspaceSuperadmin()) return;

  if (!preserveSecret) {
    workspaceState.adminSecret = null;
  }

  try {
    await refreshAdminTeamsData();
    const teamId = resolveAdminTeamId();
    await refreshAdminUsersData(teamId);
    await refreshAdminTeamDefaultsData(teamId);
  } catch (error) {
    workspaceState.adminError = error.message || 'Не удалось загрузить admin-данные';
  }
};

const refreshWorkspaceTeamMembers = async () => {
  if (!canViewWorkspaceTeamTab()) {
    workspaceState.teamMembers = [];
    workspaceState.teamMembersError = '';
    return;
  }

  try {
    const response = await listWorkspaceTeamMembers();
    workspaceState.teamMembers = Array.isArray(response?.users) ? response.users : [];
    workspaceState.teamMembersError = '';
  } catch (error) {
    workspaceState.teamMembers = [];
    workspaceState.teamMembersError = error.message || 'Не удалось загрузить состав команды';
  }
};

const renderSettingsReadonlyField = (label, value) => renderUiReadonlyField(label, value);

const renderSettingsFeedback = () => {
  if (workspaceState.adminError) {
    return `<div class="workspace-auth-error">${escapeHtml(workspaceState.adminError)}</div>`;
  }
  if (workspaceState.adminNotice) {
    return `<div class="workspace-note">${escapeHtml(workspaceState.adminNotice)}</div>`;
  }
  return '';
};

const renderSettingsSecret = () => {
  if (!workspaceState.adminSecret) return '';

  return `
    <div class="workspace-secret-card ui-surface ui-stack">
      <div class="workspace-section-title">Сгенерированный пароль</div>
      <div class="workspace-secret-line">${escapeHtml(workspaceState.adminSecret.email)}</div>
      <code class="workspace-secret-value">${escapeHtml(workspaceState.adminSecret.password)}</code>
    </div>
  `;
};

const getVisibleTeamDefaultsPayload = () => (
  workspaceState.settingsScope === 'team' && isWorkspaceSuperadmin()
    ? workspaceState.adminTeamDefaults
    : workspaceState.teamDefaults
);

const getVisibleDepartmentEntries = () => getWorkspaceDepartmentEntries(getVisibleTeamDefaultsPayload()?.defaults || {});

const renderSettingsTeamMembersList = (members, { allowRoleActions = false } = {}) => {
  if (!Array.isArray(members) || members.length === 0) {
    return '<div class="workspace-empty">Пока никого нет.</div>';
  }

  return members.map((user) => `
    <div class="workspace-settings-list-item ui-meta-item">
      <div class="workspace-settings-list-main">
        <div class="workspace-settings-list-title">${escapeHtml(user.displayName || user.email)}</div>
        <div class="workspace-settings-list-meta">${escapeHtml(user.email)}</div>
      </div>
      <div class="workspace-settings-list-side">
        <span class="workspace-settings-role-pill ui-tag ui-tag-neutral ui-tag-secondary">${escapeHtml(user.isSuperadmin ? 'admin' : user.role)}</span>
        ${allowRoleActions && !user.isSuperadmin && (user.role === 'editor' || user.role === 'lead')
          ? `<button class="btn btn-small ui-button ui-button-sm" data-workspace-action="set-admin-user-role" data-user-id="${escapeHtml(user.id)}" data-role="${user.role === 'lead' ? 'editor' : 'lead'}">${user.role === 'lead' ? 'Сделать editor' : 'Сделать lead'}</button>`
          : ''}
        ${allowRoleActions
          ? `<button class="btn btn-small ui-button ui-button-sm" data-workspace-action="reset-admin-user-password" data-user-id="${escapeHtml(user.id)}">Новый пароль</button>`
          : ''}
        ${allowRoleActions && !user.isSuperadmin
          ? `<button class="btn btn-small btn-danger ui-button ui-button-sm ui-button-danger" data-workspace-action="remove-admin-user" data-user-id="${escapeHtml(user.id)}">Удалить</button>`
          : ''}
      </div>
    </div>
  `).join('');
};

const renderSettingsSidebarMeta = (label, value) => `
  <div class="workspace-settings-sidebar-meta">
    <div class="workspace-settings-sidebar-meta-label">${escapeHtml(label)}</div>
    <div class="workspace-settings-sidebar-meta-value">${escapeHtml(value || '—')}</div>
  </div>
`;

const renderAdminTeamsSidebar = () => {
  const activeTeamId = resolveAdminTeamId();
  const teamsHtml = workspaceState.adminTeams.length
    ? workspaceState.adminTeams.map((team) => `
      <button
        type="button"
        class="workspace-settings-nav-item ui-navigation-button ui-navigation-row ${team.id === activeTeamId ? 'is-active' : ''}"
        data-workspace-action="select-admin-team"
        data-team-id="${escapeHtml(team.id)}"
      >
        <span class="workspace-admin-team-item-name">${escapeHtml(team.name)}</span>
        <span class="workspace-admin-team-item-meta">${escapeHtml(team.slug)} · ${escapeHtml(formatWorkspaceTeamStatusLabel(team.status))}</span>
      </button>
    `).join('')
    : '<div class="workspace-empty">Команд пока нет.</div>';

  return `
    <div class="workspace-settings-nav workspace-settings-nav-column">
      ${teamsHtml}
    </div>
    <div class="workspace-settings-sidebar-footer">
      <button class="btn primary btn-full ui-button ui-button-inverted ui-button-full workspace-admin-sidebar-create" type="button" data-workspace-action="start-admin-team-create">Создать новую</button>
      <button class="btn btn-full ui-button ui-button-full" data-workspace-action="logout">Выйти</button>
    </div>
  `;
};

const renderSettingsAccountView = () => {
  const preferences = getResolvedUserPreferences();
  return `
    <div class="workspace-settings-view">
      <div class="workspace-settings-view-header">
        <div>
          <div class="workspace-settings-view-title">Пользователь</div>
          <div class="workspace-settings-view-subtitle">Личные данные и настройки интерфейса для твоего аккаунта.</div>
        </div>
        <span class="workspace-settings-role-pill ui-tag ui-tag-neutral ui-tag-secondary">${escapeHtml(formatWorkspaceRoleLabel())}</span>
      </div>
      <div class="workspace-settings-surface ui-surface">
        <form id="workspaceAccountProfileForm" class="workspace-settings-form" novalidate>
          <div class="workspace-settings-grid workspace-settings-grid-single">
            ${renderUiInputField({ label: 'Имя', name: 'displayName', value: workspaceState.user?.displayName || '', placeholder: 'Твое имя' })}
            ${renderSettingsReadonlyField('Почта', workspaceState.user?.email || '')}
            ${!isWorkspaceSuperadmin() ? renderSettingsReadonlyField('Команда', workspaceState.team?.name || '') : ''}
            ${renderSettingsReadonlyField('Роль', formatWorkspaceRoleLabel())}
            ${renderUiSelectField({
              label: 'Язык',
              name: 'language',
              options: [
                `<option value="ru" ${preferences.language === 'ru' ? 'selected' : ''}>RU</option>`,
                `<option value="en" ${preferences.language === 'en' ? 'selected' : ''}>EN</option>`,
                `<option value="tr" ${preferences.language === 'tr' ? 'selected' : ''}>TR</option>`
              ]
            })}
            ${renderUiSelectField({
              label: 'Тема',
              name: 'theme',
              options: [
                `<option value="dark" ${preferences.theme === 'dark' ? 'selected' : ''}>Темная</option>`,
                `<option value="light" ${preferences.theme === 'light' ? 'selected' : ''}>Светлая</option>`
              ]
            })}
          </div>
          <div class="workspace-settings-form-actions">
            <button class="btn primary ui-button ui-button-inverted" type="submit">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

const renderTeamDefaultsSurface = () => {
  if (!canManageWorkspaceTeamDefaults()) return '';

  return `
    <div class="workspace-settings-surface ui-surface">
      <div class="workspace-settings-surface-header">
        <div>
          <div class="workspace-settings-surface-title">Все настройки workspace</div>
          <div class="workspace-settings-view-subtitle">Размеры, форматы, умножение и общие правила команды. Значения и фоны внутри редактора уже редактируются в контексте выбранного отдела.</div>
        </div>
      </div>
      <div class="workspace-settings-form-actions">
        <button class="btn ui-button" type="button" data-workspace-action="open-team-defaults">Открыть настройки</button>
      </div>
    </div>
  `;
};

const renderTeamMediaSurface = () => {
  if (!canManageWorkspaceTeamDefaults()) return '';

  return `
    <div class="workspace-settings-surface ui-surface">
      <div class="workspace-settings-surface-header">
        <div>
          <div class="workspace-settings-surface-title">Медиа</div>
          <div class="workspace-settings-view-subtitle">Загрузка и управление командной библиотекой прямо внутри настроек workspace.</div>
        </div>
      </div>
      <div id="workspaceEmbeddedMediaManager" class="workspace-settings-embedded-media">
        ${renderFileManager()}
      </div>
    </div>
  `;
};

const renderDepartmentManagementSurface = () => {
  if (!canManageWorkspaceTeamDefaults()) return '';

  const entries = getVisibleDepartmentEntries();
  const draft = getDepartmentDraft();
  const selectedTeamId = workspaceState.settingsScope === 'team' && isWorkspaceSuperadmin()
    ? resolveAdminTeamId()
    : workspaceState.team?.id || '';
  const selectedTeamDefaults = getVisibleTeamDefaultsPayload();
  const fallbackDepartment = entries.find((item) => item.id === draft.id) || entries[0] || { id: 'general', name: 'Общий', slug: 'common', isGeneral: true };
  const draftModeLabel = draft.mode === 'edit'
    ? (fallbackDepartment.isGeneral ? 'Настройки общего отдела' : 'Редактировать отдел')
    : 'Добавить отдел';

  return `
    <div class="workspace-settings-surface ui-surface">
      <div class="workspace-settings-surface-header">
        <div>
          <div class="workspace-settings-surface-title">Отделы</div>
          <div class="workspace-settings-view-subtitle">Минимум один отдел всегда остается. Общий отдел задает базовые настройки, остальные могут их переопределять.</div>
        </div>
      </div>
      <div class="workspace-settings-list">
        ${entries.map((department) => {
          return `
            <div class="workspace-settings-list-item ui-meta-item">
              <div class="workspace-settings-list-main">
                <div class="workspace-settings-list-title">${escapeHtml(department.name)}</div>
                <div class="workspace-settings-list-meta">${escapeHtml(department.slug)}${department.isGeneral ? ' · базовый отдел' : ' · наследует Общий и переопределяет его'}</div>
              </div>
              <div class="workspace-settings-list-side">
                <button class="btn btn-small ui-button ui-button-sm" type="button" data-workspace-action="edit-department" data-department-id="${escapeHtml(department.id)}">Изменить</button>
                <button class="btn btn-small ui-button ui-button-sm" type="button" data-workspace-action="open-team-defaults" data-department-id="${escapeHtml(department.id)}">${department.isGeneral ? 'Редактировать базу' : 'Редактировать настройки'}</button>
                ${!department.isGeneral ? `<button class="btn btn-small btn-danger ui-button ui-button-sm ui-button-danger" type="button" data-workspace-action="remove-department" data-department-id="${escapeHtml(department.id)}">Удалить</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <form id="workspaceDepartmentForm" class="workspace-settings-form" novalidate>
        <input type="hidden" name="mode" value="${escapeHtml(draft.mode)}">
        <input type="hidden" name="departmentId" value="${escapeHtml(fallbackDepartment.id)}">
        <input type="hidden" name="teamId" value="${escapeHtml(selectedTeamId)}">
        <div class="workspace-settings-surface-header">
          <div class="workspace-settings-surface-title">${escapeHtml(draftModeLabel)}</div>
        </div>
        <div class="workspace-settings-grid workspace-settings-grid-single">
          ${renderUiInputField({ label: 'Название отдела', name: 'name', value: draft.name || fallbackDepartment.name, placeholder: 'Например, Маркетинг', required: true })}
          ${renderUiInputField({ label: 'Slug', name: 'slug', value: draft.slug || fallbackDepartment.slug, placeholder: 'marketing', required: true })}
        </div>
        <div class="workspace-settings-form-actions">
          <button class="btn primary ui-button ui-button-inverted" type="submit">${draft.mode === 'edit' ? 'Сохранить отдел' : 'Добавить отдел'}</button>
          ${draft.mode === 'edit' ? '<button class="btn ui-button" type="button" data-workspace-action="cancel-department-edit">Отмена</button>' : ''}
        </div>
      </form>
    </div>
  `;
};

const renderSettingsTeamView = () => {
  const teamMembersContent = workspaceState.teamMembersError
    ? `<div class="workspace-auth-error">${escapeHtml(workspaceState.teamMembersError)}</div>`
    : renderSettingsTeamMembersList(workspaceState.teamMembers);

  return `
    <div class="workspace-settings-view">
      <div class="workspace-settings-view-header">
        <div>
          <div class="workspace-settings-view-title">Команда</div>
          <div class="workspace-settings-view-subtitle">Состав команды, командные настройки и медиа в одном экране.</div>
        </div>
      </div>
      ${renderTeamDefaultsSurface()}
      ${renderDepartmentManagementSurface()}
      ${renderTeamMediaSurface()}
      <div class="workspace-settings-surface ui-surface">
        <div class="workspace-settings-grid workspace-settings-grid-single">
          ${renderSettingsReadonlyField('Название команды', workspaceState.team?.name || '')}
        </div>
      </div>
      <div class="workspace-settings-surface ui-surface">
        <div class="workspace-settings-surface-header">
          <div class="workspace-settings-surface-title">Кто состоит в этой команде</div>
        </div>
        <div class="workspace-settings-list">
          ${teamMembersContent}
        </div>
      </div>
    </div>
  `;
};

const renderSettingsAdminTeamsView = () => {
  const draft = getAdminTeamDraft();
  const selectedTeam = draft.mode === 'create'
    ? null
    : workspaceState.adminTeams.find((team) => team.id === resolveAdminTeamId()) || null;

  return `
    <div class="workspace-settings-view">
      <div class="workspace-settings-view-header">
        <div>
          <div class="workspace-settings-view-title">Команды</div>
          <div class="workspace-settings-view-subtitle">Выбранная команда справа: состав, роли, настройки и медиа.</div>
        </div>
      </div>
      ${renderSettingsFeedback()}
      ${renderSettingsSecret()}
      <div class="workspace-settings-surface ui-surface">
        <div class="workspace-settings-surface-header">
          <div class="workspace-settings-surface-title">${draft.mode === 'create' ? 'Новая команда' : 'Настройки команды'}</div>
        </div>
        <form id="workspaceAdminCreateTeamForm" class="workspace-settings-form" novalidate>
          <input type="hidden" name="mode" value="${escapeHtml(draft.mode)}">
          <input type="hidden" name="teamId" value="${escapeHtml(draft.teamId)}">
          <div class="workspace-settings-grid workspace-settings-grid-single">
            ${renderUiInputField({ label: 'Название', name: 'name', value: draft.name, placeholder: 'Например, Яндекс Практикум', required: true })}
            ${renderUiInputField({ label: 'Slug', name: 'slug', value: draft.slug, placeholder: 'yandex-practicum', required: true })}
            ${draft.mode === 'edit'
              ? renderUiSelectField({
                  label: 'Статус',
                  name: 'status',
                  options: [
                    `<option value="active" ${draft.status === 'active' ? 'selected' : ''}>active</option>`,
                    `<option value="inactive" ${draft.status === 'inactive' ? 'selected' : ''}>inactive</option>`
                  ]
                })
              : ''}
          </div>
          <div class="workspace-settings-form-actions">
            <button class="btn primary ui-button ui-button-inverted" type="submit">${draft.mode === 'create' ? 'Создать команду' : 'Сохранить изменения'}</button>
          </div>
        </form>
      </div>
      ${draft.mode === 'edit' && selectedTeam ? `
        ${renderDepartmentManagementSurface()}
        <div class="workspace-settings-surface ui-surface">
          <div class="workspace-settings-surface-header">
            <div class="workspace-settings-surface-title">Кто в команде · ${escapeHtml(selectedTeam.name)}</div>
          </div>
          <div class="workspace-settings-list">
            ${renderSettingsTeamMembersList(workspaceState.adminUsers, { allowRoleActions: true })}
          </div>
        </div>
        <div class="workspace-settings-surface ui-surface">
          <div class="workspace-settings-surface-header">
            <div class="workspace-settings-surface-title">Добавить пользователя</div>
          </div>
          <form id="workspaceAdminCreateUserForm" class="workspace-settings-form" novalidate>
            <div class="workspace-settings-grid workspace-settings-grid-single">
              ${renderUiInputField({ label: 'Имя', name: 'displayName', placeholder: 'Имя пользователя' })}
              ${renderUiInputField({ label: 'Email', name: 'email', type: 'email', placeholder: 'user@example.com', required: true })}
              ${renderUiSelectField({
                label: 'Роль',
                name: 'role',
                options: [
                  '<option value="editor">editor</option>',
                  '<option value="lead">lead</option>'
                ]
              })}
            </div>
            <div class="workspace-settings-form-actions">
              <button class="btn primary ui-button ui-button-inverted" type="submit" ${selectedTeam.status !== 'active' ? 'disabled' : ''}>Добавить пользователя</button>
            </div>
          </form>
        </div>
        ${renderTeamDefaultsSurface()}
        ${renderTeamMediaSurface()}
      ` : ''}
    </div>
  `;
};

const renderSettingsModal = () => {
  const settingsView = ensureSettingsView();
  const views = getAvailableSettingsViews();
  const isTeamScope = workspaceState.settingsScope === 'team';
  const isAdminTeamScope = isTeamScope && isWorkspaceSuperadmin();
  const selectedAdminTeam = isAdminTeamScope
    ? workspaceState.adminTeams.find((team) => team.id === resolveAdminTeamId()) || null
    : null;
  const sidebarMetaHtml = isWorkspaceSuperadmin()
    ? renderSettingsSidebarMeta('Доступ', 'admin')
    : [
      renderSettingsSidebarMeta('Команда', workspaceState.team?.name || ''),
      renderSettingsSidebarMeta('Роль', formatWorkspaceRoleLabel())
    ].join('');
  const navHtml = views.map((view) => `
    <button
      type="button"
      class="workspace-settings-nav-item ui-navigation-button ui-navigation-row ${view.id === settingsView ? 'is-active' : ''}"
      data-workspace-action="open-settings-view"
      data-settings-view="${escapeHtml(view.id)}"
    >
      ${escapeHtml(view.label)}
    </button>
  `).join('');

  const contentHtml = (() => {
    if (settingsView === 'team') return renderSettingsTeamView();
    if (settingsView === 'teams') return renderSettingsAdminTeamsView();
    return renderSettingsAccountView();
  })();

  const sidebarBodyHtml = isAdminTeamScope
    ? renderAdminTeamsSidebar()
    : `
      <div class="workspace-settings-nav">
        ${navHtml}
      </div>
      <div class="workspace-settings-sidebar-footer">
        <div class="workspace-settings-sidebar-meta-list">
          ${sidebarMetaHtml}
        </div>
        <button class="btn btn-full ui-button ui-button-full" data-workspace-action="logout">Выйти</button>
      </div>
    `;

  return `
    <div class="workspace-settings-layout">
      <aside class="workspace-settings-sidebar">
        <div class="workspace-settings-sidebar-head">
          <div class="workspace-settings-sidebar-title">${isTeamScope ? escapeHtml(selectedAdminTeam?.name || workspaceState.team?.name || 'Команда') : 'Пользователь'}</div>
          <div class="workspace-settings-sidebar-subtitle">${escapeHtml(isTeamScope ? formatWorkspaceRoleLabel() : (workspaceState.user?.displayName || workspaceState.user?.email || ''))}</div>
        </div>
        ${sidebarBodyHtml}
      </aside>
      <section class="workspace-settings-content">
        ${contentHtml}
      </section>
    </div>
  `;
};

const openSettingsModal = async ({ scope = workspaceState.settingsScope, view = '', title = '' } = {}) => {
  setSettingsScope(scope);
  if (view) {
    setSettingsView(view);
  } else {
    ensureSettingsView();
  }

  if (workspaceState.settingsScope === 'team' && isWorkspaceSuperadmin()) {
    await refreshAdminWorkspaceData();
  } else if (workspaceState.settingsScope === 'team' && workspaceState.settingsView === 'team') {
    const currentTeam = await getCurrentWorkspaceTeam();
    if (currentTeam?.team) {
      workspaceState.team = currentTeam.team;
      workspaceState.teamDefaults = currentTeam.defaults || null;
    }
    await refreshWorkspaceTeamMembers();
  }
  openModal(title || (workspaceState.settingsScope === 'team' ? 'Настройки команды' : 'Настройки пользователя'), renderSettingsModal(), 'settings');
  bindSettingsModalForms();
};

const renderAuthOverlay = () => {
  const els = getEls();
  if (!els.authOverlay) return;

  if (!workspaceState.authScreenVisible) {
    els.authOverlay.style.display = 'none';
    syncWorkspaceAppVisibility();
    return;
  }

  const selectedTeamSlug = resolveSelectedTeamSlug();
  if (!workspaceState.preferredTeamSlug && selectedTeamSlug) {
    updateSelectedTeamSlug(selectedTeamSlug);
  }

  const draft = getAuthDraft();
  const buttonLabel = workspaceState.authLoading ? 'Входим...' : 'Войти';
  const errorHtml = workspaceState.authError
    ? `<div class="workspace-auth-error">${escapeHtml(workspaceState.authError)}</div>`
    : '';
  const closeButtonHtml = workspaceState.authLoading
    ? ''
    : '<button class="btn btn-small ui-button ui-button-sm ui-button-subtle" type="button" data-workspace-auth-close="true">Закрыть</button>';
  const emailField = `
    <label class="ui-field-block">
      <span class="ui-control-shell">
        <input class="ui-input workspace-settings-input workspace-auth-input" id="workspaceAuthEmail" name="email" type="email" autocomplete="username" placeholder="Почта" value="${escapeHtml(draft.email)}" required>
      </span>
    </label>
  `;
  const passwordField = `
    <label class="ui-field-block workspace-auth-password-field">
      <span class="ui-control-shell">
        <input class="ui-input workspace-settings-input workspace-auth-input" id="workspaceAuthPassword" name="password" type="password" autocomplete="current-password" placeholder="Пароль" value="${escapeHtml(draft.password)}" required>
        <button
          class="workspace-auth-password-toggle"
          type="button"
          data-workspace-password-toggle="true"
          aria-label="Показать пароль"
          aria-pressed="false"
        >
          <span class="material-icons" aria-hidden="true">visibility</span>
        </button>
      </span>
    </label>
  `;

  els.authOverlay.innerHTML = `
    <div class="workspace-auth-dialog ui-surface">
      <div class="workspace-auth-dialog-head">
        <div class="workspace-auth-dialog-copy">
          <img class="workspace-auth-logo" src="assets/logo.svg" alt="AI-Craft">
          <div class="workspace-auth-dialog-title">Войти в AI-Craft</div>
          <div class="workspace-auth-dialog-subtitle">Войдите по почте и паролю, чтобы сохранять проекты, шаблоны и настройки команды.</div>
        </div>
        ${closeButtonHtml}
      </div>
      <form id="workspaceAuthForm" class="workspace-auth-form ui-stack">
        ${emailField}
        ${passwordField}
        ${errorHtml}
        <button class="btn primary workspace-auth-submit ui-button ui-button-inverted" type="submit" ${(workspaceState.authLoading || !isAuthDraftComplete()) ? 'disabled' : ''}>${buttonLabel}</button>
      </form>
      <div class="workspace-auth-footer">Вайб-код от <a href="https://staff.yandex-team.ru/vidmich" target="_blank" rel="noopener">@vidmich</a></div>
    </div>
  `;

  els.authOverlay.style.display = 'flex';
  syncWorkspaceAppVisibility();

  if (!workspaceState.authLoading) {
    window.requestAnimationFrame(() => {
      document.getElementById('workspaceAuthEmail')?.focus();
    });
  }
};

const resetWorkspaceSessionState = () => {
  workspaceState.user = null;
  workspaceState.team = null;
  workspaceState.teamDefaults = null;
  workspaceState.projects = [];
  workspaceState.templates = [];
  workspaceState.projectsLoading = false;
  workspaceState.templatesLoading = false;
  workspaceState.projectActionPending = '';
  workspaceState.projectModalError = '';
  workspaceState.projectModalNotice = '';
  workspaceState.currentProject = null;
  workspaceState.settingsView = 'account';
  workspaceState.settingsScope = 'user';
  workspaceState.adminTeams = [];
  workspaceState.adminTeamDefaults = null;
  workspaceState.adminUsers = [];
  workspaceState.teamMembers = [];
  workspaceState.teamMembersError = '';
  workspaceState.adminSelectedTeamId = '';
  workspaceState.adminError = '';
  workspaceState.adminNotice = '';
  workspaceState.adminSecret = null;
  resetProjectComposer();
  resetAdminTeamDraft();
  resetDepartmentDraft();
};

const performLogout = async ({ reopenAuth = false } = {}) => {
  try {
    await logoutWorkspace();
  } finally {
    setWorkspaceSessionHint(false);
    resetWorkspaceSessionState();
    renderWorkspaceSummary();
    if (reopenAuth) {
      openAuthScreen();
    }
  }
};

const loadPublicTeams = async () => {
  try {
    const response = await listPublicWorkspaceTeams();
    workspaceState.publicTeams = Array.isArray(response?.teams) ? response.teams : [];
  } catch (error) {
    console.warn('Не удалось загрузить публичный список команд:', error);
    workspaceState.publicTeams = [];
  } finally {
    workspaceState.hasLoadedTeams = true;
    const selectedTeamSlug = resolveSelectedTeamSlug();
    if (selectedTeamSlug && selectedTeamSlug !== workspaceState.preferredTeamSlug) {
      updateSelectedTeamSlug(selectedTeamSlug);
    }
    renderAuthOverlay();
  }
};

const restoreWorkspaceSession = async () => {
  const me = await getWorkspaceMe();
  workspaceState.user = me?.user || null;
  workspaceState.team = me?.team || null;
  restoreUserPreferences(workspaceState.user);

  if (!workspaceState.team) {
    workspaceState.authScreenVisible = false;
    renderWorkspaceSummary();
    renderAuthOverlay();
    return;
  }

  updateSelectedTeamSlug(workspaceState.team.slug || '');
  setActiveWorkspaceTeam(workspaceState.team.slug || '');

  const currentTeam = await getCurrentWorkspaceTeam();
  workspaceState.team = currentTeam?.team || workspaceState.team;
  workspaceState.teamDefaults = currentTeam?.defaults || null;

  const appliedDefaults = currentTeam ? persistTeamDefaultsLocally(currentTeam) : null;
  await refreshWorkspaceProjects();

  if (workspaceState.currentProject) {
    await applyProjectSelection(workspaceState.currentProject);
  } else {
    const localDraft = loadLocalDraftSnapshot(workspaceState.team?.slug);
    if (localDraft?.state) {
      await syncUiAfterStateApply(localDraft.state);
    } else if (appliedDefaults && Object.keys(appliedDefaults).length > 0) {
      await syncUiAfterStateApply(appliedDefaults);
    }
    renderWorkspaceSummary();
  }

  closeAuthScreen();
};

const handleTemplateComposerSubmit = async (form) => {
  const formData = new FormData(form);
  const templateName = String(formData.get('templateName') || '').trim();
  if (!templateName) return;
  await saveTemplateInteractively(templateName);
  resetProjectComposer();
  rerenderProjectsModal();
};

const handleProjectsModalAction = async (action, event) => {
  if (action === 'save-project') {
    await saveCurrentProject();
    return;
  }
  if (action === 'save-template') {
    setProjectComposer({
      mode: 'template',
      templateName: workspaceState.currentProject ? `${workspaceState.currentProject.name} template` : ''
    });
    workspaceState.projectModalError = '';
    workspaceState.projectModalNotice = '';
    rerenderProjectsModal();
    return;
  }
  if (action === 'cancel-project-composer') {
    resetProjectComposer();
    workspaceState.projectModalError = '';
    workspaceState.projectModalNotice = '';
    rerenderProjectsModal();
    return;
  }
  if (action === 'refresh-projects') {
    void loadProjectsModalData();
    return;
  }
  if (action === 'apply-template') {
    const templateId = event.target.closest('[data-template-id]')?.dataset.templateId || '';
    const template = workspaceState.templates.find((item) => item.id === templateId);
    if (!template) return;
    setProjectActionPending('Применяем шаблон...');
    await syncUiAfterStateApply(template.state);
    setProjectActionPending('');
    closeModal();
  }
};

const handleAdminCreateTeamForm = async (form) => {
  const formData = new FormData(form);
  const mode = String(formData.get('mode') || 'create').trim().toLowerCase();
  const teamId = String(formData.get('teamId') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const slug = String(formData.get('slug') || '').trim();
  const status = String(formData.get('status') || 'active').trim().toLowerCase();

  workspaceState.adminError = '';
  workspaceState.adminNotice = '';
  workspaceState.adminSecret = null;

  if (mode === 'edit' && teamId) {
    const response = await updateAdminWorkspaceTeam({ teamId, name, slug, status });
    workspaceState.adminSelectedTeamId = response?.team?.id || teamId;
    await refreshAdminWorkspaceData();
    workspaceState.adminNotice = `Команда "${response?.team?.name || name}" обновлена.`;
    await openSettingsModal();
    return;
  }

  const response = await createAdminWorkspaceTeam({ name, slug });
  workspaceState.adminSelectedTeamId = response?.team?.id || workspaceState.adminSelectedTeamId;
  resetAdminTeamDraft();
  await refreshAdminWorkspaceData();
  workspaceState.adminNotice = `Команда "${response?.team?.name || name}" создана.`;
  await openSettingsModal();
};

const handleAccountProfileForm = async (form) => {
  const formData = new FormData(form);
  const displayName = String(formData.get('displayName') || '').trim();
  const language = String(formData.get('language') || 'ru').trim().toLowerCase();
  const theme = String(formData.get('theme') || 'dark').trim().toLowerCase();

  workspaceState.adminError = '';
  workspaceState.adminNotice = '';

  const response = await updateWorkspaceAccount({ displayName });
  if (response?.user) {
    workspaceState.user = {
      ...workspaceState.user,
      ...response.user,
      role: workspaceState.user?.role || response.user.role || ''
    };
  }
  if (response?.team) {
    workspaceState.team = response.team;
  }
  persistUserPreferences({
    language: ['ru', 'en', 'tr'].includes(language) ? language : 'ru',
    theme: theme === 'light' ? 'light' : 'dark'
  });
  renderWorkspaceSummary();
  workspaceState.adminNotice = 'Профиль обновлен.';
  await openSettingsModal({ scope: 'user', view: 'account', title: 'Настройки пользователя' });
};

const saveVisibleTeamDefaults = async ({ defaults, mediaSources }) => {
  const payload = { defaults, mediaSources };

  if (workspaceState.settingsScope === 'team' && isWorkspaceSuperadmin()) {
    const teamId = resolveAdminTeamId();
    const response = await saveAdminWorkspaceTeamDefaults({ teamId, ...payload });
    workspaceState.adminTeamDefaults = response?.defaults || payload;
    if (workspaceState.team?.id && workspaceState.team.id === teamId) {
      workspaceState.teamDefaults = response?.defaults || payload;
      persistTeamDefaultsLocally({
        team: workspaceState.team,
        defaults: workspaceState.teamDefaults
      });
    }
    return response;
  }

  const response = await saveWorkspaceTeamDefaults(payload);
  workspaceState.teamDefaults = response?.defaults || payload;
  persistTeamDefaultsLocally({
    team: workspaceState.team,
    defaults: workspaceState.teamDefaults
  });
  return response;
};

const handleDepartmentForm = async (form) => {
  const visibleTeamDefaults = getVisibleTeamDefaultsPayload() || { defaults: {}, mediaSources: {} };
  const currentDepartments = getWorkspaceDepartments(visibleTeamDefaults.defaults || {});
  const formData = new FormData(form);
  const mode = String(formData.get('mode') || 'create').trim().toLowerCase();
  const departmentId = String(formData.get('departmentId') || '').trim() || 'general';
  const rawName = String(formData.get('name') || '').trim();
  const rawSlug = String(formData.get('slug') || '').trim().toLowerCase();
  const name = rawName || 'Новый отдел';
  const slug = (rawSlug || 'department')
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'department';

  const duplicateSlug = [
    currentDepartments.general,
    ...currentDepartments.items.filter((item) => item.id !== departmentId)
  ].some((item) => item.slug === slug);

  if (duplicateSlug) {
    throw new Error('Slug отдела уже используется в этой команде.');
  }

  let nextDepartments = currentDepartments;

  if (mode === 'edit') {
    if (departmentId === 'general') {
      nextDepartments = {
        ...currentDepartments,
        general: {
          ...currentDepartments.general,
          name,
          slug
        }
      };
    } else {
      nextDepartments = {
        ...currentDepartments,
        items: currentDepartments.items.map((item) => item.id === departmentId
          ? { ...item, name, slug }
          : item)
      };
    }
  } else {
    const id = `department-${slug}`;
    nextDepartments = {
      ...currentDepartments,
      items: [
        ...currentDepartments.items,
        {
          id,
          name,
          slug,
          defaults: {},
          mediaSources: {}
        }
      ]
    };
  }

  const bundle = buildWorkspaceTeamDefaultsBundle({
    defaults: visibleTeamDefaults.defaults || {},
    mediaSources: visibleTeamDefaults.mediaSources || {},
    departments: nextDepartments
  });

  await saveVisibleTeamDefaults(bundle);
  resetDepartmentDraft();
  workspaceState.adminError = '';
  workspaceState.adminNotice = mode === 'edit'
    ? `Отдел "${name}" обновлен.`
    : `Отдел "${name}" добавлен.`;
  await openSettingsModal();
};

const handleAdminCreateUserForm = async (form) => {
  const teamId = resolveAdminTeamId();
  if (!teamId) {
    workspaceState.adminError = 'Сначала выберите команду для пользователя.';
    await openSettingsModal();
    return;
  }

  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim();
  const displayName = String(formData.get('displayName') || '').trim();
  const role = String(formData.get('role') || 'editor').trim().toLowerCase() || 'editor';

  workspaceState.adminError = '';
  workspaceState.adminNotice = '';
  workspaceState.adminSecret = null;

  const response = await createAdminWorkspaceUser({ teamId, email, displayName, role });
  const copied = await copyTextToClipboard(response?.generatedPassword || '');
  await refreshAdminWorkspaceData();
  workspaceState.adminSecret = response?.generatedPassword
    ? { email, password: response.generatedPassword }
    : null;
  workspaceState.adminNotice = `Пользователь ${email} создан с ролью ${response?.user?.role || role}.${copied ? ' Пароль скопирован в буфер обмена.' : ''}`;
  await openSettingsModal();
};

const handleSettingsModalAction = async (action, event) => {
  if (action === 'open-team-defaults') {
    const departmentId = event.target.closest('[data-department-id]')?.dataset.departmentId || 'general';
    const visibleTeamDefaults = getVisibleTeamDefaultsPayload() || { defaults: {}, mediaSources: {} };
    prepareWorkspaceDepartmentEditor({
      teamId: workspaceState.settingsScope === 'team' && isWorkspaceSuperadmin() ? resolveAdminTeamId() : workspaceState.team?.id || '',
      defaultsPayload: visibleTeamDefaults.defaults || {},
      mediaSourcesPayload: visibleTeamDefaults.mediaSources || {},
      departmentId,
      adminScope: workspaceState.settingsScope === 'team' && isWorkspaceSuperadmin()
    });
    closeModal();
    window.showSizesAdmin?.();
    return;
  }
  if (action === 'open-team-media') {
    closeModal();
    window.showLogoAssetsAdmin?.();
    return;
  }
  if (action === 'open-settings-view') {
    const nextView = event.target.closest('[data-settings-view]')?.dataset.settingsView || 'account';
    setSettingsView(nextView);
    if (nextView === 'team') {
      await refreshWorkspaceTeamMembers();
    }
    await openSettingsModal({
      scope: workspaceState.settingsScope,
      view: nextView,
      title: workspaceState.settingsScope === 'team' ? 'Настройки команды' : 'Настройки пользователя'
    });
    return;
  }
  if (action === 'logout') {
    closeModal();
    await performLogout({ reopenAuth: false });
    return;
  }
  if (action === 'logout-and-switch-team') {
    closeModal();
    await performLogout({ reopenAuth: false });
    return;
  }
  if (action === 'close-settings') {
    closeModal();
    return;
  }
  if (action === 'start-admin-team-create') {
    workspaceState.adminSelectedTeamId = '';
    setAdminTeamDraft({
      mode: 'create',
      teamId: '__new__',
      name: '',
      slug: '',
      status: 'active'
    });
    workspaceState.adminError = '';
    workspaceState.adminNotice = '';
    workspaceState.adminSecret = null;
    await openSettingsModal();
    return;
  }
  if (action === 'edit-department') {
    const departmentId = event.target.closest('[data-department-id]')?.dataset.departmentId || 'general';
    const department = getVisibleDepartmentEntries().find((item) => item.id === departmentId);
    if (!department) return;
    setDepartmentDraft({
      mode: 'edit',
      id: department.id,
      name: department.name,
      slug: department.slug
    });
    workspaceState.adminError = '';
    workspaceState.adminNotice = '';
    await openSettingsModal();
    return;
  }
  if (action === 'cancel-department-edit') {
    resetDepartmentDraft();
    workspaceState.adminError = '';
    workspaceState.adminNotice = '';
    await openSettingsModal();
    return;
  }
  if (action === 'remove-department') {
    const departmentId = event.target.closest('[data-department-id]')?.dataset.departmentId || '';
    const visibleTeamDefaults = getVisibleTeamDefaultsPayload() || { defaults: {}, mediaSources: {} };
    const currentDepartments = getWorkspaceDepartments(visibleTeamDefaults.defaults || {});
    const department = currentDepartments.items.find((item) => item.id === departmentId);
    if (!department) return;
    if (!window.confirm(`Удалить отдел ${department.name}? Его собственные настройки исчезнут.`)) return;

    const nextDepartments = {
      ...currentDepartments,
      items: currentDepartments.items.filter((item) => item.id !== departmentId)
    };
    const bundle = buildWorkspaceTeamDefaultsBundle({
      defaults: visibleTeamDefaults.defaults || {},
      mediaSources: visibleTeamDefaults.mediaSources || {},
      departments: nextDepartments
    });
    await saveVisibleTeamDefaults(bundle);
    resetDepartmentDraft();
    workspaceState.adminError = '';
    workspaceState.adminNotice = `Отдел "${department.name}" удален.`;
    await openSettingsModal();
    return;
  }
  if (action === 'select-admin-team') {
    const teamId = event.target.closest('[data-team-id]')?.dataset.teamId || '';
    setAdminTeamId(teamId);
    const team = workspaceState.adminTeams.find((item) => item.id === teamId);
    if (team) {
      setAdminTeamDraft({
        mode: 'edit',
        teamId,
        name: team.name || '',
        slug: team.slug || '',
        status: team.status || 'active'
      });
    }
    workspaceState.adminSecret = null;
    workspaceState.adminNotice = '';
    workspaceState.adminError = '';
    await refreshAdminUsersData(teamId);
    await refreshAdminTeamDefaultsData(teamId);
    resetDepartmentDraft();
    await openSettingsModal();
    return;
  }
  if (action === 'reset-admin-user-password') {
    const userId = event.target.closest('[data-user-id]')?.dataset.userId || '';
    const teamId = resolveAdminTeamId();
    const user = workspaceState.adminUsers.find((item) => item.id === userId);
    if (!user || !teamId) return;

    workspaceState.adminError = '';
    workspaceState.adminNotice = '';
    workspaceState.adminSecret = null;

    const response = await resetAdminWorkspaceUserPassword({ teamId, userId });
    const copied = await copyTextToClipboard(response?.generatedPassword || '');
    await refreshAdminWorkspaceData();
    workspaceState.adminSecret = response?.generatedPassword
      ? { email: user.email, password: response.generatedPassword }
      : null;
    workspaceState.adminNotice = `Пароль для ${user.email} обновлен.${copied ? ' Новый пароль скопирован в буфер обмена.' : ''}`;
    await openSettingsModal();
    return;
  }
  if (action === 'set-admin-user-role') {
    const userId = event.target.closest('[data-user-id]')?.dataset.userId || '';
    const role = event.target.closest('[data-role]')?.dataset.role || '';
    const teamId = resolveAdminTeamId();
    const user = workspaceState.adminUsers.find((item) => item.id === userId);
    if (!user || !teamId || !role) return;

    workspaceState.adminError = '';
    workspaceState.adminNotice = '';
    workspaceState.adminSecret = null;

    const response = await updateAdminWorkspaceUserRole({ teamId, userId, role });
    await refreshAdminWorkspaceData();
    workspaceState.adminNotice = `Роль для ${user.email} обновлена: ${response?.user?.role || role}.`;
    await openSettingsModal();
    return;
  }
  if (action === 'remove-admin-user') {
    const userId = event.target.closest('[data-user-id]')?.dataset.userId || '';
    const teamId = resolveAdminTeamId();
    const user = workspaceState.adminUsers.find((item) => item.id === userId);
    if (!user || !teamId) return;
    if (!window.confirm(`Удалить пользователя ${user.email} из команды?`)) return;

    workspaceState.adminError = '';
    workspaceState.adminNotice = '';
    workspaceState.adminSecret = null;

    await removeAdminWorkspaceUser({ teamId, userId });
    await refreshAdminWorkspaceData();
    workspaceState.adminNotice = `Пользователь ${user.email} удален из команды.`;
    await openSettingsModal();
  }
};

const submitAuthForm = async (form) => {
  if (workspaceState.authLoading) return;

  const formData = new FormData(form);
  const teamSlug = getImplicitAuthTeamSlug();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  workspaceState.authLoading = true;
  workspaceState.authError = '';
  workspaceState.authDraft = { email, password };
  renderAuthOverlay();

  try {
    await loginWorkspace({ email, password, teamSlug });

    if (teamSlug) {
      updateSelectedTeamSlug(teamSlug);
    }
    updateAuthDraftField('password', '');
    setWorkspaceSessionHint(true);
    await restoreWorkspaceSession();
  } catch (error) {
    workspaceState.authError = error.message || 'Не удалось завершить авторизацию';
    if (error?.status === 401) {
      setWorkspaceSessionHint(false);
    }
  } finally {
    workspaceState.authLoading = false;
    renderAuthOverlay();
  }
};

const attachGlobalListeners = () => {
  const els = getEls();
  if (!els.root || !els.modal || !els.authOverlay) return;

  els.accountBtn.addEventListener('click', async () => {
    if (!workspaceState.user) {
      openAuthScreen();
      return;
    }
    await openSettingsModal({ scope: 'user', view: 'account', title: 'Настройки пользователя' });
  });

  els.teamBtn?.addEventListener('click', async () => {
    if (!workspaceState.user || !workspaceState.team) return;
    const nextView = isWorkspaceSuperadmin() ? 'teams' : 'team';
    await openSettingsModal({ scope: 'team', view: nextView, title: 'Настройки команды' });
  });

  els.projectsBtn.addEventListener('click', async () => {
    try {
      await openProjectsModal();
    } catch (error) {
      alert(error.message || 'Не удалось загрузить проекты');
    }
  });

  els.saveBtn.addEventListener('click', async () => {
    try {
      await saveCurrentProject();
    } catch (error) {
      setProjectActionPending('');
      alert(error.message || 'Не удалось сохранить проект');
    }
  });

  els.templateBtn.addEventListener('click', async () => {
    try {
      setProjectComposer({
        mode: 'template',
        templateName: workspaceState.currentProject ? `${workspaceState.currentProject.name} template` : ''
      });
      workspaceState.projectModalError = '';
      workspaceState.projectModalNotice = '';
      await openProjectsModal({ skipReload: false });
    } catch (error) {
      setProjectActionPending('');
      alert(error.message || 'Не удалось сохранить шаблон');
    }
  });

  els.modalClose.addEventListener('click', closeModal);
  els.modal.addEventListener('click', async (event) => {
    if (event.target === els.modal) {
      closeModal();
      return;
    }

    const action = event.target.closest('[data-workspace-action]')?.dataset.workspaceAction;
    if (!action) return;

    try {
      if (workspaceState.modalView === 'projects') {
        await handleProjectsModalAction(action, event);
      }
      if (workspaceState.modalView === 'settings') {
        await handleSettingsModalAction(action, event);
      }
    } catch (error) {
      if (workspaceState.modalView === 'projects') {
        setProjectActionPending('');
        workspaceState.projectModalError = error.message || 'Ошибка project-операции';
        workspaceState.projectModalNotice = '';
        rerenderProjectsModal();
        return;
      }
      if (workspaceState.modalView === 'settings') {
        workspaceState.adminError = error.message || 'Ошибка admin-операции';
        workspaceState.adminNotice = '';
        workspaceState.adminSecret = null;
        await openSettingsModal();
        return;
      }
      alert(error.message || 'Ошибка workspace-операции');
    }
  });

  els.authOverlay.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (event.target.form?.id !== 'workspaceAuthForm') return;
    updateAuthDraftField(event.target.name, event.target.value);
    syncAuthSubmitState();
  });

  els.authOverlay.addEventListener('click', (event) => {
    if (event.target === els.authOverlay) {
      closeAuthScreen();
      return;
    }

    const closeButton = event.target.closest('[data-workspace-auth-close]');
    if (closeButton) {
      closeAuthScreen();
      return;
    }

    const toggle = event.target.closest('[data-workspace-password-toggle]');
    if (!toggle) return;

    const passwordInput = document.getElementById('workspaceAuthPassword');
    if (!(passwordInput instanceof HTMLInputElement)) return;

    const shouldShow = passwordInput.type === 'password';
    passwordInput.type = shouldShow ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', shouldShow ? 'true' : 'false');
    toggle.setAttribute('aria-label', shouldShow ? 'Скрыть пароль' : 'Показать пароль');
    const icon = toggle.querySelector('.material-icons');
    if (icon) {
      icon.textContent = shouldShow ? 'visibility_off' : 'visibility';
    }
  });

  els.authOverlay.addEventListener('submit', async (event) => {
    if (event.target.id !== 'workspaceAuthForm') return;
    event.preventDefault();
    await submitAuthForm(event.target);
  });
};

const injectWorkspaceUi = () => {
  const headerActions = document.querySelector('.header-actions');
  if (!headerActions || document.getElementById('workspaceControls')) return false;

  const controls = document.createElement('div');
  controls.id = 'workspaceControls';
  controls.className = 'workspace-controls';
  controls.innerHTML = `
    <div id="workspaceStatus" class="workspace-status">Workspace...</div>
    <button id="workspaceProjectsBtn" class="btn ui-button">Шаблоны</button>
    <button id="workspaceSaveBtn" class="btn ui-button">Сохранить</button>
    <button id="workspaceTemplateBtn" class="btn ui-button">Сохранить как шаблон</button>
    <button id="workspaceTeamBtn" class="btn ui-button workspace-team-trigger" style="display:none;">
      <span class="workspace-team-trigger-label">Команда</span>
      <span class="material-icons" aria-hidden="true">settings</span>
    </button>
    <button id="workspaceAccountBtn" class="btn primary ui-button ui-button-inverted">Войти</button>
  `;
  headerActions.prepend(controls);

  const modal = document.createElement('div');
  modal.id = 'workspaceModalOverlay';
  modal.className = 'workspace-modal-overlay';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="workspace-modal-panel">
      <div class="workspace-modal-header">
        <div id="workspaceModalTitle" class="workspace-modal-title">Workspace</div>
        <button id="workspaceModalCloseBtn" class="btn btn-small ui-button ui-button-sm">Закрыть</button>
      </div>
      <div id="workspaceModalBody" class="workspace-modal-body"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const authOverlay = document.createElement('div');
  authOverlay.id = 'workspaceAuthOverlay';
  authOverlay.className = 'workspace-auth-overlay';
  authOverlay.style.display = 'none';
  document.body.appendChild(authOverlay);

  return true;
};

export const initWorkspacePanel = async () => {
  workspaceState.preferredTeamSlug = getPreferredTeamSlug();

  if (!isWorkspaceApiEnabled()) {
    workspaceState.enabled = false;
    return;
  }

  const mounted = injectWorkspaceUi();
  if (!mounted) return;

  attachGlobalListeners();
  workspaceState.authScreenVisible = false;
  renderWorkspaceSummary();
  renderAuthOverlay();

  try {
    const health = await getWorkspaceHealth();
    workspaceState.enabled = !!health?.ok;
    workspaceState.ready = !!health?.ok;
  } catch (error) {
    console.warn('Workspace API недоступен:', error);
    workspaceState.enabled = false;
    workspaceState.ready = false;
    workspaceState.authScreenVisible = false;
    renderWorkspaceSummary();
    renderAuthOverlay();
    return;
  }

  try {
    await restoreWorkspaceSession();
    if (workspaceState.user && workspaceState.team) {
      setWorkspaceSessionHint(true);
    }
  } catch (error) {
    if (error?.status === 401) {
      setWorkspaceSessionHint(false);
    } else {
      console.warn('Workspace session restore failed:', error);
    }
  }

  renderWorkspaceSummary();
  renderAuthOverlay();
};
