<?php

namespace App\Services;

use App\Models\Credential;
use App\Models\EmailVerificationToken;
use App\Models\Member;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RegistrationService
{
    public function __construct(private readonly AuditService $audit) {}

    /**
     * 建立 Member + Credential + EmailVerificationToken；
     * 寄發驗證信（queued）；寫 audit `registration`。
     */
    public function register(string $email, string $password, ?string $displayName): Member
    {
        $email = strtolower($email);

        return DB::transaction(function () use ($email, $password, $displayName) {
            $member = Member::create([
                'email' => $email,
                'display_name' => $displayName,
            ]);

            Credential::create([
                'member_id' => $member->id,
                'password_hash' => $password,  // cast 'hashed' 自動 bcrypt
                'password_changed_at' => now(),
            ]);

            $plainToken = $this->issueVerificationToken($member);

            $member->notify(new VerifyEmailNotification($plainToken));

            $this->audit->success('registration', $member);

            return $member;
        });
    }

    /**
     * 為 member 建立一張新驗證 token，並把同 member 既有未消費的全部作廢（FR-013）。
     * 回傳原始 token（只保存 hash）。
     */
    public function issueVerificationToken(Member $member): string
    {
        $plain = bin2hex(random_bytes(32));

        EmailVerificationToken::where('member_id', $member->id)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        EmailVerificationToken::create([
            'member_id' => $member->id,
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addMinutes(60),
            'created_at' => now(),
        ]);

        return $plain;
    }
}
