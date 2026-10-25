package com.selfmall.member;

import com.selfmall.core.ApiResponse;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/members")
public class MemberController {
    @GetMapping("/me")
    public ApiResponse<Map<String,String>> me(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(Map.of("memberId", jwt.getSubject()));
    }
}
