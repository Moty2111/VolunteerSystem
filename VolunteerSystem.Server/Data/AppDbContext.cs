using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using VolunteerSystem.Server.Models;

namespace VolunteerSystem.Server.Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Assignment> Assignments { get; set; }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<Event> Events { get; set; }

    public virtual DbSet<EventType> EventTypes { get; set; }

    public virtual DbSet<Event_Partner> Event_Partners { get; set; }

    public virtual DbSet<Partner> Partners { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Skill> Skills { get; set; }

    public virtual DbSet<SystemUser> SystemUsers { get; set; }

    public virtual DbSet<Volunteer> Volunteers { get; set; }

    public virtual DbSet<Volunteer_Skill> Volunteer_Skills { get; set; }

    public virtual DbSet<vw_EventParticipant> vw_EventParticipants { get; set; }

    public virtual DbSet<vw_HoursByPeriod> vw_HoursByPeriods { get; set; }

    public virtual DbSet<vw_PartnerReport> vw_PartnerReports { get; set; }

    public virtual DbSet<vw_VolunteerSummary> vw_VolunteerSummaries { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.HasKey(e => e.assignment_id).HasName("PK__Assignme__DA891814FD1CC2A1");

            entity.ToTable("Assignment", tb =>
                {
                    tb.HasTrigger("trg_assignment_hours");
                    tb.HasTrigger("trg_assignment_medbook");
                    tb.HasTrigger("trg_assignment_no_overlap");
                    tb.HasTrigger("trg_audit_assignment");
                });

            entity.HasIndex(e => e.event_id, "idx_assignment_event");

            entity.HasIndex(e => e.volunteer_id, "idx_assignment_volunteer");

            entity.HasIndex(e => new { e.volunteer_id, e.event_id, e.role_id }, "uq_assignment").IsUnique();

            entity.Property(e => e.assigned_at)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.hours_actual).HasColumnType("decimal(5, 2)");

            entity.HasOne(d => d._event).WithMany(p => p.Assignments)
                .HasForeignKey(d => d.event_id)
                .HasConstraintName("FK__Assignmen__event__71D1E811");

            entity.HasOne(d => d.role).WithMany(p => p.Assignments)
                .HasForeignKey(d => d.role_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Assignmen__role___72C60C4A");

            entity.HasOne(d => d.volunteer).WithMany(p => p.Assignments)
                .HasForeignKey(d => d.volunteer_id)
                .HasConstraintName("FK__Assignmen__volun__70DDC3D8");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.log_id).HasName("PK__AuditLog__9E2397E0AAD3EE49");

            entity.ToTable("AuditLog");

            entity.HasIndex(e => e.action_date, "idx_audit_date");

            entity.Property(e => e.action).HasMaxLength(500);
            entity.Property(e => e.action_date)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.table_name).HasMaxLength(100);

            entity.HasOne(d => d.user).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.user_id)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK__AuditLog__user_i__00200768");
        });

        modelBuilder.Entity<Event>(entity =>
        {
            entity.HasKey(e => e.event_id).HasName("PK__Event__2370F727A391F91C");

            entity.ToTable("Event");

            entity.HasIndex(e => e.coordinator_id, "idx_event_coordinator");

            entity.HasIndex(e => new { e.date_start, e.date_end }, "idx_event_dates");

            entity.HasIndex(e => e.status, "idx_event_status");

            entity.Property(e => e.created_at)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.date_end).HasColumnType("datetime");
            entity.Property(e => e.date_start).HasColumnType("datetime");
            entity.Property(e => e.event_name).HasMaxLength(250);
            entity.Property(e => e.location).HasMaxLength(300);
            entity.Property(e => e.status)
                .HasMaxLength(30)
                .HasDefaultValue("Запланировано");

            entity.HasOne(d => d.coordinator).WithMany(p => p.Events)
                .HasForeignKey(d => d.coordinator_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Event__coordinat__6A30C649");

            entity.HasOne(d => d.event_type).WithMany(p => p.Events)
                .HasForeignKey(d => d.event_type_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Event__event_typ__693CA210");
        });

        modelBuilder.Entity<EventType>(entity =>
        {
            entity.HasKey(e => e.event_type_id).HasName("PK__EventTyp__BB84C6F32010E1A2");

            entity.ToTable("EventType");

            entity.HasIndex(e => e.type_name, "UQ__EventTyp__543C4FD9BD2C141C").IsUnique();

            entity.Property(e => e.type_name).HasMaxLength(100);
        });

        modelBuilder.Entity<Event_Partner>(entity =>
        {
            entity.HasKey(e => new { e.event_id, e.partner_id }).HasName("PK__Event_Pa__460606953DF4C0B9");

            entity.ToTable("Event_Partner");

            entity.Property(e => e.amount)
                .HasDefaultValue(0m)
                .HasColumnType("decimal(12, 2)");

            entity.HasOne(d => d._event).WithMany(p => p.Event_Partners)
                .HasForeignKey(d => d.event_id)
                .HasConstraintName("FK__Event_Par__event__7B5B524B");

            entity.HasOne(d => d.partner).WithMany(p => p.Event_Partners)
                .HasForeignKey(d => d.partner_id)
                .HasConstraintName("FK__Event_Par__partn__7C4F7684");
        });

        modelBuilder.Entity<Partner>(entity =>
        {
            entity.HasKey(e => e.partner_id).HasName("PK__Partner__576F1B2714014C95");

            entity.ToTable("Partner");

            entity.Property(e => e.contact_person).HasMaxLength(200);
            entity.Property(e => e.contract_number).HasMaxLength(100);
            entity.Property(e => e.email).HasMaxLength(150);
            entity.Property(e => e.inn).HasMaxLength(12);
            entity.Property(e => e.partner_name).HasMaxLength(250);
            entity.Property(e => e.phone).HasMaxLength(20);
            entity.Property(e => e.support_amount)
                .HasDefaultValue(0m)
                .HasColumnType("decimal(12, 2)");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.role_id).HasName("PK__Role__760965CCD8487225");

            entity.ToTable("Role");

            entity.HasIndex(e => e.role_name, "UQ__Role__783254B15BA202AC").IsUnique();

            entity.Property(e => e.role_name).HasMaxLength(100);
        });

        modelBuilder.Entity<Skill>(entity =>
        {
            entity.HasKey(e => e.skill_id).HasName("PK__Skill__FBBA83794CD57FEA");

            entity.ToTable("Skill");

            entity.Property(e => e.level).HasMaxLength(50);
            entity.Property(e => e.skill_name).HasMaxLength(150);
        });

        modelBuilder.Entity<SystemUser>(entity =>
        {
            entity.HasKey(e => e.user_id).HasName("PK__SystemUs__B9BE370F07AA644A");

            entity.ToTable("SystemUser");

            entity.HasIndex(e => e.login_name, "UQ__SystemUs__F6D56B5715BA53B7").IsUnique();

            entity.HasIndex(e => e.volunteer_id, "uq_systemuser_volunteer")
                .IsUnique()
                .HasFilter("([volunteer_id] IS NOT NULL)");

            entity.Property(e => e.created_at)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.is_active).HasDefaultValue(true);
            entity.Property(e => e.login_name).HasMaxLength(100);
            entity.Property(e => e.password_hash).HasMaxLength(256);
            entity.Property(e => e.system_role).HasMaxLength(30);

            entity.HasOne(d => d.volunteer).WithOne(p => p.SystemUser)
                .HasForeignKey<SystemUser>(d => d.volunteer_id)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK__SystemUse__volun__5DCAEF64");
        });

        modelBuilder.Entity<Volunteer>(entity =>
        {
            entity.HasKey(e => e.volunteer_id).HasName("PK__Voluntee__0FE766B17F8F6ED1");

            entity.ToTable("Volunteer");

            entity.HasIndex(e => e.email, "UQ__Voluntee__AB6E6164C3B5651B").IsUnique();

            entity.HasIndex(e => e.is_active, "idx_volunteer_active");

            entity.HasIndex(e => e.city, "idx_volunteer_city");

            entity.Property(e => e.city).HasMaxLength(100);
            entity.Property(e => e.created_at)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.email).HasMaxLength(150);
            entity.Property(e => e.full_name).HasMaxLength(200);
            entity.Property(e => e.is_active).HasDefaultValue(true);
            entity.Property(e => e.phone).HasMaxLength(20);
        });

        modelBuilder.Entity<Volunteer_Skill>(entity =>
        {
            entity.HasKey(e => new { e.volunteer_id, e.skill_id }).HasName("PK__Voluntee__805CCE863F869076");

            entity.ToTable("Volunteer_Skill");

            entity.HasOne(d => d.skill).WithMany(p => p.Volunteer_Skills)
                .HasForeignKey(d => d.skill_id)
                .HasConstraintName("FK__Volunteer__skill__628FA481");

            entity.HasOne(d => d.volunteer).WithMany(p => p.Volunteer_Skills)
                .HasForeignKey(d => d.volunteer_id)
                .HasConstraintName("FK__Volunteer__volun__619B8048");
        });

        modelBuilder.Entity<vw_EventParticipant>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_EventParticipants");

            entity.Property(e => e.date_start).HasColumnType("datetime");
            entity.Property(e => e.event_name).HasMaxLength(250);
            entity.Property(e => e.hours_actual).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.role_name).HasMaxLength(100);
            entity.Property(e => e.volunteer_name).HasMaxLength(200);
        });

        modelBuilder.Entity<vw_HoursByPeriod>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_HoursByPeriod");

            entity.Property(e => e.city).HasMaxLength(100);
            entity.Property(e => e.date_start).HasColumnType("datetime");
            entity.Property(e => e.event_name).HasMaxLength(250);
            entity.Property(e => e.full_name).HasMaxLength(200);
            entity.Property(e => e.hours_actual).HasColumnType("decimal(5, 2)");
        });

        modelBuilder.Entity<vw_PartnerReport>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_PartnerReport");

            entity.Property(e => e.allocated_amount).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.contract_number).HasMaxLength(100);
            entity.Property(e => e.inn).HasMaxLength(12);
            entity.Property(e => e.partner_name).HasMaxLength(250);
            entity.Property(e => e.total_support).HasColumnType("decimal(12, 2)");
        });

        modelBuilder.Entity<vw_VolunteerSummary>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_VolunteerSummary");

            entity.Property(e => e.city).HasMaxLength(100);
            entity.Property(e => e.full_name).HasMaxLength(200);
            entity.Property(e => e.total_hours).HasColumnType("decimal(38, 2)");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
