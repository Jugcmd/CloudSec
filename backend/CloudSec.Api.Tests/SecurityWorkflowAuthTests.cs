using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace CloudSec.Api.Tests;

public class SecurityWorkflowAuthTests : IClassFixture<TestApiFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _client;

    public SecurityWorkflowAuthTests(TestApiFactory factory)
    {
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("https://localhost")
        });
    }

    [Fact]
    public async Task Protected_Endpoint_Requires_Bearer_Token()
    {
        var response = await _client.GetAsync("/api/SecurityExceptionRequests");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Health_Endpoints_Are_Available_And_Ready()
    {
        var healthResponse = await _client.GetAsync("/healthz");
        var readyResponse = await _client.GetAsync("/readyz");

        Assert.Equal(HttpStatusCode.OK, healthResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, readyResponse.StatusCode);
    }

    [Fact]
    public async Task Security_Headers_Are_Emitted()
    {
        var response = await _client.GetAsync("/healthz");

        Assert.True(response.Headers.Contains("X-Content-Type-Options"));
        Assert.True(response.Headers.Contains("X-Frame-Options"));
        Assert.True(response.Headers.Contains("Referrer-Policy"));
    }

    [Fact]
    public async Task Requester_Can_Create_But_Cannot_Decide()
    {
        var requesterToken = await GetTokenAsync("requester.user@osborneclarke.com", "Requester");

        var createResponse = await PostJsonAsync(
            "/api/SecurityExceptionRequests",
            new
            {
                title = "Temporary outbound internet exception",
                description = "Need temporary outbound rule for deployment diagnostics.",
                systemName = "Litigation Ops Portal",
                dataClassification = "Confidential"
            },
            requesterToken);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var listResponse = await GetAuthorizedAsync("/api/SecurityExceptionRequests", requesterToken);
        var listBody = await listResponse.Content.ReadAsStringAsync();
        var requests = JsonSerializer.Deserialize<List<RequestDto>>(listBody, JsonOptions) ?? [];
        var created = requests.FirstOrDefault();

        Assert.NotNull(created);

        var decisionResponse = await PostJsonAsync(
            $"/api/SecurityExceptionRequests/{created!.Id}/decision",
            new { action = "approve", comment = "Requester should not be able to approve." },
            requesterToken);

        Assert.Equal(HttpStatusCode.Forbidden, decisionResponse.StatusCode);
    }

    [Fact]
    public async Task Approver_Can_Decide_And_Reject_Requires_Comment()
    {
        var requesterToken = await GetTokenAsync("requester.two@osborneclarke.com", "Requester");
        var approverToken = await GetTokenAsync("approver.user@osborneclarke.com", "Approver");

        var createResponse = await PostJsonAsync(
            "/api/SecurityExceptionRequests",
            new
            {
                title = "Database export exception",
                description = "One-off export needed for legal hold analysis.",
                systemName = "Matter Intelligence",
                dataClassification = "Restricted"
            },
            requesterToken);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var listResponse = await GetAuthorizedAsync("/api/SecurityExceptionRequests", approverToken);
        var listBody = await listResponse.Content.ReadAsStringAsync();
        var requests = JsonSerializer.Deserialize<List<RequestDto>>(listBody, JsonOptions) ?? [];
        var created = requests.FirstOrDefault();

        Assert.NotNull(created);

        var rejectNoComment = await PostJsonAsync(
            $"/api/SecurityExceptionRequests/{created!.Id}/decision",
            new { action = "reject", comment = "" },
            approverToken);

        Assert.Equal(HttpStatusCode.BadRequest, rejectNoComment.StatusCode);

        var approveResponse = await PostJsonAsync(
            $"/api/SecurityExceptionRequests/{created.Id}/decision",
            new { action = "approve", comment = "Compensating controls verified." },
            approverToken);

        Assert.Equal(HttpStatusCode.OK, approveResponse.StatusCode);
    }

    private async Task<string> GetTokenAsync(string email, string role)
    {
        var response = await PostJsonAsync("/api/Auth/token", new { email, role }, bearerToken: null);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        var payload = JsonSerializer.Deserialize<TokenDto>(content, JsonOptions);

        Assert.NotNull(payload);
        Assert.False(string.IsNullOrWhiteSpace(payload!.AccessToken));

        return payload.AccessToken;
    }

    private async Task<HttpResponseMessage> GetAuthorizedAsync(string uri, string bearerToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        return await _client.SendAsync(request);
    }

    private async Task<HttpResponseMessage> PostJsonAsync(string uri, object body, string? bearerToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, uri)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };

        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        }

        return await _client.SendAsync(request);
    }

    private sealed class TokenDto
    {
        public string AccessToken { get; set; } = string.Empty;
    }

    private sealed class RequestDto
    {
        public int Id { get; set; }
    }
}
