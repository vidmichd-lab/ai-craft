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
import {
  archiveAdminWorkspaceTeam,
  createAdminWorkspaceTeam,
  createAdminWorkspaceUser,
  createWorkspaceProject,
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
  updateAdminWorkspaceUserRole,
  updateAdminWorkspaceTeam
} from '../../utils/workspaceApi.js';
import { applyWorkspaceTeamDefaultsLocally } from '../../utils/workspaceTeamDefaults.js';
import { setWorkspaceAccessState } from '../../utils/workspaceAccess.js';

const STORAGE_PREFIX = 'workspace-current-project-id';
const SESSION_HINT_KEY = 'workspace-session-hint';
const PREFERRED_TEAM_KEY = 'workspace-preferred-team';
const LOCAL_DRAFT_PREFIX = 'workspace-local-draft';
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

const hasWorkspaceSessionHint = () => {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
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
  return applyWorkspaceTeamDefaultsLocally(teamPayload?.defaults?.defaults, teamPayload?.defaults?.mediaSources);
};

const getEls = () => ({
  root: document.getElementById('workspaceControls'),
  status: document.getElementById('workspaceStatus'),
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
  submitButton.disabled = !workspaceState.ready || workspaceState.authLoading || !isAuthDraftComplete();
};

const isWorkspaceSuperadmin = () => !!workspaceState.user?.isSuperadmin;
const getWorkspaceRole = () => String(workspaceState.user?.role || '').trim().toLowerCase();
const canManageWorkspaceTeamDefaults = () => isWorkspaceSuperadmin() || ['admin', 'lead'].includes(getWorkspaceRole());
const canViewWorkspaceTeamTab = () => !isWorkspaceSuperadmin() && getWorkspaceRole() === 'lead';

const createEmptyAdminTeamDraft = () => ({
  mode: 'create',
  teamId: '',
  name: '',
  slug: ''
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

const getAvailableSettingsViews = () => {
  const views = [{ id: 'account', label: 'Аккаунт' }];
  if (isWorkspaceSuperadmin()) {
    views.push(
      { id: 'teams', label: 'Команды' },
      { id: 'users', label: 'Пользователи' }
    );
    return views;
  }

  if (canViewWorkspaceTeamTab()) {
    views.push({ id: 'team', label: 'Команда' });
  }

  return views;
};

const ensureSettingsView = () => {
  const views = getAvailableSettingsViews();
  if (!views.some((view) => view.id === workspaceState.settingsView)) {
    workspaceState.settingsView = views[0]?.id || 'account';
  }
  return workspaceState.settingsView;
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
  if (user.isSuperadmin) return 'superadmin';

  const role = String(user.role || '').trim().toLowerCase();
  if (role === 'lead') return 'lead';
  if (role === 'admin') return 'admin';
  return 'editor';
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
    if (!workspaceState.user || !workspaceState.team) return 'Нужен вход';
    return `${workspaceState.team.name} / личный черновик`;
  })();

  els.status.textContent = statusText;
  const isBusy = Boolean(workspaceState.projectActionPending);
  els.projectsBtn.disabled = !workspaceState.ready || !workspaceState.user || isBusy;
  els.saveBtn.disabled = !workspaceState.ready || !workspaceState.user || isBusy;
  els.templateBtn.disabled = !workspaceState.ready || !workspaceState.user || isBusy;
  els.accountBtn.disabled = !workspaceState.ready || isBusy;
  els.accountBtn.textContent = workspaceState.user ? 'Настройки' : 'Войти';
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
};

const syncWorkspaceAppVisibility = () => {
  document.body.classList.toggle('workspace-auth-active', Boolean(isWorkspaceApiEnabled() && workspaceState.authScreenVisible && !workspaceState.user));
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
  if (project?.id) {
    try {
      workspaceState.templatesLoading = true;
      const response = await listWorkspaceSnapshots({ projectId: project.id, kind: 'template' });
      workspaceState.templates = Array.isArray(response?.snapshots) ? response.snapshots : [];
    } catch (error) {
      console.warn('Не удалось загрузить шаблоны проекта:', error);
    } finally {
      workspaceState.templatesLoading = false;
    }
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

const saveCurrentProject = async () => {
  if (!workspaceState.user) {
    openAuthScreen();
    return;
  }
  const snapshot = getCurrentStateSnapshot();
  setProjectActionPending('Сохраняем черновик...');
  saveLocalDraftSnapshot(workspaceState.team?.slug, {
    savedAt: new Date().toISOString(),
    state: snapshot
  });
  workspaceState.projectModalError = '';
  workspaceState.projectModalNotice = 'Черновик сохранен в браузере.';
  setProjectActionPending('');
  rerenderProjectsModal();
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
    title: activePair?.title || snapshot?.brandName || 'AI-Craft',
    subtitle: activePair?.subtitle || '',
    backgroundColor: snapshot?.bgColor || '#111111',
    backgroundImage: activePair?.bgImageSelected || snapshot?.kvSelected || '',
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
        <button class="btn btn-small" type="button" data-workspace-action="cancel-project-composer">Отмена</button>
      </div>
      <form id="workspaceTemplateComposerForm" class="workspace-settings-form" novalidate>
        <label class="workspace-settings-field">
          <span class="workspace-settings-field-label">Название шаблона</span>
          <input class="workspace-settings-input" name="templateName" type="text" value="${escapeHtml(composer.templateName)}" placeholder="Например, Базовый KV" required>
        </label>
        <div class="workspace-settings-form-actions">
          <button class="btn primary" type="submit" ${workspaceState.projectActionPending ? 'disabled' : ''}>Сохранить шаблон</button>
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
            <div class="workspace-project-card-meta">${new Date(template.createdAt).toLocaleString('ru-RU')}</div>
            <div class="workspace-project-card-actions">
              <button class="btn btn-small" data-workspace-action="apply-template" data-template-id="${escapeHtml(template.id)}">Применить</button>
            </div>
          </div>
        </article>
      `).join('')
      : '<div class="workspace-empty">Шаблонов пока нет. Работай в личном черновике и сохраняй удачные варианты сюда.</div>';

  return `
    <div class="workspace-modal-stack">
      <div class="workspace-projects-header">
        <div>
          <div class="workspace-settings-view-title">Шаблоны</div>
          <div class="workspace-settings-view-subtitle">Работаешь в личном черновике, а удачные варианты сохраняешь как шаблоны.</div>
        </div>
        <div class="workspace-toolbar">
          <button class="btn primary" data-workspace-action="save-template" ${workspaceState.projectActionPending ? 'disabled' : ''}>Сохранить как шаблон</button>
          <button class="btn" data-workspace-action="refresh-projects" ${workspaceState.templatesLoading || workspaceState.projectActionPending ? 'disabled' : ''}>Обновить</button>
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
              <div class="workspace-settings-surface-title">Личный черновик</div>
            </div>
            ${renderProjectPreview(currentSnapshot, 'Текущий макет')}
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
    if (workspaceState.currentProject?.id) {
      const response = await listWorkspaceSnapshots({ projectId: workspaceState.currentProject.id, kind: 'template' });
      if (loadSeq !== workspaceState.projectsModalLoadSeq) return;
      workspaceState.templates = Array.isArray(response?.snapshots) ? response.snapshots : [];
    } else {
      workspaceState.templates = [];
    }
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
    workspaceState.templatesLoading = Boolean(workspaceState.currentProject?.id);
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

const refreshAdminWorkspaceData = async ({ preserveSecret = true } = {}) => {
  if (!isWorkspaceSuperadmin()) return;

  if (!preserveSecret) {
    workspaceState.adminSecret = null;
  }

  try {
    await refreshAdminTeamsData();
    await refreshAdminUsersData(resolveAdminTeamId());
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

const renderSettingsReadonlyField = (label, value) => `
  <label class="workspace-settings-field">
    <span class="workspace-settings-field-label">${escapeHtml(label)}</span>
    <input class="workspace-settings-input" type="text" value="${escapeHtml(value || '—')}" readonly>
  </label>
`;

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
    <div class="workspace-secret-card">
      <div class="workspace-section-title">Сгенерированный пароль</div>
      <div class="workspace-secret-line">${escapeHtml(workspaceState.adminSecret.email)}</div>
      <code class="workspace-secret-value">${escapeHtml(workspaceState.adminSecret.password)}</code>
    </div>
  `;
};

const renderSettingsTeamMembersList = (members, { allowRoleActions = false } = {}) => {
  if (!Array.isArray(members) || members.length === 0) {
    return '<div class="workspace-empty">Пока никого нет.</div>';
  }

  return members.map((user) => `
    <div class="workspace-settings-list-item">
      <div class="workspace-settings-list-main">
        <div class="workspace-settings-list-title">${escapeHtml(user.displayName || user.email)}</div>
        <div class="workspace-settings-list-meta">${escapeHtml(user.email)}</div>
      </div>
      <div class="workspace-settings-list-side">
        <span class="workspace-settings-role-pill">${escapeHtml(user.role)}</span>
        ${allowRoleActions && !user.isSuperadmin && (user.role === 'editor' || user.role === 'lead')
          ? `<button class="btn btn-small" data-workspace-action="set-admin-user-role" data-user-id="${escapeHtml(user.id)}" data-role="${user.role === 'lead' ? 'editor' : 'lead'}">${user.role === 'lead' ? 'Сделать editor' : 'Сделать lead'}</button>`
          : ''}
        ${allowRoleActions
          ? `<button class="btn btn-small" data-workspace-action="reset-admin-user-password" data-user-id="${escapeHtml(user.id)}">Новый пароль</button>`
          : ''}
        ${allowRoleActions && !user.isSuperadmin
          ? `<button class="btn btn-small btn-danger" data-workspace-action="remove-admin-user" data-user-id="${escapeHtml(user.id)}">Удалить</button>`
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

const renderSettingsAccountView = () => {
  const fields = [
    renderSettingsReadonlyField('Имя', workspaceState.user?.displayName || ''),
    renderSettingsReadonlyField('Почта', workspaceState.user?.email || '')
  ];

  if (!isWorkspaceSuperadmin()) {
    fields.push(
      renderSettingsReadonlyField('Команда', workspaceState.team?.name || ''),
      renderSettingsReadonlyField('Роль', formatWorkspaceRoleLabel())
    );
  }

  return `
    <div class="workspace-settings-view">
      <div class="workspace-settings-view-header">
        <div>
          <div class="workspace-settings-view-title">Аккаунт</div>
          <div class="workspace-settings-view-subtitle">Профиль и активный доступ в workspace.</div>
        </div>
        <span class="workspace-settings-role-pill">${escapeHtml(isWorkspaceSuperadmin() ? 'Superadmin' : formatWorkspaceRoleLabel())}</span>
      </div>
      <div class="workspace-settings-surface">
        <div class="workspace-settings-grid workspace-settings-grid-single">
          ${fields.join('')}
        </div>
      </div>
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
          <div class="workspace-settings-view-subtitle">Название команды и состав участников.</div>
        </div>
      </div>
      <div class="workspace-settings-surface">
        <div class="workspace-settings-grid workspace-settings-grid-single">
          ${renderSettingsReadonlyField('Название команды', workspaceState.team?.name || '')}
        </div>
      </div>
      <div class="workspace-settings-surface">
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
  const teamsHtml = workspaceState.adminTeams.length
    ? workspaceState.adminTeams.map((team) => `
      <div class="workspace-settings-list-item ${team.id === resolveAdminTeamId() ? 'is-active' : ''}">
        <div class="workspace-settings-list-main">
          <div class="workspace-settings-list-title">${escapeHtml(team.name)}</div>
          <div class="workspace-settings-list-meta">${escapeHtml(team.slug)} · ${escapeHtml(team.status === 'archived' ? 'archived' : 'active')}</div>
        </div>
        <div class="workspace-settings-list-side">
          <button class="btn btn-small" data-workspace-action="select-admin-team" data-team-id="${escapeHtml(team.id)}">${team.id === resolveAdminTeamId() ? 'Выбрана' : 'Открыть'}</button>
          <button class="btn btn-small" data-workspace-action="rename-admin-team" data-team-id="${escapeHtml(team.id)}">Редактировать</button>
          ${team.id !== workspaceState.team?.id
            ? `<button class="btn btn-small btn-danger" data-workspace-action="archive-admin-team" data-team-id="${escapeHtml(team.id)}">Удалить</button>`
            : ''}
        </div>
      </div>
    `).join('')
    : '<div class="workspace-empty">Команд пока нет.</div>';

  return `
    <div class="workspace-settings-view">
      <div class="workspace-settings-view-header">
        <div>
          <div class="workspace-settings-view-title">Команды</div>
          <div class="workspace-settings-view-subtitle">Все команды workspace, редактирование и удаление.</div>
        </div>
      </div>
      ${renderSettingsFeedback()}
      <div class="workspace-settings-surface">
        <div class="workspace-settings-surface-header">
          <div class="workspace-settings-surface-title">Список всех команд</div>
        </div>
        <div class="workspace-settings-list">
          ${teamsHtml}
        </div>
      </div>
      <div class="workspace-settings-surface">
        <div class="workspace-settings-surface-header">
          <div class="workspace-settings-surface-title">${draft.mode === 'edit' ? 'Редактировать команду' : 'Добавить команду'}</div>
          ${draft.mode === 'edit'
            ? '<button class="btn btn-small" data-workspace-action="start-admin-team-create">Новая команда</button>'
            : ''}
        </div>
        <form id="workspaceAdminCreateTeamForm" class="workspace-settings-form" novalidate>
          <input type="hidden" name="mode" value="${escapeHtml(draft.mode)}">
          <input type="hidden" name="teamId" value="${escapeHtml(draft.teamId)}">
          <div class="workspace-settings-grid workspace-settings-grid-single">
            <label class="workspace-settings-field">
              <span class="workspace-settings-field-label">Имя</span>
              <input class="workspace-settings-input" name="name" type="text" value="${escapeHtml(draft.name)}" placeholder="Например, Яндекс Практикум" required>
            </label>
            <label class="workspace-settings-field">
              <span class="workspace-settings-field-label">Slug</span>
              <input class="workspace-settings-input" name="slug" type="text" value="${escapeHtml(draft.slug)}" placeholder="yandex-practicum" required>
            </label>
          </div>
          <div class="workspace-settings-form-actions">
            <button class="btn primary" type="submit">${draft.mode === 'edit' ? 'Сохранить' : 'Добавить команду'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

const renderSettingsAdminUsersView = () => {
  const adminTeamId = resolveAdminTeamId();
  const adminSelectedTeam = workspaceState.adminTeams.find((team) => team.id === adminTeamId) || null;
  const teamSwitchHtml = workspaceState.adminTeams.length
    ? workspaceState.adminTeams.map((team) => `
      <button class="workspace-settings-chip ${team.id === adminTeamId ? 'is-active' : ''}" type="button" data-workspace-action="select-admin-team" data-team-id="${escapeHtml(team.id)}">
        ${escapeHtml(team.name)}
      </button>
    `).join('')
    : '<div class="workspace-empty">Команд пока нет.</div>';

  return `
    <div class="workspace-settings-view">
      <div class="workspace-settings-view-header">
        <div>
          <div class="workspace-settings-view-title">Пользователи</div>
          <div class="workspace-settings-view-subtitle">Список пользователей, роли и создание новых аккаунтов.</div>
        </div>
      </div>
      ${renderSettingsFeedback()}
      ${renderSettingsSecret()}
      <div class="workspace-settings-surface">
        <div class="workspace-settings-surface-header">
          <div class="workspace-settings-surface-title">Команда</div>
        </div>
        <div class="workspace-settings-chip-group">
          ${teamSwitchHtml}
        </div>
      </div>
      <div class="workspace-settings-surface">
        <div class="workspace-settings-surface-header">
          <div class="workspace-settings-surface-title">Список пользователей${adminSelectedTeam ? ` · ${escapeHtml(adminSelectedTeam.name)}` : ''}</div>
        </div>
        <div class="workspace-settings-list">
          ${renderSettingsTeamMembersList(workspaceState.adminUsers, { allowRoleActions: true })}
        </div>
      </div>
      <div class="workspace-settings-surface">
        <div class="workspace-settings-surface-header">
          <div class="workspace-settings-surface-title">Добавить пользователя</div>
        </div>
        <form id="workspaceAdminCreateUserForm" class="workspace-settings-form" novalidate ${adminTeamId ? '' : 'style="display:none;"'}>
          <div class="workspace-settings-grid workspace-settings-grid-single">
            <label class="workspace-settings-field">
              <span class="workspace-settings-field-label">Имя</span>
              <input class="workspace-settings-input" name="displayName" type="text" placeholder="Имя пользователя">
            </label>
            <label class="workspace-settings-field">
              <span class="workspace-settings-field-label">Email</span>
              <input class="workspace-settings-input" name="email" type="email" placeholder="user@example.com" required>
            </label>
            <label class="workspace-settings-field">
              <span class="workspace-settings-field-label">Роль</span>
              <select class="workspace-settings-input" name="role">
                <option value="editor">editor</option>
                <option value="lead">lead</option>
              </select>
            </label>
          </div>
          <div class="workspace-settings-form-actions">
            <button class="btn primary" type="submit">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

const renderSettingsModal = () => {
  const settingsView = ensureSettingsView();
  const views = getAvailableSettingsViews();
  const sidebarMetaHtml = isWorkspaceSuperadmin()
    ? renderSettingsSidebarMeta('Доступ', 'Superadmin')
    : [
      renderSettingsSidebarMeta('Команда', workspaceState.team?.name || ''),
      renderSettingsSidebarMeta('Роль', formatWorkspaceRoleLabel())
    ].join('');
  const navHtml = views.map((view) => `
    <button
      type="button"
      class="workspace-settings-nav-item ${view.id === settingsView ? 'is-active' : ''}"
      data-workspace-action="open-settings-view"
      data-settings-view="${escapeHtml(view.id)}"
    >
      ${escapeHtml(view.label)}
    </button>
  `).join('');

  const contentHtml = (() => {
    if (settingsView === 'team') return renderSettingsTeamView();
    if (settingsView === 'teams') return renderSettingsAdminTeamsView();
    if (settingsView === 'users') return renderSettingsAdminUsersView();
    return renderSettingsAccountView();
  })();

  return `
    <div class="workspace-settings-layout">
      <aside class="workspace-settings-sidebar">
        <div class="workspace-settings-sidebar-head">
          <div class="workspace-settings-sidebar-title">Workspace</div>
          <div class="workspace-settings-sidebar-subtitle">${escapeHtml(workspaceState.user?.displayName || workspaceState.user?.email || '')}</div>
        </div>
        <div class="workspace-settings-nav">
          ${navHtml}
        </div>
        <div class="workspace-settings-sidebar-footer">
          <div class="workspace-settings-sidebar-meta-list">
            ${sidebarMetaHtml}
          </div>
          <button class="btn btn-full" data-workspace-action="logout">Выйти</button>
        </div>
      </aside>
      <section class="workspace-settings-content">
        ${contentHtml}
      </section>
    </div>
  `;
};

const openSettingsModal = async () => {
  ensureSettingsView();
  if (isWorkspaceSuperadmin()) {
    await refreshAdminWorkspaceData();
  } else if (workspaceState.settingsView === 'team') {
    await refreshWorkspaceTeamMembers();
  }
  openModal('Настройки workspace', renderSettingsModal(), 'settings');
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

  els.authOverlay.innerHTML = `
    <div class="workspace-auth-shell" style="--workspace-auth-hero-image: url('${escapeHtml(AUTH_HERO_IMAGE)}')">
      <div class="workspace-auth-hero">
        <img class="workspace-auth-logo" src="assets/logo.svg" alt="AI-Craft">
        <div class="workspace-auth-hero-copy">
          <div class="workspace-auth-eyebrow">Workspace</div>
          <h1 class="workspace-auth-title">Вход в AI-Craft</h1>
          <p class="workspace-auth-description">Только для участников команды. Аккаунты editor и lead создает администратор.</p>
        </div>
        <div class="workspace-auth-footer">Вайб-код от <a href="https://staff.yandex-team.ru/vidmich" target="_blank" rel="noopener">@vidmich</a></div>
      </div>
      <div class="workspace-auth-card">
        <div class="workspace-auth-header">
          <div class="workspace-auth-kicker">Авторизация</div>
          <h2 class="workspace-auth-heading">Войдите по почте и паролю</h2>
          <p class="workspace-auth-subtitle">Если доступа еще нет, напишите админу или лиду вашей команды.</p>
        </div>
        <form id="workspaceAuthForm" class="workspace-auth-form">
          <label class="workspace-field">
            <input class="workspace-settings-input workspace-auth-input" id="workspaceAuthEmail" name="email" type="email" autocomplete="username" placeholder="Email" value="${escapeHtml(draft.email)}" required>
          </label>
          <label class="workspace-field workspace-auth-password-field">
            <input class="workspace-settings-input workspace-auth-input" id="workspaceAuthPassword" name="password" type="password" autocomplete="current-password" placeholder="Пароль" value="${escapeHtml(draft.password)}" required>
            <button
              class="workspace-auth-password-toggle"
              type="button"
              data-workspace-password-toggle="true"
              aria-label="Показать пароль"
              aria-pressed="false"
            >
              <span class="material-icons" aria-hidden="true">visibility</span>
            </button>
          </label>
          ${errorHtml}
          <button class="btn primary workspace-auth-submit" type="submit" ${(!workspaceState.ready || workspaceState.authLoading || !isAuthDraftComplete()) ? 'disabled' : ''}>${buttonLabel}</button>
        </form>
      </div>
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
  workspaceState.adminTeams = [];
  workspaceState.adminUsers = [];
  workspaceState.teamMembers = [];
  workspaceState.teamMembersError = '';
  workspaceState.adminSelectedTeamId = '';
  workspaceState.adminError = '';
  workspaceState.adminNotice = '';
  workspaceState.adminSecret = null;
  resetProjectComposer();
  resetAdminTeamDraft();
};

const performLogout = async ({ reopenAuth = true } = {}) => {
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

  if (!workspaceState.team) {
    workspaceState.authScreenVisible = true;
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

  workspaceState.adminError = '';
  workspaceState.adminNotice = '';
  workspaceState.adminSecret = null;

  if (mode === 'edit' && teamId) {
    const response = await updateAdminWorkspaceTeam({ teamId, name, slug });
    workspaceState.adminSelectedTeamId = response?.team?.id || teamId;
    resetAdminTeamDraft();
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
  if (action === 'open-settings-view') {
    const nextView = event.target.closest('[data-settings-view]')?.dataset.settingsView || 'account';
    setSettingsView(nextView);
    if (nextView === 'team') {
      await refreshWorkspaceTeamMembers();
    }
    await openSettingsModal();
    return;
  }
  if (action === 'logout') {
    closeModal();
    await performLogout({ reopenAuth: true });
    return;
  }
  if (action === 'logout-and-switch-team') {
    closeModal();
    await performLogout({ reopenAuth: true });
    return;
  }
  if (action === 'close-settings') {
    closeModal();
    return;
  }
  if (action === 'start-admin-team-create') {
    resetAdminTeamDraft();
    workspaceState.adminError = '';
    workspaceState.adminNotice = '';
    workspaceState.adminSecret = null;
    await openSettingsModal();
    return;
  }
  if (action === 'select-admin-team') {
    const teamId = event.target.closest('[data-team-id]')?.dataset.teamId || '';
    setAdminTeamId(teamId);
    workspaceState.adminSecret = null;
    workspaceState.adminNotice = '';
    workspaceState.adminError = '';
    await refreshAdminUsersData(teamId);
    await openSettingsModal();
    return;
  }
  if (action === 'rename-admin-team') {
    const teamId = event.target.closest('[data-team-id]')?.dataset.teamId || '';
    const team = workspaceState.adminTeams.find((item) => item.id === teamId);
    if (!team) return;
    setAdminTeamDraft({
      mode: 'edit',
      teamId,
      name: team.name || '',
      slug: team.slug || ''
    });
    await openSettingsModal();
    return;
  }
  if (action === 'archive-admin-team') {
    const teamId = event.target.closest('[data-team-id]')?.dataset.teamId || '';
    const team = workspaceState.adminTeams.find((item) => item.id === teamId);
    if (!team) return;
    if (!window.confirm(`Архивировать команду "${team.name}"?`)) return;

    workspaceState.adminError = '';
    workspaceState.adminNotice = '';
    workspaceState.adminSecret = null;

    await archiveAdminWorkspaceTeam({ teamId });
    if (workspaceState.adminSelectedTeamId === teamId) {
      workspaceState.adminSelectedTeamId = '';
    }
    const draft = getAdminTeamDraft();
    if (draft.teamId === teamId) {
      resetAdminTeamDraft();
    }
    await refreshAdminWorkspaceData();
    workspaceState.adminNotice = `Команда "${team.name}" архивирована.`;
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
    if (workspaceState.user) {
      await openSettingsModal();
    }
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
    await openSettingsModal();
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
    <button id="workspaceProjectsBtn" class="btn">Шаблоны</button>
    <button id="workspaceSaveBtn" class="btn">Сохранить</button>
    <button id="workspaceTemplateBtn" class="btn">Сохранить как шаблон</button>
    <button id="workspaceAccountBtn" class="btn primary">Войти</button>
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
        <button id="workspaceModalCloseBtn" class="btn btn-small">Закрыть</button>
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
  workspaceState.authScreenVisible = true;
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

  if (!hasWorkspaceSessionHint()) {
    renderWorkspaceSummary();
    openAuthScreen();
    return;
  }

  try {
    await restoreWorkspaceSession();
  } catch (error) {
    if (error?.status === 401) {
      setWorkspaceSessionHint(false);
    } else {
      console.warn('Workspace session restore failed:', error);
    }
    openAuthScreen();
  }

  renderWorkspaceSummary();
  renderAuthOverlay();
};
