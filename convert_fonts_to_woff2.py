#!/usr/bin/env python3
"""
Скрипт для конвертации всех шрифтов в формат WOFF2
"""

import os
import subprocess
import sys
from pathlib import Path

def check_woff2_tool():
    """Проверяет наличие инструмента для конвертации в woff2"""
    # Проверяем woff2_compress (C++ утилита от Google)
    try:
        result = subprocess.run(['which', 'woff2_compress'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            return 'woff2_compress'
    except:
        pass
    
    # Проверяем fonttools (Python библиотека)
    try:
        import fontTools
        return 'fonttools'
    except ImportError:
        pass
    
    return None

def convert_with_woff2_compress(input_file, output_file):
    """Конвертирует шрифт используя woff2_compress"""
    try:
        subprocess.run(['woff2_compress', input_file], 
                      check=True, capture_output=True)
        # woff2_compress создает файл с расширением .woff2 рядом с исходным
        expected_output = str(input_file).rsplit('.', 1)[0] + '.woff2'
        if os.path.exists(expected_output):
            if expected_output != output_file:
                os.rename(expected_output, output_file)
            return True
    except Exception as e:
        print(f"Ошибка при использовании woff2_compress: {e}")
    return False

def convert_with_fonttools(input_file, output_file):
    """Конвертирует шрифт используя fonttools"""
    try:
        from fontTools.ttLib import TTFont
        
        font = TTFont(input_file)
        font.flavor = 'woff2'
        font.save(output_file)
        return True
    except Exception as e:
        print(f"Ошибка при использовании fonttools: {e}")
    return False

def convert_font(input_file, output_file, tool):
    """Конвертирует один шрифт"""
    if tool == 'woff2_compress':
        return convert_with_woff2_compress(input_file, output_file)
    elif tool == 'fonttools':
        return convert_with_fonttools(input_file, output_file)
    return False

def main():
    font_dir = Path('font')
    if not font_dir.exists():
        print("Папка font/ не найдена")
        return 1
    
    # Проверяем наличие инструмента для конвертации
    tool = check_woff2_tool()
    if not tool:
        print("❌ Не найден инструмент для конвертации в WOFF2")
        print("Установите один из вариантов:")
        print("  1. woff2 (C++ утилита): brew install woff2")
        print("  2. fonttools (Python): pip3 install fonttools[woff]")
        return 1
    
    print(f"✅ Используется инструмент: {tool}")
    print("🔄 Начинаем конвертацию шрифтов...\n")
    
    converted = 0
    skipped = 0
    errors = 0
    
    # Находим все шрифты
    font_extensions = ['.ttf', '.otf', '.woff']
    for font_file in font_dir.rglob('*'):
        if font_file.suffix.lower() not in font_extensions:
            continue
        
        # Пропускаем уже существующие woff2
        woff2_file = font_file.with_suffix('.woff2')
        if woff2_file.exists():
            print(f"⏭️  Пропущен (уже есть woff2): {font_file.relative_to(font_dir)}")
            skipped += 1
            continue
        
        print(f"🔄 Конвертирую: {font_file.relative_to(font_dir)}")
        
        if convert_font(font_file, woff2_file, tool):
            print(f"✅ Создан: {woff2_file.relative_to(font_dir)}")
            converted += 1
        else:
            print(f"❌ Ошибка при конвертации: {font_file.relative_to(font_dir)}")
            errors += 1
    
    print(f"\n📊 Результаты:")
    print(f"  ✅ Конвертировано: {converted}")
    print(f"  ⏭️  Пропущено: {skipped}")
    print(f"  ❌ Ошибок: {errors}")
    
    return 0 if errors == 0 else 1

if __name__ == '__main__':
    sys.exit(main())

