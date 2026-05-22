<?php

use Illuminate\Http\Testing\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
});

it('accepts a valid png and stores it', function () {
    $member = actingAsMember();
    $file = UploadedFile::fake()->image('avatar.png', 200, 200);

    $response = $this->postJson('/api/v1/profile/avatar', ['avatar' => $file]);

    $response->assertOk()->assertJsonStructure(['avatar_url']);
    expect($member->fresh()->avatar_path)->not->toBeNull();
    Storage::disk('public')->assertExists($member->fresh()->avatar_path);
});

it('accepts a valid jpg', function () {
    $member = actingAsMember();
    $file = UploadedFile::fake()->image('avatar.jpg', 200, 200);

    $this->postJson('/api/v1/profile/avatar', ['avatar' => $file])->assertOk();
    expect($member->fresh()->avatar_path)->toEndWith('.jpg');
});

it('rejects a file larger than 2MB', function () {
    actingAsMember();
    $file = UploadedFile::fake()->image('big.png')->size(2049);  // 2049 KB > 2 MB

    $this->postJson('/api/v1/profile/avatar', ['avatar' => $file])
        ->assertStatus(422)
        ->assertJsonValidationErrors('avatar');
});

it('rejects an executable disguised by extension', function () {
    actingAsMember();
    // .exe 偽裝為 .png：MIME 不對
    $file = UploadedFile::fake()->create('virus.exe', 100, 'application/x-msdownload');

    $this->postJson('/api/v1/profile/avatar', ['avatar' => $file])
        ->assertStatus(422)
        ->assertJsonValidationErrors('avatar');
});

it('deletes the old avatar when extension changes', function () {
    $member = actingAsMember();

    // 先上傳 jpg
    $first = UploadedFile::fake()->image('first.jpg', 100, 100);
    $this->postJson('/api/v1/profile/avatar', ['avatar' => $first])->assertOk();
    $firstPath = $member->fresh()->avatar_path;
    expect($firstPath)->toEndWith('.jpg');

    // 再上傳 png（不同 ext → 不同檔名 → 應刪舊）
    $second = UploadedFile::fake()->image('second.png', 100, 100);
    $this->postJson('/api/v1/profile/avatar', ['avatar' => $second])->assertOk();
    $secondPath = $member->fresh()->avatar_path;

    expect($secondPath)->toEndWith('.png')->not->toBe($firstPath);
    Storage::disk('public')->assertMissing($firstPath);
    Storage::disk('public')->assertExists($secondPath);
});

it('overwrites the file when same extension is re-uploaded (no orphan)', function () {
    $member = actingAsMember();

    $first = UploadedFile::fake()->image('first.png', 100, 100);
    $this->postJson('/api/v1/profile/avatar', ['avatar' => $first])->assertOk();
    $path = $member->fresh()->avatar_path;

    $second = UploadedFile::fake()->image('second.png', 100, 100);
    $this->postJson('/api/v1/profile/avatar', ['avatar' => $second])->assertOk();

    // 路徑相同（同副檔名直接覆寫），不留孤兒檔
    expect($member->fresh()->avatar_path)->toBe($path);
    Storage::disk('public')->assertExists($path);
});
