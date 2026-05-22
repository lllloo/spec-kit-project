# Member System backend image
# Base: php:8.4-cli + Laravel 12 必備擴充 + Composer 2
FROM php:8.4-cli

# 系統相依（gd / zip / intl 編譯所需）
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libzip-dev \
        libpng-dev \
        libjpeg-dev \
        libwebp-dev \
        libicu-dev \
        libonig-dev \
    && rm -rf /var/lib/apt/lists/*

# PHP 擴充
RUN docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        bcmath \
        gd \
        zip \
        intl \
        pcntl \
        exif

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Opcache config（dev 友好：revalidate frequency 0）
RUN docker-php-ext-install opcache \
    && { \
        echo 'opcache.enable=1'; \
        echo 'opcache.enable_cli=0'; \
        echo 'opcache.validate_timestamps=1'; \
        echo 'opcache.revalidate_freq=0'; \
    } > /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /var/www/html

EXPOSE 8000

# 預設啟動 dev server；docker-compose 中可被 command 覆蓋（如 queue:work）
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
