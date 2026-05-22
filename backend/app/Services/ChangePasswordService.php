<?php

namespace App\Services;

use App\Models\Credential;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * FR-008：登入會員變更密碼。
 * - 驗證 current_password
 * - 寫入新密碼雜湊與 password_changed_at
 * - 廢除「其他」session（保留當前 request 的 session）
 * - 寫 audit `password.change`
 */
class ChangePasswordService
{
    public function __construct(private readonly AuditService $audit) {}

    public function change(Request $request, Member $member, string $currentPassword, string $newPassword): void
    {
        $credential = Credential::where('member_id', $member->id)->first();

        if (! $credential || ! Hash::check($currentPassword, $credential->password_hash)) {
            $this->audit->failure('password.change', $member, ['reason' => 'wrong_current_password']);

            throw ValidationException::withMessages([
                'current_password' => ['目前密碼錯誤'],
            ]);
        }

        DB::transaction(function () use ($request, $member, $credential, $newPassword): void {
            $credential->forceFill([
                'password_hash' => $newPassword,  // cast 'hashed' 自動 bcrypt
                'password_changed_at' => now(),
            ])->save();

            $this->invalidateOtherSessions($request, $member);
        });

        $this->audit->success('password.change', $member);
    }

    /**
     * 廢除「其他」session：刪除該 member 名下、id ≠ 當前 session 的 sessions row。
     */
    private function invalidateOtherSessions(Request $request, Member $member): void
    {
        $currentSessionId = $request->hasSession() ? $request->session()->getId() : null;

        $query = DB::table('sessions')->where('user_id', $member->id);

        if ($currentSessionId !== null) {
            $query->where('id', '!=', $currentSessionId);
        }

        $query->delete();
    }
}
