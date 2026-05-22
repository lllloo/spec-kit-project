<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\MemberResource;
use App\Models\Member;
use App\Notifications\VerifyEmailNotification;
use App\Services\AuditService;
use App\Services\EmailVerificationService;
use App\Services\LoginService;
use App\Services\RegistrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AuthController extends Controller
{
    public function __construct(
        private readonly RegistrationService $registration,
        private readonly EmailVerificationService $emailVerification,
        private readonly LoginService $login,
        private readonly AuditService $audit,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $this->registration->register(
            $request->string('email'),
            $request->string('password'),
            $request->input('display_name'),
        );

        return response()->json(
            ['message' => '註冊成功，請至信箱收取驗證信'],
            Response::HTTP_CREATED,
        );
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $request->validate(['token' => 'required|string|min:32']);

        $this->emailVerification->verify($request->string('token'));

        return response()->json(['message' => 'Email 已驗證完成，可以登入了']);
    }

    /**
     * 重發驗證信。
     * FR-009 pattern：無論 email 是否存在皆回一致 200，避免帳號枚舉。
     */
    public function resendVerification(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|string|email:rfc']);

        $email = strtolower($request->string('email'));
        $member = Member::where('email', $email)->first();

        if ($member && $member->email_verified_at === null) {
            $plainToken = $this->registration->issueVerificationToken($member);
            $member->notify(new VerifyEmailNotification($plainToken));
            $this->audit->success('email.verification.request', $member);
        }

        return response()->json(['message' => '若該帳號存在且尚未驗證，已重新寄出驗證信']);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $member = $this->login->attempt(
            $request,
            $request->string('email'),
            $request->string('password'),
            $request->boolean('remember'),
        );

        return response()->json([
            'message' => '登入成功',
            'member' => new MemberResource($member),
        ]);
    }

    public function logout(Request $request): Response
    {
        $this->login->logout($request);

        return response()->noContent();
    }

    public function me(Request $request): MemberResource
    {
        return new MemberResource($request->user());
    }
}
