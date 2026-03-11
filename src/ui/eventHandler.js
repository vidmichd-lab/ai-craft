/**
 * Централизованная система обработки событий через делегирование
 * Заменяет инлайн обработчики в HTML
 */

// Маппинг data-атрибутов на функции
const eventHandlers = new Map();

/**
 * Регистрирует обработчик события
 */
export const registerHandler = (selector, handler) => {
  eventHandlers.set(selector, handler);
};

/**
 * Показывает overlay с drag-and-drop зоной вместо прямого вызова file input.
 * @param {HTMLInputElement} fileInput - элемент <input type="file">
 */
function showUploadDropzone(fileInput) {
  const accept = fileInput.getAttribute('accept') || '*/*';
  const formats = accept.replace(/image\//g, '').replace(/,/g, ', ').toUpperCase();

  const overlay = document.createElement('div');
  overlay.className = 'upload-overlay';
  overlay.innerHTML = `
    <div class="upload-dropzone" id="upload-dropzone-inner">
      <div class="upload-icon">upload_file</div>
      <div class="upload-text">Перетащите файл или нажмите для выбора</div>
      <div class="upload-formats">${formats}</div>
    </div>
  `;
  document.body.appendChild(overlay);

  const zone = overlay.querySelector('#upload-dropzone-inner');

  const close = () => overlay.remove();

  // Click on dropzone → trigger native file dialog
  zone.addEventListener('click', () => fileInput.click());

  // Click on overlay background → close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Prevent browser from opening file when dropped on overlay background
  overlay.addEventListener('dragover', (e) => e.preventDefault());
  overlay.addEventListener('drop', (e) => e.preventDefault());

  // Escape key → close
  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);

  // Drag events
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const dt = new DataTransfer();
      dt.items.add(files[0]);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    }
  });

  const onFileChange = () => { close(); fileInput.removeEventListener('change', onFileChange); };
  fileInput.addEventListener('change', onFileChange);
}

/**
 * Инициализирует делегирование событий
 * Вызывается после загрузки всех модулей
 */
export const initEventDelegation = () => {
  console.log('[EventHandler] Инициализация системы делегирования событий...');
  
  // Обработка кликов с data-action
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const handler = eventHandlers.get(`[data-action="${action}"]`);
    
    if (handler) {
      e.preventDefault();
      handler(e, target);
      return;
    }

    // Специальные обработчики для часто используемых действий
    if (action === 'trigger-file-input') {
      const inputId = target.dataset.inputId;
      if (inputId) {
        const input = document.getElementById(inputId);
        if (input) showUploadDropzone(input);
      }
    }
  });

  // Флаг для отслеживания обработки чекбоксов, чтобы избежать двойной обработки
  const checkboxProcessing = new WeakSet();
  
  // Обработка кликов на чекбоксы и их label (резервный механизм)
  document.addEventListener('click', (e) => {
    try {
      let checkbox = null;
      
      // Если кликнули на сам чекбокс
      if (e.target.type === 'checkbox' && e.target.hasAttribute('data-state-key')) {
        checkbox = e.target;
      }
      // Если кликнули на label, связанный с чекбоксом
      else if (e.target.tagName === 'LABEL' && e.target.hasAttribute('for')) {
        const checkboxId = e.target.getAttribute('for');
        checkbox = document.getElementById(checkboxId);
      }
      
      if (checkbox && checkbox.type === 'checkbox' && checkbox.hasAttribute('data-state-key')) {
        // Помечаем чекбокс как обрабатываемый
        checkboxProcessing.add(checkbox);
        
        // Используем setTimeout, чтобы дать браузеру обновить checked состояние
        // Это гарантирует, что состояние обновится даже если событие change не сработает
        setTimeout(() => {
          const key = checkbox.getAttribute('data-state-key');
          const value = checkbox.checked;
          
          if (key) {
            if (typeof window.updateState === 'function') {
              try {
                window.updateState(key, value);
              } catch (error) {
                console.error('Ошибка при обновлении состояния чекбокса:', error);
                console.error('Ключ:', key, 'Значение:', value);
              }
            } else {
              console.warn('updateState не доступна для чекбокса:', key);
            }
          }
          
          // Убираем флаг через небольшую задержку
          setTimeout(() => {
            checkboxProcessing.delete(checkbox);
          }, 100);
        }, 10);
      }
    } catch (error) {
      // Игнорируем ошибки в этом обработчике
    }
  });

  // Обработка изменений input/select/textarea с data-state-key
  // Используем один обработчик для избежания дублирования
  document.addEventListener('change', (e) => {
    try {
      const target = e.target;
      // Пропускаем события от элементов без data-state-key (например, чекбоксы размеров с onchange)
      if (!target || !target.hasAttribute('data-state-key')) return;

      const key = target.getAttribute('data-state-key');
      if (!key) return;

      // Проверяем наличие специального обработчика ПЕРЕД стандартным
      const updateHandler = target.getAttribute('data-update-handler');
      if (updateHandler && typeof window[updateHandler] === 'function') {
        const handlerParam = target.getAttribute('data-handler-param') || key;
        let value;
        
        if (target.type === 'checkbox') {
          value = target.checked;
        } else if (target.type === 'number') {
          value = parseFloat(target.value);
          if (isNaN(value)) {
            console.warn('Некорректное числовое значение для', updateHandler, ':', target.value);
            return;
          }
        } else if (target.type === 'color') {
          value = target.value;
        } else {
          value = target.value;
        }
        
        try {
          // Функции для цветов принимают два параметра (key, value)
          // Функции для слайдеров принимают один параметр (value)
          if (handlerParam && (updateHandler.includes('Color') || updateHandler.includes('Hex'))) {
            window[updateHandler](handlerParam, value);
          } else {
            // Большинство обработчиков принимают только значение
            window[updateHandler](value);
          }
        } catch (error) {
          console.error('Ошибка в обработчике обновления:', error);
          console.error('Обработчик:', updateHandler, 'Параметр:', handlerParam, 'Значение:', value);
          console.error('Стек ошибки:', error.stack);
        }
        return; // Не продолжаем, если есть специальный обработчик
      }

      // Стандартная обработка для элементов без специального обработчика
      // Для чекбоксов проверяем, не обрабатывается ли он уже через click
      if (target.type === 'checkbox' && checkboxProcessing.has(target)) {
        // Пропускаем обработку, так как она уже выполняется через click
        return;
      }
      
      let value;
      if (target.type === 'checkbox') {
        value = target.checked;
      } else if (target.type === 'number') {
        const numValue = parseFloat(target.value);
        value = isNaN(numValue) ? 0 : numValue;
      } else {
        value = target.value;
      }

      // Вызываем updateState если доступен
      if (typeof window.updateState === 'function') {
        try {
          window.updateState(key, value);
        } catch (error) {
          console.error('Ошибка при обновлении состояния через updateState:', error);
          console.error('Ключ:', key, 'Значение:', value, 'Тип:', typeof value);
          console.error('Стек ошибки:', error.stack);
        }
      } else {
        console.warn('updateState не доступен для ключа:', key);
      }
    } catch (error) {
      console.error('Ошибка в обработчике change:', error);
    }
  });

  // Обработка input событий (для range, text и т.д.)
  document.addEventListener('input', (e) => {
    try {
      const target = e.target;
      if (!target || !target.hasAttribute('data-state-key')) return;

      const key = target.getAttribute('data-state-key');
      if (!key) return;

      // Проверяем наличие специального обработчика ПЕРЕД стандартным
      const updateHandler = target.getAttribute('data-update-handler');
      if (updateHandler && typeof window[updateHandler] === 'function') {
        let value;

        if (target.type === 'range') {
          value = parseFloat(target.value);
        } else if (target.type === 'number') {
          value = parseFloat(target.value);
        } else {
          value = target.value;
        }
        
        // Проверяем, что значение валидное
        if (target.type === 'range' || target.type === 'number') {
          if (isNaN(value)) {
            console.warn('Некорректное числовое значение для', updateHandler, ':', target.value);
            return;
          }
        }
        
        try {
          // Функции обновления принимают только значение, не ключ
          window[updateHandler](value);
          
          // Для range input обновляем отображаемое значение, если есть соответствующий span
          if (target.type === 'range') {
            const valueSpanId = target.id + 'Value';
            const valueSpan = document.getElementById(valueSpanId);
            if (valueSpan) {
              // Форматируем значение в зависимости от типа
              if (updateHandler.includes('Opacity') || updateHandler.includes('Percent')) {
                valueSpan.textContent = `${Math.round(value)}%`;
              } else if (updateHandler.includes('Size') && updateHandler.includes('Image')) {
                valueSpan.textContent = `${Math.round(value)}%`;
              } else {
                valueSpan.textContent = Math.round(value);
              }
            }
          }
        } catch (error) {
          console.error('Ошибка в обработчике обновления:', error);
          console.error('Обработчик:', updateHandler, 'Значение:', value);
          console.error('Стек ошибки:', error.stack);
        }
        return; // Не продолжаем, если есть специальный обработчик
      }

      // Стандартная обработка
      let value;
      if (target.type === 'range') {
        value = parseFloat(target.value) || 0;
      } else if (target.type === 'number') {
        value = parseFloat(target.value) || 0;
      } else {
        value = target.value;
      }

      if (typeof window.updateState === 'function') {
        window.updateState(key, value);
      }
    } catch (error) {
      console.error('Ошибка в обработчике input:', error);
    }
  });

  // Обработка кликов на табы
  document.addEventListener('click', (e) => {
    try {
      const tab = e.target.closest('[data-section]');
      if (!tab) return;

      const section = tab.getAttribute('data-section');
      if (section && typeof window.showSection === 'function') {
        e.preventDefault();
        e.stopPropagation();
        try {
          window.showSection(section);
        } catch (error) {
          console.error('Ошибка при переключении секции:', section, error);
        }
      }
    } catch (error) {
      console.error('Ошибка в обработчике табов:', error);
    }
  });
  
  // Обработка кликов на toggle-switch (опции и сам элемент)
  document.addEventListener('click', (e) => {
    try {
      // Сначала проверяем, кликнули ли на опцию
      const option = e.target.closest('.toggle-switch-option');
      let value, toggle;
      
      if (option) {
        toggle = option.closest('.toggle-switch');
        value = option.dataset.value;
      } else {
        // Если кликнули на сам toggle-switch, переключаем на следующую опцию
        toggle = e.target.closest('.toggle-switch');
        if (!toggle) return;
        
        // Находим текущую активную опцию
        const activeOption = toggle.querySelector('.toggle-switch-option.active');
        if (!activeOption) return;
        
        // Находим следующую опцию
        const allOptions = Array.from(toggle.querySelectorAll('.toggle-switch-option'));
        const currentIndex = allOptions.indexOf(activeOption);
        const nextIndex = (currentIndex + 1) % allOptions.length;
        const nextOption = allOptions[nextIndex];
        
        if (!nextOption) return;
        value = nextOption.dataset.value;
      }
      
      if (!toggle || !value) return;
      
      const toggleId = toggle.id;
      if (!toggleId) return;
      
      // Определяем функцию для вызова на основе ID toggle
      const toggleHandlers = {
        'logoLangToggle': () => {
          if (typeof window.selectLogoLanguage === 'function') {
            window.selectLogoLanguage(value);
          }
        },
        'logoPosToggle': () => {
          if (typeof window.selectLogoPos === 'function') {
            window.selectLogoPos(value);
          }
        },
        'titleAlignToggle': () => {
          if (typeof window.selectTitleAlign === 'function') {
            window.selectTitleAlign(value);
          }
        },
        'titleVPosToggle': () => {
          if (typeof window.selectTitleVPos === 'function') {
            window.selectTitleVPos(value);
          }
        },
        'exportScaleToggle': () => {
          if (typeof window.updateState === 'function') {
            const scale = Math.min(2, Math.max(1, parseInt(value, 10) || 1));
            window.updateState('exportScale', scale);
          }
        },
        'titleTransformToggle': () => {
          if (typeof window.selectTitleTransform === 'function') {
            window.selectTitleTransform(value);
          }
        },
        'titleTransformToggleMain': () => {
          if (typeof window.selectTitleTransform === 'function') {
            window.selectTitleTransform(value);
          }
        },
        'subtitleTransformToggle': () => {
          if (typeof window.selectSubtitleTransform === 'function') {
            window.selectSubtitleTransform(value);
          }
        },
        'subtitleTransformToggleMain': () => {
          if (typeof window.selectSubtitleTransform === 'function') {
            window.selectSubtitleTransform(value);
          }
        },
        'legalTransformToggle': () => {
          if (typeof window.selectLegalTransform === 'function') {
            window.selectLegalTransform(value);
          }
        },
        'kvPositionToggle': () => {
          if (typeof window.selectKVPosition === 'function') {
            window.selectKVPosition(value);
          }
        },
        'bgPositionToggle': () => {
          if (typeof window.selectBgPosition === 'function') {
            window.selectBgPosition(value);
          }
        },
        'bgVPositionToggle': () => {
          if (typeof window.selectBgVPosition === 'function') {
            window.selectBgVPosition(value);
          }
        },
        'bgGradientTypeToggle': () => {
          if (typeof window.updateBgGradientType === 'function') {
            window.updateBgGradientType(value);
          }
        }
      };
      
      const handler = toggleHandlers[toggleId];
      if (handler) {
        e.preventDefault();
        e.stopPropagation();
        try {
          handler();
        } catch (error) {
          console.error('Ошибка в обработчике toggle:', toggleId, error);
          console.error('Значение:', value);
          console.error('Стек ошибки:', error.stack);
        }
      }
    } catch (error) {
      console.error('Ошибка в обработчике toggle-switch:', error);
    }
  });

  // Обработка кликов на чипсы (chips) - теперь без onclick
  document.addEventListener('click', (e) => {
    try {
      const chip = e.target.closest('.chip[data-group]');
      if (!chip) return;

      const group = chip.dataset.group;
      const value = chip.dataset.value;
      
      if (group && value) {
        // Убираем active у всех чипсов в группе
        try {
          document.querySelectorAll(`[data-group="${group}"]`).forEach(c => {
            c.classList.remove('active');
          });
          // Добавляем active выбранному
          chip.classList.add('active');
        } catch (domError) {
          console.error('Ошибка при обновлении классов чипсов:', domError);
        }
        
        // Вызываем обработчик если есть
        const handler = eventHandlers.get(`chip[data-group="${group}"]`);
        if (handler) {
          try {
            handler(value, chip);
          } catch (error) {
            console.error('Ошибка в обработчике чипса:', error);
            console.error('Группа:', group, 'Значение:', value);
            console.error('Стек ошибки:', error.stack);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка в обработчике чипсов:', error);
    }
  });

  // Обработка кликов на кнопки с data-function
  document.addEventListener('click', (e) => {
    try {
      const target = e.target.closest('[data-function]');
      if (!target) return;

      const funcName = target.dataset.function;
      if (!funcName) return;

      // Останавливаем всплытие, если у элемента есть data-action="stop-propagation"
      // Делаем это ПОСЛЕ получения функции, чтобы функция успела выполниться
      if (target.hasAttribute('data-action') && target.getAttribute('data-action') === 'stop-propagation') {
        e.stopPropagation();
      }

      let params = [];
      if (target.dataset.params) {
        try {
          params = JSON.parse(target.dataset.params);
        } catch (parseError) {
          console.error('Ошибка парсинга параметров для функции:', funcName, parseError);
          return;
        }
      }

      if (typeof window[funcName] === 'function') {
        try {
          console.log('Вызываем функцию:', funcName, 'с параметрами:', params);
          const result = window[funcName](...params);
          // Если функция возвращает Promise, обрабатываем ошибки
          if (result && typeof result.then === 'function') {
            result.catch((error) => {
              console.error('Ошибка в асинхронном обработчике data-function:', funcName, error);
              console.error('Параметры:', params);
              console.error('Стек ошибки:', error.stack);
            });
          }
        } catch (error) {
          console.error('Ошибка выполнения функции:', funcName, error);
          console.error('Параметры:', params);
          console.error('Стек ошибки:', error.stack);
        }
      } else {
        console.warn('Функция не найдена:', funcName);
        console.warn('Доступные функции с "Size":', Object.keys(window).filter(k => typeof window[k] === 'function' && k.includes('Size')));
        console.warn('Доступные функции с "Admin":', Object.keys(window).filter(k => typeof window[k] === 'function' && k.includes('Admin')));
        console.warn('Доступные функции с "show":', Object.keys(window).filter(k => typeof window[k] === 'function' && k.includes('show')));
        console.warn('Доступные функции с "Logo":', Object.keys(window).filter(k => typeof window[k] === 'function' && k.includes('Logo')));
        console.warn('Все функции в window:', Object.keys(window).filter(k => typeof window[k] === 'function').sort());
      }
    } catch (error) {
      console.error('Ошибка в обработчике data-function:', error);
    }
  });

  // Обработка file input с data-handler
  document.addEventListener('change', (e) => {
    try {
      const target = e.target;
      if (!target || target.type !== 'file' || !target.hasAttribute('data-handler')) return;

      const handlerName = target.getAttribute('data-handler');
      if (!handlerName) return;

      if (typeof window[handlerName] === 'function') {
        try {
          window[handlerName](e);
        } catch (error) {
          console.error('Ошибка в обработчике файла:', handlerName, error);
          console.error('Стек ошибки:', error.stack);
        }
      } else {
        console.warn('Обработчик файла не найден:', handlerName);
      }
    } catch (error) {
      console.error('Ошибка в обработчике file input:', error);
    }
  });

  // Обработка закрытия модальных окон
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action="close-modal"]');
    if (!target) return;
    
    // Проверяем, не произошел ли клик внутри панели модального окна
    // Если клик внутри панели, не закрываем модальное окно
    const panel = e.target.closest('[data-action="stop-propagation"]');
    if (panel) {
      // Клик произошел внутри панели, не закрываем модальное окно
      return;
    }
    
    // Проверяем, не произошел ли клик на элементе с классом column-item (папки)
    if (e.target.closest('.column-item')) {
      // Клик произошел на папке, не закрываем модальное окно
      return;
    }
    
    const modalId = target.getAttribute('data-modal');
    if (modalId === 'logoSelectModal' && typeof window.closeLogoSelectModal === 'function') {
      window.closeLogoSelectModal();
    } else if (modalId === 'kvSelectModal' && typeof window.closeKVSelectModal === 'function') {
      window.closeKVSelectModal();
    } else if (modalId === 'guideModal' && typeof window.closeGuideModal === 'function') {
      window.closeGuideModal();
    }
  });

  // Обработка stop-propagation (дополнительная защита от всплытия)
  // Этот обработчик срабатывает после data-function, чтобы остановить всплытие к overlay
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action="stop-propagation"]');
    if (target && !target.hasAttribute('data-function')) {
      // Останавливаем всплытие только для элементов без data-function
      // (элементы с data-function уже обработаны выше)
      e.stopPropagation();
    }
  });

  // Обработка update-add-size-button
  document.addEventListener('input', (e) => {
    if (e.target.hasAttribute('data-action') && e.target.getAttribute('data-action') === 'update-add-size-button') {
      if (typeof window.updateAddSizeButtonState === 'function') {
        window.updateAddSizeButtonState();
      }
    }
  });

  // Обработка Escape для закрытия модальных окон
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Проверяем, открыто ли модальное окно гайда
      const guideModal = document.getElementById('guideModalOverlay');
      if (guideModal && guideModal.style.display === 'block') {
        if (typeof window.closeGuideModal === 'function') {
          window.closeGuideModal();
        }
      }
      // Проверяем другие модальные окна
      const logoModal = document.getElementById('logoSelectModalOverlay');
      if (logoModal && logoModal.style.display !== 'none') {
        if (typeof window.closeLogoSelectModal === 'function') {
          window.closeLogoSelectModal();
        }
      }
      const kvModal = document.getElementById('kvSelectModalOverlay');
      if (kvModal && kvModal.style.display !== 'none') {
        if (typeof window.closeKVSelectModal === 'function') {
          window.closeKVSelectModal();
        }
      }
      const bgModal = document.getElementById('bgSelectModalOverlay');
      if (bgModal && bgModal.style.display !== 'none') {
        if (typeof window.closeBGSelectModal === 'function') {
          window.closeBGSelectModal();
        }
      }
    }
  });
  
  console.log('[EventHandler] Система делегирования событий полностью инициализирована');
};

/**
 * Инициализирует обработчики для чекбоксов напрямую
 */
export const initCheckboxHandlers = () => {
  const checkboxIds = ['showLogo', 'showSubtitle', 'hideSubtitleOnWide', 'showLegal', 'showAge', 'showKV'];
  
  checkboxIds.forEach((id) => {
    const checkbox = document.getElementById(id);
    if (checkbox && checkbox.type === 'checkbox') {
      // Удаляем старые обработчики, если они есть
      const newCheckbox = checkbox.cloneNode(true);
      checkbox.parentNode.replaceChild(newCheckbox, checkbox);
      
      // Добавляем обработчик change
      const updatedCheckbox = document.getElementById(id);
      if (updatedCheckbox) {
        updatedCheckbox.addEventListener('change', (e) => {
          const key = updatedCheckbox.getAttribute('data-state-key');
          const value = updatedCheckbox.checked;
          
          if (key && typeof window.updateState === 'function') {
            try {
              window.updateState(key, value);
            } catch (error) {
              console.error('Ошибка при обновлении состояния чекбокса:', error);
            }
          }
        });
      }
    }
  });
};

// Экспортируем функции для регистрации обработчиков
export default {
  registerHandler,
  initEventDelegation,
  initCheckboxHandlers
};

