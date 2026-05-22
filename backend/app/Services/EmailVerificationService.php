<?php

namespace App\Services;

use App\Models\EmailVerificationToken;
use Symfony\Component\HttpKernel\Exception\HttpException;

class EmailVerificationService
{
    public function __construct(private readonly AuditService $audit) {}

    /**
     * 驗證 token：成功則消費並更新 member.email_verified_at；
     * 失敗（過期/已使用/不存在）擲 410。
     */
    public function verify(string $plainToken): void
    {
        $tokenHash = hash('sha256', $plainToken);

        $token = EmailVerificationToken::with('member')
            ->where('token_hash', $tokenHash)
            ->first();

        if (! $token || ! $token->isUsable()) {
            // 不存在 / 已使用 / 已過期 → 一致 410，不洩漏哪一種
            throw new HttpException(410, '連結已失效或已被使用');
        }

        $member = $token->member;

        $token->forceFill([
            'consumed_at' => now(),
        ])->save();

        if ($member->email_verified_at === null) {
            $member->forceFill(['email_verified_at' => now()])->save();
        }

        $this->audit->success('email.verification.complete', $member);
    }
}
