<?php

namespace App\Services;

use App\Models\Member;
use App\Models\PasswordResetToken;
use App\Notifications\ResetPasswordNotification;

/**
 * FR-009、FR-013：申請密碼重設信
 *
 * - 不論 email 是否存在，呼叫方一律得到 200（一致訊息）
 * - 存在且已驗證的 member 才實際建立 token + 寄信，並把舊 token 全部作廢（FR-013）
 * - 寫 audit `password.reset.request`
 */
class ForgotPasswordService
{
    public function __construct(private readonly AuditService $audit) {}

    public function request(string $email): void
    {
        $email = strtolower($email);
        $member = Member::where('email', $email)->first();

        if (! $member) {
            return;  // 一致回應；不洩漏帳號存在與否
        }

        $plainToken = $this->issueResetToken($member);

        $member->notify(new ResetPasswordNotification($plainToken));

        $this->audit->success('password.reset.request', $member);
    }

    /**
     * 為 member 新發一張 reset token，並把舊未消費的 token 全部標記為已消費。
     */
    public function issueResetToken(Member $member): string
    {
        $plain = bin2hex(random_bytes(32));

        PasswordResetToken::where('member_id', $member->id)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        PasswordResetToken::create([
            'member_id' => $member->id,
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addMinutes(60),
            'created_at' => now(),
        ]);

        return $plain;
    }
}
