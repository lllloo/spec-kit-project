<?php

use App\Models\AuditEvent;
use App\Models\Credential;
use App\Models\EmailVerificationToken;
use App\Models\Member;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
});

it('registers a new member with valid email and password', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'email' => 'alice@example.com',
        'password' => 'Strong1pass',
        'display_name' => 'Alice',
    ]);

    $response->assertCreated()->assertJsonStructure(['message']);

    $member = Member::where('email', 'alice@example.com')->first();
    expect($member)->not->toBeNull()
        ->and($member->email_verified_at)->toBeNull()
        ->and($member->display_name)->toBe('Alice');

    expect(Credential::where('member_id', $member->id)->exists())->toBeTrue();
    expect(EmailVerificationToken::where('member_id', $member->id)->exists())->toBeTrue();
    expect(AuditEvent::where('member_id', $member->id)->where('event_type', 'registration')->exists())->toBeTrue();
});

it('rejects duplicate email (case-insensitive)', function () {
    Member::factory()->withCredential()->create(['email' => 'bob@example.com']);

    $response = $this->postJson('/api/v1/auth/register', [
        'email' => 'BOB@example.com',
        'password' => 'Strong1pass',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('email');
});

it('rejects password shorter than 8 chars', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'email' => 'short@example.com',
        'password' => 'Aa1',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('password');
});

it('rejects password without letter and digit', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'email' => 'nodigit@example.com',
        'password' => 'onlyletters',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('password');
});

it('normalizes email to lowercase', function () {
    $this->postJson('/api/v1/auth/register', [
        'email' => 'Mixed@Case.Com',
        'password' => 'Strong1pass',
    ])->assertCreated();

    expect(Member::where('email', 'mixed@case.com')->exists())->toBeTrue();
});
