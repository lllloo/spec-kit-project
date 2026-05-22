<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Password\ChangePasswordRequest;
use App\Http\Requests\Password\ForgotPasswordRequest;
use App\Http\Requests\Password\ResetPasswordRequest;
use App\Services\ChangePasswordService;
use App\Services\ForgotPasswordService;
use App\Services\ResetPasswordService;
use Illuminate\Http\JsonResponse;

class PasswordController extends Controller
{
    public function __construct(
        private readonly ChangePasswordService $changePassword,
        private readonly ForgotPasswordService $forgotPassword,
        private readonly ResetPasswordService $resetPassword,
    ) {}

    public function change(ChangePasswordRequest $request): JsonResponse
    {
        $this->changePassword->change(
            $request,
            $request->user(),
            (string) $request->string('current_password'),
            (string) $request->string('new_password'),
        );

        return response()->json(['message' => '密碼已變更，請使用新密碼重新登入']);
    }

    /**
     * FR-009：無論 email 是否存在皆回相同 200 訊息。
     */
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        $this->forgotPassword->request((string) $request->string('email'));

        return response()->json(['message' => '若該帳號存在，已寄出密碼重設信']);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $this->resetPassword->reset(
            (string) $request->string('token'),
            (string) $request->string('password'),
        );

        return response()->json(['message' => '密碼已重設，請使用新密碼登入']);
    }
}
