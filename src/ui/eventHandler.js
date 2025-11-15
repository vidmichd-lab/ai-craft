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
 * Инициализирует делегирование событий
 * Вызывается после загрузки всех модулей
 */
export const initEventDelegation = () => {
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
        if (input) input.click();
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
            window.updateState('exportScale', parseInt(value, 10));
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
          window[funcName](...params);
        } catch (error) {
          console.error('Ошибка выполнения функции:', funcName, error);
          console.error('Параметры:', params);
          console.error('Стек ошибки:', error.stack);
        }
      } else {
        console.warn('Функция не найдена:', funcName, 'Доступные функции:', Object.keys(window).filter(k => typeof window[k] === 'function' && k.includes('Size')));
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
    
    const modalId = target.getAttribute('data-modal');
    if (modalId === 'logoSelectModal' && typeof window.closeLogoSelectModal === 'function') {
      window.closeLogoSelectModal();
    } else if (modalId === 'kvSelectModal' && typeof window.closeKVSelectModal === 'function') {
      window.closeKVSelectModal();
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

