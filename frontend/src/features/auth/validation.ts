export function validateCredentials(email: string, password: string) {
  return {
    email: !email.trim()
      ? 'Vui lòng nhập email.'
      : email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? 'Email chưa hợp lệ.'
        : '',
    password: !password
      ? 'Vui lòng nhập mật khẩu.'
      : password.length < 8
        ? 'Mật khẩu cần ít nhất 8 ký tự.'
        : new TextEncoder().encode(password).length > 72
          ? 'Mật khẩu tối đa 72 byte UTF-8.'
          : '',
  };
}
