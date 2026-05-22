<?php

namespace App\Services;

use App\Models\Member;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class AvatarService
{
    private const DISK = 'public';

    public function __construct(private readonly AuditService $audit) {}

    /**
     * 儲存頭像到 storage/app/public/avatars/{uuid}.{ext}。
     * 替換時刪除舊檔避免孤兒。
     */
    public function store(Member $member, UploadedFile $file): string
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        // 安全網：只接受 mime 偵測得到的影像格式
        $ext = match ($ext) {
            'jpg', 'jpeg' => 'jpg',
            'png' => 'png',
            'webp' => 'webp',
            default => 'png',
        };

        $relativePath = 'avatars/'.$member->uuid.'.'.$ext;

        $oldPath = $member->avatar_path;

        Storage::disk(self::DISK)->putFileAs('avatars', $file, $member->uuid.'.'.$ext);

        $member->forceFill(['avatar_path' => $relativePath])->save();

        if ($oldPath !== null && $oldPath !== $relativePath) {
            Storage::disk(self::DISK)->delete($oldPath);
        }

        $this->audit->success('profile.avatar_upload', $member, ['path' => $relativePath]);

        return $relativePath;
    }

    public function urlFor(Member $member): ?string
    {
        return $member->avatar_path
            ? Storage::disk(self::DISK)->url($member->avatar_path)
            : null;
    }
}
