<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Requests\Profile\UploadAvatarRequest;
use App\Http\Resources\MemberResource;
use App\Services\AvatarService;
use App\Services\ProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(
        private readonly ProfileService $profile,
        private readonly AvatarService $avatar,
    ) {}

    public function show(Request $request): MemberResource
    {
        return new MemberResource($request->user());
    }

    public function update(UpdateProfileRequest $request): MemberResource
    {
        $updated = $this->profile->update($request->user(), $request->validated());

        return new MemberResource($updated);
    }

    public function uploadAvatar(UploadAvatarRequest $request): JsonResponse
    {
        $this->avatar->store($request->user(), $request->file('avatar'));
        $member = $request->user()->fresh();

        return response()->json([
            'avatar_url' => $this->avatar->urlFor($member),
        ]);
    }
}
