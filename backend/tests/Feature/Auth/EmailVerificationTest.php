<?php

use App\Models\EmailVerificationToken;
use App\Models\Member;

function makeVerificationToken(Member $member, ?string $plain = null, bool $consumed = false, ?\DateTimeInterface $expiresAt = null): array
{
    $plain ??= bin2hex(random_bytes(32));

    EmailVerificationToken::create([
        'member_id' => $member->id,
        'token_hash' => hash('sha256', $plain),
        'expires_at' => $expiresAt ?? now()->addMinutes(60),
        'consumed_at' => $consumed ? now() : null,
    ]);

    return ['plain' => $plain];
}

it('verifies email with a valid token', function () {
    $member = Member::factory()->unverified()->create();
    ['plain' => $token] = makeVerificationToken($member);

    $response = $this->postJson('/api/v1/auth/email/verify', ['token' => $token]);

    $response->assertOk();
    expect($member->fresh()->email_verified_at)->not->toBeNull();
});

it('rejects an expired token with 410', function () {
    $member = Member::factory()->unverified()->create();
    ['plain' => $token] = makeVerificationToken($member, expiresAt: now()->subMinute());

    $this->postJson('/api/v1/auth/email/verify', ['token' => $token])->assertStatus(410);
    expect($member->fresh()->email_verified_at)->toBeNull();
});

it('rejects an already-consumed token with 410', function () {
    $member = Member::factory()->unverified()->create();
    ['plain' => $token] = makeVerificationToken($member, consumed: true);

    $this->postJson('/api/v1/auth/email/verify', ['token' => $token])->assertStatus(410);
});

it('invalidates older token when a newer one is issued (FR-013)', function () {
    $member = Member::factory()->unverified()->withCredential()->create();
    ['plain' => $oldToken] = makeVerificationToken($member);

    // 申請重發 → 舊 token 應作廢
    $this->postJson('/api/v1/auth/email/resend', ['email' => $member->email])->assertOk();

    // 舊 token 已不可用
    $this->postJson('/api/v1/auth/email/verify', ['token' => $oldToken])->assertStatus(410);
});
