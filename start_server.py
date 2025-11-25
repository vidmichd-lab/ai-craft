#!/usr/bin/env python3
"""
Простой HTTP сервер для запуска проекта локально
"""
import http.server
import socketserver
import webbrowser
import os
import sys
import socket
import traceback
import json
import shutil
from urllib.parse import urlparse, parse_qs, unquote
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("⚠️  Предупреждение: Pillow не установлен. Конвертация в WebP недоступна.")
    print("   Установите: pip install Pillow")

PORT = 8000

def find_free_port(start_port=8000):
    """Находит свободный порт, начиная с start_port"""
    port = start_port
    while port < start_port + 100:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            port += 1
    raise RuntimeError(f"Не удалось найти свободный порт в диапазоне {start_port}-{start_port + 100}")

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    # Счетчики для статистики
    _assets_404_count = 0
    _js_404_count = 0
    _other_404_count = 0
    
    def translate_path(self, path):
        """Переводит URL путь в файловый путь"""
        try:
            # Сначала получаем стандартный путь
            translated = super().translate_path(path)
            
            # Если путь указывает на /state/ или /constants.js (без src/), перенаправляем на src/
            # Проверяем URL путь (не файловый путь)
            if path.startswith('/state/') and not path.startswith('/src/state/'):
                # Это запрос к /state/... без src/
                # Проверяем, существует ли файл в src/ директории
                src_path = os.path.join(os.getcwd(), 'src' + path)
                if os.path.exists(src_path):
                    return src_path
            
            # Обработка /constants.js -> src/constants.js
            if path.rstrip('/') == '/constants.js':
                src_path = os.path.join(os.getcwd(), 'src', 'constants.js')
                if os.path.exists(src_path):
                    return src_path
            
            # Если файла нет по стандартному пути, проверяем src/
            if not os.path.exists(translated):
                # Пытаемся найти файл в src/ директории
                if path.endswith('.js') and not path.startswith('/src/'):
                    src_path = os.path.join(os.getcwd(), 'src', path.lstrip('/'))
                    if os.path.exists(src_path):
                        return src_path
            
            return translated
        except Exception as e:
            print(f"❌ ОШИБКА в translate_path для пути '{path}': {e}")
            print(f"   Трассировка: {traceback.format_exc()}")
            # Возвращаем стандартный путь даже при ошибке
            return super().translate_path(path)
    
    def guess_type(self, path):
        """Определяет MIME-тип файла"""
        mimetype = super().guess_type(path)
        
        # Устанавливаем правильный MIME-тип для JavaScript модулей
        if path.endswith('.js'):
            return 'application/javascript'
        
        return mimetype
    
    def log_message(self, format, *args):
        """Логируем запросы для отладки"""
        # Логируем все запросы .js файлов и ошибки 404
        if len(args) >= 1:
            try:
                # Извлекаем путь и метод из лог-сообщения
                # Формат: "GET /path HTTP/1.1" или "HEAD /path HTTP/1.1"
                log_line = args[0] if isinstance(args[0], str) else str(args[0])
                method = 'GET'
                path = log_line
                
                if ' ' in log_line:
                    parts = log_line.split()
                    if len(parts) >= 2:
                        method = parts[0]  # GET, HEAD, POST и т.д.
                        path = parts[1]    # /path/to/file
                    elif len(parts) == 1:
                        path = parts[0]
                
                status = args[1] if len(args) > 1 else '200'
                
                # Логируем все запросы .js файлов
                if path.endswith('.js'):
                    if status == '404':
                        MyHTTPRequestHandler._js_404_count += 1
                        print(f"❌ 404 JS: {path}")
                        # Показываем, где искался файл
                        translated = self.translate_path(path)
                        print(f"   Искали по пути: {translated}")
                        if not os.path.exists(translated):
                            # Проверяем альтернативные пути
                            alt_paths = []
                            if path.startswith('/state/'):
                                alt_paths.append(os.path.join(os.getcwd(), 'src' + path))
                            if path.rstrip('/') == '/constants.js':
                                alt_paths.append(os.path.join(os.getcwd(), 'src', 'constants.js'))
                            if path.endswith('.js') and not path.startswith('/src/'):
                                alt_paths.append(os.path.join(os.getcwd(), 'src', path.lstrip('/')))
                            
                            for alt_path in alt_paths:
                                if os.path.exists(alt_path):
                                    print(f"   ⚠️  Файл найден по альтернативному пути: {alt_path}")
                                else:
                                    print(f"   ✗ Альтернативный путь не существует: {alt_path}")
                    else:
                        print(f"[{status}] JS: {path}")
                
                # Обработка ошибок 404
                elif len(args) >= 2 and args[1] == '404':
                    # Подавляем детальное логирование для HEAD запросов к assets/ (это нормальные проверки существования)
                    is_assets_check = (path.startswith('/assets/') or path.startswith('/logo/') or path.startswith('/font/'))
                    is_head_request = method.upper() == 'HEAD'
                    
                    if is_assets_check and is_head_request:
                        # Только считаем, не логируем детально
                        MyHTTPRequestHandler._assets_404_count += 1
                        # Показываем статистику каждые 50 запросов
                        if MyHTTPRequestHandler._assets_404_count % 50 == 0:
                            print(f"ℹ️  Проверено {MyHTTPRequestHandler._assets_404_count} несуществующих ресурсов (assets/logo/font/)...")
                    else:
                        # Детальное логирование для важных ошибок
                        MyHTTPRequestHandler._other_404_count += 1
                        print(f"❌ 404 ERROR: {path} ({method})")
                        translated = self.translate_path(path)
                        print(f"   Искали по пути: {translated}")
                        if not os.path.exists(translated):
                            # Проверяем альтернативные пути только для важных файлов
                            if path.startswith('/state/') or path.rstrip('/') == '/constants.js' or path.endswith('.js'):
                                alt_paths = []
                                if path.startswith('/state/'):
                                    alt_paths.append(os.path.join(os.getcwd(), 'src' + path))
                                if path.rstrip('/') == '/constants.js':
                                    alt_paths.append(os.path.join(os.getcwd(), 'src', 'constants.js'))
                                if path.endswith('.js') and not path.startswith('/src/'):
                                    alt_paths.append(os.path.join(os.getcwd(), 'src', path.lstrip('/')))
                                
                                for alt_path in alt_paths:
                                    if os.path.exists(alt_path):
                                        print(f"   ⚠️  Файл найден по альтернативному пути: {alt_path}")
                                    else:
                                        print(f"   ✗ Альтернативный путь не существует: {alt_path}")
            except Exception as e:
                print(f"❌ ОШИБКА в log_message: {e}")
                print(f"   Трассировка: {traceback.format_exc()}")
        
        # Для остальных запросов используем стандартное логирование
        super().log_message(format, *args)
    
    def do_GET(self):
        """Обработка GET запросов с детальным логированием ошибок"""
        try:
            super().do_GET()
        except Exception as e:
            print(f"❌ КРИТИЧЕСКАЯ ОШИБКА при обработке GET запроса '{self.path}': {e}")
            print(f"   Тип ошибки: {type(e).__name__}")
            print(f"   Трассировка:")
            traceback.print_exc()
            # Пытаемся отправить ответ об ошибке
            try:
                self.send_error(500, f"Internal Server Error: {str(e)}")
            except:
                pass
    
    def do_OPTIONS(self):
        """Обработка OPTIONS запросов для CORS"""
        try:
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
        except Exception as e:
            print(f"❌ ОШИБКА в do_OPTIONS: {e}")
            traceback.print_exc()
    
    def end_headers(self):
        """Добавляет заголовки CORS"""
        try:
            # Добавляем заголовки CORS для работы с модулями
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            super().end_headers()
        except Exception as e:
            print(f"❌ ОШИБКА в end_headers: {e}")
            traceback.print_exc()
            try:
                super().end_headers()
            except:
                pass
    
    def do_POST(self):
        """Обработка POST запросов для загрузки файлов"""
        try:
            # Обрабатываем API запросы
            if self.path.startswith('/api/'):
                self.handle_api_post()
            else:
                self.send_error(404, "Not Found")
        except Exception as e:
            print(f"❌ ОШИБКА при обработке POST запроса '{self.path}': {e}")
            traceback.print_exc()
            self.send_error(500, f"Internal Server Error: {str(e)}")
    
    def do_DELETE(self):
        """Обработка DELETE запросов для удаления файлов и папок"""
        try:
            if self.path.startswith('/api/'):
                self.handle_api_delete()
            else:
                self.send_error(404, "Not Found")
        except Exception as e:
            print(f"❌ ОШИБКА при обработке DELETE запроса '{self.path}': {e}")
            traceback.print_exc()
            self.send_error(500, f"Internal Server Error: {str(e)}")
    
    def handle_api_post(self):
        """Обработка POST API запросов"""
        parsed_path = urlparse(self.path)
        path_parts = parsed_path.path.split('/')
        
        if len(path_parts) < 3:
            self.send_error(400, "Bad Request")
            return
        
        api_action = path_parts[2]
        
        if api_action == 'upload':
            self.handle_upload()
        elif api_action == 'create-folder':
            self.handle_create_folder()
        elif api_action == 'rename-folder':
            self.handle_rename_folder()
        else:
            self.send_error(404, "API endpoint not found")
    
    def handle_api_delete(self):
        """Обработка DELETE API запросов"""
        parsed_path = urlparse(self.path)
        path_parts = parsed_path.path.split('/')
        
        if len(path_parts) < 3:
            self.send_error(400, "Bad Request")
            return
        
        api_action = path_parts[2]
        
        if api_action == 'file':
            self.handle_delete_file()
        elif api_action == 'folder':
            self.handle_delete_folder()
        else:
            self.send_error(404, "API endpoint not found")
    
    def handle_upload(self):
        """Обработка загрузки файла"""
        try:
            # Получаем параметры из query string
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            
            target_path = query_params.get('path', [None])[0]
            if not target_path:
                self.send_error(400, "Missing 'path' parameter")
                return
            
            target_path = unquote(target_path)
            
            # Проверяем, что путь находится в разрешенных директориях
            allowed_dirs = ['logo', 'assets']
            if not any(target_path.startswith(d + '/') or target_path == d for d in allowed_dirs):
                self.send_error(403, "Path not allowed")
                return
            
            # Читаем данные из запроса
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error(400, "Empty file")
                return
            
            file_data = self.rfile.read(content_length)
            
            # Получаем имя файла из заголовков
            content_disposition = self.headers.get('Content-Disposition', '')
            filename = None
            if 'filename=' in content_disposition:
                filename = content_disposition.split('filename=')[1].strip('"')
            
            if not filename:
                # Пытаемся получить из query параметра
                filename = query_params.get('filename', [None])[0]
                if not filename:
                    self.send_error(400, "Missing filename")
                    return
            
            filename = unquote(filename)
            
            # Формируем полный путь
            full_path = os.path.join(os.getcwd(), target_path, filename)
            
            # Создаем директорию, если её нет
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            # Определяем, нужно ли конвертировать в WebP
            should_convert_to_webp = target_path.startswith('assets/') and HAS_PIL
            
            if should_convert_to_webp:
                # Конвертируем в WebP с качеством 50%
                try:
                    # Сохраняем временный файл
                    temp_path = full_path + '.tmp'
                    with open(temp_path, 'wb') as f:
                        f.write(file_data)
                    
                    # Открываем изображение
                    img = Image.open(temp_path)
                    
                    # Конвертируем RGBA в RGB, если нужно (для JPEG)
                    if img.mode in ('RGBA', 'LA', 'P'):
                        # Создаем белый фон
                        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                        if img.mode == 'P':
                            img = img.convert('RGBA')
                        rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                        img = rgb_img
                    elif img.mode != 'RGB':
                        img = img.convert('RGB')
                    
                    # Сохраняем как WebP с качеством 50%
                    webp_path = os.path.splitext(full_path)[0] + '.webp'
                    img.save(webp_path, 'WEBP', quality=50, method=6)
                    
                    # Удаляем временный файл
                    os.remove(temp_path)
                    
                    # Если оригинальный файл не WebP, удаляем его
                    if not filename.lower().endswith('.webp'):
                        if os.path.exists(full_path):
                            os.remove(full_path)
                        full_path = webp_path
                        filename = os.path.splitext(filename)[0] + '.webp'
                    
                    print(f"✅ Загружен и сконвертирован: {target_path}/{filename}")
                except Exception as e:
                    print(f"❌ Ошибка конвертации в WebP: {e}")
                    traceback.print_exc()
                    # Сохраняем оригинальный файл, если конвертация не удалась
                    with open(full_path, 'wb') as f:
                        f.write(file_data)
            else:
                # Сохраняем файл как есть
                with open(full_path, 'wb') as f:
                    f.write(file_data)
                print(f"✅ Загружен: {target_path}/{filename}")
            
            # Отправляем успешный ответ
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                'success': True,
                'path': f"{target_path}/{filename}",
                'message': 'File uploaded successfully'
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            print(f"❌ Ошибка при загрузке файла: {e}")
            traceback.print_exc()
            self.send_error(500, f"Upload failed: {str(e)}")
    
    def handle_create_folder(self):
        """Обработка создания папки"""
        try:
            # Получаем параметры из query string
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            
            target_path = query_params.get('path', [None])[0]
            folder_name = query_params.get('name', [None])[0]
            
            if not target_path or not folder_name:
                self.send_error(400, "Missing 'path' or 'name' parameter")
                return
            
            target_path = unquote(target_path)
            folder_name = unquote(folder_name)
            
            # Нормализуем путь (убираем начальные/конечные слэши)
            target_path = target_path.strip('/')
            
            # Проверяем, что путь находится в разрешенных директориях
            allowed_dirs = ['logo', 'assets']
            # Проверяем, что путь начинается с разрешенной директории
            path_allowed = False
            for allowed_dir in allowed_dirs:
                if target_path == allowed_dir or target_path.startswith(allowed_dir + '/'):
                    path_allowed = True
                    break
            
            if not path_allowed:
                self.send_error(403, f"Path not allowed: {target_path}")
                return
            
            # Формируем полный путь
            full_path = os.path.join(os.getcwd(), target_path, folder_name)
            
            # Создаем папку
            os.makedirs(full_path, exist_ok=True)
            
            print(f"✅ Создана папка: {target_path}/{folder_name}")
            
            # Отправляем успешный ответ
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                'success': True,
                'path': f"{target_path}/{folder_name}",
                'message': 'Folder created successfully'
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            print(f"❌ Ошибка при создании папки: {e}")
            traceback.print_exc()
            self.send_error(500, f"Create folder failed: {str(e)}")
    
    def handle_delete_file(self):
        """Обработка удаления файла"""
        try:
            # Получаем путь из query string
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            
            file_path = query_params.get('path', [None])[0]
            if not file_path:
                self.send_error(400, "Missing 'path' parameter")
                return
            
            file_path = unquote(file_path)
            
            # Проверяем, что путь находится в разрешенных директориях
            allowed_dirs = ['logo', 'assets']
            if not any(file_path.startswith(d + '/') for d in allowed_dirs):
                self.send_error(403, "Path not allowed")
                return
            
            # Формируем полный путь
            full_path = os.path.join(os.getcwd(), file_path)
            
            # Проверяем, что это файл, а не папка
            if not os.path.isfile(full_path):
                self.send_error(404, "File not found")
                return
            
            # Удаляем файл
            os.remove(full_path)
            
            print(f"✅ Удален файл: {file_path}")
            
            # Отправляем успешный ответ
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                'success': True,
                'message': 'File deleted successfully'
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            print(f"❌ Ошибка при удалении файла: {e}")
            traceback.print_exc()
            self.send_error(500, f"Delete file failed: {str(e)}")
    
    def handle_delete_folder(self):
        """Обработка удаления папки"""
        try:
            # Получаем путь из query string
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            
            folder_path = query_params.get('path', [None])[0]
            if not folder_path:
                self.send_error(400, "Missing 'path' parameter")
                return
            
            folder_path = unquote(folder_path)
            
            # Проверяем, что путь находится в разрешенных директориях
            allowed_dirs = ['logo', 'assets']
            if not any(folder_path.startswith(d + '/') for d in allowed_dirs):
                self.send_error(403, "Path not allowed")
                return
            
            # Формируем полный путь
            full_path = os.path.join(os.getcwd(), folder_path)
            
            # Проверяем, что это папка
            if not os.path.isdir(full_path):
                self.send_error(404, "Folder not found")
                return
            
            # Удаляем папку со всем содержимым
            shutil.rmtree(full_path)
            
            print(f"✅ Удалена папка: {folder_path}")
            
            # Отправляем успешный ответ
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                'success': True,
                'message': 'Folder deleted successfully'
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            print(f"❌ Ошибка при удалении папки: {e}")
            traceback.print_exc()
            self.send_error(500, f"Delete folder failed: {str(e)}")
    
    def handle_rename_folder(self):
        """Обработка переименования папки"""
        try:
            # Получаем параметры из query string
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            
            folder_path = query_params.get('path', [None])[0]
            new_name = query_params.get('name', [None])[0]
            
            if not folder_path or not new_name:
                self.send_error(400, "Missing 'path' or 'name' parameter")
                return
            
            folder_path = unquote(folder_path)
            new_name = unquote(new_name)
            
            # Проверяем, что путь находится в разрешенных директориях
            allowed_dirs = ['logo', 'assets']
            if not any(folder_path.startswith(d + '/') for d in allowed_dirs):
                self.send_error(403, "Path not allowed")
                return
            
            # Проверяем на недопустимые символы
            if '/' in new_name or '\\' in new_name:
                self.send_error(400, "Folder name cannot contain / or \\")
                return
            
            # Формируем полный путь
            full_path = os.path.join(os.getcwd(), folder_path)
            
            # Проверяем, что это папка
            if not os.path.isdir(full_path):
                self.send_error(404, "Folder not found")
                return
            
            # Формируем новый путь
            parent_dir = os.path.dirname(full_path)
            new_full_path = os.path.join(parent_dir, new_name)
            
            # Проверяем, что папка с таким именем не существует
            if os.path.exists(new_full_path):
                self.send_error(409, "Folder with this name already exists")
                return
            
            # Переименовываем папку
            os.rename(full_path, new_full_path)
            
            # Формируем новый относительный путь
            new_relative_path = os.path.relpath(new_full_path, os.getcwd()).replace('\\', '/')
            
            print(f"✅ Переименована папка: {folder_path} -> {new_relative_path}")
            
            # Отправляем успешный ответ
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                'success': True,
                'path': new_relative_path,
                'message': 'Folder renamed successfully'
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            print(f"❌ Ошибка при переименовании папки: {e}")
            traceback.print_exc()
            self.send_error(500, f"Rename folder failed: {str(e)}")

def main():
    try:
        # Переходим в директорию скрипта
        script_dir = os.path.dirname(os.path.abspath(__file__))
        print(f"📁 Рабочая директория: {script_dir}")
        os.chdir(script_dir)
        
        # Проверяем наличие index.html
        if not os.path.exists('index.html'):
            print("❌ ОШИБКА: index.html не найден в текущей директории")
            print(f"   Искали в: {os.getcwd()}")
            sys.exit(1)
        print("✓ index.html найден")
        
        # Проверяем наличие src/ директории
        if not os.path.exists('src'):
            print("⚠️  ПРЕДУПРЕЖДЕНИЕ: директория src/ не найдена")
        else:
            print("✓ Директория src/ найдена")
        
        # Находим свободный порт
        try:
            actual_port = find_free_port(PORT)
            if actual_port != PORT:
                print(f"⚠️  Порт {PORT} занят, используем порт {actual_port}")
            else:
                print(f"✓ Порт {actual_port} свободен")
        except RuntimeError as e:
            print(f"❌ ОШИБКА при поиске свободного порта: {e}")
            sys.exit(1)
        
        # Создаем сервер
        print(f"\n🚀 Запуск сервера...")
        with socketserver.TCPServer(("", actual_port), MyHTTPRequestHandler) as httpd:
            url = f"http://localhost:{actual_port}"
            print(f"\n{'='*60}")
            print(f"✅ Сервер успешно запущен на {url}")
            print(f"{'='*60}")
            print(f"Откройте в браузере: {url}")
            print("Нажмите Ctrl+C для остановки сервера")
            print(f"{'='*60}\n")
            
            # Автоматически открываем браузер
            try:
                webbrowser.open(url)
            except Exception as e:
                print(f"⚠️  Не удалось открыть браузер автоматически: {e}")
            
            # Запускаем сервер
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n\n🛑 Сервер остановлен пользователем")
                # Показываем статистику при остановке
                total_404 = (MyHTTPRequestHandler._assets_404_count + 
                            MyHTTPRequestHandler._js_404_count + 
                            MyHTTPRequestHandler._other_404_count)
                if total_404 > 0:
                    print(f"\n📊 Статистика 404 ошибок:")
                    if MyHTTPRequestHandler._assets_404_count > 0:
                        print(f"   - Проверки ресурсов (assets/logo/font/): {MyHTTPRequestHandler._assets_404_count}")
                    if MyHTTPRequestHandler._js_404_count > 0:
                        print(f"   - JS файлы: {MyHTTPRequestHandler._js_404_count}")
                    if MyHTTPRequestHandler._other_404_count > 0:
                        print(f"   - Другие: {MyHTTPRequestHandler._other_404_count}")
            except Exception as e:
                print(f"\n❌ КРИТИЧЕСКАЯ ОШИБКА сервера: {e}")
                print(f"   Тип ошибки: {type(e).__name__}")
                print(f"   Трассировка:")
                traceback.print_exc()
                sys.exit(1)
    except Exception as e:
        print(f"\n❌ КРИТИЧЕСКАЯ ОШИБКА при запуске: {e}")
        print(f"   Тип ошибки: {type(e).__name__}")
        print(f"   Трассировка:")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

