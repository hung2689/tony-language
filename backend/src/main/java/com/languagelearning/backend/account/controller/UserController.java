package com.languagelearning.backend.account.controller;

import com.languagelearning.backend.account.Role;
import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserProfile;
import com.languagelearning.backend.account.UserProfileRepository;
import com.languagelearning.backend.account.dto.UserMeResponse;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.level.dto.LevelInfoDto;
import com.languagelearning.backend.level.service.XpService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final CurrentUserProvider currentUserProvider;
    private final UserProfileRepository userProfileRepository;
    private final XpService xpService;

    public UserController(CurrentUserProvider currentUserProvider,
                          UserProfileRepository userProfileRepository,
                          XpService xpService) {
        this.currentUserProvider = currentUserProvider;
        this.userProfileRepository = userProfileRepository;
        this.xpService = xpService;
    }

    @GetMapping("/me")
    public UserMeResponse getCurrentUser() {
        User user = currentUserProvider.getCurrentUser();
        Optional<UserProfile> profileOpt = userProfileRepository.findByUserId(user.getId());
        String displayName = profileOpt
                .map(UserProfile::getDisplayName)
                .orElse(user.getUsername());
        String avatarUrl = profileOpt
                .map(UserProfile::getAvatarUrl)
                .orElse(null);

        LevelInfoDto levelInfo = xpService.getLevelInfo(user.getId());

        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .toList();

        return new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                displayName,
                avatarUrl,
                levelInfo.level(),
                levelInfo.tierId(),
                levelInfo.tierName(),
                roles
        );
    }
}
