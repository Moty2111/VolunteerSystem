using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using VolunteerSystem.Server.Models;

namespace VolunteerSystem.Server.Services;

public class JwtService
{
    private readonly IConfiguration _config;

    public JwtService(IConfiguration config) => _config = config;

    public (string Token, DateTime ExpiresAt) Generate(SystemUser user)
    {
        var jwt = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddMinutes(int.Parse(jwt["ExpireMinutes"]!));

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
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}