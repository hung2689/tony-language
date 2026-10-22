package com.languagelearning.backend.common.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

class TestDatabaseSafetyGuardTest {

    @Test
    @DisplayName("Safety guard aborts when database name does not end with _test")
    void testGuardAbortsWhenDatabaseNameDoesNotEndWithTest() throws SQLException {
        DataSource mockDs = Mockito.mock(DataSource.class);
        Connection mockConn = Mockito.mock(Connection.class);
        when(mockDs.getConnection()).thenReturn(mockConn);
        when(mockConn.getCatalog()).thenReturn("language_learning");

        TestDatabaseSafetyGuard guard = new TestDatabaseSafetyGuard();

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> guard.validateTestDatabase(mockDs));
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().contains("does not end with '_test'"));
    }

    @Test
    @DisplayName("Safety guard allows when database name ends with _test")
    void testGuardAllowsWhenDatabaseNameEndsWithTest() throws SQLException {
        DataSource mockDs = Mockito.mock(DataSource.class);
        Connection mockConn = Mockito.mock(Connection.class);
        when(mockDs.getConnection()).thenReturn(mockConn);
        when(mockConn.getCatalog()).thenReturn("language_learning_test");

        TestDatabaseSafetyGuard guard = new TestDatabaseSafetyGuard();

        assertDoesNotThrow(() -> guard.validateTestDatabase(mockDs));
    }
}
