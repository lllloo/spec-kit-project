<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // 對齊 contracts/*.openapi.yaml：API 直接回 schema，不包 'data'
        JsonResource::withoutWrapping();

        $this->configureRateLimiters();
    }

    /**
     * spec FR-015：
     * - 註冊（含 verify email 重發）：同 IP/h ≤10
     * - 忘記密碼：同 IP/h ≤10 + 同 Email/h ≤3
     */
    private function configureRateLimiters(): void
    {
        $enabled = (bool) config('app.throttle_enabled', true);

        RateLimiter::for('register', function (Request $request) use ($enabled) {
            return $enabled ? Limit::perHour(10)->by($request->ip()) : Limit::none();
        });

        RateLimiter::for('password-reset', function (Request $request) use ($enabled) {
            if (! $enabled) {
                return Limit::none();
            }

            $email = strtolower((string) $request->input('email', ''));

            return [
                Limit::perHour(10)->by($request->ip()),
                Limit::perHour(3)->by('pwreset:'.$email),
            ];
        });
    }
}
