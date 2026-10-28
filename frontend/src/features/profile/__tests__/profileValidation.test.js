import { describe, it, expect } from 'vitest';

function validateDisplayName(name) {
  const trimmed = (name || '').trim().normalize('NFC');
  if (!trimmed) {
    return 'Họ và tên không được để trống.';
  }
  if (trimmed.length > 50) {
    return 'Họ và tên tối đa 50 ký tự.';
  }
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code < 32 || (code >= 127 && code <= 159)) {
      return 'Họ và tên không được chứa ký tự điều khiển.';
    }
  }
  return null;
}

function validateNewPassword(newPassword, { username, email, currentPassword } = {}) {
  if (!newPassword) {
    return 'Vui lòng nhập mật khẩu mới.';
  }
  if (newPassword.length < 8) {
    return 'Mật khẩu phải có ít nhất 8 ký tự.';
  }
  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số.';
  }
  const byteLen = new TextEncoder().encode(newPassword).length;
  if (byteLen > 72) {
    return 'Mật khẩu không được vượt quá 72 bytes.';
  }
  if (username && newPassword.toLowerCase() === username.toLowerCase()) {
    return 'Mật khẩu mới không được trùng với tên đăng nhập.';
  }
  if (email && newPassword.toLowerCase() === email.toLowerCase()) {
    return 'Mật khẩu mới không được trùng với địa chỉ email.';
  }
  if (currentPassword && newPassword === currentPassword) {
    return 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  }
  return null;
}

describe('Profile Validation Rules', () => {
  it('accepts valid display name and normalizes NFC', () => {
    expect(validateDisplayName('Nguyễn Văn A')).toBeNull();
    expect(validateDisplayName('Tony Stark')).toBeNull();
  });

  it('rejects blank or control characters in display name', () => {
    expect(validateDisplayName('')).toBe('Họ và tên không được để trống.');
    expect(validateDisplayName('   ')).toBe('Họ và tên không được để trống.');
    expect(validateDisplayName('Bad\u0007Name')).toBe('Họ và tên không được chứa ký tự điều khiển.');
  });

  it('rejects names longer than 50 characters', () => {
    const longName = 'A'.repeat(51);
    expect(validateDisplayName(longName)).toBe('Họ và tên tối đa 50 ký tự.');
  });

  it('validates password requirements: min 8, letters and digits', () => {
    expect(validateNewPassword('short')).toBe('Mật khẩu phải có ít nhất 8 ký tự.');
    expect(validateNewPassword('allletters')).toBe('Mật khẩu phải chứa ít nhất một chữ cái và một chữ số.');
    expect(validateNewPassword('12345678')).toBe('Mật khẩu phải chứa ít nhất một chữ cái và một chữ số.');
    expect(validateNewPassword('validPass123')).toBeNull();
  });

  it('rejects password equal to username, email, or current password', () => {
    expect(
      validateNewPassword('john123', { username: 'john123', email: 'john@mail.com' })
    ).toBe('Mật khẩu phải có ít nhất 8 ký tự.'); // length < 8

    expect(
      validateNewPassword('johnny123', { username: 'johnny123', email: 'john@mail.com' })
    ).toBe('Mật khẩu mới không được trùng với tên đăng nhập.');

    expect(
      validateNewPassword('john@mail.com1', { username: 'john', email: 'john@mail.com1' })
    ).toBe('Mật khẩu mới không được trùng với địa chỉ email.');

    expect(
      validateNewPassword('currentPass1', { currentPassword: 'currentPass1' })
    ).toBe('Mật khẩu mới phải khác mật khẩu hiện tại.');
  });
});
