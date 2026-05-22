<?php

use App\Models\Member;

it('logs in a verified member with correct credentials', function () {
    $member = Member::factory()->verified()->withCredential('Strong1pass')->create([
        'email' => 'login@example.com',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'login@example.com',
        'password' => 'Strong1pass',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['message', 'member' => ['uuid', 'email']]);

    $this->assertAuthenticatedAs($member);
});

it('rejects unverified member with consistent message', function () {
    Member::factory()->unverified()->withCredential('Strong1pass')->create([
        'email' => 'unverified@example.com',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'unverified@example.com',
        'password' => 'Strong1pass',
    ]);

    // FR-012 一致訊息：不洩漏「未驗證」這個狀態，回 422 同 wrong-password
    $response->assertStatus(422);
    $this->assertGuest();
});

it('rejects wrong password with 422', function () {
    Member::factory()->verified()->withCredential('Strong1pass')->create([
        'email' => 'wrongpw@example.com',
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'wrongpw@example.com',
        'password' => 'WrongPass1',
    ])->assertStatus(422);

    $this->assertGuest();
});

it('locks account after 5 failed attempts (Fortify login limiter, plan R8)', function () {
    Member::factory()->verified()->withCredential('Strong1pass')->create([
        'email' => 'brute@example.com',
    ]);

    foreach (range(1, 5) as $_) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'brute@example.com',
            'password' => 'WrongPass1',
        ])->assertStatus(422);
    }

    // 第 6 次：被 throttle:login 鎖住
    $this->postJson('/api/v1/auth/login', [
        'email' => 'brute@example.com',
        'password' => 'WrongPass1',
    ])->assertStatus(429);
});

it('sets remember cookie when remember=true (FR-016)', function () {
    Member::factory()->verified()->withCredential('Strong1pass')->create([
        'email' => 'remember@example.com',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'remember@example.com',
        'password' => 'Strong1pass',
        'remember' => true,
    ])->assertOk();

    $cookies = collect($response->headers->getCookies())
        ->filter(fn ($c) => str_starts_with($c->getName(), 'remember_'));
    expect($cookies)->not->toBeEmpty();
});

it('does not set remember cookie when remember=false', function () {
    Member::factory()->verified()->withCredential('Strong1pass')->create([
        'email' => 'noremember@example.com',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'noremember@example.com',
        'password' => 'Strong1pass',
    ])->assertOk();

    $cookies = collect($response->headers->getCookies())
        ->filter(fn ($c) => str_starts_with($c->getName(), 'remember_'));
    expect($cookies)->toBeEmpty();
});
