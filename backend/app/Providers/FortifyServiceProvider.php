<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Fortify;

/**
 * 本期使用 Fortify 的 primitives（MustVerifyEmail、PasswordBroker、Password Reset Tokens 等），
 * 但**不**使用 Fortify 預設提供的 Action / Route 流程——所有 endpoint 由 App\Http\Controllers\Api\V1
 * 自行實作（見 tasks T055、T074、T093）。
 *
 * 因此這裡：
 * - 不註冊 createUsersUsing / updateUserPasswordsUsing / resetUserPasswordsUsing 等 binding
 * - 只保留 `login` RateLimiter（plan R8：5 次/分鐘/email+IP）
 * - 不註冊 `two-factor` / `passkeys` RateLimiter（spec Q2 排除）
 */
class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // 本期不使用 Fortify 自身註冊的路由（POST /register、POST /login 等），
        // 所有 endpoint 由 App\Http\Controllers\Api\V1 自行實作於 /api/v1/auth/*
        Fortify::ignoreRoutes();

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(
                Str::lower((string) $request->input(Fortify::username())).'|'.$request->ip()
            );

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
