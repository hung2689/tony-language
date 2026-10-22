package com.languagelearning.backend.common.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Profile;
import org.springframework.core.PriorityOrdered;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Safety guard active ONLY in the 'test' Spring profile.
 * Aborts the Spring application context immediately if the connected
 * database catalog does not end with '_test', preventing any accidental
 * execution of integration tests or schema modifications against development
 * or production databases.
 */
@Component
@Profile("test")
public class TestDatabaseSafetyGuard implements BeanPostProcessor, PriorityOrdered {

    private static final Logger log = LoggerFactory.getLogger(TestDatabaseSafetyGuard.class);
    private boolean validated = false;

    @Override
    public int getOrder() {
        return PriorityOrdered.HIGHEST_PRECEDENCE;
    }

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        if (!validated && bean instanceof DataSource dataSource) {
            validateTestDatabase(dataSource);
            validated = true;
        }
        return bean;
    }

    public void validateTestDatabase(DataSource dataSource) {
        log.info("TestDatabaseSafetyGuard: Validating database connection catalog for test profile...");
        try (Connection connection = dataSource.getConnection()) {
            String catalog = connection.getCatalog();
            if (catalog == null || !catalog.toLowerCase().endsWith("_test")) {
                String errorMsg = String.format(
                        "CRITICAL SAFETY ABORT: Active profile is 'test' but database '%s' does not end with '_test'. Context aborted to protect non-test data!",
                        catalog
                );
                log.error(errorMsg);
                throw new IllegalStateException(errorMsg);
            }
            log.info("TestDatabaseSafetyGuard: Validated. Connected to safe test database: '{}'", catalog);
        } catch (SQLException e) {
            String errorMsg = "CRITICAL SAFETY ABORT: Failed to connect to test database: " + e.getMessage();
            log.error(errorMsg, e);
            throw new IllegalStateException(errorMsg, e);
        }
    }
}
