<?php

it('returns 401 when not authenticated', function () {
    $this->getJson('/api/v1/profile')->assertStatus(401);
});

it('returns the authenticated member as profile', function () {
    $member = actingAsMember([
        'email' => 'show@example.com',
        'display_name' => 'Shown',
        'contact_info' => 'Discord: shown#1234',
    ]);

    $this->getJson('/api/v1/profile')
        ->assertOk()
        ->assertJson([
            'uuid' => $member->uuid,
            'email' => 'show@example.com',
            'display_name' => 'Shown',
            'contact_info' => 'Discord: shown#1234',
        ]);
});
