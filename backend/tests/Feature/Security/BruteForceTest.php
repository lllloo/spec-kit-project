<?php

use App\Models\AuditEvent;
use App\Models\Member;

/**
 * SC-006 baseline：登入暴力攻擊防護
 *
 * - 同 email+IP 每分鐘 5 次（FortifyServiceProvider 的 RateLimiter::for('login')）
 * - 第 6 次起回 429，且必須寫入 audit `login.lockout`
 */
it('locks out after 5 failed login attempts and writes audit login.lockout', function () {
    Member::factory()->verified()->withCredential('Strong1pass')->create([
        'email' => 'attacker-target@example.com',
    ]);

    foreach (range(1, 5) as $_) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'attacker-target@example.com',
            'password' => 'WrongPass1',
        ])->assertStatus(422);
    }

    // 第 6 次：throttle 觸發
    $this->postJson('/api/v1/auth/login', [
        'email' => 'attacker-target@example.com',
        'password' => 'WrongPass1',
    ])->assertStatus(429);

    expect(
        AuditEvent::where('event_type', 'login.lockout')
            ->where('result', 'failure')
            ->exists()
    )->toBeTrue();
});

it('records login.lockout with member id when email matches', function () {
    $member = Member::factory()->verified()->withCredential('Strong1pass')->create([
        'email' => 'attribution@example.com',
    ]);

    foreach (range(1, 5) as $_) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'attribution@example.com',
            'password' => 'WrongPass1',
        ]);
    }
    $this->postJson('/api/v1/auth/login', [
        'email' => 'attribution@example.com',
        'password' => 'WrongPass1',
    ])->assertStatus(429);

    expect(
        AuditEvent::where('event_type', 'login.lockout')
            ->where('member_id', $member->id)
            ->exists()
    )->toBeTrue();
});
