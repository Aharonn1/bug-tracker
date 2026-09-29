namespace MyBackendApi.Services.Auth;

public interface ICurrentUserProvider
{
    int? UserId { get; }
    bool IsAdmin { get; }
}
