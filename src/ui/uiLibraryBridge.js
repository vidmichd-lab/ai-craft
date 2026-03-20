const TEXT_INPUT_TYPES = new Set(['text', 'number', 'email', 'password', 'search', 'url', 'tel']);

const toArray = (value) => Array.from(value || []);

const decorateButtons = (root) => {
  toArray(root.querySelectorAll('button')).forEach((button) => {
    if (!button.classList.contains('ui-button')) {
      button.classList.add('ui-button');
    }
    if (button.classList.contains('btn-small')) {
      button.classList.add('ui-button-sm');
    }
    if (button.classList.contains('btn-full')) {
      button.classList.add('ui-button-full');
    }
    if (button.classList.contains('btn-primary') || button.classList.contains('primary')) {
      button.classList.add('ui-button-inverted');
    }
    if (button.classList.contains('btn-danger')) {
      button.classList.add('ui-button-danger');
    }
  });
};

const decorateTabsAndNav = (root) => {
  toArray(root.querySelectorAll('.tab')).forEach((item) => {
    item.classList.add('ui-navigation-button', 'ui-navigation-row');
  });

  toArray(root.querySelectorAll('.toggle-switch-track')).forEach((track) => {
    track.classList.add('ui-tabs');
  });

  toArray(root.querySelectorAll('.toggle-switch-option')).forEach((option) => {
    option.classList.add('ui-tab');
    option.classList.toggle('is-active', option.classList.contains('active'));
  });
};

const decorateTextControls = (root) => {
  toArray(root.querySelectorAll('textarea')).forEach((textarea) => {
    textarea.classList.add('ui-textarea');
  });

  toArray(root.querySelectorAll('select')).forEach((select) => {
    select.classList.add('ui-select');
  });

  toArray(root.querySelectorAll('input')).forEach((input) => {
    const type = String(input.type || 'text').toLowerCase();

    if (TEXT_INPUT_TYPES.has(type)) {
      input.classList.add('ui-input');
      return;
    }

    if (type === 'range') {
      input.classList.add('ui-slider');
      return;
    }

    if (type === 'checkbox' || type === 'radio') {
      input.classList.add('ui-choice-native');
      return;
    }

    if (type === 'color') {
      input.classList.add('ui-color-input');
    }
  });
};

const decorateCustomSelectors = (root) => {
  toArray(root.querySelectorAll('.custom-select-button, .select-btn')).forEach((button) => {
    button.classList.add('ui-button', 'ui-button-neutral', 'ui-legacy-select-trigger');
  });
};

const decorateDepartmentTags = (root) => {
  toArray(root.querySelectorAll('.workspace-layout-department-tag')).forEach((button) => {
    button.classList.add('ui-tag-toggle');
    const selected = button.classList.contains('is-active') || button.classList.contains('active');
    button.classList.toggle('is-selected', selected);
  });
};

export const applyUiLibraryContract = (root = document) => {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  decorateButtons(root);
  decorateTabsAndNav(root);
  decorateTextControls(root);
  decorateCustomSelectors(root);
  decorateDepartmentTags(root);
};

export const watchUiLibraryContract = (root = document.body) => {
  if (!root || typeof MutationObserver === 'undefined') return null;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        applyUiLibraryContract(node);
      });
    });
  });

  observer.observe(root, { childList: true, subtree: true });
  return observer;
};
