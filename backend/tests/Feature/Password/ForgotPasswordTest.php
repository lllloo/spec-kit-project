<?php

use App\Models\AuditEvent;
use App\Models\Member;
use App\Models\PasswordResetToken;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Support\Facades\Notification;

/**
 * US3 / FR-009、FR-013、FR-015：忘記密碼端點
 * - 不論 email 是否存在，回相同 200 訊息（避免帳號枚舉）
 * - 存在的 email 才實際寄信 + 建立 token，舊 token 作廢
 * - 同 email/h 上限 3 次
 */
beforeEach(function () {
    Notification::fake();
});

it('returns 200 for existing email and sends a notification', function () {
    $member = Member::factory()->verified()->create(['email' => 'real@example.com']);

    $this->postJson('/api/v1/auth/password/forgot', ['email' => 'real@example.com'])
        ->assertOk();

    Notification::assertSentTo($member, ResetPasswordNotification::class);

    expect(PasswordResetToken::where('member_id', $member->id)->whereNull('consumed_at')->count())
        ->toBe(1);

    expect(AuditEvent::where('event_type', 'password.reset.request')->exists())->toBeTrue();
});

it('returns identical 200 for non-existent email (FR-009)', function () {
    $existingResponse = $this->postJson('/api/v1/auth/password/forgot', ['email' => 'ghost@example.com'])
        ->assertOk();

    $body = $existingResponse->json();
    expect($body)->toHaveKey('message');

    Notification::assertNothingSent();
    expect(PasswordResetToken::count())->toBe(0);
});

it('invalidates previously issued tokens when new one is issued (FR-013)', function () {
    $member = Member::factory()->verified()->create(['email' => 'reissue@example.com']);

    $this->postJson('/api/v1/auth/password/forgot', ['email' => 'reissue@example.com'])->assertOk();
    $first = PasswordResetToken::where('member_id', $member->id)->latest('id')->first();
    expect($first->consumed_at)->toBeNull();

    $this->postJson('/api/v1/auth/password/forgot', ['email' => 'reissue@example.com'])->assertOk();

    $first->refresh();
    expect($first->consumed_at)->not->toBeNull();

    $second = PasswordResetToken::where('member_id', $member->id)->latest('id')->first();
    expect($second->id)->not->toBe($first->id);
    expect($second->consumed_at)->toBeNull();
});

it('throttles same-email forgot to 3 per hour (FR-015)', function () {
    Member::factory()->verified()->create(['email' => 'rate@example.com']);

    foreach (range(1, 3) as $_) {
        $this->postJson('/api/v1/auth/password/forgot', ['email' => 'rate@example.com'])
            ->assertOk();
    }

    $this->postJson('/api/v1/auth/password/forgot', ['email' => 'rate@example.com'])
        ->assertStatus(429);
});
