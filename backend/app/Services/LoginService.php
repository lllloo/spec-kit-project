<?php

namespace App\Services;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class LoginService
{
    public function __construct(private readonly AuditService $audit) {}

    /**
     * 登入流程：
     * 1. 透過 Auth::attempt 驗證憑證（自動觸發 Credential password_hash 比對）
     * 2. 已鎖定 / 未驗證 / 密碼錯誤 → 一致 422（FR-012）
     * 3. 成功 → 寫 audit、更新 last_login_at；session regenerate
     */
    public function attempt(Request $request, string $email, string $password, bool $remember = false): Member
    {
        $email = strtolower($email);
        $member = Member::where('email', $email)->first();

        // 一致訊息常數，避免洩漏 enum
        $invalid = ValidationException::withMessages([
            'email' => ['認證失敗，請確認帳號狀態或重新嘗試'],
        ]);

        if ($member?->isLocked()) {
            $this->audit->failure('login.failure', $member, ['reason' => 'locked']);
            throw $invalid;
        }

        if (! Auth::attempt(['email' => $email, 'password' => $password], $remember)) {
            $this->audit->failure('login.failure', $member, ['reason' => 'bad_credentials']);
            throw $invalid;
        }

        /** @var Member $loggedIn */
        $loggedIn = Auth::user();

        if ($loggedIn->email_verified_at === null) {
            Auth::logout();
            $this->audit->failure('login.failure', $loggedIn, ['reason' => 'unverified']);
            throw $invalid;
        }

        $request->session()->regenerate();

        $loggedIn->forceFill(['last_login_at' => now()])->save();

        $this->audit->success('login.success', $loggedIn);

        return $loggedIn;
    }

    public function logout(Request $request): void
    {
        $member = Auth::user();

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($member) {
            $this->audit->success('logout', $member);
        }
    }
}
