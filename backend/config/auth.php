<?php

use App\Models\Member;

return [

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'web'),
        'passwords' => env('AUTH_PASSWORD_BROKER', 'members'),
    ],

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'members',
        ],
    ],

    // 對齊 spec：原 Laravel `users` 表重新命名為 `members`，model 為 App\Models\Member
    'providers' => [
        'members' => [
            'driver' => 'eloquent',
            'model' => env('AUTH_MODEL', Member::class),
        ],
    ],

    'passwords' => [
        'members' => [
            'provider' => 'members',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,  // FR-010：60 分鐘
            'throttle' => 60,
        ],
    ],

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];
