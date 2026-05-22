<?php

use App\Models\EmailVerificationToken;
use App\Models\Member;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
});

it('issues a new token and invalidates older ones (FR-013)', function () {
    $member = Member::factory()->unverified()->withCredential()->create([
        'email' => 'resend@example.com',
    ]);
    $old = EmailVerificationToken::create([
        'member_id' => $member->id,
        'token_hash' => hash('sha256', 'old-token'),
        'expires_at' => now()->addMinutes(60),
    ]);

    $this->postJson('/api/v1/auth/email/resend', ['email' => 'resend@example.com'])->assertOk();

    expect($old->fresh()->consumed_at)->not->toBeNull();
    expect(EmailVerificationToken::where('member_id', $member->id)
        ->whereNull('consumed_at')
        ->count())->toBe(1);
});

it('returns the same response when email does not exist (FR-009 pattern)', function () {
    $response = $this->postJson('/api/v1/auth/email/resend', ['email' => 'ghost@example.com']);

    $response->assertOk()->assertJsonStructure(['message']);
});
