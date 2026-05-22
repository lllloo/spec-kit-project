<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\Member;
use Illuminate\Http\Request;

/**
 * 單一寫入入口；自動帶當前請求的 ip / user-agent。
 * 對應 spec FR-014：登入成功/失敗、密碼變更、密碼重設、帳號鎖定等關鍵事件。
 */
class AuditService
{
    public function __construct(private readonly ?Request $request = null) {}

    public function record(
        string $event,
        string $result,
        ?Member $member = null,
        array $metadata = [],
    ): AuditEvent {
        $request = $this->request ?? request();

        return AuditEvent::create([
            'member_id' => $member?->id,
            'event_type' => $event,
            'result' => $result,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'metadata' => $metadata ?: null,
            'created_at' => now(),
        ]);
    }

    public function success(string $event, ?Member $member = null, array $metadata = []): AuditEvent
    {
        return $this->record($event, 'success', $member, $metadata);
    }

    public function failure(string $event, ?Member $member = null, array $metadata = []): AuditEvent
    {
        return $this->record($event, 'failure', $member, $metadata);
    }
}
