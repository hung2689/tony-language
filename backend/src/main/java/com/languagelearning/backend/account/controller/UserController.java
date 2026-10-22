package com.languagelearning.backend.account.controller;

import com.languagelearning.backend.account.Role;
import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserProfile;
import com.languagelearning.backend.account.UserProfileRepository;
import com.languagelearning.backend.account.dto.UserMeResponse;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final CurrentUserProvider currentUserProvider;
    private final UserProfileRepository userProfileRepository;

    public UserController(CurrentUserProvider currentUserProvider,
                          UserProfileRepository userProfileRepository) {
        this.currentUserProvider = currentUserProvider;
        this.userProfileRepository = userProfileRepository;
    }

    @GetMapping("/me")
    public UserMeResponse getCurrentUser() {
        User user = currentUserProvider.getCurrentUser();
        String displayName = userProfileRepository.findByUserId(user.getId())
                .map(UserProfile::getDisplayName)
                .orElse(user.getUsername());
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .toList();
        return new UserMeResponse(user.getId(), user.getEmail(), user.getUsername(), displayName, roles);
    }
}
