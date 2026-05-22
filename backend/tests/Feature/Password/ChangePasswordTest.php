<?php

use App\Models\AuditEvent;
use App\Models\Credential;
use App\Models\Member;
use Illuminate\Support\Facades\DB;

/**
 * US3 / FR-008：登入會員可變更密碼；變更後其他 session 全失效。
 */
it('changes password with correct current_password', function () {
    $member = Member::factory()->verified()->withCredential('Old1pass!!')->create([
        'email' => 'change@example.com',
    ]);

    $this->actingAs($member);

    $response = $this->patchJson('/api/v1/profile/password', [
        'current_password' => 'Old1pass!!',
        'new_password' => 'New1pass!!',
    ]);

    $response->assertOk();

    $member->refresh();
    expect(Credential::where('member_id', $member->id)->first())
        ->password_changed_at->not->toBeNull();

    expect(AuditEvent::where('event_type', 'password.change')->where('result', 'success')->exists())
        ->toBeTrue();
});

it('rejects change when current_password is wrong with 422', function () {
    $member = Member::factory()->verified()->withCredential('Old1pass!!')->create();
    $this->actingAs($member);

    $this->patchJson('/api/v1/profile/password', [
        'current_password' => 'WrongPass1',
        'new_password' => 'New1pass!!',
    ])->assertStatus(422);
});

it('rejects change when new_password fails policy', function () {
    $member = Member::factory()->verified()->withCredential('Old1pass!!')->create();
    $this->actingAs($member);

    // 太短
    $this->patchJson('/api/v1/profile/password', [
        'current_password' => 'Old1pass!!',
        'new_password' => 'short1',
    ])->assertStatus(422);

    // 缺字母
    $this->patchJson('/api/v1/profile/password', [
        'current_password' => 'Old1pass!!',
        'new_password' => '12345678',
    ])->assertStatus(422);

    // 缺數字
    $this->patchJson('/api/v1/profile/password', [
        'current_password' => 'Old1pass!!',
        'new_password' => 'abcdefgh',
    ])->assertStatus(422);
});

it('rejects unauthenticated change with 401', function () {
    $this->patchJson('/api/v1/profile/password', [
        'current_password' => 'whatever',
        'new_password' => 'Strong1pass',
    ])->assertStatus(401);
});

it('invalidates other sessions on password change (FR-008)', function () {
    $member = Member::factory()->verified()->withCredential('Old1pass!!')->create([
        'email' => 'multi@example.com',
    ]);

    // 模擬其他裝置的 session（直接寫入 sessions 表）
    DB::table('sessions')->insert([
        'id' => 'other-session-1',
        'user_id' => $member->id,
        'ip_address' => '203.0.113.1',
        'user_agent' => 'OtherDevice',
        'payload' => base64_encode(serialize([])),
        'last_activity' => now()->timestamp,
    ]);
    DB::table('sessions')->insert([
        'id' => 'other-session-2',
        'user_id' => $member->id,
        'ip_address' => '203.0.113.2',
        'user_agent' => 'Mobile',
        'payload' => base64_encode(serialize([])),
        'last_activity' => now()->timestamp,
    ]);

    $this->actingAs($member);

    $this->patchJson('/api/v1/profile/password', [
        'current_password' => 'Old1pass!!',
        'new_password' => 'New1pass!!',
    ])->assertOk();

    // 其他 session 已被刪除
    expect(DB::table('sessions')->where('user_id', $member->id)->whereIn('id', ['other-session-1', 'other-session-2'])->count())
        ->toBe(0);
});
