using CloudSec.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CloudSec.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<SecurityExceptionRequest> SecurityExceptionRequests => Set<SecurityExceptionRequest>();
    public DbSet<SecurityExceptionEvent> SecurityExceptionEvents => Set<SecurityExceptionEvent>();
}
