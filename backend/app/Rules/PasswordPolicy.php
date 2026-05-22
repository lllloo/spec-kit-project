<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * 密碼強度政策（spec FR-002）：≥ 8 字元、含字母與數字。
 */
class PasswordPolicy implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('密碼格式錯誤');

            return;
        }

        if (mb_strlen($value) < 8) {
            $fail('密碼長度至少 8 字元');

            return;
        }

        if (! preg_match('/[A-Za-z]/', $value)) {
            $fail('密碼必須包含至少一個字母');

            return;
        }

        if (! preg_match('/\d/', $value)) {
            $fail('密碼必須包含至少一個數字');
        }
    }
}
