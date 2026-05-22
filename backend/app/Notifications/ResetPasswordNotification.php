<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification implements ShouldQueue
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
        $resetUrl = $frontendBase.'/reset-password?token='.$this->plainToken;

        return (new MailMessage)
            ->subject('密碼重設請求 — '.config('app.name'))
            ->greeting('您好！')
            ->line('我們收到了您的密碼重設請求，請點擊下方連結重設您的密碼（60 分鐘內有效）。')
            ->action('重設密碼', $resetUrl)
            ->line('如果您未發出此請求，請忽略此信件；您的密碼不會被變更。');
    }
}
