<?php

namespace App\Services;

use App\Models\Credential;
use App\Models\PasswordResetToken;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * FR-010、FR-013：透過 token 重設密碼。
 *
 * - 驗證 token（存在、未消費、未過期）
 * - 失敗一律回 410，不洩漏哪種狀態
 * - 成功：更新 credential、消費 token、廢除「全部」sessions（FR-008 衍生）
 */
class ResetPasswordService
{
    public function __construct(private readonly AuditService $audit) {}

    public function reset(string $plainToken, string $newPassword): void
    {
        $tokenHash = hash('sha256', $plainToken);

        $token = PasswordResetToken::with('member.credential')
            ->where('token_hash', $tokenHash)
            ->first();

        if (! $token || ! $token->isUsable()) {
            throw new HttpException(410, '連結已失效或已被使用');
        }

        $member = $token->member;

        DB::transaction(function () use ($token, $member, $newPassword): void {
            $token->forceFill(['consumed_at' => now()])->save();

            $credential = Credential::where('member_id', $member->id)->first();
            $credential->forceFill([
                'password_hash' => $newPassword,
                'password_changed_at' => now(),
            ])->save();

            // 廢除該 member 全部 session（含當前；本端點不需要登入）
            DB::table('sessions')->where('user_id', $member->id)->delete();
        });

        $this->audit->success('password.reset.complete', $member);
    }
}
