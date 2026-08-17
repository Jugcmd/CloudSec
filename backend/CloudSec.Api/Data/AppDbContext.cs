using CloudSec.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CloudSec.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<SecurityExceptionRequest> SecurityExceptionRequests => Set<SecurityExceptionRequest>();
    public DbSet<SecurityExceptionEvent> SecurityExceptionEvents => Set<SecurityExceptionEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Index on Status — used in every filtered query and summary count
        modelBuilder.Entity<SecurityExceptionRequest>()
            .HasIndex(x => x.Status)
            .HasDatabaseName("IX_SecurityExceptionRequests_Status");

        // Index on CreatedUtc — used in OrderByDescending on the main list
        modelBuilder.Entity<SecurityExceptionRequest>()
            .HasIndex(x => x.CreatedUtc)
            .HasDatabaseName("IX_SecurityExceptionRequests_CreatedUtc");

        // Index on RiskScore — used in high-risk count query
        modelBuilder.Entity<SecurityExceptionRequest>()
            .HasIndex(x => x.RiskScore)
            .HasDatabaseName("IX_SecurityExceptionRequests_RiskScore");

        // Index on RequestId + CreatedUtc for event timeline queries
        modelBuilder.Entity<SecurityExceptionEvent>()
            .HasIndex(x => new { x.RequestId, x.CreatedUtc })
            .HasDatabaseName("IX_SecurityExceptionEvents_RequestId_CreatedUtc");

        // Index on EventType + CreatedUtc for the last-7-days decision count
        modelBuilder.Entity<SecurityExceptionEvent>()
            .HasIndex(x => new { x.EventType, x.CreatedUtc })
            .HasDatabaseName("IX_SecurityExceptionEvents_EventType_CreatedUtc");

        // Navigation: Request has many Events
        modelBuilder.Entity<SecurityExceptionRequest>()
            .HasMany(x => x.Events)
            .WithOne()
            .HasForeignKey(x => x.RequestId);
    }
}
