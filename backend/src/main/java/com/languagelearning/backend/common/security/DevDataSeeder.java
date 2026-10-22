package com.languagelearning.backend.common.security;

import com.languagelearning.backend.account.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    public static final String DEV_USER_EMAIL = "dev@languagelearning.com";
    public static final String DEV_USERNAME = "dev_user";
    public static final String DEV_PASSWORD = "DevPassword123!";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public DevDataSeeder(UserRepository userRepository,
                         RoleRepository roleRepository,
                         UserProfileRepository userProfileRepository,
                         PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userProfileRepository = userProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        Role userRole = roleRepository.findByName("USER")
                .orElseGet(() -> roleRepository.save(new Role("USER")));

        userRepository.findByEmailIgnoreCase(DEV_USER_EMAIL).ifPresentOrElse(
                user -> {
                    boolean updated = false;
                    if (user.getPasswordHash().startsWith("{noop}")) {
                        user.setPasswordHash(passwordEncoder.encode(DEV_PASSWORD));
                        updated = true;
                    }
                    if (user.getRoles().isEmpty()) {
                        user.getRoles().add(userRole);
                        updated = true;
                    }
                    if (updated) {
                        userRepository.save(user);
                        log.info("Updated dev seed user with BCrypt password hash and USER role");
                    }
                    if (userProfileRepository.findByUserId(user.getId()).isEmpty()) {
                        userProfileRepository.save(new UserProfile(user, "Developer"));
                        log.info("Created user profile for dev user");
                    }
                    log.info("Dev seed user already exists with id: {}", user.getId());
                },
                () -> {
                    User newUser = new User(
                            DEV_USER_EMAIL,
                            passwordEncoder.encode(DEV_PASSWORD),
                            DEV_USERNAME,
                            User.STATUS_ACTIVE
                    );
                    newUser.getRoles().add(userRole);
                    User saved = userRepository.save(newUser);
                    userProfileRepository.save(new UserProfile(saved, "Developer"));
                    log.info("Created dev seed user with id: {} and email: {}", saved.getId(), saved.getEmail());
                }
        );
    }
}
