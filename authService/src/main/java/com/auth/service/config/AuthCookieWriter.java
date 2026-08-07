package com.auth.service.config;

import java.time.Duration;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import com.auth.service.web.dto.auth.AuthTokensResponse;

import jakarta.servlet.http.HttpServletResponse;

@Component
public class AuthCookieWriter {

    public static final String ACCESS_COOKIE = "access_token";
    public static final String REFRESH_COOKIE = "refresh_token";

    private static final long ACCESS_COOKIE_TTL_SECONDS = 7 * 24 * 3600;
    private static final long REFRESH_COOKIE_TTL_SECONDS = 7 * 24 * 3600;

    public void setAuthCookies(HttpServletResponse response, AuthTokensResponse tokens) {
        if (tokens == null) {
            return;
        }
        addCookie(response, ACCESS_COOKIE, tokens.accessToken(), ACCESS_COOKIE_TTL_SECONDS);
        addCookie(response, REFRESH_COOKIE, tokens.refreshToken(), REFRESH_COOKIE_TTL_SECONDS);
    }

    public void clearAuthCookies(HttpServletResponse response) {
        addCookie(response, ACCESS_COOKIE, "", 0);
        addCookie(response, REFRESH_COOKIE, "", 0);
    }

    private void addCookie(HttpServletResponse response, String name, String value, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofSeconds(maxAgeSeconds))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
