#!/usr/bin/env python3
"""
Скрипт для автоматического сжатия изображений перед деплоем
Поддерживает PNG, JPG, JPEG, WebP
"""

import os
import sys
import argparse
from pathlib import Path

try:
    from PIL import Image
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    print("Устанавливаю Pillow для сжатия изображений...")
    os.system(f"{sys.executable} -m pip install --quiet Pillow pillow-heif")
    from PIL import Image
    import pillow_heif
    pillow_heif.register_heif_opener()

def get_file_size(filepath):
    """Возвращает размер файла в байтах"""
    return os.path.getsize(filepath)

def format_size(size_bytes):
    """Форматирует размер в читаемый вид"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"

def compress_image(input_path, output_path, quality=85, max_width=None, max_height=None, max_size_mb=3, convert_to_webp=False):
    """
    Сжимает изображение с гарантией максимального размера
    
    Args:
        input_path: Путь к исходному изображению
        output_path: Путь для сохранения сжатого изображения
        quality: Начальное качество сжатия (1-100, только для JPEG/WebP)
        max_width: Максимальная ширина (None = без ограничений)
        max_height: Максимальная высота (None = без ограничений)
        max_size_mb: Максимальный размер файла в МБ (по умолчанию: 3)
    
    Returns:
        tuple: (успех, исходный размер, новый размер, процент сжатия)
    """
    try:
        max_size_bytes = max_size_mb * 1024 * 1024
        original_size = get_file_size(input_path)
        
        with Image.open(input_path) as img:
            original_format = img.format
            original_width, original_height = img.size
            
            # Определяем формат вывода
            ext = Path(output_path).suffix.lower()
            is_jpeg = ext in ('.jpg', '.jpeg')
            is_webp = ext == '.webp'
            is_png = ext == '.png'
            
            # Сохраняем оригинальное расширение
            original_ext = Path(input_path).suffix.lower()
            
            # Если запрошена конвертация в WebP, конвертируем PNG и JPEG
            if convert_to_webp and (original_ext == '.png' or original_ext in ('.jpg', '.jpeg')):
                ext = '.webp'
                is_webp = True
                is_png = False
                is_jpeg = False
                output_path = str(Path(output_path).with_suffix('.webp'))
            # Если формат не указан, используем оригинальный формат
            elif not is_jpeg and not is_webp and not is_png:
                ext = original_ext
                if ext == '.png':
                    is_png = True
                elif ext in ('.jpg', '.jpeg'):
                    is_jpeg = True
                else:
                    is_webp = True
                    output_path = str(Path(output_path).with_suffix('.webp'))
            
            # Для очень больших PNG (> 1 МБ) конвертируем в JPEG для лучшего сжатия (если не конвертируем в WebP)
            if is_png and original_size > 1024 * 1024 and not convert_to_webp:  # Больше 1 МБ
                ext = '.jpg'
                is_jpeg = True
                is_png = False
                # Меняем расширение в output_path
                output_path = str(Path(output_path).with_suffix('.jpg'))
            
            # Подготовка изображения
            if is_jpeg:
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
            elif is_webp or is_png:
                if img.mode not in ('RGB', 'RGBA'):
                    img = img.convert('RGBA' if img.mode in ('RGBA', 'LA', 'P') else 'RGB')
            
            # Вычисляем начальные размеры
            current_width, current_height = img.size
            scale_factor = 1.0
            
            # Если изображение очень большое, уменьшаем его размер
            if current_width > 4000 or current_height > 4000:
                scale_factor = min(4000 / current_width, 4000 / current_height)
                new_width = int(current_width * scale_factor)
                new_height = int(current_height * scale_factor)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                current_width, current_height = new_width, new_height
            
            # Применяем дополнительные ограничения размера, если указаны
            if max_width or max_height:
                img.thumbnail((max_width or 99999, max_height or 99999), Image.Resampling.LANCZOS)
                current_width, current_height = img.size
            
            # Итеративное сжатие до достижения целевого размера
            current_quality = quality
            best_size = float('inf')
            best_path = None
            attempts = 0
            max_attempts = 20
            
            # Всегда используем временный файл для безопасности
            temp_output = str(Path(output_path).with_suffix(Path(output_path).suffix + '.tmp'))
            
            while attempts < max_attempts:
                # Сохраняем с текущими параметрами во временный файл
                # Используем уникальное имя для каждой попытки, чтобы не перезаписывать лучший результат
                temp_path = temp_output if attempts == 0 else str(Path(output_path).with_suffix(Path(output_path).suffix + f'.tmp{attempts}'))
                
                if is_jpeg:
                    save_format = 'JPEG'
                    save_kwargs = {'quality': current_quality, 'optimize': True, 'progressive': True}
                elif is_webp:
                    save_format = 'WEBP'
                    save_kwargs = {'quality': current_quality, 'method': 6}
                else:  # PNG
                    save_format = 'PNG'
                    save_kwargs = {'optimize': True, 'compress_level': 9}
                
                img.save(temp_path, format=save_format, **save_kwargs)
                temp_size = get_file_size(temp_path)
                
                # Если достигли целевого размера, используем этот результат
                if temp_size <= max_size_bytes:
                    if best_path and best_path != temp_path and Path(best_path).exists():
                        Path(best_path).unlink()
                    best_path = temp_path
                    best_size = temp_size
                    break
                
                # Если это лучший результат, сохраняем
                if temp_size < best_size:
                    if best_path and best_path != temp_path and Path(best_path).exists():
                        Path(best_path).unlink()
                    best_path = temp_path
                    best_size = temp_size
                
                # Не удаляем временный файл, если это лучший результат
                # Удалим лишние файлы в конце
                
                # Если файл все еще слишком большой, уменьшаем качество или размер
                if temp_size > max_size_bytes:
                    if is_jpeg or is_webp:
                        # Уменьшаем качество
                        current_quality = max(30, current_quality - 10)
                        # Если качество уже минимальное, уменьшаем размер
                        if current_quality <= 30:
                            scale_factor *= 0.9
                            new_width = int(current_width * scale_factor)
                            new_height = int(current_height * scale_factor)
                            if new_width < 100 or new_height < 100:
                                break
                            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                            current_width, current_height = new_width, new_height
                    else:
                        # Для PNG уменьшаем размер изображения
                        scale_factor *= 0.9
                        new_width = int(current_width * scale_factor)
                        new_height = int(current_height * scale_factor)
                        if new_width < 100 or new_height < 100:
                            break
                        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                        current_width, current_height = new_width, new_height
                
                attempts += 1
            
            # Используем лучший результат
            if best_path and Path(best_path).exists():
                if Path(output_path).exists():
                    Path(output_path).unlink()
                Path(best_path).rename(output_path)
                
                # Удаляем все остальные временные файлы
                for i in range(max_attempts):
                    temp_file = str(Path(output_path).with_suffix(Path(output_path).suffix + f'.tmp{i}'))
                    if Path(temp_file).exists() and temp_file != best_path:
                        Path(temp_file).unlink()
            elif not Path(output_path).exists():
                # Если не было успешных попыток, создаем минимальную версию
                print(f"⚠️  Не удалось сжать {input_path} до целевого размера", file=sys.stderr)
                return False, original_size, original_size, 0
            
            # Удаляем все временные файлы, если они остались
            temp_base = str(Path(output_path).with_suffix(Path(output_path).suffix + '.tmp'))
            if Path(temp_base).exists():
                Path(temp_base).unlink()
            for i in range(1, max_attempts):
                temp_file = str(Path(output_path).with_suffix(Path(output_path).suffix + f'.tmp{i}'))
                if Path(temp_file).exists():
                    Path(temp_file).unlink()
            
            new_size = get_file_size(output_path)
            compression_ratio = (1 - new_size / original_size) * 100 if original_size > 0 else 0
            
            return True, original_size, new_size, compression_ratio
            
    except Exception as e:
        print(f"Ошибка при сжатии {input_path}: {e}", file=sys.stderr)
        return False, 0, 0, 0

def compress_directory(directory, output_dir=None, quality=50, max_dimension=None, min_size_kb=20, max_size_mb=3, convert_to_webp=False):
    """
    Сжимает все изображения в директории
    
    Args:
        directory: Директория с изображениями
        output_dir: Директория для сохранения (None = перезаписать оригиналы)
        quality: Начальное качество сжатия (по умолчанию: 50 для более агрессивного сжатия)
        max_dimension: Максимальный размер (ширина или высота)
        min_size_kb: Минимальный размер файла для сжатия (в KB)
        max_size_mb: Максимальный размер файла в МБ (по умолчанию: 3)
        convert_to_webp: Конвертировать PNG/JPEG в WebP формат (по умолчанию: False)
    """
    directory = Path(directory)
    if not directory.exists():
        print(f"Директория не найдена: {directory}")
        return
    
    # Определяем расширения на основе того, что реально есть в директории
    # Для assets обычно только PNG, но поддерживаем все форматы на случай будущих изменений
    all_supported_extensions = {'.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif'}
    
    # Оптимизация: сначала проверяем, какие форматы реально есть в директории
    actual_extensions = set()
    for file_path in directory.rglob('*'):
        if file_path.is_file():
            ext = file_path.suffix.lower()
            if ext in all_supported_extensions:
                actual_extensions.add(ext)
    
    # Используем только те форматы, которые реально есть (ускоряет обработку)
    image_extensions = actual_extensions if actual_extensions else all_supported_extensions
    if actual_extensions:
        print(f"Найдены форматы изображений: {', '.join(sorted(actual_extensions))}")
    total_original = 0
    total_compressed = 0
    files_processed = 0
    files_skipped = 0
    
    # Рекурсивно обходим все файлы
    for file_path in directory.rglob('*'):
        if file_path.is_file() and file_path.suffix.lower() in image_extensions:
            # Пропускаем файлы в .git и других служебных папках
            if '.git' in file_path.parts or '__pycache__' in file_path.parts:
                continue
            
            # Если запрошена конвертация в WebP, проверяем, не существует ли уже WebP версия
            if convert_to_webp and file_path.suffix.lower() in ('.png', '.jpg', '.jpeg'):
                webp_path = file_path.with_suffix('.webp')
                if webp_path.exists():
                    # WebP версия уже существует, пропускаем конвертацию
                    files_skipped += 1
                    continue
            
            file_size_kb = get_file_size(file_path) / 1024
            
            # Пропускаем маленькие файлы
            if file_size_kb < min_size_kb:
                files_skipped += 1
                continue
            
            # Определяем путь для сохранения
            if output_dir:
                relative_path = file_path.relative_to(directory)
                output_path = Path(output_dir) / relative_path
                output_path.parent.mkdir(parents=True, exist_ok=True)
            else:
                # Используем оригинальный путь (compress_image создаст временный файл)
                output_path = file_path
            
            # Сжимаем изображение (compress_image сам создаст временный файл и заменит оригинал)
            success, orig_size, new_size, ratio = compress_image(
                file_path, 
                output_path,
                quality=quality,
                max_width=max_dimension,
                max_height=max_dimension,
                max_size_mb=max_size_mb,
                convert_to_webp=convert_to_webp
            )
            
            # Проверяем, что файл не превышает максимальный размер
            if success and new_size > max_size_mb * 1024 * 1024:
                print(f"⚠️  {file_path.relative_to(directory)}: все еще {format_size(new_size)} (цель: {max_size_mb} МБ)")
                # Пытаемся еще раз с более агрессивными настройками
                success, orig_size, new_size, ratio = compress_image(
                    file_path, 
                    output_path,
                    quality=50,  # Еще более низкое качество
                    max_width=max_dimension or 2000,  # Ограничиваем размер
                    max_height=max_dimension or 2000,
                    max_size_mb=max_size_mb,
                    convert_to_webp=convert_to_webp
                )
            
            if success:
                # Проверяем, что файл действительно был создан/изменен
                final_path = output_path
                if not output_dir:
                    # Если конвертировали в WebP, проверяем наличие WebP файла
                    if convert_to_webp and file_path.suffix.lower() in ('.png', '.jpg', '.jpeg'):
                        webp_path = file_path.with_suffix('.webp')
                        if webp_path.exists():
                            final_path = webp_path
                            # Удаляем оригинальный PNG/JPEG файл после успешной конвертации
                            if file_path.exists() and file_path != webp_path:
                                file_path.unlink()
                        elif final_path.exists():
                            # WebP файл уже создан по пути output_path
                            if file_path.exists() and file_path != final_path:
                                file_path.unlink()
                    # Если расширение могло измениться, проверяем оба варианта
                    elif not final_path.exists():
                        # Проверяем, не изменилось ли расширение
                        for ext in ['.jpg', '.jpeg', '.webp', '.png']:
                            alt_path = file_path.with_suffix(ext)
                            if alt_path.exists() and alt_path != file_path:
                                final_path = alt_path
                                # Удаляем старый файл, если расширение изменилось
                                if file_path.exists():
                                    file_path.unlink()
                                break
                
                if final_path.exists():
                    final_size = get_file_size(final_path)
                    # Если сжатие дало результат, считаем успешным
                    if final_size < orig_size or final_size <= max_size_mb * 1024 * 1024:
                        total_original += orig_size
                        total_compressed += final_size
                        files_processed += 1
                        print(f"✓ {file_path.relative_to(directory)}: {format_size(orig_size)} → {format_size(final_size)} ({ratio:.1f}% меньше)")
                    else:
                        files_skipped += 1
                else:
                    files_skipped += 1
            else:
                files_skipped += 1
    
    if files_processed > 0:
        total_saved = total_original - total_compressed
        total_ratio = (1 - total_compressed / total_original) * 100 if total_original > 0 else 0
        print(f"\n✅ Сжато файлов: {files_processed}")
        print(f"📦 Экономия: {format_size(total_saved)} ({total_ratio:.1f}%)")
        print(f"⏭️  Пропущено: {files_skipped}")
    else:
        print(f"ℹ️  Нет файлов для сжатия (пропущено: {files_skipped})")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Сжимает изображения для веб-деплоя')
    parser.add_argument('directory', nargs='?', default='.', help='Директория с изображениями (по умолчанию: текущая)')
    parser.add_argument('--output', '-o', help='Директория для сохранения (по умолчанию: перезаписать оригиналы)')
    parser.add_argument('--quality', '-q', type=int, default=50, help='Начальное качество сжатия 1-100 (по умолчанию: 50)')
    parser.add_argument('--max-dimension', '-m', type=int, help='Максимальный размер (ширина или высота в пикселях)')
    parser.add_argument('--min-size', type=int, default=20, help='Минимальный размер файла для сжатия в KB (по умолчанию: 20)')
    parser.add_argument('--max-size', type=float, default=3.0, help='Максимальный размер файла в МБ (по умолчанию: 3.0)')
    parser.add_argument('--webp', action='store_true', help='Конвертировать PNG/JPEG в WebP формат (лучшее сжатие для веба)')
    
    args = parser.parse_args()
    
    compress_directory(
        args.directory,
        output_dir=args.output,
        quality=args.quality,
        max_dimension=args.max_dimension,
        min_size_kb=args.min_size,
        max_size_mb=args.max_size,
        convert_to_webp=args.webp
    )

