# Создание ключей доступа в Yandex Cloud

Пошаговая инструкция по созданию ключей доступа для работы с Yandex Object Storage через AWS CLI.

## Шаг 1: Войдите в Yandex Cloud Console

1. Откройте [Yandex Cloud Console](https://console.cloud.yandex.ru/)
2. Войдите в свой аккаунт

## Шаг 2: Создайте сервисный аккаунт

1. В левом меню выберите **"Сервисные аккаунты"** (или перейдите по прямой ссылке: https://console.cloud.yandex.ru/folders/<ваш-folder-id>/iam/service-accounts)

2. Нажмите кнопку **"Создать сервисный аккаунт"**

3. Заполните форму:
   - **Имя**: например, `practicum-banners-deploy` или `s3-deploy`
   - **Описание** (опционально): "Сервисный аккаунт для деплоя в Object Storage"
   - Нажмите **"Создать"**

## Шаг 3: Назначьте роли сервисному аккаунту

1. После создания сервисного аккаунта откройте его
2. Перейдите на вкладку **"Роли"**
3. Нажмите **"Назначить роли"**
4. Выберите роль: **`storage.editor`** (для полного доступа к Object Storage)
   - Или **`storage.uploader`** (только для загрузки файлов)
   - Или **`storage.admin`** (полный административный доступ)
5. Нажмите **"Сохранить"**

## Шаг 4: Создайте статический ключ доступа

1. В карточке сервисного аккаунта перейдите на вкладку **"Ключи"**
2. Нажмите **"Создать новый ключ"**
3. Выберите **"Создать статический ключ доступа"**
4. Нажмите **"Создать"**

## Шаг 5: Сохраните ключи

⚠️ **ВАЖНО**: Ключи будут показаны только один раз! Обязательно сохраните их в безопасном месте.

Вы увидите:
- **Key ID** (это ваш `aws_access_key_id`)
- **Secret** (это ваш `aws_secret_access_key`)

Скопируйте оба значения.

## Шаг 6: Настройте AWS CLI

Выполните команды в терминале, заменив `YOUR_ACCESS_KEY` и `YOUR_SECRET_KEY` на реальные значения:

```bash
aws configure set aws_access_key_id YOUR_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_SECRET_KEY
aws configure set region ru-central1
```

Или создайте файлы вручную:

### Создание файла `~/.aws/credentials`:

```bash
mkdir -p ~/.aws
nano ~/.aws/credentials
```

Добавьте содержимое:

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

### Создание файла `~/.aws/config`:

```bash
nano ~/.aws/config
```

Добавьте содержимое:

```ini
[default]
region = ru-central1
```

## Шаг 7: Проверьте настройку

Проверьте, что всё настроено правильно:

```bash
aws configure list
```

Попробуйте выполнить тестовую команду:

```bash
aws --endpoint-url=https://storage.yandexcloud.net s3 ls
```

Если всё настроено правильно, вы увидите список бакетов (или пустой список, если бакетов ещё нет).

## Альтернативный способ: через Yandex CLI

Если у вас установлен Yandex CLI, вы можете создать ключи через командную строку:

```bash
# Установите Yandex CLI (если ещё не установлен)
# macOS:
brew install yandex-cloud-cli

# Создайте сервисный аккаунт
yc iam service-account create --name practicum-banners-deploy

# Создайте ключ доступа
yc iam access-key create --service-account-name practicum-banners-deploy
```

## Безопасность

⚠️ **Важные рекомендации по безопасности:**

1. **Никогда не коммитьте ключи в Git** — добавьте `~/.aws/` в `.gitignore`
2. **Используйте минимально необходимые права** — роль `storage.uploader` вместо `storage.admin`, если достаточно только загрузки
3. **Регулярно ротируйте ключи** — создавайте новые ключи и удаляйте старые
4. **Храните ключи в безопасном месте** — используйте менеджеры паролей или секреты CI/CD

## Устранение проблем

### Ошибка "Access Denied"

- Проверьте, что сервисному аккаунту назначена роль `storage.editor` или выше
- Убедитесь, что вы используете правильные ключи

### Ошибка "InvalidAccessKeyId"

- Проверьте правильность `aws_access_key_id`
- Убедитесь, что ключ не был удалён

### Ошибка "SignatureDoesNotMatch"

- Проверьте правильность `aws_secret_access_key`
- Убедитесь, что скопировали ключ полностью, без лишних пробелов

## Дополнительные ресурсы

- [Документация Yandex Cloud: Сервисные аккаунты](https://cloud.yandex.ru/docs/iam/concepts/users/service-accounts)
- [Документация Yandex Cloud: Статические ключи доступа](https://cloud.yandex.ru/docs/iam/operations/sa/create-access-key)
- [Документация Yandex Cloud: Роли для Object Storage](https://cloud.yandex.ru/docs/storage/security/)

