/**
 * Утилита для управления паролем админки
 */

const PASSWORD_STORAGE_KEY = 'admin_password';
const DEFAULT_PASSWORD = 'admin';

/**
 * Получает текущий пароль из localStorage или возвращает дефолтный
 */
export const getPassword = () => {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_PASSWORD;
  }
  const stored = localStorage.getItem(PASSWORD_STORAGE_KEY);
  // Если пароль не установлен (null), возвращаем дефолтный
  // Если установлен пустая строка, значит пароль отключен
  if (stored === null) {
    return DEFAULT_PASSWORD;
  }
  return stored;
};

/**
 * Проверяет, установлен ли пароль (не пустая строка)
 * Если пароль не установлен явно, но есть дефолтный пароль, возвращает true
 */
export const hasPassword = () => {
  if (typeof localStorage === 'undefined') {
    return true; // По умолчанию пароль установлен
  }
  const stored = localStorage.getItem(PASSWORD_STORAGE_KEY);
  // Если null - пароль не установлен явно, но есть дефолтный 'admin', значит пароль есть
  // Если пустая строка - пароль явно отключен
  // Если есть значение - пароль установлен
  if (stored === null) {
    return true; // Есть дефолтный пароль 'admin'
  }
  return stored !== ''; // Пароль есть, если не пустая строка
};

/**
 * Устанавливает пароль
 */
export const setPassword = (password) => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  if (password === null || password === undefined || password === '') {
    // Удаляем пароль (админка будет открываться без пароля)
    localStorage.setItem(PASSWORD_STORAGE_KEY, '');
  } else {
    localStorage.setItem(PASSWORD_STORAGE_KEY, password);
  }
};

/**
 * Проверяет пароль
 */
export const checkPassword = (inputPassword) => {
  const currentPassword = getPassword();
  // Если пароль не установлен (пустая строка), всегда возвращаем true
  if (currentPassword === '') {
    return true;
  }
  return inputPassword === currentPassword;
};

