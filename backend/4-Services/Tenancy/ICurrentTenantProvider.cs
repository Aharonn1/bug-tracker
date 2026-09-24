namespace MyBackendApi.Services.Tenancy;

public interface ICurrentTenantProvider
{
    string TenantId { get; }
}
