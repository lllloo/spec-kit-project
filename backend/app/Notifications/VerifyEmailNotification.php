<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly string $plainToken) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendBase = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');
        $verifyUrl = $frontendBase.'/verify-email?token='.$this->plainToken;

        return (new MailMessage)
            ->subject('請驗證您的 Email — '.config('app.name'))
            ->greeting('您好！')
            ->line('感謝註冊。請點擊下方連結完成 Email 驗證（60 分鐘內有效）。')
            ->action('驗證 Email', $verifyUrl)
            ->line('如果您未進行此操作，可忽略本信。');
    }
}
