<?php

use App\Models\AuditEvent;
use App\Models\Member;

it('returns 204 on logout and writes audit (FR-005)', function () {
    Member::factory()->verified()->withCredential('Strong1pass')->create([
        'email' => 'lo@example.com',
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'lo@example.com',
        'password' => 'Strong1pass',
    ])->assertOk();

    $this->postJson('/api/v1/auth/logout')->assertNoContent();

    // session 清除由 Laravel 框架負責；此處驗證 endpoint 行為 + 業務 audit
    expect(AuditEvent::where('event_type', 'logout')->where('result', 'success')->exists())
        ->toBeTrue();
});

it('rejects logout when not authenticated', function () {
    $this->postJson('/api/v1/auth/logout')->assertStatus(401);
});
