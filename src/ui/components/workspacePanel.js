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
  archiveWorkspaceProject,
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
  listWorkspaceProjects,
  listWorkspaceSnapshots,
  loginWorkspace,
  logoutWorkspace,
  removeAdminWorkspaceUser,
  registerWorkspace,
  resetAdminWorkspaceUserPassword,
  saveWorkspaceSnapshot,
  updateAdminWorkspaceUserRole,
  updateAdminWorkspaceTeam,
  updateWorkspaceProject
} from '../../utils/workspaceApi.js';
import { applyWorkspaceTeamDefaultsLocally } from '../../utils/workspaceTeamDefaults.js';
import { setWorkspaceAccessState } from '../../utils/workspaceAccess.js';

const STORAGE_PREFIX = 'workspace-current-project-id';
const SESSION_HINT_KEY = 'workspace-session-hint';
const PREFERRED_TEAM_KEY = 'workspace-preferred-team';

const workspaceState = {
  enabled: false,
  ready: false,
  user: null,
  team: null,
  teamDefaults: null,
  currentProject: null,
  projects: [],
  templates: [],
  modalView: '',
  authMode: 'login',
  authScreenVisible: false,
  authLoading: false,
  authError: '',
  publicTeams: [],
  preferredTeamSlug: '',
  hasLoadedTeams: false,
  adminTeams: [],
  adminUsers: [],
  adminSelectedTeamId: '',
  adminError: '',
  adminNotice: '',
  adminSecret: null
};

const getScopedProjectStorageKey = (teamSlug = '') => {
  const normalizedTeam = (teamSlug || 'default').trim().toLowerCase();
  return `${STORAGE_PREFIX}::${normalizedTeam}`;
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

const isWorkspaceSuperadmin = () => !!workspaceState.user?.isSuperadmin;
const getWorkspaceRole = () => String(workspaceState.user?.role || '').trim().toLowerCase();
const canManageWorkspaceTeamDefaults = () => isWorkspaceSuperadmin() || ['admin', 'lead'].includes(getWorkspaceRole());

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
    if (!workspaceState.user || !workspaceState.team) return 'Нужен вход';
    if (workspaceState.currentProject?.name) {
      return `${workspaceState.team.name} / ${workspaceState.currentProject.name}`;
    }
    return `${workspaceState.team.name} / без проекта`;
  })();

  els.status.textContent = statusText;
  els.projectsBtn.disabled = !workspaceState.ready || !workspaceState.user;
  els.saveBtn.disabled = !workspaceState.ready || !workspaceState.user;
  els.templateBtn.disabled = !workspaceState.ready || !workspaceState.user || !workspaceState.currentProject;
  els.accountBtn.disabled = !workspaceState.ready;
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
  els.modal.style.display = 'none';
};

const openModal = (title, html, modalView = '') => {
  const els = getEls();
  if (!els.modal || !els.modalBody || !els.modalTitle) return;
  workspaceState.modalView = modalView;
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = html;
  els.modal.style.display = 'flex';
};

const openAuthScreen = (mode = workspaceState.authMode) => {
  workspaceState.authMode = mode;
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
  workspaceState.currentProject = project;
  setPersistedProjectId(workspaceState.team?.slug, project?.id || '');

  if (project?.state) {
    await syncUiAfterStateApply(project.state);
  }

  workspaceState.templates = [];
  if (project?.id) {
    try {
      const response = await listWorkspaceSnapshots({ projectId: project.id, kind: 'template' });
      workspaceState.templates = Array.isArray(response?.snapshots) ? response.snapshots : [];
    } catch (error) {
      console.warn('Не удалось загрузить шаблоны проекта:', error);
    }
  }

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

const createProjectInteractively = async () => {
  const name = window.prompt('Название проекта');
  if (!name) return null;
  const description = window.prompt('Описание проекта', '') || '';
  const state = getCurrentStateSnapshot();
  const response = await createWorkspaceProject({ name, description, state });
  const project = response?.project || null;
  if (!project) return null;
  await refreshWorkspaceProjects();
  await applyProjectSelection(project);
  return project;
};

const saveCurrentProject = async () => {
  if (!workspaceState.user) {
    openAuthScreen('login');
    return;
  }

  let project = workspaceState.currentProject;
  if (!project) {
    project = await createProjectInteractively();
    if (!project) return;
  }

  const snapshot = getCurrentStateSnapshot();
  const response = await updateWorkspaceProject({
    projectId: project.id,
    name: project.name,
    description: project.description || '',
    state: snapshot
  });

  if (response?.project) {
    workspaceState.currentProject = response.project;
    await refreshWorkspaceProjects();
    renderWorkspaceSummary();
    alert(`Проект "${response.project.name}" сохранен`);
  }
};

const saveTemplateInteractively = async () => {
  if (!workspaceState.currentProject) {
    alert('Сначала откройте или создайте проект.');
    return;
  }

  const name = window.prompt('Название шаблона');
  if (!name) return;

  const snapshot = getCurrentStateSnapshot();
  const response = await saveWorkspaceSnapshot({
    projectId: workspaceState.currentProject.id,
    name,
    kind: 'template',
    state: snapshot
  });

  if (response?.snapshot) {
    workspaceState.templates = [response.snapshot, ...workspaceState.templates];
    alert(`Шаблон "${response.snapshot.name}" сохранен`);
  }
};

const renderProjectsModal = () => {
  const projectsHtml = workspaceState.projects.length
    ? workspaceState.projects.map((project) => `
      <div class="workspace-list-item ${workspaceState.currentProject?.id === project.id ? 'is-active' : ''}" data-workspace-project-id="${escapeHtml(project.id)}">
        <div class="workspace-list-main">
          <div class="workspace-list-title">${escapeHtml(project.name)}</div>
          <div class="workspace-list-meta">${escapeHtml(project.description || 'Без описания')}</div>
        </div>
        <div class="workspace-list-actions">
          <button class="btn btn-small" data-workspace-action="open-project" data-project-id="${escapeHtml(project.id)}">Открыть</button>
          <button class="btn btn-small btn-danger" data-workspace-action="archive-project" data-project-id="${escapeHtml(project.id)}">Архив</button>
        </div>
      </div>
    `).join('')
    : '<div class="workspace-empty">У команды пока нет проектов.</div>';

  const templatesHtml = workspaceState.currentProject && workspaceState.templates.length
    ? workspaceState.templates.map((template) => `
      <div class="workspace-list-item" data-workspace-template-id="${escapeHtml(template.id)}">
        <div class="workspace-list-main">
          <div class="workspace-list-title">${escapeHtml(template.name)}</div>
          <div class="workspace-list-meta">${new Date(template.createdAt).toLocaleString('ru-RU')}</div>
        </div>
        <div class="workspace-list-actions">
          <button class="btn btn-small" data-workspace-action="apply-template" data-template-id="${escapeHtml(template.id)}">Применить</button>
        </div>
      </div>
    `).join('')
    : '<div class="workspace-empty">Для текущего проекта шаблонов пока нет.</div>';

  return `
    <div class="workspace-modal-stack">
      <div class="workspace-toolbar">
        <button class="btn" data-workspace-action="create-project">Создать проект</button>
        <button class="btn" data-workspace-action="rename-project" ${workspaceState.currentProject ? '' : 'disabled'}>Переименовать текущий</button>
        <button class="btn" data-workspace-action="save-project">Сохранить текущий</button>
        <button class="btn" data-workspace-action="save-template" ${workspaceState.currentProject ? '' : 'disabled'}>Сохранить как шаблон</button>
      </div>
      <div class="workspace-section">
        <div class="workspace-section-title">Проекты</div>
        <div class="workspace-list">${projectsHtml}</div>
      </div>
      <div class="workspace-section">
        <div class="workspace-section-title">Шаблоны текущего проекта</div>
        <div class="workspace-list">${templatesHtml}</div>
      </div>
    </div>
  `;
};

const openProjectsModal = async () => {
  await refreshWorkspaceProjects();
  if (workspaceState.currentProject?.id) {
    try {
      const response = await listWorkspaceSnapshots({ projectId: workspaceState.currentProject.id, kind: 'template' });
      workspaceState.templates = Array.isArray(response?.snapshots) ? response.snapshots : [];
    } catch (error) {
      console.warn('Не удалось загрузить шаблоны для модального окна:', error);
    }
  }

  openModal('Проекты команды', renderProjectsModal(), 'projects');
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

const renderSettingsModal = () => {
  const teams = getSelectableTeams();
  const selectedTeamSlug = resolveSelectedTeamSlug();
  const currentTeamSlug = workspaceState.team?.slug || '';
  const accountTitle = workspaceState.user?.displayName || workspaceState.user?.email || 'Аккаунт';
  const accountMeta = [workspaceState.user?.email || '', workspaceState.team?.name || '', formatWorkspaceRoleLabel()]
    .filter(Boolean)
    .join(' · ');
  const teamDefaultsNote = canManageWorkspaceTeamDefaults() && !isWorkspaceSuperadmin()
    ? '<div class="workspace-note">Роль lead может менять defaults и режимы макетов только внутри своей команды: логотип, визуалы, тексты, legal, ограничения, фоны, шрифты, быстрые палитры и наборы режимов вроде KZ/PRO/Reskill.</div>'
    : '';

  const teamsHtml = teams.length
    ? teams.map((team) => {
      const isCurrent = team.slug === currentTeamSlug;
      const isPreferred = team.slug === selectedTeamSlug;
      return `
        <button
          type="button"
          class="workspace-team-card ${isPreferred ? 'is-active' : ''}"
          data-workspace-action="select-settings-team"
          data-team-slug="${escapeHtml(team.slug)}"
        >
          <span class="workspace-team-card-title">${escapeHtml(team.name)}</span>
          <span class="workspace-team-card-meta">${escapeHtml(team.slug)}${isCurrent ? ' · активна сейчас' : ''}</span>
        </button>
      `;
    }).join('')
    : '<div class="workspace-empty">Команды пока не загрузились. Текущая сессия продолжит работать без переключения.</div>';

  const reloginHint = selectedTeamSlug && currentTeamSlug && selectedTeamSlug !== currentTeamSlug
    ? '<div class="workspace-note">Новая команда сохранена в браузере. Чтобы применить ее сразу, выйдите и войдите заново.</div>'
    : '<div class="workspace-note">Выбранную команду сохраняем в браузере и используем как команду по умолчанию при следующем входе.</div>';

  const adminEnabled = isWorkspaceSuperadmin();
  const adminTeamId = resolveAdminTeamId();
  const adminSelectedTeam = workspaceState.adminTeams.find((team) => team.id === adminTeamId) || null;
  const adminTeamsHtml = adminEnabled
    ? (workspaceState.adminTeams.length
      ? workspaceState.adminTeams.map((team) => `
        <div class="workspace-list-item ${team.id === adminTeamId ? 'is-active' : ''}">
          <div class="workspace-list-main">
            <div class="workspace-list-title">${escapeHtml(team.name)}</div>
            <div class="workspace-list-meta">${escapeHtml(team.slug)} · ${escapeHtml(team.status === 'archived' ? 'archived' : 'active')}</div>
          </div>
          <div class="workspace-list-actions">
            <button class="btn btn-small" data-workspace-action="select-admin-team" data-team-id="${escapeHtml(team.id)}">${team.id === adminTeamId ? 'Выбрана' : 'Открыть'}</button>
            <button class="btn btn-small" data-workspace-action="rename-admin-team" data-team-id="${escapeHtml(team.id)}">Переименовать</button>
            ${team.id !== workspaceState.team?.id
              ? `<button class="btn btn-small btn-danger" data-workspace-action="archive-admin-team" data-team-id="${escapeHtml(team.id)}">Архив</button>`
              : ''}
          </div>
        </div>
      `).join('')
      : '<div class="workspace-empty">Команд пока нет. Создайте первую вручную ниже.</div>')
    : '';

  const adminUsersHtml = adminEnabled
    ? (workspaceState.adminUsers.length
      ? workspaceState.adminUsers.map((user) => `
        <div class="workspace-list-item">
          <div class="workspace-list-main">
            <div class="workspace-list-title">${escapeHtml(user.displayName || user.email)}</div>
            <div class="workspace-list-meta">${escapeHtml(user.email)} · ${escapeHtml(user.role)} · ${escapeHtml(user.status)}</div>
          </div>
          <div class="workspace-list-actions">
            ${!user.isSuperadmin && (user.role === 'editor' || user.role === 'lead')
              ? `<button class="btn btn-small" data-workspace-action="set-admin-user-role" data-user-id="${escapeHtml(user.id)}" data-role="${user.role === 'lead' ? 'editor' : 'lead'}">${user.role === 'lead' ? 'Сделать editor' : 'Сделать lead'}</button>`
              : ''}
            <button class="btn btn-small" data-workspace-action="reset-admin-user-password" data-user-id="${escapeHtml(user.id)}">Новый пароль</button>
            ${!user.isSuperadmin
              ? `<button class="btn btn-small btn-danger" data-workspace-action="remove-admin-user" data-user-id="${escapeHtml(user.id)}">Удалить</button>`
              : ''}
          </div>
        </div>
      `).join('')
      : `<div class="workspace-empty">${adminSelectedTeam ? 'В этой команде пока нет пользователей.' : 'Выберите команду, чтобы увидеть пользователей.'}</div>`)
    : '';

  const adminSecretHtml = workspaceState.adminSecret
    ? `
      <div class="workspace-secret-card">
        <div class="workspace-section-title">Сгенерированный пароль</div>
        <div class="workspace-secret-line">${escapeHtml(workspaceState.adminSecret.email)}</div>
        <code class="workspace-secret-value">${escapeHtml(workspaceState.adminSecret.password)}</code>
      </div>
    `
    : '';

  const adminFeedbackHtml = workspaceState.adminError
    ? `<div class="workspace-auth-error">${escapeHtml(workspaceState.adminError)}</div>`
    : (workspaceState.adminNotice ? `<div class="workspace-note">${escapeHtml(workspaceState.adminNotice)}</div>` : '');

  const adminSectionHtml = adminEnabled
    ? `
      <div class="workspace-section">
        <div class="workspace-section-title">Superadmin</div>
        <div class="workspace-note">Только вы можете создавать и архивировать команды, вручную создавать пользователей, сбрасывать им пароли, удалять их из команды и выдавать роль lead.</div>
        ${adminFeedbackHtml}
        ${adminSecretHtml}
      </div>
      <div class="workspace-section">
        <div class="workspace-section-title">Команды workspace</div>
        <div class="workspace-list">${adminTeamsHtml}</div>
        <form id="workspaceAdminCreateTeamForm" class="workspace-auth-form">
          <label class="workspace-field">
            <span>Новая команда</span>
            <input name="name" type="text" placeholder="Например, Яндекс Практикум" required>
          </label>
          <label class="workspace-field">
            <span>Slug</span>
            <input name="slug" type="text" placeholder="yandex-practicum">
          </label>
          <button class="btn primary" type="submit">Создать команду</button>
        </form>
      </div>
      <div class="workspace-section">
        <div class="workspace-section-title">Пользователи ${adminSelectedTeam ? `· ${escapeHtml(adminSelectedTeam.name)}` : ''}</div>
        <div class="workspace-list">${adminUsersHtml}</div>
        <form id="workspaceAdminCreateUserForm" class="workspace-auth-form" ${adminTeamId ? '' : 'style="display:none;"'}>
          <label class="workspace-field">
            <span>Email пользователя</span>
            <input name="email" type="email" placeholder="user@example.com" required>
          </label>
          <label class="workspace-field">
            <span>Имя</span>
            <input name="displayName" type="text" placeholder="Опционально">
          </label>
          <label class="workspace-field">
            <span>Роль</span>
            <select name="role">
              <option value="editor">editor</option>
              <option value="lead">lead</option>
            </select>
          </label>
          <button class="btn primary" type="submit">Создать пользователя и сгенерировать пароль</button>
        </form>
      </div>
    `
    : '';

  return `
    <div class="workspace-modal-stack">
      <div class="workspace-account-card">
        <div class="workspace-account-eyebrow">Аккаунт</div>
        <div class="workspace-account-title">${escapeHtml(accountTitle)}</div>
        <div class="workspace-account-meta">${escapeHtml(accountMeta || 'Авторизованный пользователь')}</div>
      </div>
      <div class="workspace-section">
        <div class="workspace-section-title">Команда</div>
        <div class="workspace-team-grid">${teamsHtml}</div>
      </div>
      ${reloginHint}
      ${teamDefaultsNote}
      ${adminSectionHtml}
      <div class="workspace-toolbar">
        <button class="btn" data-workspace-action="close-settings">Готово</button>
        ${selectedTeamSlug && currentTeamSlug && selectedTeamSlug !== currentTeamSlug
          ? '<button class="btn" data-workspace-action="logout-and-switch-team">Выйти и сменить</button>'
          : ''}
        <button class="btn btn-danger" data-workspace-action="logout">Выйти</button>
      </div>
    </div>
  `;
};

const openSettingsModal = async () => {
  if (isWorkspaceSuperadmin()) {
    await refreshAdminWorkspaceData();
  }
  openModal('Настройки workspace', renderSettingsModal(), 'settings');
};

const renderAuthOverlay = () => {
  const els = getEls();
  if (!els.authOverlay) return;

  if (!workspaceState.enabled || !workspaceState.authScreenVisible) {
    els.authOverlay.style.display = 'none';
    return;
  }

  const selectedTeamSlug = resolveSelectedTeamSlug();
  if (!workspaceState.preferredTeamSlug && selectedTeamSlug) {
    updateSelectedTeamSlug(selectedTeamSlug);
  }

  if (!workspaceState.ready) {
    els.authOverlay.innerHTML = `
      <div class="workspace-auth-shell workspace-auth-shell-loading">
        <div class="workspace-auth-card">
          <div class="workspace-auth-title">Подключаем workspace</div>
          <div class="workspace-auth-subtitle">Проверяем API и загружаем доступные команды.</div>
        </div>
      </div>
    `;
    els.authOverlay.style.display = 'flex';
    return;
  }

  const teams = getSelectableTeams();
  const isRegister = workspaceState.authMode === 'register';
  const title = isRegister ? 'Создать аккаунт' : 'Войти в AI-Craft';
  const subtitle = isRegister
    ? 'Создаем доступ в workspace и сразу открываем рабочее пространство.'
    : 'Войдите в workspace, чтобы открыть проекты, шаблоны и командные defaults.';
  const buttonLabel = workspaceState.authLoading
    ? (isRegister ? 'Создаем аккаунт...' : 'Входим...')
    : (isRegister ? 'Создать аккаунт' : 'Войти');
  const teamCardsHtml = teams.length
    ? teams.map((team) => `
      <button
        type="button"
        class="workspace-team-card ${team.slug === selectedTeamSlug ? 'is-active' : ''}"
        data-workspace-action="select-auth-team"
        data-team-slug="${escapeHtml(team.slug)}"
      >
        <span class="workspace-team-card-title">${escapeHtml(team.name)}</span>
        <span class="workspace-team-card-meta">${escapeHtml(team.slug)}</span>
      </button>
    `).join('')
    : '';

  const teamFieldHtml = teams.length
    ? `
      <div class="workspace-section">
        <div class="workspace-section-title">Команда</div>
        <div class="workspace-team-grid">${teamCardsHtml}</div>
      </div>
    `
    : `
      <label class="workspace-field">
        <span>Команда</span>
        <input id="workspaceAuthTeamSlugManual" name="teamSlug" type="text" autocomplete="organization" value="${escapeHtml(selectedTeamSlug)}" placeholder="practicum" required>
      </label>
    `;

  const errorHtml = workspaceState.authError
    ? `<div class="workspace-auth-error">${escapeHtml(workspaceState.authError)}</div>`
    : '';

  els.authOverlay.innerHTML = `
    <div class="workspace-auth-shell">
      <div class="workspace-auth-hero">
        <img class="workspace-auth-logo" src="assets/logo.svg" alt="AI-Craft">
        <div class="workspace-auth-hero-title">Командный вход</div>
        <div class="workspace-auth-hero-text">
          Сначала авторизуемся, потом открываем настройки команды и сохраняем выбор в браузере.
        </div>
        <div class="workspace-auth-hero-pills">
          <span class="workspace-auth-pill">Projects</span>
          <span class="workspace-auth-pill">Templates</span>
          <span class="workspace-auth-pill">Team defaults</span>
        </div>
      </div>
      <div class="workspace-auth-card">
        <div class="workspace-auth-tabs">
          <button type="button" class="workspace-auth-tab ${workspaceState.authMode === 'login' ? 'is-active' : ''}" data-workspace-auth-mode="login">Войти</button>
          <button type="button" class="workspace-auth-tab ${workspaceState.authMode === 'register' ? 'is-active' : ''}" data-workspace-auth-mode="register">Создать аккаунт</button>
        </div>
        <div class="workspace-auth-title">${title}</div>
        <div class="workspace-auth-subtitle">${subtitle}</div>
        <form id="workspaceAuthForm" class="workspace-auth-form" data-auth-mode="${escapeHtml(workspaceState.authMode)}">
          ${teamFieldHtml}
          ${isRegister ? `
            <label class="workspace-field">
              <span>Имя</span>
              <input id="workspaceRegisterName" name="displayName" type="text" autocomplete="name" placeholder="Ваше имя" required>
            </label>
          ` : ''}
          <label class="workspace-field">
            <span>Email</span>
            <input id="workspaceAuthEmail" name="email" type="email" autocomplete="${isRegister ? 'email' : 'username'}" placeholder="name@example.com" required>
          </label>
          <label class="workspace-field">
            <span>Пароль</span>
            <input id="workspaceAuthPassword" name="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" placeholder="Минимум 8 символов" required>
          </label>
          ${errorHtml}
          <button class="btn primary workspace-auth-submit" type="submit" ${workspaceState.authLoading ? 'disabled' : ''}>${buttonLabel}</button>
        </form>
        <div class="workspace-auth-footer">
          Сессию и выбранную команду сохраняем в браузере. Вход через Яндекс ID можно добавить отдельным шагом после OAuth-конфига.
        </div>
      </div>
    </div>
  `;

  els.authOverlay.style.display = 'flex';

  if (!workspaceState.authLoading) {
    const focusId = isRegister ? 'workspaceRegisterName' : 'workspaceAuthEmail';
    window.requestAnimationFrame(() => {
      document.getElementById(focusId)?.focus();
    });
  }
};

const resetWorkspaceSessionState = () => {
  workspaceState.user = null;
  workspaceState.team = null;
  workspaceState.teamDefaults = null;
  workspaceState.projects = [];
  workspaceState.templates = [];
  workspaceState.currentProject = null;
  workspaceState.adminTeams = [];
  workspaceState.adminUsers = [];
  workspaceState.adminSelectedTeamId = '';
  workspaceState.adminError = '';
  workspaceState.adminNotice = '';
  workspaceState.adminSecret = null;
};

const performLogout = async ({ reopenAuth = true } = {}) => {
  try {
    await logoutWorkspace();
  } finally {
    setWorkspaceSessionHint(false);
    resetWorkspaceSessionState();
    renderWorkspaceSummary();
    if (reopenAuth) {
      openAuthScreen('login');
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
    if (appliedDefaults && Object.keys(appliedDefaults).length > 0) {
      await syncUiAfterStateApply(appliedDefaults);
    }
    renderWorkspaceSummary();
  }

  closeAuthScreen();
};

const renameCurrentProject = async () => {
  if (!workspaceState.currentProject) return;
  const nextName = window.prompt('Новое название проекта', workspaceState.currentProject.name || '');
  if (!nextName) return;
  const response = await updateWorkspaceProject({
    projectId: workspaceState.currentProject.id,
    name: nextName,
    description: workspaceState.currentProject.description || '',
    state: workspaceState.currentProject.state || getCurrentStateSnapshot()
  });
  if (response?.project) {
    workspaceState.currentProject = response.project;
    await refreshWorkspaceProjects();
    renderWorkspaceSummary();
  }
};

const handleProjectsModalAction = async (action, event) => {
  if (action === 'create-project') {
    await createProjectInteractively();
    await openProjectsModal();
    return;
  }
  if (action === 'rename-project') {
    await renameCurrentProject();
    await openProjectsModal();
    return;
  }
  if (action === 'save-project') {
    await saveCurrentProject();
    await openProjectsModal();
    return;
  }
  if (action === 'save-template') {
    await saveTemplateInteractively();
    await openProjectsModal();
    return;
  }
  if (action === 'open-project') {
    const projectId = event.target.closest('[data-project-id]')?.dataset.projectId || '';
    const project = workspaceState.projects.find((item) => item.id === projectId);
    if (!project) return;
    await applyProjectSelection(project);
    closeModal();
    return;
  }
  if (action === 'archive-project') {
    const projectId = event.target.closest('[data-project-id]')?.dataset.projectId || '';
    if (!projectId || !window.confirm('Архивировать проект?')) return;
    await archiveWorkspaceProject({ projectId });
    if (workspaceState.currentProject?.id === projectId) {
      workspaceState.currentProject = null;
      setPersistedProjectId(workspaceState.team?.slug, '');
    }
    await refreshWorkspaceProjects();
    await openProjectsModal();
    return;
  }
  if (action === 'apply-template') {
    const templateId = event.target.closest('[data-template-id]')?.dataset.templateId || '';
    const template = workspaceState.templates.find((item) => item.id === templateId);
    if (!template) return;
    await syncUiAfterStateApply(template.state);
    closeModal();
  }
};

const handleAdminCreateTeamForm = async (form) => {
  const formData = new FormData(form);
  const name = String(formData.get('name') || '').trim();
  const slug = String(formData.get('slug') || '').trim();

  workspaceState.adminError = '';
  workspaceState.adminNotice = '';
  workspaceState.adminSecret = null;

  const response = await createAdminWorkspaceTeam({ name, slug });
  workspaceState.adminSelectedTeamId = response?.team?.id || workspaceState.adminSelectedTeamId;
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
  await refreshAdminWorkspaceData();
  workspaceState.adminSecret = response?.generatedPassword
    ? { email, password: response.generatedPassword }
    : null;
  workspaceState.adminNotice = `Пользователь ${email} создан с ролью ${response?.user?.role || role}.`;
  await openSettingsModal();
};

const handleSettingsModalAction = async (action, event) => {
  if (action === 'select-settings-team') {
    const teamSlug = event.target.closest('[data-team-slug]')?.dataset.teamSlug || '';
    updateSelectedTeamSlug(teamSlug);
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

    const nextName = window.prompt('Новое название команды', team.name || '');
    if (!nextName) return;
    const nextSlug = window.prompt('Новый slug команды', team.slug || '') || '';

    workspaceState.adminError = '';
    workspaceState.adminNotice = '';
    workspaceState.adminSecret = null;

    await updateAdminWorkspaceTeam({
      teamId,
      name: nextName,
      slug: nextSlug || team.slug
    });
    workspaceState.adminSelectedTeamId = teamId;
    await refreshAdminWorkspaceData();
    workspaceState.adminNotice = `Команда "${nextName}" обновлена.`;
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
    await refreshAdminWorkspaceData();
    workspaceState.adminSecret = response?.generatedPassword
      ? { email: user.email, password: response.generatedPassword }
      : null;
    workspaceState.adminNotice = `Пароль для ${user.email} обновлен.`;
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
  const fallbackTeamSlug = typeof formData.get('teamSlug') === 'string'
    ? formData.get('teamSlug')
    : '';
  const teamSlug = (resolveSelectedTeamSlug() || String(fallbackTeamSlug || '')).trim().toLowerCase();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const displayName = String(formData.get('displayName') || '').trim();

  if (!teamSlug) {
    workspaceState.authError = 'Выберите команду перед входом.';
    renderAuthOverlay();
    return;
  }

  workspaceState.authLoading = true;
  workspaceState.authError = '';
  renderAuthOverlay();

  try {
    if (workspaceState.authMode === 'register') {
      await registerWorkspace({ displayName, email, password, teamSlug });
    } else {
      await loginWorkspace({ email, password, teamSlug });
    }

    updateSelectedTeamSlug(teamSlug);
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
      openAuthScreen('login');
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
      alert(error.message || 'Не удалось сохранить проект');
    }
  });

  els.templateBtn.addEventListener('click', async () => {
    try {
      await saveTemplateInteractively();
    } catch (error) {
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

  els.modal.addEventListener('submit', async (event) => {
    if (event.target.id !== 'workspaceAdminCreateTeamForm' && event.target.id !== 'workspaceAdminCreateUserForm') {
      return;
    }

    event.preventDefault();

    try {
      if (event.target.id === 'workspaceAdminCreateTeamForm') {
        await handleAdminCreateTeamForm(event.target);
      }
      if (event.target.id === 'workspaceAdminCreateUserForm') {
        await handleAdminCreateUserForm(event.target);
      }
    } catch (error) {
      workspaceState.adminError = error.message || 'Не удалось выполнить admin-операцию';
      workspaceState.adminNotice = '';
      workspaceState.adminSecret = null;
      await openSettingsModal();
    }
  });

  els.authOverlay.addEventListener('click', (event) => {
    const mode = event.target.closest('[data-workspace-auth-mode]')?.dataset.workspaceAuthMode;
    if (mode && mode !== workspaceState.authMode) {
      workspaceState.authMode = mode;
      workspaceState.authError = '';
      renderAuthOverlay();
      return;
    }

    const action = event.target.closest('[data-workspace-action]')?.dataset.workspaceAction;
    if (action === 'select-auth-team') {
      const teamSlug = event.target.closest('[data-team-slug]')?.dataset.teamSlug || '';
      updateSelectedTeamSlug(teamSlug);
      renderAuthOverlay();
    }
  });

  els.authOverlay.addEventListener('change', (event) => {
    if (event.target.id === 'workspaceAuthTeamSlugManual') {
      updateSelectedTeamSlug(event.target.value || '');
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
    <button id="workspaceProjectsBtn" class="btn">Проекты</button>
    <button id="workspaceSaveBtn" class="btn">Сохранить</button>
    <button id="workspaceTemplateBtn" class="btn">Шаблон</button>
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

  await loadPublicTeams();

  if (!hasWorkspaceSessionHint()) {
    renderWorkspaceSummary();
    openAuthScreen('login');
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
    openAuthScreen('login');
  }

  renderWorkspaceSummary();
  renderAuthOverlay();
};
