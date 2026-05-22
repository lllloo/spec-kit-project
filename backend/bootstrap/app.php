<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api/v1',  // contracts/*.openapi.yaml 約定
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum SPA cookie session：API 群組需 stateful
        $middleware->statefulApi();

        // FR-016「記住我」滑動續期：對每個已驗證請求 re-queue remember cookie 14 天
        $middleware->web(append: [
            \App\Http\Middleware\SlidingRememberCookie::class,
        ]);
        $middleware->api(append: [
            \App\Http\Middleware\SlidingRememberCookie::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // 統一 JSON 錯誤格式（FR-012：一致、不洩漏內部狀態）
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'errors' => $e->errors(),
                ], 422);
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => '未登入或工作階段已失效'], 401);
            }
        });

        $exceptions->render(function (TooManyRequestsHttpException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => '請求過於頻繁，請稍後再試'], 429);
            }
        });

        $exceptions->render(function (HttpException $e, Request $request) {
            if (($request->expectsJson() || $request->is('api/*')) && $e->getStatusCode() === 410) {
                return response()->json(['message' => '連結已失效或已被使用'], 410);
            }
        });
    })->create();
