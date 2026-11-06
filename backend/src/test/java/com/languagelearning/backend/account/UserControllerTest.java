package com.languagelearning.backend.account;

import com.languagelearning.backend.account.controller.UserController;
import com.languagelearning.backend.account.dto.UserMeResponse;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private CurrentUserProvider currentUserProvider;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private com.languagelearning.backend.level.service.XpService xpService;

    @InjectMocks
    private UserController userController;

    @Test
    @DisplayName("GET /api/users/me returns current user info")
    void getCurrentUser_ReturnsCurrentUserMeResponse() {
        User user = new User("dev@languagelearning.com", "hash", "dev_user", User.STATUS_ACTIVE);
        user.setId(1L);
        UserProfile profile = new UserProfile(user, "Developer");

        when(currentUserProvider.getCurrentUser()).thenReturn(user);
        when(userProfileRepository.findByUserId(1L)).thenReturn(Optional.of(profile));
        when(xpService.getLevelInfo(1L)).thenReturn(new com.languagelearning.backend.level.dto.LevelInfoDto(
                1, 0L, 0L, 100L, 1, "Đồng", false
        ));

        UserMeResponse response = userController.getCurrentUser();

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("dev@languagelearning.com", response.getEmail());
        assertEquals("dev_user", response.getUsername());
        assertEquals("Developer", response.getDisplayName());
    }
}
