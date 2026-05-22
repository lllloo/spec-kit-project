<?php

it('returns 401 when not authenticated', function () {
    $this->getJson('/api/v1/auth/me')->assertStatus(401);
});

it('returns Member resource when authenticated', function () {
    $member = actingAsMember(['email' => 'me@example.com', 'display_name' => 'Me']);

    $this->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJson([
            'uuid' => $member->uuid,
            'email' => 'me@example.com',
            'display_name' => 'Me',
        ]);
});
