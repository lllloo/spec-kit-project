<?php

namespace Database\Seeders;

use App\Models\Member;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * 建立開發／QA 用的固定測試帳號。
     *
     * 帳號：test@example.com / Password123（已驗證，可直接登入）
     * 密碼符合 FR-002（≥8 字元、含字母與數字）。
     * 具存在性保護，可重複執行（idempotent）。
     */
    public function run(): void
    {
        $email = 'test@example.com';

        if (Member::where('email', $email)->withTrashed()->exists()) {
            return;
        }

        Member::factory()
            ->verified()
            ->withCredential('Password123')
            ->create([
                'email' => $email,
                'display_name' => 'Test User',
            ]);
    }
}
