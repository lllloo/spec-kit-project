<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class Member extends Authenticatable implements MustVerifyEmail
{
    use HasFactory;
    use Notifiable;
    use SoftDeletes;

    protected $table = 'members';

    protected $fillable = [
        'uuid',
        'email',
        'display_name',
        'avatar_path',
        'contact_info',
    ];

    protected $hidden = [
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Member $member): void {
            $member->uuid ??= (string) Str::uuid();
        });
    }

    // 密碼存於 credentials 表，Auth::attempt 透過此回傳值校驗
    public function getAuthPassword(): string
    {
        return $this->credential?->password_hash ?? '';
    }

    public function credential(): HasOne
    {
        return $this->hasOne(Credential::class);
    }

    public function auditEvents(): HasMany
    {
        return $this->hasMany(AuditEvent::class);
    }
}
