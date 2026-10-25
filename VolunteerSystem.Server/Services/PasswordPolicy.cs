namespace VolunteerSystem.Server.Services;

/// <summary>
/// Политика паролей (по ГОСТу/ужесточённая): минимум 8 символов,
/// заглавные и строчные буквы, цифры и спецсимволы.
/// </summary>
public static class PasswordPolicy
{
    public const string Message =
        "Пароль должен содержать минимум 8 символов: заглавные и строчные буквы, цифры и спецсимволы";

    public static bool IsValid(string? password)
    {
        if (string.IsNullOrEmpty(password)) return false;
        if (password.Length < 8 || password.Length > 128) return false;

        var hasUpper = false;
        var hasLower = false;
        var hasDigit = false;
        var hasSpecial = false;

        foreach (var ch in password)
        {
            if (char.IsUpper(ch)) hasUpper = true;
            else if (char.IsLower(ch)) hasLower = true;
            else if (char.IsDigit(ch)) hasDigit = true;
            else if (!char.IsLetterOrDigit(ch)) hasSpecial = true;
        }

        return hasUpper && hasLower && hasDigit && hasSpecial;
    }
}
