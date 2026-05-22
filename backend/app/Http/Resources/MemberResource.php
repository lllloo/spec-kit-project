<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 對齊 contracts/auth.openapi.yaml Member schema：
 * uuid / email / email_verified / display_name / avatar_url / contact_info / last_login_at
 */
class MemberResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'uuid' => $this->uuid,
            'email' => $this->email,
            'email_verified' => $this->email_verified_at !== null,
            'email_verified_at' => optional($this->email_verified_at)?->toIso8601String(),
            'display_name' => $this->display_name,
            'avatar_url' => $this->avatar_path
                ? rtrim(config('app.url'), '/').'/storage/'.ltrim($this->avatar_path, '/')
                : null,
            'contact_info' => $this->contact_info,
            'last_login_at' => optional($this->last_login_at)?->toIso8601String(),
        ];
    }
}
