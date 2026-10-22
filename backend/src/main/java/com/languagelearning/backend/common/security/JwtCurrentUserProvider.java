package com.languagelearning.backend.common.security;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.exception.ResourceNotFoundException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class JwtCurrentUserProvider implements CurrentUserProvider {

    private final UserRepository userRepository;

    public JwtCurrentUserProvider(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public User getCurrentUser() {
        Long userId = getCurrentUserId();
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "Không tìm thấy người dùng có id: " + userId));
    }

    @Override
    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            throw new IllegalStateException("Không có người dùng nào đang đăng nhập");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            try {
                return Long.parseLong(jwt.getSubject());
            } catch (NumberFormatException e) {
                throw new IllegalStateException("JWT subject không phải là user ID hợp lệ: " + jwt.getSubject());
            }
        }

        // Support string/username principal if needed in custom auth
        if (authentication.getName() != null) {
            try {
                return Long.parseLong(authentication.getName());
            } catch (NumberFormatException ignored) {
            }
            return userRepository.findByEmailIgnoreCase(authentication.getName())
                    .or(() -> userRepository.findByUsernameIgnoreCase(authentication.getName()))
                    .map(User::getId)
                    .orElseThrow(() -> new IllegalStateException("Không xác định được user từ authentication: " + authentication.getName()));
        }

        throw new IllegalStateException("Principal authentication không được hỗ trợ: " + principal);
    }
}
