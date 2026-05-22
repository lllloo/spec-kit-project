<?php

it('responds 200 on /api/v1/health', function () {
    $response = $this->getJson('/api/v1/health');

    $response->assertOk()
        ->assertJsonStructure(['status', 'service', 'time'])
        ->assertJson(['status' => 'ok']);
});
