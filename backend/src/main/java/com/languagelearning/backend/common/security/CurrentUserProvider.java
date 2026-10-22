package com.languagelearning.backend.common.security;

import com.languagelearning.backend.account.User;

public interface CurrentUserProvider {
    User getCurrentUser();
    Long getCurrentUserId();
}
