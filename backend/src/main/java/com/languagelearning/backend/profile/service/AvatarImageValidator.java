package com.languagelearning.backend.profile.service;

import com.languagelearning.backend.common.exception.ValidationException;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public final class AvatarImageValidator {

    public static final long MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
    public static final int TARGET_AVATAR_SIZE = 256;

    private AvatarImageValidator() {}

    public static void validateSize(long size) {
        if (size <= 0) {
            throw new ValidationException("AVATAR_EMPTY", "Tệp hình ảnh trống");
        }
        if (size > MAX_AVATAR_SIZE) {
            throw new ValidationException("AVATAR_TOO_LARGE", "Dung lượng ảnh vượt quá giới hạn 2 MB");
        }
    }

    /**
     * Inspects magic bytes to ensure file is JPEG, PNG, or WebP.
     * Explicitly rejects SVG, HTML, scripts, or corrupted files.
     */
    public static String detectImageType(byte[] headerBytes) {
        if (headerBytes == null || headerBytes.length < 12) {
            throw new ValidationException("AVATAR_INVALID_FORMAT", "Định dạng hình ảnh không hợp lệ");
        }

        // SVG check
        String headerStr = new String(headerBytes, 0, Math.min(headerBytes.length, 64), StandardCharsets.UTF_8).toLowerCase();
        if (headerStr.contains("<svg") || headerStr.contains("<?xml") || headerStr.contains("<html")) {
            throw new ValidationException("AVATAR_SVG_NOT_ALLOWED", "Không hỗ trợ tệp SVG hoặc văn bản. Vui lòng tải ảnh PNG, JPG hoặc WebP.");
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if ((headerBytes[0] & 0xFF) == 0x89 &&
            (headerBytes[1] & 0xFF) == 0x50 &&
            (headerBytes[2] & 0xFF) == 0x4E &&
            (headerBytes[3] & 0xFF) == 0x47) {
            return "image/png";
        }

        // JPEG: FF D8 FF
        if ((headerBytes[0] & 0xFF) == 0xFF &&
            (headerBytes[1] & 0xFF) == 0xD8 &&
            (headerBytes[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }

        // WebP: RIFF ... WEBP
        if (headerBytes[0] == 'R' && headerBytes[1] == 'I' && headerBytes[2] == 'F' && headerBytes[3] == 'F' &&
            headerBytes[8] == 'W' && headerBytes[9] == 'E' && headerBytes[10] == 'B' && headerBytes[11] == 'P') {
            return "image/webp";
        }

        throw new ValidationException("AVATAR_UNSUPPORTED_TYPE", "Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận JPG, PNG hoặc WebP");
    }

    /**
     * Decodes the raw bytes, scales smoothly to 256x256, and re-encodes as clean PNG.
     * This strips any malicious EXIF or metadata payloads and verifies image integrity.
     */
    public static byte[] sanitizeAndReencodeToPng(byte[] rawBytes) {
        validateSize(rawBytes.length);
        detectImageType(rawBytes);

        BufferedImage original;
        try (InputStream in = new ByteArrayInputStream(rawBytes)) {
            original = ImageIO.read(in);
        } catch (IOException e) {
            throw new ValidationException("AVATAR_CORRUPTED", "Không thể đọc dữ liệu hình ảnh");
        }

        if (original == null) {
            throw new ValidationException("AVATAR_DECODE_FAILED", "Không thể giải mã hình ảnh. Tệp có thể bị hỏng.");
        }

        BufferedImage resized = new BufferedImage(TARGET_AVATAR_SIZE, TARGET_AVATAR_SIZE, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = resized.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(original, 0, 0, TARGET_AVATAR_SIZE, TARGET_AVATAR_SIZE, null);
        } finally {
            g.dispose();
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            ImageIO.write(resized, "png", baos);
        } catch (IOException e) {
            throw new RuntimeException("Lỗi ghi dữ liệu ảnh avatar", e);
        }

        return baos.toByteArray();
    }
}
