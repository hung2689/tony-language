package com.languagelearning.backend.profile;

import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.profile.service.AvatarImageValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class AvatarImageValidatorTest {

    private byte[] createTestPngBytes(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "png", baos);
        return baos.toByteArray();
    }

    @Test
    @DisplayName("Valid PNG image passes validation and re-encodes to 256x256")
    void testValidPng() throws IOException {
        byte[] original = createTestPngBytes(100, 100);
        byte[] sanitized = AvatarImageValidator.sanitizeAndReencodeToPng(original);

        assertNotNull(sanitized);
        assertTrue(sanitized.length > 0);

        BufferedImage img = ImageIO.read(new ByteArrayInputStream(sanitized));
        assertNotNull(img);
        assertEquals(256, img.getWidth());
        assertEquals(256, img.getHeight());
    }

    @Test
    @DisplayName("Oversize avatar (> 2MB) is rejected")
    void testOversizeAvatarRejected() {
        ValidationException ex = assertThrows(ValidationException.class, () ->
                AvatarImageValidator.validateSize(2 * 1024 * 1024 + 1));
        assertTrue(ex.getMessage().contains("2 MB"));
    }

    @Test
    @DisplayName("Empty file is rejected")
    void testEmptyFileRejected() {
        assertThrows(ValidationException.class, () ->
                AvatarImageValidator.validateSize(0));
    }

    @Test
    @DisplayName("SVG format is strictly rejected")
    void testSvgRejected() {
        byte[] svgBytes = "<svg xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"10\"/></svg>".getBytes();
        ValidationException ex = assertThrows(ValidationException.class, () ->
                AvatarImageValidator.detectImageType(svgBytes));
        assertTrue(ex.getMessage().contains("SVG"));
    }

    @Test
    @DisplayName("Fake extension with non-image content is rejected")
    void testFakeExtensionRejected() {
        byte[] fakeContent = "GIF89a this is not really a valid png or jpeg header".getBytes();
        assertThrows(ValidationException.class, () ->
                AvatarImageValidator.detectImageType(fakeContent));
    }

    @Test
    @DisplayName("HTML content is rejected")
    void testHtmlRejected() {
        byte[] htmlBytes = "<html><body><script>alert(1)</script></body></html>".getBytes();
        assertThrows(ValidationException.class, () ->
                AvatarImageValidator.detectImageType(htmlBytes));
    }
}
