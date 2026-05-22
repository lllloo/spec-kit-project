<?php

it('updates display_name and contact_info', function () {
    $member = actingAsMember(['display_name' => 'Old', 'contact_info' => null]);

    $this->patchJson('/api/v1/profile', [
        'display_name' => 'New Name',
        'contact_info' => 'IG: newname',
    ])->assertOk()
      ->assertJson([
          'display_name' => 'New Name',
          'contact_info' => 'IG: newname',
      ]);

    expect($member->fresh()->display_name)->toBe('New Name');
    expect($member->fresh()->contact_info)->toBe('IG: newname');
});

it('rejects display_name longer than 64', function () {
    actingAsMember();

    $this->patchJson('/api/v1/profile', [
        'display_name' => str_repeat('x', 65),
    ])->assertStatus(422)->assertJsonValidationErrors('display_name');
});

it('rejects unauthenticated update with 401', function () {
    $this->patchJson('/api/v1/profile', ['display_name' => 'X'])->assertStatus(401);
});

it('writes an audit event on successful update', function () {
    $member = actingAsMember();

    $this->patchJson('/api/v1/profile', ['display_name' => 'Audit Me'])->assertOk();

    expect(\App\Models\AuditEvent::where('event_type', 'profile.update')
        ->where('member_id', $member->id)
        ->exists())->toBeTrue();
});
