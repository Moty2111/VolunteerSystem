using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using VolunteerSystem.Server.Models;

namespace VolunteerSystem.Server.Services;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpireMinutes { get; set; } = 120;
}

public class JwtService
{
    private readonly JwtOptions _options;
    private readonly SigningCredentials _credentials;
    private readonly JwtSecurityTokenHandler _handler = new();

    public JwtService(IOptions<JwtOptions> options)
    {
        _options = options.Value;

        if (string.IsNullOrWhiteSpace(_options.Key) || _options.Key.Length < 32)
            throw new InvalidOperationException(
                "Jwt:Key должен быть задан и содержать не менее 32 символов.");

        // ключ и подпись считаем один раз, а не на каждый токен
        _credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key)),
            SecurityAlgorithms.HmacSha256);
    }

    public (string Token, DateTime ExpiresAt) Generate(SystemUser user)
    {
        var expires = DateTime.UtcNow.AddMinutes(_options.ExpireMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.user_id.ToString()),
            new(ClaimTypes.Name, user.login_name),
            new(ClaimTypes.Role, user.system_role),
            new("UserId", user.user_id.ToString())
        };

        if (user.volunteer_id.HasValue)
            claims.Add(new Claim("VolunteerId", user.volunteer_id.Value.ToString()));

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: _credentials);

        return (_handler.WriteToken(token), expires);
    }
}
