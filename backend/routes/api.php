<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/**
 * API v1 entrypoint。
 * 注意：apiPrefix=api/v1 已在 bootstrap/app.php 註冊，這裡的 Route::xxx
 * 路徑不需再帶 `v1` 前綴。
 *
 * 實際端點將於 Phase 3+（US1/US2/US3）逐步加入；
 * 本檔在 Phase 2 僅放骨架與健康檢查、未登入者基線路由。
 */

// 公開：健康探測
Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'service' => config('app.name'),
    'time' => now()->toIso8601String(),
]));

// 受 Sanctum 保護的範例（後續 US1/US2 會擴充）
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/auth/me', function (Request $request) {
        return response()->json($request->user()?->only([
            'uuid', 'email', 'email_verified_at', 'display_name', 'avatar_path', 'contact_info',
        ]));
    });
});
