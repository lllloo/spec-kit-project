<?php

namespace App\Http\Requests\Password;

use App\Rules\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'min:32'],
            'password' => ['required', 'string', new PasswordPolicy],
        ];
    }
}
