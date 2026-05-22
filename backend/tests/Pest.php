<?php

use App\Models\Credential;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
*/

uses(TestCase::class)->in('Feature', 'Unit');
uses(RefreshDatabase::class)->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
*/

expect()->extend('toBeOne', fn () => $this->toBe(1));

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * 建立已驗證會員 + 對應 Credential，並登入。
 * 給 Feature test 在「需要登入態」的情境使用。
 */
function actingAsMember(?array $attributes = null, string $password = 'password123'): Member
{
    $member = Member::factory()->verified()->create($attributes ?? []);
    Credential::create([
        'member_id' => $member->id,
        'password_hash' => $password,
        'password_changed_at' => now(),
    ]);

    test()->actingAs($member);

    return $member;
}
