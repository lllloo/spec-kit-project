<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'display_name' => ['sometimes', 'nullable', 'string', 'max:64'],
            'contact_info' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
