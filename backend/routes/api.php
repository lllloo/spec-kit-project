<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ProfileController;
use Illuminate\Support\Facades\Route;

/**
 * API v1 entrypoint。
 * apiPrefix=api/v1 已在 bootstrap/app.php 註冊。
 */

// 公開：健康探測
Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'service' => config('app.name'),
    'time' => now()->toIso8601String(),
]));

// US1：認證流程（公開）
Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:register');

    Route::post('/email/verify', [AuthController::class, 'verifyEmail']);

    Route::post('/email/resend', [AuthController::class, 'resendVerification'])
        ->middleware('throttle:register');

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');
});

// US1 + US2：需登入
Route::middleware('auth:sanctum')->group(function (): void {
    // US1
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // US2 — 個資查/改、頭像上傳
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
});
