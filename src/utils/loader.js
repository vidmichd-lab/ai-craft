/**
 * Утилита для показа индикатора загрузки
 */

/**
 * Выполняет асинхронную функцию с индикатором загрузки
 * @param {Function} asyncFn - Асинхронная функция для выполнения
 * @param {string} message - Сообщение для отображения (опционально)
 * @param {boolean} showLoader - Показывать ли индикатор загрузки (опционально)
 * @returns {Promise} - Результат выполнения функции
 */
export const withLoader = async (asyncFn, message = '', showLoader = false) => {
  // Если индикатор не нужен, просто выполняем функцию
  if (!showLoader) {
    return await asyncFn();
  }
  
  // Простая реализация - можно расширить для показа UI индикатора
  if (message) {
    console.log(message);
  }
  
  try {
    const result = await asyncFn();
    return result;
  } catch (error) {
    console.error('Ошибка в withLoader:', error);
    throw error;
  }
};

