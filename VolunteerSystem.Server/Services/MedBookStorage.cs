namespace VolunteerSystem.Server.Services;

/// <summary>
/// Хранение сканов медкнижек в wwwroot/medbooks.
/// </summary>
public static class MedBookStorage
{
    public const long MaxBytes = 10L * 1024 * 1024;

    private static readonly string[] AllowedExtensions = { ".pdf", ".jpg", ".jpeg", ".png" };

    public static string GetRoot(IWebHostEnvironment env) =>
        Path.Combine(
            env.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot"),
            "medbooks");

    public static string GetFullPath(IWebHostEnvironment env, string fileName)
    {
        var root = Path.GetFullPath(GetRoot(env));
        var full = Path.GetFullPath(Path.Combine(root, fileName));
        return full.StartsWith(root, StringComparison.OrdinalIgnoreCase) ? full : root;
    }

    /// <summary>Сохраняет файл скана. Возвращает false + текст ошибки при невалидном файле.</summary>
    public static bool TrySaveScan(IWebHostEnvironment env, IFormFile file, out string fileName, out string error)
    {
        fileName = string.Empty;
        error = string.Empty;

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
        {
            error = "Разрешены только файлы PDF, JPG, JPEG или PNG";
            return false;
        }

        if (file.Length <= 0 || file.Length > MaxBytes)
        {
            error = "Размер файла не должен превышать 10 МБ";
            return false;
        }

        Directory.CreateDirectory(GetRoot(env));
        fileName = $"{Guid.NewGuid():N}{ext}";
        var path = Path.Combine(GetRoot(env), fileName);

        using var stream = new FileStream(path, FileMode.Create, FileAccess.Write);
        file.CopyTo(stream);
        return true;
    }

    public static string GetContentType(string fileName) =>
        Path.GetExtension(fileName).ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            _ => "application/octet-stream"
        };
}
