<?php

namespace App\Services;

use App\Models\Member;

class ProfileService
{
    public function __construct(private readonly AuditService $audit) {}

    /**
     * 更新 display_name / contact_info；只更新傳入的欄位。
     */
    public function update(Member $member, array $attributes): Member
    {
        $changed = [];
        foreach (['display_name', 'contact_info'] as $field) {
            if (array_key_exists($field, $attributes)) {
                $member->{$field} = $attributes[$field];
                $changed[] = $field;
            }
        }

        if ($changed === []) {
            return $member;
        }

        $member->save();

        $this->audit->success('profile.update', $member, ['fields' => $changed]);

        return $member;
    }
}
