<?php

use App\Models\AuditEvent;
use App\Models\Credential;
use App\Models\Member;
use App\Models\PasswordResetToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * US3 / FR-010、FR-013：透過 token 重設密碼
 * - 有效 token + 強密碼 → 200，新密碼可登入
 * - 過期 → 410
 * - 已使用 → 410
 * - 成功時其他 session 全失效
 */
function makeResetToken(Member $member, ?string $plain = null, bool $consumed = false, ?DateTimeInterface $expiresAt = null): array
{
    $plain ??= bin2hex(random_bytes(32));

    PasswordResetToken::create([
        'member_id' => $member->id,
        'token_hash' => hash('sha256', $plain),
        'expires_at' => $expiresAt ?? now()->addMinutes(60),
        'consumed_at' => $consumed ? now() : null,
    ]);

    return ['plain' => $plain];
}

it('resets password with valid token and strong new password', function () {
    $member = Member::factory()->verified()->withCredential('Old1pass!!')->create([
        'email' => 'reset@example.com',
    ]);
    ['plain' => $token] = makeResetToken($member);

    $this->postJson('/api/v1/auth/password/reset', [
        'token' => $token,
        'password' => 'BrandNew1pass',
    ])->assertOk();

    // 新密碼可登入
    $this->postJson('/api/v1/auth/login', [
        'email' => 'reset@example.com',
        'password' => 'BrandNew1pass',
    ])->assertOk();

    // password_changed_at 已更新
    $cred = Credential::where('member_id', $member->id)->first();
    expect(Hash::check('BrandNew1pass', $cred->password_hash))->toBeTrue();

    expect(AuditEvent::where('event_type', 'password.reset.complete')->where('result', 'success')->exists())
        ->toBeTrue();
});

it('rejects expired token with 410', function () {
    $member = Member::factory()->verified()->withCredential()->create();
    ['plain' => $token] = makeResetToken($member, expiresAt: now()->subMinute());

    $this->postJson('/api/v1/auth/password/reset', [
        'token' => $token,
        'password' => 'Strong1pass',
    ])->assertStatus(410);
});

it('rejects already-consumed token with 410', function () {
    $member = Member::factory()->verified()->withCredential()->create();
    ['plain' => $token] = makeResetToken($member, consumed: true);

    $this->postJson('/api/v1/auth/password/reset', [
        'token' => $token,
        'password' => 'Strong1pass',
    ])->assertStatus(410);
});

it('rejects weak new password with 422', function () {
    $member = Member::factory()->verified()->withCredential()->create();
    ['plain' => $token] = makeResetToken($member);

    $this->postJson('/api/v1/auth/password/reset', [
        'token' => $token,
        'password' => 'weak',
    ])->assertStatus(422);
});

it('invalidates all sessions of member after successful reset (FR-010)', function () {
    $member = Member::factory()->verified()->withCredential('Old1pass!!')->create();
    ['plain' => $token] = makeResetToken($member);

    DB::table('sessions')->insert([
        'id' => 'reset-session-a',
        'user_id' => $member->id,
        'ip_address' => '203.0.113.1',
        'user_agent' => 'Browser',
        'payload' => base64_encode(serialize([])),
        'last_activity' => now()->timestamp,
    ]);

    $this->postJson('/api/v1/auth/password/reset', [
        'token' => $token,
        'password' => 'BrandNew1pass',
    ])->assertOk();

    expect(DB::table('sessions')->where('user_id', $member->id)->count())->toBe(0);
});
