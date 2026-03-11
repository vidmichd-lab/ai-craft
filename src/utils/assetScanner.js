// Кэш для проверки существования файлов
const fileExistsCache = new Map();

async function checkFilesParallel(urls, concurrency = 10) {
  const found = [];
  const executing = new Set();

  for (const url of urls) {
    const p = checkFileExists(url).then(exists => {
      executing.delete(p);
      if (exists) found.push(url);
    }).catch(() => {
      executing.delete(p);
    });
    executing.add(p);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return found;
}

// Функция для проверки существования файла (без ошибок в консоли)
// Использует fetch HEAD, чтобы не засорять консоль 404 при отсутствии файла
export const checkFileExists = async (url) => {
  if (fileExistsCache.has(url)) {
    return fileExistsCache.get(url);
  }
  const absoluteUrl = url.startsWith('http') ? url : new URL(url, window.location.origin).href;
  try {
    const response = await fetch(absoluteUrl, { method: 'HEAD' });
    const exists = response.ok;
    fileExistsCache.set(url, exists);
    return exists;
  } catch {
    fileExistsCache.set(url, false);
    return false;
  }
};

/**
 * Умная проверка файлов с параллельной проверкой и ранней остановкой
 * По умолчанию проверяем только 01–35 (endNum=35), чтобы не слать десятки HEAD по несуществующим номерам.
 */
export const checkFilesSmart = async (basePath, startNum = 1, endNum = 35, maxConsecutiveMisses = 3) => {
  const candidateUrls = [];
  for (let i = startNum; i <= endNum; i++) {
    const num = String(i).padStart(2, '0');
    candidateUrls.push(`${basePath}/${num}.webp`);
  }

  // Проверяем батчами по 5, останавливаемся после 3 подряд 404 — меньше шума в консоли
  const foundUrls = [];
  let consecutiveMisses = 0;
  const batchSize = 5;
  for (let i = 0; i < candidateUrls.length; i += batchSize) {
    const batch = candidateUrls.slice(i, i + batchSize);
    const batchFound = await checkFilesParallel(batch, 5);
    foundUrls.push(...batchFound);
    const batchSet = new Set(batchFound);
    for (const url of batch) {
      if (batchSet.has(url)) {
        consecutiveMisses = 0;
      } else {
        consecutiveMisses++;
      }
    }
    if (consecutiveMisses >= maxConsecutiveMisses) {
      break;
    }
  }

  const byNum = {};
  for (const url of foundUrls) {
    const filePart = url.split('/').pop();
    const [num, ext] = filePart.split('.');
    if (!byNum[num]) byNum[num] = ext;
  }
  const foundFiles = Object.entries(byNum)
    .map(([num, ext]) => ({ name: num, file: `${basePath}/${num}.${ext}` }))
    .sort((a, b) => parseInt(a.name, 10) - parseInt(b.name, 10));
  return foundFiles;
};

// Сканирование логотипов из папки logo/ с динамическим обнаружением структуры (аналогично scanKV)
// Возвращает структурированные данные (объект) вместо плоского массива
export const scanLogos = async () => {
  const logoStructure = {};
  
  // Список возможных папок первого уровня (только реально используемые)
  const firstLevelFolders = ['black', 'white'];
  
  // Список возможных папок второго уровня (только реально используемые)
  // pro - для PRO логотипов (logo/white/pro/mono.svg)
  const secondLevelFolders = ['pro'];
  
  // Список возможных папок третьего уровня (языковые коды)
  const thirdLevelFolders = ['ru', 'en', 'kz'];
  
  // Функция для сканирования файлов в трехуровневой папке
  // Если folder2 пустой, сканирует logo/folder1/folder3/file
  // Иначе сканирует logo/folder1/folder2/folder3/file
  const scanFolder3Level = async (folder1, folder2, folder3) => {
    const folderFiles = [];
    
    // Список известных именованных файлов для проверки
    const knownNames = ['main', 'main_mono', 'mono', 'long', 'logo', 'long_logo', 'black', 'white', 'icon', 'symbol', 'mark', 'emblem'];
    
    // Определяем путь в зависимости от наличия folder2
    const basePath = folder2 ? `logo/${folder1}/${folder2}/${folder3}` : `logo/${folder1}/${folder3}`;
    
    // Проверяем только именованные SVG файлы (PNG и числовые файлы не используются в проекте)
    const namedFilePromises = [];
    for (const name of knownNames) {
      namedFilePromises.push(
        checkFileExists(`${basePath}/${name}.svg`).then(exists => ({ name, exists, ext: 'svg' }))
      );
    }
    
    const namedResults = await Promise.all(namedFilePromises);
    
    for (const result of namedResults) {
      if (result.exists) {
        const folder1Name = folder1.charAt(0).toUpperCase() + folder1.slice(1);
        const folder2Name = folder2 ? folder2.charAt(0).toUpperCase() + folder2.slice(1) : '';
        const folder3Name = folder3.toUpperCase();
        const displayName = result.name.charAt(0).toUpperCase() + result.name.slice(1).replace(/_/g, ' ');
        const displayPath = folder2 ? `${folder1Name} / ${folder2Name} / ${folder3Name} / ${displayName}` : `${folder1Name} / ${folder3Name} / ${displayName}`;
        folderFiles.push({ name: displayPath, file: `${basePath}/${result.name}.svg` });
      }
    }
    
    return folderFiles;
  };
  
  // Функция для сканирования файлов в папке
  const scanFolder = async (folder1, folder2) => {
    const folderFiles = [];
    
    // Список известных именованных файлов для проверки
    const knownNames = ['main', 'main_mono', 'mono', 'long', 'logo', 'long_logo', 'black', 'white', 'icon', 'symbol', 'mark', 'emblem'];
    
    // Проверяем только именованные SVG файлы (PNG и числовые файлы не используются в проекте)
    const namedFilePromises = [];
    for (const name of knownNames) {
      namedFilePromises.push(
        checkFileExists(`logo/${folder1}/${folder2}/${name}.svg`).then(exists => ({ name, exists, ext: 'svg' }))
      );
    }
    
    const namedResults = await Promise.all(namedFilePromises);
    
    for (const result of namedResults) {
      if (result.exists) {
        const folder1Name = folder1.charAt(0).toUpperCase() + folder1.slice(1);
        const folder2Name = folder2.charAt(0).toUpperCase() + folder2.slice(1);
        const displayName = result.name.charAt(0).toUpperCase() + result.name.slice(1).replace(/_/g, ' ');
        folderFiles.push({ name: `${folder1Name} / ${folder2Name} / ${displayName}`, file: `logo/${folder1}/${folder2}/${result.name}.svg` });
      }
    }
    
    return folderFiles;
  };
  
  // Сначала проверяем двухуровневую структуру (logo/folder1/folder3/file)
  // Например: logo/white/ru/main.svg - это white -> ru -> [файлы]
  for (const folder1 of firstLevelFolders) {
    for (const folder3 of thirdLevelFolders) {
      const folderFiles3 = await scanFolder3Level(folder1, '', folder3);
      
      if (folderFiles3.length > 0) {
        if (!logoStructure[folder1]) {
          logoStructure[folder1] = {};
        }
        // Сохраняем как двухуровневую структуру: folder1 -> folder3 -> [файлы]
        if (!logoStructure[folder1][folder3]) {
          logoStructure[folder1][folder3] = [];
        }
        folderFiles3.forEach(file => {
          if (!logoStructure[folder1][folder3].find(l => l.file === file.file)) {
            logoStructure[folder1][folder3].push(file);
          }
        });
      }
    }
  }
  
  // Если есть папки второго уровня, проверяем трехуровневую структуру с folder2
  if (secondLevelFolders.length > 0) {
    for (const folder1 of firstLevelFolders) {
      for (const folder2 of secondLevelFolders) {
        // Проверяем трехуровневую структуру (logo/folder1/folder2/folder3/file)
        for (const folder3 of thirdLevelFolders) {
          const folderFiles3 = await scanFolder3Level(folder1, folder2, folder3);
          
          if (folderFiles3.length > 0) {
            if (!logoStructure[folder1]) {
              logoStructure[folder1] = {};
            }
            if (!logoStructure[folder1][folder2]) {
              logoStructure[folder1][folder2] = {};
            }
            logoStructure[folder1][folder2][folder3] = folderFiles3;
          }
        }
        
        // Затем проверяем двухуровневую структуру (logo/folder1/folder2/file)
        const folderFiles = await scanFolder(folder1, folder2);
        
        if (folderFiles.length > 0) {
          if (!logoStructure[folder1]) {
            logoStructure[folder1] = {};
          }
          // Если уже есть трехуровневая структура, добавляем файлы в 'root'
          if (logoStructure[folder1][folder2] && typeof logoStructure[folder1][folder2] === 'object' && !Array.isArray(logoStructure[folder1][folder2])) {
            // Уже есть трехуровневая структура, добавляем в 'root'
            logoStructure[folder1][folder2]['root'] = folderFiles;
          } else {
            // Нет трехуровневой структуры, используем массив
            logoStructure[folder1][folder2] = folderFiles;
          }
        }
      }
    }
  }
  
  // Преобразуем структуру в плоский массив для обратной совместимости
  const logos = [];
  Object.keys(logoStructure).forEach((folder1) => {
    Object.keys(logoStructure[folder1]).forEach((folder2) => {
      const folder2Data = logoStructure[folder1][folder2];
      // Проверяем, является ли это трехуровневой структурой (объект с ключами folder3) или массивом
      if (Array.isArray(folder2Data)) {
        logos.push(...folder2Data);
      } else if (typeof folder2Data === 'object') {
        // Трехуровневая структура
        Object.keys(folder2Data).forEach((folder3) => {
          if (Array.isArray(folder2Data[folder3])) {
            logos.push(...folder2Data[folder3]);
          }
        });
      }
    });
  });
  
  // Также проверяем файлы в одноуровневой структуре (logo/folder1/file) для обратной совместимости
  // Только SVG файлы (PNG не используются в проекте)
  const knownLogoFiles = [
    'black.svg',
    'long_black.svg',
    'long_white.svg',
    'white.svg',
    'logo.svg',
    'long_logo.svg',
    'main.svg',
    'main_mono.svg',
    'mono.svg',
    'long.svg',
    'icon.svg',
    'symbol.svg',
    'mark.svg',
    'emblem.svg'
  ];

  const oneLevelCandidateUrls = [];
  for (const folder1 of firstLevelFolders) {
    for (const filename of knownLogoFiles) {
      oneLevelCandidateUrls.push(`logo/${folder1}/${filename}`);
    }
  }
  const oneLevelFoundUrls = await checkFilesParallel(oneLevelCandidateUrls, 10);

  for (const file of oneLevelFoundUrls) {
    const filename = file.split('/').pop();
    const baseName = filename.replace(/\.svg$/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const folder1 = file.split('/')[1];
    const folder1Name = folder1.charAt(0).toUpperCase() + folder1.slice(1);
    const name = `${folder1Name} / ${baseName}`;
    if (!logos.find(l => l.file === file)) {
      logos.push({ name, file });
    }
  }

  // Возвращаем структурированные данные вместо плоского массива
  return logoStructure;
};

// Сканирование KV из папки assets/ с динамическим обнаружением структуры
export const scanKV = async () => {
  const kvStructure = {};
  
  // Список реальных папок первого уровня (только те, что существуют в проекте)
  // В проекте есть assets/3d/, assets/photo/ и assets/pro/
  const firstLevelFolders = ['3d', 'photo', 'pro'];
  
  // Список известных папок второго уровня для проверки
  // Для 3d: sign, icons, logos, numbers, other, shapes, tech, yandex
  // Для photo: pro, ai_reskill, old_reskill и другие
  // Для pro: assets, bg, photo_env, photo_faces
  const knownSecondLevelFolders3d = ['sign', 'icons', 'logos', 'numbers', 'other', 'shapes', 'tech', 'yandex'];
  const knownSecondLevelFoldersPhoto = ['pro', 'ai_reskill', 'old_reskill'];
  const knownSecondLevelFoldersPro = ['assets', 'bg', 'photo_env', 'photo_faces'];
  
  // Расширенный список возможных имен папок для автоматического обнаружения
  // Включает все возможные варианты имен, которые могут встречаться в проекте
  const extendedFolderNames = [
    // Основные категории
    'assets', 'bg', 'backgrounds', 'images', 'img', 'pictures', 'pics', 'photos', 'photo',
    // Специфичные для проекта
    'photo_env', 'photo_faces', 'photo_envs', 'faces', 'environments', 'env',
    'icons', 'logos', 'numbers', 'shapes', 'sign', 'signs', 'tech', 'yandex',
    'other', 'others',
    // Общие категории
    'textures', 'patterns', 'overlays', 'frames', 'borders', 'elements', 
    'graphics', 'illustrations', 'vectors', 'svg', 'png', 'jpg',
    // Варианты написания
    'ai_reskill', 'old_reskill', 'reskill', 'ai', 'old',
    // Числовые и буквенные варианты (для динамических папок)
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
    '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
  ];
  
  // Функция для проверки существования папки (проверяем наличие хотя бы одного файла)
  const checkFolderExists = async (folder1, folder2) => {
    // Если folder1 пустой, проверяем assets/folder2/
    const basePath = folder1 ? `assets/${folder1}/${folder2}` : `assets/${folder2}`;
    
    // Специальная обработка для папки bg (файлы с особыми именами)
    if (folder2 === 'bg') {
      // Проверяем известные файлы фонов PRO
      const bgFileNames = [
        'shape=triangle, inside=green, theme=dark',
        'shape=triangle, inside=green, theme=light',
        'shape=triangle, inside=black, theme=dark',
        'shape=triangle, inside=white, theme=light',
        'shape=circle, inside=green, theme=dark',
        'shape=circle, inside=green, theme=light',
        'shape=circle, inside=black, theme=dark',
        'shape=circle, inside=white, theme=light',
        'shape=square, inside=green, theme=dark',
        'shape=square, inside=green, theme=light',
        'shape=square, inside=black, theme=dark',
        'shape=square, inside=white, theme=light',
        'shape=8, inside=green, theme=dark',
        'shape=8, inside=green, theme=light',
        'shape=8, inside=black, theme=dark',
        'shape=8, inside=white, theme=light'
      ];
      
      const bgCheckPromises = bgFileNames.map(name => 
        Promise.all([
          checkFileExists(`${basePath}/${name}.webp`),
          checkFileExists(`${basePath}/${name}.png`)
        ])
      );
      
      const bgResults = await Promise.all(bgCheckPromises);
      for (const results of bgResults) {
        if (results[0] || results[1]) {
          return true;
        }
      }
    }
    
    // Проверяем только первые 3 файла параллельно для быстрой проверки (только .webp — в assets нет .jpg)
    const quickCheckPromises = [];
    for (let i = 1; i <= 3; i++) {
      const num = i.toString().padStart(2, '0');
      quickCheckPromises.push(checkFileExists(`${basePath}/${num}.webp`));
    }
    
    const quickResults = await Promise.all(quickCheckPromises);
    if (quickResults.some(Boolean)) return true;
    
    // Дополнительно проверяем распространённые имена (только .webp)
    const commonNames = ['01', '1'];
    for (const name of commonNames) {
      if (await checkFileExists(`${basePath}/${name}.webp`)) return true;
    }
    
    return false;
  };
  
  // Функция для сканирования файлов в папке
  const scanFolder = async (folder1, folder2) => {
    const basePath = folder1 ? `assets/${folder1}/${folder2}` : `assets/${folder2}`;
    
    // Специальная обработка для папки bg (файлы с особыми именами)
    if (folder2 === 'bg') {
      const bgFiles = [];
      const shapes = ['triangle', 'circle', 'square', '8'];
      const insides = ['green', 'black', 'white'];
      const themes = ['dark', 'light'];

      const bgCandidateUrls = [];
      for (const shape of shapes) {
        for (const inside of insides) {
          for (const theme of themes) {
            const fileName = `shape=${shape}, inside=${inside}, theme=${theme}`;
            bgCandidateUrls.push(`${basePath}/${fileName}.webp`);
            bgCandidateUrls.push(`${basePath}/${fileName}.png`);
          }
        }
      }
      const bgFoundUrls = await checkFilesParallel(bgCandidateUrls, 10);

      const byKey = {};
      for (const url of bgFoundUrls) {
        const filePart = url.split('/').pop();
        const [baseName, ext] = filePart.split('.');
        const key = baseName;
        if (!byKey[key] || ext === 'webp') {
          byKey[key] = ext;
        }
      }
      for (const [fileName, ext] of Object.entries(byKey)) {
        const parts = fileName.split(', ');
        const shape = parts[0] ? parts[0].split('=')[1] || '' : '';
        const inside = parts[1] ? parts[1].split('=')[1] || '' : '';
        const theme = parts[2] ? parts[2].split('=')[1] || '' : '';
        const displayName = `${shape} ${inside} ${theme}`;
        bgFiles.push({
          name: displayName,
          file: `${basePath}/${fileName}.${ext}`
        });
      }

      return bgFiles;
    }
    
    // Используем умную проверку файлов с ранней остановкой для числовых файлов
    // Ограничиваем 01–35 и останавливаемся после 3 подряд 404 — меньше шума в консоли
    return await checkFilesSmart(basePath, 1, 35, 3);
  };
  
  
  // Сканируем каждую папку первого уровня
  for (const folder1 of firstLevelFolders) {
    const discoveredFolders = new Set();
    
    // Выбираем список известных папок в зависимости от папки первого уровня
    let knownSecondLevelFolders;
    if (folder1 === 'photo') {
      knownSecondLevelFolders = knownSecondLevelFoldersPhoto;
    } else if (folder1 === 'pro') {
      knownSecondLevelFolders = knownSecondLevelFoldersPro;
    } else {
      knownSecondLevelFolders = knownSecondLevelFolders3d;
    }
    
    // Проверяем известные папки параллельно для ускорения
    const checkPromises = knownSecondLevelFolders.map(async (folder2) => {
      const exists = await checkFolderExists(folder1, folder2);
      if (exists) {
        discoveredFolders.add(folder2);
      }
    });
    
    await Promise.all(checkPromises);
    
    // Для assets/3d/, assets/photo/ и assets/pro/ не проверяем расширенный список —
    // только известные папки, чтобы не слать сотни HEAD-запросов по несуществующим путям (404 в консоли)
    if (folder1 !== '3d' && folder1 !== 'photo' && folder1 !== 'pro') {
    const additionalCheckPromises = extendedFolderNames.map(async (folder2) => {
      if (!discoveredFolders.has(folder2) && !knownSecondLevelFolders.includes(folder2)) {
        const exists = await checkFolderExists(folder1, folder2);
        if (exists) {
          discoveredFolders.add(folder2);
        }
      }
    });
    
    const batchSize = 10;
    for (let i = 0; i < additionalCheckPromises.length; i += batchSize) {
      const batch = additionalCheckPromises.slice(i, i + batchSize);
      await Promise.all(batch);
    }
    }
    
    const secondLevelFolders = Array.from(discoveredFolders);
    
    // Сканируем все папки второго уровня для этой папки первого уровня
    for (const folder2 of secondLevelFolders) {
      const folderFiles = await scanFolder(folder1, folder2);
      
      if (folderFiles.length > 0) {
        if (!kvStructure[folder1]) {
          kvStructure[folder1] = {};
        }
        kvStructure[folder1][folder2] = folderFiles;
      }
    }
  }
  
  return kvStructure;
};

// Сканирование фоновых изображений из папки assets/ с динамическим обнаружением структуры
// Использует ту же структуру, что и KV (assets/3d/...)
export const scanBG = async () => {
  // Используем ту же логику, что и scanKV, так как структура папок идентична
  return await scanKV();
};

// Маппинг названий начертаний на веса шрифтов
const FONT_WEIGHT_MAP = {
  'Thin': '100',
  'Light': '300',
  'Regular': '400',
  'Medium': '500',
  'Bold': '700',
  'Heavy': '800',
  'Black': '900'
};

// Маппинг названий начертаний на стили шрифтов
const FONT_STYLE_MAP = {
  'Italic': 'italic',
  'Oblique': 'oblique'
};

// Парсинг имени файла шрифта для извлечения информации
const parseFontFileName = (fileName, fontFamilyName) => {
  // Убираем расширение
  const nameWithoutExt = fileName.replace(/\.(ttf|otf|woff|woff2)$/i, '');
  
  // Убираем имя семейства из начала (если есть)
  // Поддерживаем форматы: "YS Text-Regular" или "YS Text Regular"
  let variantName = nameWithoutExt;
  
  // Проверяем формат с дефисом: "Family-Weight"
  if (nameWithoutExt.startsWith(fontFamilyName + '-')) {
    variantName = nameWithoutExt.substring(fontFamilyName.length + 1);
  } 
  // Проверяем формат с пробелом: "Family Weight"
  else if (nameWithoutExt.startsWith(fontFamilyName + ' ')) {
    variantName = nameWithoutExt.substring(fontFamilyName.length + 1);
  }
  // Если имя семейства совпадает с именем файла (без расширения), это Regular
  else if (nameWithoutExt === fontFamilyName) {
    variantName = 'Regular';
  }
  
  // Определяем стиль (italic)
  let style = 'normal';
  let weightName = variantName;
  
  // Проверяем наличие "Italic" в названии (может быть в конце или в середине)
  if (variantName.toLowerCase().includes('italic')) {
    style = 'italic';
    // Убираем "Italic" и пробелы вокруг него
    weightName = variantName.replace(/\s*italic\s*/i, '').trim();
    // Если после удаления "Italic" осталась пустая строка, это Regular Italic
    if (!weightName) {
      weightName = 'Regular';
    }
  }
  
  // Определяем вес по маппингу
  const weight = FONT_WEIGHT_MAP[weightName] || '400';
  
  return {
    weight,
    style,
    weightName: weightName || 'Regular',
    displayName: weightName === 'Regular' ? 'Regular' : weightName
  };
};

// Сканирование шрифтов из папки font/
// Возвращает массив объектов { family, name, file, weight, style }
export const scanFonts = async () => {
  const fonts = [];
  
  // Список известных папок со шрифтами
  // Можно расширить, если появятся новые папки
  const fontFolders = [
    'YS Text',
    'YS Text Cond',
    'YS Text Wide',
    'YS Display',
    'YS Display Cond',
    'YS Display Wide',
    'YS Logotype',
    'Yandex Serif Display'
  ];
  
  // Известные расширения шрифтов (только woff2 для оптимизации, ttf как fallback)
  // Проверяем сначала woff2 (оптимальный формат), затем ttf если woff2 нет
  const fontExtensions = ['woff2', 'ttf'];
  
  // Известные начертания для проверки
  const knownWeights = ['Thin', 'Light', 'Regular', 'Medium', 'Bold', 'Heavy', 'Black'];
  const knownItalicWeights = knownWeights.map(w => w + ' Italic');
  const allKnownWeights = [...knownWeights, ...knownItalicWeights];
  
  // Сканируем каждую папку
  for (const folder of fontFolders) {
    const fontFamily = folder;
    // Один пробный запрос (только woff2): если 404 — сразу пропускаем папку (меньше 404 в консоли)
    const probePath = `font/${folder}/${fontFamily}-Regular.woff2`;
    if (!(await checkFileExists(probePath))) {
      const fallbackPath = `font/${folder}/${fontFamily}-Regular.ttf`;
      if (!(await checkFileExists(fallbackPath))) {
        continue;
      }
    }

    // Сканируем файлы в папке батчами; при 3 подряд 404 прекращаем (меньше запросов и 404 в консоли)
    const candidates = [];
    for (const weightName of allKnownWeights) {
      for (const ext of fontExtensions) {
        candidates.push({
          fileName: `${fontFamily}-${weightName}.${ext}`,
          filePath: `font/${folder}/${fontFamily}-${weightName}.${ext}`,
          weightName,
          ext,
          format: 'hyphen'
        });
      }
    }
    for (const ext of fontExtensions) {
      candidates.push({
        fileName: `${fontFamily}.${ext}`,
        filePath: `font/${folder}/${fontFamily}.${ext}`,
        weightName: 'Regular',
        ext,
        format: 'name-only'
      });
    }

    const fontResults = [];
    const batchSize = 5;
    let consecutiveMisses = 0;
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (c) => ({
          ...c,
          exists: await checkFileExists(c.filePath)
        }))
      );
      for (const r of batchResults) {
        fontResults.push(r);
        if (r.exists) {
          consecutiveMisses = 0;
        } else {
          consecutiveMisses++;
        }
      }
      if (consecutiveMisses >= 3) {
        break;
      }
    }
    
    // Обрабатываем найденные шрифты
    const foundFonts = new Map(); // Используем Map для избежания дубликатов
    
    for (const result of fontResults) {
      if (result.exists) {
        const parsed = parseFontFileName(result.fileName, fontFamily);
        const key = `${fontFamily}-${parsed.weight}-${parsed.style}`;
        
        // Если такой шрифт уже найден, пропускаем (приоритет: woff2 > ttf)
        // WOFF2 имеет наивысший приоритет для лучшей производительности
        if (foundFonts.has(key)) {
          const existing = foundFonts.get(key);
          const extPriority = { woff2: 2, ttf: 1 };
          const currentPriority = extPriority[result.ext] || 0;
          const existingPriority = extPriority[existing.ext] || 0;
          if (currentPriority > existingPriority) {
            foundFonts.set(key, { ...result, ...parsed });
          }
        } else {
          foundFonts.set(key, { ...result, ...parsed });
        }
      }
    }
    
    // Добавляем найденные шрифты в массив
    foundFonts.forEach((font) => {
      fonts.push({
        family: fontFamily,
        name: `${fontFamily} ${font.weightName}`,
        file: font.filePath,
        weight: font.weight,
        style: font.style,
        weightName: font.weightName
      });
    });
  }
  
  // Сортируем шрифты: сначала по семейству, затем по весу
  fonts.sort((a, b) => {
    if (a.family !== b.family) {
      return a.family.localeCompare(b.family);
    }
    return parseInt(a.weight) - parseInt(b.weight);
  });
  
  return fonts;
};

