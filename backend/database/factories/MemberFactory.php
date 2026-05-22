<?php

namespace Database\Factories;

use App\Models\Credential;
use App\Models\Member;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Member>
 */
class MemberFactory extends Factory
{
    protected $model = Member::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'email' => fake()->unique()->safeEmail(),
            'display_name' => fake()->name(),
            'email_verified_at' => now(),
        ];
    }

    public function verified(): static
    {
        return $this->state(fn () => ['email_verified_at' => now()]);
    }

    public function unverified(): static
    {
        return $this->state(fn () => ['email_verified_at' => null]);
    }

    public function locked(int $minutes = 1): static
    {
        return $this->state(fn () => ['locked_until' => now()->addMinutes($minutes)]);
    }

    /**
     * 同步建立對應 Credential（預設密碼：password123）
     */
    public function withCredential(string $plainPassword = 'password123'): static
    {
        return $this->afterCreating(function (Member $member) use ($plainPassword): void {
            Credential::create([
                'member_id' => $member->id,
                'password_hash' => $plainPassword,  // cast 'hashed' 自動 bcrypt
                'password_changed_at' => now(),
            ]);
        });
    }
}
