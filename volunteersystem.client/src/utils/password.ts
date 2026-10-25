/** Политика паролей (по ГОСТу): минимум 8 символов, заглавные и строчные буквы,
 * цифры и спецсимволы. Дублирует проверку на сервере (PasswordPolicy). */

export const PASSWORD_REQUIREMENTS =
    'Пароль должен содержать минимум 8 символов: заглавные и строчные буквы, цифры и спецсимволы';

export function isValidPassword(password: string) {
    return (
        password.length >= 8 &&
        password.length <= 128 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
}
