using CloudSec.Api.Data;
using CloudSec.Api.Models;
using Microsoft.ApplicationInsights;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CloudSec.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SecurityExceptionRequestsController(AppDbContext db, TelemetryClient telemetry) : ControllerBase
{
    private const string RequesterRole = "Requester";
    private const string ApproverRole = "Approver";

    [Authorize(Roles = RequesterRole + "," + ApproverRole)]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SecurityExceptionRequestViewDto>>> GetAll(CancellationToken cancellationToken)
    {
        // Project directly in the query — avoids loading full entities into memory
        var output = await db.SecurityExceptionRequests
            .OrderByDescending(x => x.CreatedUtc)
            .Select(request => new SecurityExceptionRequestViewDto
            {
                Id = request.Id,
                Title = request.Title,
                Description = request.Description,
                RequesterEmail = request.RequesterEmail,
                SystemName = request.SystemName,
                DataClassification = request.DataClassification,
                Status = request.Status,
                RiskScore = request.RiskScore,
                CreatedUtc = request.CreatedUtc,
                UpdatedUtc = request.UpdatedUtc,
                Events = request.Events
                    .OrderBy(e => e.CreatedUtc)
                    .Select(e => new SecurityExceptionEventDto
                    {
                        Id = e.Id,
                        EventType = e.EventType,
                        FromStatus = e.FromStatus,
                        ToStatus = e.ToStatus,
                        ActorEmail = e.ActorEmail,
                        Comment = e.Comment,
                        CreatedUtc = e.CreatedUtc
                    }).ToList()
            })
            .ToListAsync(cancellationToken);

        return Ok(output);
    }

    [Authorize(Roles = RequesterRole + "," + ApproverRole)]
    [HttpGet("summary")]
    [OutputCache(PolicyName = "summary")]
    public async Task<ActionResult<SecurityExceptionSummaryDto>> GetSummary(CancellationToken cancellationToken)
    {
        // Aggregate in the database rather than loading all rows into memory
        var totalRequests = await db.SecurityExceptionRequests.CountAsync(cancellationToken);
        var pendingRequests = await db.SecurityExceptionRequests.CountAsync(x => x.Status == "Pending", cancellationToken);
        var approvedRequests = await db.SecurityExceptionRequests.CountAsync(x => x.Status == "Approved", cancellationToken);
        var rejectedRequests = await db.SecurityExceptionRequests.CountAsync(x => x.Status == "Rejected", cancellationToken);
        var highRiskRequests = await db.SecurityExceptionRequests.CountAsync(x => x.RiskScore >= 70, cancellationToken);
        var averageRiskScore = totalRequests == 0
            ? 0
            : Math.Round(await db.SecurityExceptionRequests.AverageAsync(x => (double)x.RiskScore, cancellationToken), 1);

        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
        var decisionEventsLast7Days = await db.SecurityExceptionEvents
            .CountAsync(x =>
                (x.EventType == "Approved" || x.EventType == "Rejected") &&
                x.CreatedUtc >= sevenDaysAgo,
                cancellationToken);

        var approvalRate = (approvedRequests + rejectedRequests) == 0
            ? 0
            : Math.Round((double)approvedRequests / (approvedRequests + rejectedRequests) * 100, 1);

        return Ok(new SecurityExceptionSummaryDto
        {
            TotalRequests = totalRequests,
            PendingRequests = pendingRequests,
            ApprovedRequests = approvedRequests,
            RejectedRequests = rejectedRequests,
            HighRiskRequests = highRiskRequests,
            AverageRiskScore = averageRiskScore,
            DecisionEventsLast7Days = decisionEventsLast7Days,
            ApprovalRatePercent = approvalRate
        });
    }

    [Authorize(Roles = RequesterRole + "," + ApproverRole)]
    [HttpPost]
    public async Task<ActionResult<SecurityExceptionRequest>> Create([FromBody] CreateSecurityExceptionRequestDto dto, CancellationToken cancellationToken)
    {
        var callerEmail = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? string.Empty;
        if (string.IsNullOrWhiteSpace(callerEmail))
        {
            return Unauthorized("Authenticated user email claim is missing.");
        }

        var entity = new SecurityExceptionRequest
        {
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            RequesterEmail = callerEmail,
            SystemName = dto.SystemName.Trim(),
            DataClassification = dto.DataClassification.Trim(),
            Status = "Pending",
            RiskScore = CalculateRiskScore(dto.DataClassification),
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow
        };

        db.SecurityExceptionRequests.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        db.SecurityExceptionEvents.Add(new SecurityExceptionEvent
        {
            RequestId = entity.Id,
            EventType = "Submitted",
            FromStatus = "",
            ToStatus = entity.Status,
            ActorEmail = entity.RequesterEmail,
            Comment = "Request submitted.",
            CreatedUtc = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);

        // Custom telemetry: track business-level event and risk score metric in App Insights
        telemetry.TrackEvent("ExceptionRequestSubmitted", new Dictionary<string, string>
        {
            ["dataClassification"] = entity.DataClassification,
            ["systemName"] = entity.SystemName,
            ["requesterEmail"] = entity.RequesterEmail
        });
        telemetry.TrackMetric("ExceptionRequest.RiskScore", entity.RiskScore, new Dictionary<string, string>
        {
            ["dataClassification"] = entity.DataClassification
        });

        return CreatedAtAction(nameof(GetAll), new { id = entity.Id }, entity);
    }

    [Authorize(Roles = ApproverRole)]
    [HttpPost("{id:int}/decision")]
    public async Task<ActionResult<SecurityExceptionRequestViewDto>> ApplyDecision(int id, [FromBody] DecisionDto dto, CancellationToken cancellationToken)
    {
        var callerEmail = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? string.Empty;
        if (string.IsNullOrWhiteSpace(callerEmail))
        {
            return Unauthorized("Authenticated user email claim is missing.");
        }

        var entity = await db.SecurityExceptionRequests.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            return NotFound();
        }

        if (!string.Equals(entity.Status, "Pending", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Only pending requests can be updated by decision workflow.");
        }

        var action = dto.Action.Trim().ToLowerInvariant();
        var toStatus = action switch
        {
            "approve" => "Approved",
            "reject" => "Rejected",
            _ => string.Empty
        };

        if (string.IsNullOrWhiteSpace(toStatus))
        {
            return BadRequest("Action must be either 'approve' or 'reject'.");
        }

        if (toStatus == "Rejected" && string.IsNullOrWhiteSpace(dto.Comment))
        {
            return BadRequest("A rejection comment is required.");
        }

        var fromStatus = entity.Status;
        entity.Status = toStatus;
        entity.UpdatedUtc = DateTime.UtcNow;

        db.SecurityExceptionEvents.Add(new SecurityExceptionEvent
        {
            RequestId = entity.Id,
            EventType = action.Equals("approve", StringComparison.Ordinal) ? "Approved" : "Rejected",
            FromStatus = fromStatus,
            ToStatus = entity.Status,
            ActorEmail = callerEmail,
            Comment = dto.Comment.Trim(),
            CreatedUtc = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);

        // Custom telemetry: track decision outcome with risk context
        telemetry.TrackEvent("ExceptionRequestDecision", new Dictionary<string, string>
        {
            ["decision"] = toStatus,
            ["dataClassification"] = entity.DataClassification,
            ["riskScore"] = entity.RiskScore.ToString(),
            ["approverEmail"] = callerEmail
        });
        telemetry.TrackMetric("ExceptionRequest.DecisionRiskScore", entity.RiskScore, new Dictionary<string, string>
        {
            ["decision"] = toStatus
        });

        var events = await db.SecurityExceptionEvents
            .Where(x => x.RequestId == entity.Id)
            .OrderBy(x => x.CreatedUtc)
            .ToListAsync(cancellationToken);

        return Ok(new SecurityExceptionRequestViewDto
        {
            Id = entity.Id,
            Title = entity.Title,
            Description = entity.Description,
            RequesterEmail = entity.RequesterEmail,
            SystemName = entity.SystemName,
            DataClassification = entity.DataClassification,
            Status = entity.Status,
            RiskScore = entity.RiskScore,
            CreatedUtc = entity.CreatedUtc,
            UpdatedUtc = entity.UpdatedUtc,
            Events = events.Select(MapEvent).ToList()
        });
    }

    private static SecurityExceptionEventDto MapEvent(SecurityExceptionEvent item)
    {
        return new SecurityExceptionEventDto
        {
            Id = item.Id,
            EventType = item.EventType,
            FromStatus = item.FromStatus,
            ToStatus = item.ToStatus,
            ActorEmail = item.ActorEmail,
            Comment = item.Comment,
            CreatedUtc = item.CreatedUtc
        };
    }

    private static int CalculateRiskScore(string dataClassification)
    {
        return dataClassification.Trim().ToLowerInvariant() switch
        {
            "public" => 20,
            "internal" => 45,
            "confidential" => 70,
            "restricted" => 90,
            _ => 50
        };
    }

    public sealed class CreateSecurityExceptionRequestDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string SystemName { get; set; } = string.Empty;
        public string DataClassification { get; set; } = "Internal";
    }

    public sealed class DecisionDto
    {
        public string Action { get; set; } = string.Empty;
        public string Comment { get; set; } = string.Empty;
    }

    public sealed class SecurityExceptionRequestViewDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string RequesterEmail { get; set; } = string.Empty;
        public string SystemName { get; set; } = string.Empty;
        public string DataClassification { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int RiskScore { get; set; }
        public DateTime CreatedUtc { get; set; }
        public DateTime UpdatedUtc { get; set; }
        public IReadOnlyList<SecurityExceptionEventDto> Events { get; set; } = [];
    }

    public sealed class SecurityExceptionEventDto
    {
        public int Id { get; set; }
        public string EventType { get; set; } = string.Empty;
        public string FromStatus { get; set; } = string.Empty;
        public string ToStatus { get; set; } = string.Empty;
        public string ActorEmail { get; set; } = string.Empty;
        public string Comment { get; set; } = string.Empty;
        public DateTime CreatedUtc { get; set; }
    }

    public sealed class SecurityExceptionSummaryDto
    {
        public int TotalRequests { get; set; }
        public int PendingRequests { get; set; }
        public int ApprovedRequests { get; set; }
        public int RejectedRequests { get; set; }
        public int HighRiskRequests { get; set; }
        public double AverageRiskScore { get; set; }
        public int DecisionEventsLast7Days { get; set; }
        public double ApprovalRatePercent { get; set; }
    }
}
