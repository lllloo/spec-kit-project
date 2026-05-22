<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Symfony\Component\HttpFoundation\Response;

/**
 * FR-016：「記住我」14 天滑動續期。
 *
 * Laravel 預設把 remember cookie Max-Age 設為 5 年（一次性）。
 * 本 middleware 對每個已驗證請求重新寫入同名 cookie，把 Max-Age 重設為 14 天，
 * 達到「最近活動後計算」的 sliding 效果。
 */
class SlidingRememberCookie
{
    private const LIFETIME_MINUTES = 60 * 24 * 14;  // 14 天

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! Auth::guard('web')->check()) {
            return $response;
        }

        $cookieName = Auth::guard('web')->getRecallerName();
        $cookieValue = $request->cookies->get($cookieName);

        if ($cookieValue === null) {
            // 未勾「記住我」即無 remember cookie；不延長
            return $response;
        }

        Cookie::queue(
            Cookie::make(
                $cookieName,
                $cookieValue,
                self::LIFETIME_MINUTES,
                config('session.path'),
                config('session.domain'),
                config('session.secure'),
                httpOnly: true,
                sameSite: config('session.same_site'),
            )
        );

        return $response;
    }
}
