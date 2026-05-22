<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Sanctum stateful 偵測讀 Referer/Origin；測試預設無此 header → 視為非 SPA → 不啟 session
        $this->defaultHeaders = array_merge($this->defaultHeaders, [
            'Referer' => 'http://localhost',
            'Origin' => 'http://localhost',
        ]);
    }
}
