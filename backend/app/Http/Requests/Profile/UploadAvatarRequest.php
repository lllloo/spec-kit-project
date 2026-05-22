<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UploadAvatarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        // FR-007：≤ 2MB；限 jpg/png/webp
        return [
            'avatar' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',  // KB
            ],
        ];
    }
}
