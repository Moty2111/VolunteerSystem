using System.Text;
using Microsoft.Data.SqlClient;

namespace VolunteerSystem.Server.Data;

/// <summary>
/// Инициализация БД при первом запуске:
/// 1) создаёт БД IS_Volunteer вместе со схемой (таблицы, индексы, триггеры, представления, процедуры);
/// 2) всегда проверяет, заполнена ли БД тестовыми данными, и добавляет их при необходимости.
/// Пароли пользователей хранятся и сравниваются открытым текстом (требование курсового).
/// </summary>
public static class DbInitializer
{
    public static async Task InitializeAsync(IConfiguration config, ILogger logger)
    {
        var connString = config.GetConnectionString("DefaultConnection")!;
        var builder = new SqlConnectionStringBuilder(connString);
        var targetDb = builder.InitialCatalog;

        // ----------------------------------------------------------
        // 1. Существует ли уже БД?
        // ----------------------------------------------------------
        builder.InitialCatalog = "master";
        var masterConn = builder.ConnectionString;

        var dbExists = false;
        await using (var conn = new SqlConnection(masterConn))
        {
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(
                "SELECT 1 FROM sys.databases WHERE name = @name", conn);
            cmd.Parameters.AddWithValue("@name", targetDb);
            dbExists = await cmd.ExecuteScalarAsync() != null;
        }

        // ----------------------------------------------------------
        // 2. Создаём схему, если БД нет
        // ----------------------------------------------------------
        if (!dbExists)
        {
            logger.LogInformation("БД {Db} не найдена — создаём схему из встроенного скрипта…", targetDb);
            await RunBatchesAsync(masterConn, SchemaScript, logger);
            logger.LogInformation("Схема БД {Db} успешно создана", targetDb);
        }
        else
        {
            logger.LogInformation("БД {Db} уже существует", targetDb);
        }

        // ----------------------------------------------------------
        // 3. Тестовые данные (идемпотентно: добавляем только если пусто)
        // ----------------------------------------------------------
        var dataBuilder = new SqlConnectionStringBuilder(connString);
        var dataConn = dataBuilder.ConnectionString;

        var needsSeed = await IsEmptyAsync(dataConn, logger);
        if (needsSeed)
        {
            logger.LogInformation("БД {Db} пуста — заполняем тестовыми данными…", targetDb);
            await RunBatchesAsync(dataConn, SeedScript, logger);
            logger.LogInformation("БД {Db} успешно заполнена тестовыми данными", targetDb);
        }
        else
        {
            logger.LogInformation("Тестовые данные в БД {Db} уже присутствуют", targetDb);
        }

        await ApplyDemoDataUpgradeAsync(dataConn, logger);
    }

    private static async Task ApplyDemoDataUpgradeAsync(string connString, ILogger logger)
    {
        await using var conn = new SqlConnection(connString);
        await conn.OpenAsync();

        await using (var create = new SqlCommand(
            "IF OBJECT_ID(N'dbo.SeedHistory', N'U') IS NULL " +
            "CREATE TABLE SeedHistory (" +
            "  version INT PRIMARY KEY," +
            "  applied_at DATETIME NOT NULL DEFAULT GETDATE()" +
            ");", conn))
        {
            await create.ExecuteNonQueryAsync();
        }

        int currentVersion;
        await using (var check = new SqlCommand(
            "SELECT ISNULL(MAX(version), 0) FROM SeedHistory", conn))
        {
            currentVersion = Convert.ToInt32(await check.ExecuteScalarAsync());
        }

        if (currentVersion >= CurrentDemoDataVersion)
        {
            logger.LogInformation("Демо-данные актуальны (версия {Version})", currentVersion);
            return;
        }

        logger.LogInformation(
            "Обновляем демо-данные: версия {From} → {To}…",
            currentVersion, CurrentDemoDataVersion);

        await RunBatchesAsync(connString, DemoUpgradeScript, logger);

        await ApplyMedBookUpgradeAsync(connString, logger);

        await ApplyPasswordResetUpgradeAsync(connString, logger);

        await using (var mark = new SqlCommand(
            "IF NOT EXISTS (SELECT 1 FROM SeedHistory WHERE version = @version) " +
            "INSERT INTO SeedHistory (version) VALUES (@version)", conn))
        {
            mark.Parameters.AddWithValue("@version", CurrentDemoDataVersion);
            await mark.ExecuteNonQueryAsync();
        }

        logger.LogInformation("Демо-данные обновлены до версии {Version}", CurrentDemoDataVersion);
    }

    private static async Task ApplyMedBookUpgradeAsync(string connString, ILogger logger)
    {
        await using var conn = new SqlConnection(connString);
        await conn.OpenAsync();

        // Add new columns if missing
        var columnsToAdd = new[]
        {
            ("med_book_status", "NVARCHAR(20) NOT NULL DEFAULT N'Не загружена' CONSTRAINT chk_med_book_status CHECK (med_book_status IN (N'Не загружена', N'На проверке', N'Подтверждена', N'Отклонена', N'Просрочена'))"),
            ("med_book_scan_path", "NVARCHAR(500) NULL"),
            ("med_book_uploaded_at", "DATETIME NULL"),
            ("med_book_verified_by", "INT NULL"),
            ("med_book_verified_at", "DATETIME NULL"),
            ("med_book_notes", "NVARCHAR(MAX) NULL")
        };

        foreach (var (colName, colDef) in columnsToAdd)
        {
            await using var cmd = new SqlCommand(
                $"IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Volunteer') AND name = N'{colName}') ALTER TABLE Volunteer ADD {colDef}",
                conn);
            try
            {
                await cmd.ExecuteNonQueryAsync();
            }
            catch (SqlException ex)
            {
                logger.LogWarning(ex, "Ошибка при добавлении колонки {Column} в Volunteer", colName);
            }
        }

        // Add foreign key if missing
        await using (var fkCheck = new SqlCommand(
            "IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'dbo.Volunteer') AND name = N'med_book_verified_by_FK') " +
            "ALTER TABLE Volunteer ADD CONSTRAINT med_book_verified_by_FK FOREIGN KEY (med_book_verified_by) REFERENCES SystemUser(user_id) ON DELETE SET NULL", conn))
        {
            try
            {
                await fkCheck.ExecuteNonQueryAsync();
            }
            catch (SqlException ex)
            {
                logger.LogWarning(ex, "Ошибка при добавлении FK med_book_verified_by_FK");
            }
        }

        // Пересоздаём триггер медкнижки с актуальной логикой
        // (CREATE TRIGGER должен быть первой инструкцией батча, поэтому отдельно)
        await using (var drop = new SqlCommand(
            "DROP TRIGGER IF EXISTS trg_assignment_medbook", conn))
        {
            await drop.ExecuteNonQueryAsync();
        }

        await using (var trgCheck = new SqlCommand(
            @"CREATE TRIGGER trg_assignment_medbook
        ON Assignment
        AFTER INSERT, UPDATE
        AS
        BEGIN
            SET NOCOUNT ON;
            IF EXISTS (
                SELECT 1
                FROM inserted i
                JOIN Event e ON e.event_id = i.event_id
                JOIN EventType et ON et.event_type_id = e.event_type_id
                JOIN Volunteer v ON v.volunteer_id = i.volunteer_id
                WHERE et.type_name IN (N'Социальное', N'Благотворительное', N'Образовательное')
                  AND (v.med_book_status <> N'Подтверждена'
                       OR v.med_book_valid_until IS NULL
                       OR v.med_book_valid_until < CAST(GETDATE() AS DATE))
            )
            BEGIN
                RAISERROR(N'Для участия в мероприятии требуется действующая медицинская книжка.', 16, 1);
                ROLLBACK TRANSACTION;
            END
        END;", conn))
        {
            try
            {
                await trgCheck.ExecuteNonQueryAsync();
            }
            catch (SqlException ex)
            {
                logger.LogWarning(ex, "Ошибка при воссоздании триггера trg_assignment_medbook");
            }
        }

        // Set default status for existing rows where status is null
        await using (var upd = new SqlCommand(
            "UPDATE Volunteer SET med_book_status = N'Не загружена' WHERE med_book_status IS NULL", conn))
        {
            await upd.ExecuteNonQueryAsync();
        }

        // Демо-данные: даты из прошлых версий считаем подтверждёнными, просроченные метим
        await using (var backfill = new SqlCommand(
            "UPDATE Volunteer SET med_book_status = N'Подтверждена' " +
            "WHERE (med_book_status IS NULL OR med_book_status = N'Не загружена') " +
            "  AND med_book_valid_until IS NOT NULL " +
            "  AND med_book_valid_until >= CAST(GETDATE() AS DATE); " +
            "UPDATE Volunteer SET med_book_status = N'Просрочена' " +
            "WHERE med_book_status = N'Подтверждена' " +
            "  AND med_book_valid_until < CAST(GETDATE() AS DATE);", conn))
        {
            await backfill.ExecuteNonQueryAsync();
        }

        logger.LogInformation("Проведено обновление медкнижки до версии 4");
    }

    private static async Task ApplyPasswordResetUpgradeAsync(string connString, ILogger logger)
    {
        await using var conn = new SqlConnection(connString);
        await conn.OpenAsync();

        var columnsToAdd = new[]
        {
            "password_reset_token NVARCHAR(100) NULL",
            "password_reset_expires DATETIME NULL",
            "must_change_password BIT NOT NULL DEFAULT 0"
        };

        foreach (var def in columnsToAdd)
        {
            // Прямой ALTER + игнорирование ошибки «колонка уже существует» (2705)
            await using var cmd = new SqlCommand("ALTER TABLE SystemUser ADD " + def, conn);
            try
            {
                await cmd.ExecuteNonQueryAsync();
            }
            catch (SqlException ex) when (ex.Number == 2705)
            {
                logger.LogInformation("Колонка в SystemUser уже существует: {Def}", def);
            }
            catch (SqlException ex)
            {
                logger.LogWarning(ex, "Ошибка при добавлении колонки в SystemUser: {Def}", def);
            }
        }

        // На случай, если колонка была добавлена без DEFAULT — проставляем нули
        await using (var upd = new SqlCommand(
            "UPDATE SystemUser SET must_change_password = 0 WHERE must_change_password IS NULL", conn))
        {
            try
            {
                await upd.ExecuteNonQueryAsync();
            }
            catch (SqlException ex)
            {
                logger.LogWarning(ex, "Ошибка при обратной заливке must_change_password");
            }
        }

        logger.LogInformation("Проведено обновление парольной политики до версии 6");
    }

    private const int CurrentDemoDataVersion = 7;

    /// <summary>БД считается незаполненной, если в ней нет ни ролей, ни пользователей.</summary>
    private static async Task<bool> IsEmptyAsync(string connString, ILogger logger)
    {
        try
        {
            await using var conn = new SqlConnection(connString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(
                "SELECT CASE WHEN EXISTS (SELECT 1 FROM Role) AND EXISTS (SELECT 1 FROM SystemUser) " +
                "THEN 0 ELSE 1 END", conn);
            return (int)(await cmd.ExecuteScalarAsync())! == 1;
        }
        catch (SqlException ex)
        {
            logger.LogWarning(ex, "Не удалось проверить наполненность БД — пробуем заполнить данные");
            return true;
        }
    }

    private static async Task RunBatchesAsync(string connString, string script, ILogger logger)
    {
        await using var conn = new SqlConnection(connString);
        await conn.OpenAsync();

        foreach (var raw in SplitByGo(script))
        {
            var batch = raw.Trim();
            if (batch.Length == 0) continue;

            await using var cmd = new SqlCommand(batch, conn) { CommandTimeout = 180 };
            try
            {
                await cmd.ExecuteNonQueryAsync();
            }
            catch (SqlException ex)
            {
                logger.LogError(ex,
                    "Ошибка при выполнении батча:\n{Batch}",
                    batch.Length > 400 ? batch[..400] + "…" : batch);
                throw;
            }
        }
    }

    private static IEnumerable<string> SplitByGo(string script)
    {
        var sb = new StringBuilder();
        foreach (var line in script.Split('\n'))
        {
            var t = line.Trim();
            if (t.Equals("GO", StringComparison.OrdinalIgnoreCase))
            {
                yield return sb.ToString();
                sb.Clear();
            }
            else
            {
                sb.AppendLine(line);
            }
        }
        if (sb.Length > 0) yield return sb.ToString();
    }

    // ============================================================
    // 1) СХЕМА БД (только структура, без данных)
    // ============================================================
    private const string SchemaScript = """
        -- ============================================================
        -- Создание БД IS_Volunteer: таблицы, индексы, триггеры,
        -- представления и хранимые процедуры
        -- ============================================================
        CREATE DATABASE IS_Volunteer;
        GO

        USE IS_Volunteer;
        GO

        SET NOCOUNT ON;
        GO

        -- 1. Справочники
        CREATE TABLE Role (
            role_id   INT PRIMARY KEY IDENTITY(1,1),
            role_name NVARCHAR(100) NOT NULL UNIQUE
        );
        GO

        CREATE TABLE EventType (
            event_type_id INT PRIMARY KEY IDENTITY(1,1),
            type_name     NVARCHAR(100) NOT NULL UNIQUE
        );
        GO

        CREATE TABLE Skill (
            skill_id   INT PRIMARY KEY IDENTITY(1,1),
            skill_name NVARCHAR(150) NOT NULL,
            level      NVARCHAR(50)  NOT NULL
                CONSTRAINT chk_skill_level CHECK (level IN (
                    N'Начальный', N'Средний', N'Профессиональный',
                    N'A1', N'A2', N'B1', N'B2', N'C1', N'C2'
                ))
        );
        GO

        -- 2. Волонтёр
        CREATE TABLE Volunteer (
            volunteer_id                    INT PRIMARY KEY IDENTITY(1,1),
            full_name                       NVARCHAR(200) NOT NULL,
            birth_date                      DATE          NOT NULL,
            phone                           NVARCHAR(20)  NOT NULL,
            email                           NVARCHAR(150) NOT NULL UNIQUE,
            city                            NVARCHAR(100) NOT NULL,
            med_book_valid_until            DATE          NULL,
            med_book_status                 NVARCHAR(20)  NOT NULL DEFAULT N'Не загружена'
                CONSTRAINT chk_med_book_status CHECK (med_book_status IN (N'Не загружена', N'На проверке', N'Подтверждена', N'Отклонена', N'Просрочена')),
            med_book_scan_path              NVARCHAR(500) NULL,
            med_book_uploaded_at            DATETIME      NULL,
            med_book_verified_by            INT           NULL,
            med_book_verified_at            DATETIME      NULL,
            med_book_notes                  NVARCHAR(MAX) NULL,
            personal_data_consent           BIT           NOT NULL DEFAULT 0,
            is_active                       BIT           NOT NULL DEFAULT 1,
            created_at                      DATETIME      NOT NULL DEFAULT GETDATE(),
            CONSTRAINT chk_volunteer_birth CHECK (birth_date <= DATEADD(YEAR, -14, GETDATE()))
        );
        GO

        -- 3. Пользователи системы (password_hash хранит пароль открытым текстом)
        CREATE TABLE SystemUser (
            user_id       INT PRIMARY KEY IDENTITY(1,1),
            volunteer_id  INT           NULL,
            login_name    NVARCHAR(100) NOT NULL UNIQUE,
            password_hash NVARCHAR(256) NOT NULL,
            system_role   NVARCHAR(30)  NOT NULL
                CONSTRAINT chk_system_role CHECK (system_role IN (
                    N'Администратор', N'Менеджер', N'Волонтёр'
                )),
            is_active     BIT           NOT NULL DEFAULT 1,
            created_at    DATETIME      NOT NULL DEFAULT GETDATE(),
            password_reset_token   NVARCHAR(100) NULL,
            password_reset_expires DATETIME      NULL,
            must_change_password   BIT           NOT NULL DEFAULT 0,
            FOREIGN KEY (volunteer_id) REFERENCES Volunteer(volunteer_id) ON DELETE SET NULL
        );
        GO

        CREATE UNIQUE INDEX uq_systemuser_volunteer
            ON SystemUser(volunteer_id)
            WHERE volunteer_id IS NOT NULL;
        GO

        ALTER TABLE Volunteer
            ADD CONSTRAINT fk_volunteer_medbook_verified_by
            FOREIGN KEY (med_book_verified_by) REFERENCES SystemUser(user_id) ON DELETE SET NULL;
        GO

        -- 4. Навыки волонтёра
        CREATE TABLE Volunteer_Skill (
            volunteer_id   INT NOT NULL,
            skill_id       INT NOT NULL,
            year_confirmed INT NULL
                CONSTRAINT chk_year_confirmed CHECK (year_confirmed BETWEEN 2000 AND 2100),
            PRIMARY KEY (volunteer_id, skill_id),
            FOREIGN KEY (volunteer_id) REFERENCES Volunteer(volunteer_id) ON DELETE CASCADE,
            FOREIGN KEY (skill_id)     REFERENCES Skill(skill_id)         ON DELETE CASCADE
        );
        GO

        -- 5. Мероприятия
        CREATE TABLE Event (
            event_id      INT PRIMARY KEY IDENTITY(1,1),
            event_name    NVARCHAR(250) NOT NULL,
            date_start    DATETIME      NOT NULL,
            date_end      DATETIME      NOT NULL,
            location      NVARCHAR(300) NOT NULL,
            event_type_id INT           NOT NULL,
            description   NVARCHAR(MAX) NULL,
            status        NVARCHAR(30)  NOT NULL DEFAULT N'Запланировано'
                CONSTRAINT chk_event_status CHECK (status IN (
                    N'Запланировано', N'Идёт', N'Завершено', N'Отменено'
                )),
            coordinator_id INT          NOT NULL,
            created_at    DATETIME      NOT NULL DEFAULT GETDATE(),
            CONSTRAINT chk_event_dates CHECK (date_end > date_start),
            FOREIGN KEY (event_type_id)  REFERENCES EventType(event_type_id),
            FOREIGN KEY (coordinator_id) REFERENCES SystemUser(user_id)
        );
        GO

        -- 5.1. Обсуждение мероприятий
        CREATE TABLE EventComment (
            comment_id INT PRIMARY KEY IDENTITY(1,1),
            event_id   INT           NOT NULL,
            user_id    INT           NOT NULL,
            text       NVARCHAR(2000) NOT NULL,
            created_at DATETIME      NOT NULL DEFAULT GETDATE(),
            FOREIGN KEY (event_id) REFERENCES Event(event_id)     ON DELETE CASCADE,
            FOREIGN KEY (user_id)  REFERENCES SystemUser(user_id) ON DELETE CASCADE
        );
        GO

        -- 6. Назначения
        CREATE TABLE Assignment (
            assignment_id INT PRIMARY KEY IDENTITY(1,1),
            volunteer_id  INT           NOT NULL,
            event_id      INT           NOT NULL,
            role_id       INT           NOT NULL,
            hours_actual  DECIMAL(5,2)  NULL
                CONSTRAINT chk_hours_actual CHECK (hours_actual >= 0),
            confirmed     BIT           NOT NULL DEFAULT 0,
            assigned_at   DATETIME      NOT NULL DEFAULT GETDATE(),
            CONSTRAINT uq_assignment UNIQUE (volunteer_id, event_id, role_id),
            FOREIGN KEY (volunteer_id) REFERENCES Volunteer(volunteer_id) ON DELETE CASCADE,
            FOREIGN KEY (event_id)     REFERENCES Event(event_id)         ON DELETE CASCADE,
            FOREIGN KEY (role_id)      REFERENCES Role(role_id)
        );
        GO

        -- 7. Партнёры
        CREATE TABLE Partner (
            partner_id      INT PRIMARY KEY IDENTITY(1,1),
            partner_name    NVARCHAR(250) NOT NULL,
            inn             NVARCHAR(12)  NULL,
            contact_person  NVARCHAR(200) NULL,
            phone           NVARCHAR(20)  NULL,
            email           NVARCHAR(150) NULL,
            support_amount  DECIMAL(12,2) NULL DEFAULT 0,
            contract_number NVARCHAR(100) NULL,
            contract_date   DATE          NULL,
            CONSTRAINT chk_support_amount CHECK (support_amount >= 0)
        );
        GO

        -- 8. Партнёр ↔ Мероприятие
        CREATE TABLE Event_Partner (
            event_id   INT NOT NULL,
            partner_id INT NOT NULL,
            amount     DECIMAL(12,2) NULL DEFAULT 0
                CONSTRAINT chk_amount CHECK (amount >= 0),
            PRIMARY KEY (event_id, partner_id),
            FOREIGN KEY (event_id)   REFERENCES Event(event_id)     ON DELETE CASCADE,
            FOREIGN KEY (partner_id) REFERENCES Partner(partner_id) ON DELETE CASCADE
        );
        GO

        -- 9. Журнал аудита
        CREATE TABLE AuditLog (
            log_id      INT PRIMARY KEY IDENTITY(1,1),
            user_id     INT           NULL,
            action      NVARCHAR(500) NOT NULL,
            table_name  NVARCHAR(100) NOT NULL,
            record_id   INT           NULL,
            action_date DATETIME      NOT NULL DEFAULT GETDATE(),
            FOREIGN KEY (user_id) REFERENCES SystemUser(user_id) ON DELETE SET NULL
        );
        GO

        -- 10. Индексы
        CREATE INDEX idx_volunteer_city       ON Volunteer(city);
        CREATE INDEX idx_volunteer_active     ON Volunteer(is_active);
        CREATE INDEX idx_event_dates          ON Event(date_start, date_end);
        CREATE INDEX idx_event_status         ON Event(status);
        CREATE INDEX idx_event_coordinator    ON Event(coordinator_id);
        CREATE INDEX idx_assignment_volunteer ON Assignment(volunteer_id);
        CREATE INDEX idx_assignment_event     ON Assignment(event_id);
        CREATE INDEX idx_audit_date           ON AuditLog(action_date);
        GO

        -- 11.1. Запрет пересечения мероприятий у волонтёра
        CREATE TRIGGER trg_assignment_no_overlap
        ON Assignment
        AFTER INSERT, UPDATE
        AS
        BEGIN
            SET NOCOUNT ON;
            IF EXISTS (
                SELECT 1
                FROM inserted i
                JOIN Assignment a ON a.volunteer_id = i.volunteer_id
                                  AND a.assignment_id <> i.assignment_id
                JOIN Event e_new ON e_new.event_id = i.event_id
                JOIN Event e_old ON e_old.event_id = a.event_id
                WHERE e_new.date_start < e_old.date_end
                  AND e_new.date_end   > e_old.date_start
            )
            BEGIN
                RAISERROR(N'Волонтёр не может быть назначен на пересекающиеся мероприятия.', 16, 1);
                ROLLBACK TRANSACTION;
            END
        END;
        GO

        -- 11.2. Медкнижка для соц/благотв./образовательных мероприятий
        CREATE TRIGGER trg_assignment_medbook
        ON Assignment
        AFTER INSERT, UPDATE
        AS
        BEGIN
            SET NOCOUNT ON;
            IF EXISTS (
                SELECT 1
                FROM inserted i
                JOIN Event e ON e.event_id = i.event_id
                JOIN EventType et ON et.event_type_id = e.event_type_id
                JOIN Volunteer v ON v.volunteer_id = i.volunteer_id
                WHERE et.type_name IN (N'Социальное', N'Благотворительное', N'Образовательное')
                  AND v.med_book_status = N'Подтверждена'
                  AND (v.med_book_valid_until IS NULL
                       OR v.med_book_valid_until < CAST(GETDATE() AS DATE))
            )
            BEGIN
                RAISERROR(N'Для участия в мероприятии требуется действующая медицинская книжка.', 16, 1);
                ROLLBACK TRANSACTION;
            END
        END;
        GO

        -- 11.3. Часы не больше длительности мероприятия
        CREATE TRIGGER trg_assignment_hours
        ON Assignment
        AFTER INSERT, UPDATE
        AS
        BEGIN
            SET NOCOUNT ON;
            IF EXISTS (
                SELECT 1
                FROM inserted i
                JOIN Event e ON e.event_id = i.event_id
                WHERE i.hours_actual IS NOT NULL
                  AND i.hours_actual > DATEDIFF(MINUTE, e.date_start, e.date_end) / 60.0
            )
            BEGIN
                RAISERROR(N'Количество часов не может превышать длительность мероприятия.', 16, 1);
                ROLLBACK TRANSACTION;
            END
        END;
        GO

        -- 11.4. Аудит назначений
        CREATE TRIGGER trg_audit_assignment
        ON Assignment
        AFTER INSERT, UPDATE, DELETE
        AS
        BEGIN
            SET NOCOUNT ON;
            INSERT INTO AuditLog (user_id, action, table_name, record_id)
            SELECT NULL,
                   CASE
                       WHEN EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted) THEN N'UPDATE'
                       WHEN EXISTS (SELECT 1 FROM inserted) THEN N'INSERT'
                       ELSE N'DELETE'
                   END,
                   N'Assignment',
                   ISNULL((SELECT TOP 1 assignment_id FROM inserted),
                          (SELECT TOP 1 assignment_id FROM deleted));
        END;
        GO

        -- 12.1. Сводка по волонтёрам
        CREATE VIEW vw_VolunteerSummary AS
        SELECT
            v.volunteer_id,
            v.full_name,
            v.city,
            COUNT(DISTINCT a.event_id) AS events_count,
            ISNULL(SUM(a.hours_actual), 0) AS total_hours
        FROM Volunteer v
        LEFT JOIN Assignment a ON a.volunteer_id = v.volunteer_id AND a.confirmed = 1
        GROUP BY v.volunteer_id, v.full_name, v.city;
        GO

        -- 12.2. Участники мероприятия
        CREATE VIEW vw_EventParticipants AS
        SELECT
            e.event_id,
            e.event_name,
            e.date_start,
            v.full_name   AS volunteer_name,
            r.role_name,
            a.hours_actual,
            a.confirmed
        FROM Event e
        JOIN Assignment a ON a.event_id = e.event_id
        JOIN Volunteer v  ON v.volunteer_id = a.volunteer_id
        JOIN Role r       ON r.role_id = a.role_id;
        GO

        -- 12.3. Партнёрский отчёт
        CREATE VIEW vw_PartnerReport AS
        SELECT
            p.partner_name,
            p.inn,
            p.contract_number,
            p.support_amount AS total_support,
            COUNT(ep.event_id) AS events_supported,
            ISNULL(SUM(ep.amount), 0) AS allocated_amount
        FROM Partner p
        LEFT JOIN Event_Partner ep ON ep.partner_id = p.partner_id
        GROUP BY p.partner_id, p.partner_name, p.inn, p.contract_number, p.support_amount;
        GO

        -- 12.4. Часы за период
        CREATE VIEW vw_HoursByPeriod AS
        SELECT
            v.full_name,
            v.city,
            e.event_name,
            e.event_type_id,
            a.hours_actual,
            e.date_start
        FROM Assignment a
        JOIN Volunteer v ON v.volunteer_id = a.volunteer_id
        JOIN Event e      ON e.event_id = a.event_id
        WHERE a.confirmed = 1;
        GO

        -- 13.1. Отчёт по часам за период
        CREATE PROCEDURE sp_HoursReport
            @date_from DATE,
            @date_to   DATE
        AS
        BEGIN
            SET NOCOUNT ON;
            SELECT
                v.full_name,
                v.city,
                COUNT(DISTINCT a.event_id) AS events_count,
                ISNULL(SUM(a.hours_actual), 0) AS total_hours
            FROM Volunteer v
            JOIN Assignment a ON a.volunteer_id = v.volunteer_id
            JOIN Event e      ON e.event_id = a.event_id
            WHERE e.date_start BETWEEN @date_from AND @date_to
              AND a.confirmed = 1
            GROUP BY v.volunteer_id, v.full_name, v.city
            ORDER BY total_hours DESC;
        END;
        GO

        -- 13.2. Рейтинг волонтёров
        CREATE PROCEDURE sp_VolunteerRating
        AS
        BEGIN
            SET NOCOUNT ON;
            SELECT
                v.volunteer_id,
                v.full_name,
                v.city,
                ISNULL(SUM(a.hours_actual), 0) AS total_hours,
                COUNT(DISTINCT a.event_id) AS events_count,
                RANK() OVER (ORDER BY ISNULL(SUM(a.hours_actual), 0) DESC) AS rating
            FROM Volunteer v
            LEFT JOIN Assignment a ON a.volunteer_id = v.volunteer_id AND a.confirmed = 1
            GROUP BY v.volunteer_id, v.full_name, v.city
            ORDER BY rating;
        END;
        GO
        """;

    // ============================================================
    // 2) ТЕСТОВЫЕ ДАННЫЕ (пароли — открытым текстом, без хэширования)
    // ============================================================
    private const string SeedScript = """
        SET NOCOUNT ON;
        GO

        -- ============================================================
        -- 14.1. Справочники
        -- ============================================================
        INSERT INTO Role (role_name) VALUES
            (N'Координатор'), (N'Помощник'), (N'Водитель'),
            (N'Медик'), (N'Организатор'), (N'Участник');
        GO

        INSERT INTO EventType (type_name) VALUES
            (N'Социальное'), (N'Экологическое'), (N'Культурное'),
            (N'Благотворительное'), (N'Спортивное'), (N'Образовательное');
        GO

        INSERT INTO Skill (skill_name, level) VALUES
            (N'Английский язык',           N'B1'),
            (N'Немецкий язык',             N'A2'),
            (N'Первая помощь',             N'Средний'),
            (N'Вождение автомобиля',       N'Профессиональный'),
            (N'Организация мероприятий',   N'Средний'),
            (N'Работа с детьми',           N'Начальный'),
            (N'Работа с пожилыми людьми',  N'Средний'),
            (N'Веб-разработка',            N'Профессиональный');
        GO

        -- ============================================================
        -- 14.2. Волонтёры (даты медкнижек — относительно сегодня)
        -- ============================================================
        INSERT INTO Volunteer (full_name, birth_date, phone, email, city, med_book_valid_until, personal_data_consent, med_book_status, med_book_scan_path, med_book_uploaded_at, med_book_verified_by, med_book_verified_at, med_book_notes)
        VALUES
            (N'Иванов Иван Иванович',     '2000-05-14', N'+79001112233', N'ivanov@mail.ru',     N'Москва', DATEADD(YEAR, 1, GETDATE()), 1, N'Подтверждена', NULL, NULL, NULL, NULL, NULL),
            (N'Петрова Анна Сергеевна',   '1998-11-02', N'+79004445566', N'petrova@mail.ru',    N'Санкт-Петербург', DATEADD(MONTH, -3, GETDATE()), 1, N'Просрочена', NULL, NULL, NULL, NULL, NULL),
            (N'Сидоров Пётр Алексеевич',  '2005-03-21', N'+79007778899', N'sidorov@mail.ru',    N'Москва', NULL, 1, N'Не загружена', NULL, NULL, NULL, NULL, NULL),
            (N'Кузнецова Мария Олеговна', '2001-07-19', N'+79002223344', N'kuznetsova@mail.ru', N'Казань', DATEADD(YEAR, 2, GETDATE()), 1, N'Подтверждена', NULL, NULL, NULL, NULL, NULL),
            (N'Соколов Дмитрий Павлович', '1996-02-08', N'+79005556677', N'sokolov@mail.ru',    N'Новосибирск', DATEADD(YEAR, 1, GETDATE()), 1, N'Подтверждена', NULL, NULL, NULL, NULL, NULL),
            (N'Морозова Елена Викторовна','1999-09-30', N'+79008889900', N'morozova@mail.ru',   N'Казань', DATEADD(YEAR, 1, GETDATE()), 1, N'Подтверждена', NULL, NULL, NULL, NULL, NULL);
        GO

        -- ============================================================
        -- 14.3. Пользователи (пароли в открытом виде — без хэширования)
        -- ============================================================
        INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role) VALUES
            (NULL, N'admin',       N'admin123',      N'Администратор'),
            (NULL, N'manager1',    N'manager1123',   N'Менеджер'),
            (1,    N'ivanov',      N'ivanov123',     N'Волонтёр'),
            (2,    N'petrova',     N'petrova123',    N'Волонтёр'),
            (3,    N'sidorov',     N'sidorov123',    N'Волонтёр'),
            (4,    N'kuznetsova',  N'kuznetsova123', N'Волонтёр'),
            (5,    N'sokolov',     N'sokolov123',    N'Волонтёр'),
            (6,    N'morozova',    N'morozova123',   N'Волонтёр');
        GO

        -- ============================================================
        -- 14.4. Навыки волонтёров
        -- ============================================================
        INSERT INTO Volunteer_Skill (volunteer_id, skill_id, year_confirmed) VALUES
            (1, 3, 2023), (1, 4, 2022), (1, 5, 2024),
            (2, 1, 2021), (2, 6, 2023),
            (3, 2, 2024),
            (4, 3, 2024), (4, 7, 2023), (4, 8, 2024),
            (5, 4, 2020), (5, 3, 2022),
            (6, 1, 2022), (6, 5, 2024);
        GO

        -- ============================================================
        -- 14.5. Мероприятия (даты относительно сегодня)
        --   1 — завершённое (позавчера), 2/3 — будущие,
        --   4 — идёт сегодня, 5 — через месяц, 6 — отменённое
        -- ============================================================
        DECLARE @yesterday DATETIME = DATEADD(DAY, -21, CAST(CAST(GETDATE() AS DATE) AS DATETIME));
        DECLARE @today     DATETIME = CAST(CAST(GETDATE() AS DATE) AS DATETIME);
        DECLARE @soon      DATETIME = DATEADD(DAY, 14, CAST(CAST(GETDATE() AS DATE) AS DATETIME));
        DECLARE @later     DATETIME = DATEADD(DAY, 32, CAST(CAST(GETDATE() AS DATE) AS DATETIME));

        INSERT INTO Event (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id) VALUES
            (N'Субботник в парке',          DATEADD(HOUR, 9,  @yesterday), DATEADD(HOUR, 14, @yesterday),
                N'Парк Сокольники, Москва', 2, N'Уборка территорий, посадка деревьев и развеска скамеек.', N'Завершено', 2),
            (N'Помощь детскому дому',       DATEADD(HOUR, 10, @soon),      DATEADD(HOUR, 18, @soon),
                N'Детский дом №5',          1, N'Развивающие занятия с детьми, мастер-классы и подготовка к празднику.', N'Запланировано', 2),
            (N'Благотворительный концерт',  DATEADD(HOUR, 17, @later),     DATEADD(HOUR, 22, @later),
                N'ДК «Заря»',               4, N'Сбор средств для поддержки семей с детьми-инвалидами.', N'Запланировано', 2),
            (N'Эко-акция «Чистая набережная»', DATEADD(HOUR, 10, @today),  DATEADD(HOUR, 16, @today),
                N'Набережная озера Пестово', 2, N'Сбор и сортировка отходов, экологическая просветительская программа.', N'Идёт', 2),
            (N'Спортивный фестиваль',       DATEADD(HOUR, 11, @later),     DATEADD(HOUR, 19, @later),
                N'Стадион «Динамо»',        5, N'Организация зон, регистрация участников, судейство.', N'Запланировано', 2),
            (N'Книжная ярмарка',            DATEADD(HOUR, 12, @soon),      DATEADD(HOUR, 20, @soon),
                N'Центральная библиотека',   3, N'Отменено по организационным причинам.', N'Отменено', 2);
        GO

        -- ============================================================
        -- 14.6. Назначения
        -- ============================================================
        INSERT INTO Assignment (volunteer_id, event_id, role_id, hours_actual, confirmed) VALUES
            (1, 1, 6, 5.0, 1),
            (2, 1, 1, 5.0, 1),
            (4, 1, 6, 5.0, 1),
            (1, 2, 6, NULL, 0),
            (4, 2, 6, NULL, 0),
            (3, 4, 6, NULL, 0),
            (5, 4, 5, NULL, 0),
            (6, 5, 2, NULL, 0);
        GO

        -- ============================================================
        -- 14.7. Партнёры
        -- ============================================================
        INSERT INTO Partner (partner_name, inn, contact_person, phone, email, support_amount, contract_number, contract_date) VALUES
            (N'ООО «Добро»',   N'7701234567', N'Смирнов А.А.', N'+74951112233', N'dobro@mail.ru',   150000, N'Д-2026-01', DATEADD(MONTH, -8, GETDATE())),
            (N'Фонд «Помощь»', N'7809876543', N'Орлова Е.В.',  N'+78123334455', N'pomosh@mail.ru',  200000, N'П-2026-03', DATEADD(MONTH, -6, GETDATE())),
            (N'Компания «Зелёный город»', N'7765432109', N'Кузнечев И.И.', N'+74957778899', N'green@mail.ru', 90000, N'З-2026-05', DATEADD(MONTH, -2, GETDATE()));
        GO

        -- ============================================================
        -- 14.8. Партнёры ↔ Мероприятия
        -- ============================================================
        INSERT INTO Event_Partner (event_id, partner_id, amount) VALUES
            (1, 1, 50000),
            (2, 1, 30000),
            (2, 2, 70000),
            (3, 2, 100000),
            (4, 3, 40000),
            (5, 3, 50000);
        GO
        """;

    private const string DemoUpgradeScript = """
        SET NOCOUNT ON;
        GO

        IF NOT EXISTS (SELECT 1 FROM SystemUser WHERE login_name = N'admin2')
            INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
            VALUES (NULL, N'admin2', N'admin2123', N'Администратор', 1, DATEADD(DAY, -60, GETDATE()));

        IF NOT EXISTS (SELECT 1 FROM SystemUser WHERE login_name = N'admin3')
            INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
            VALUES (NULL, N'admin3', N'admin3123', N'Администратор', 1, DATEADD(DAY, -120, GETDATE()));

        IF NOT EXISTS (SELECT 1 FROM SystemUser WHERE login_name = N'manager2')
            INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
            VALUES (NULL, N'manager2', N'manager2123', N'Менеджер', 1, DATEADD(DAY, -90, GETDATE()));

        IF NOT EXISTS (SELECT 1 FROM SystemUser WHERE login_name = N'manager3')
            INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
            VALUES (NULL, N'manager3', N'manager3123', N'Менеджер', 1, DATEADD(DAY, -45, GETDATE()));

        IF NOT EXISTS (SELECT 1 FROM SystemUser WHERE login_name = N'manager4')
            INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
            VALUES (NULL, N'manager4', N'manager4123', N'Менеджер', 1, DATEADD(DAY, -20, GETDATE()));
        GO

        IF NOT EXISTS (SELECT 1 FROM Volunteer WHERE email = N'nikitin@mail.ru')
            INSERT INTO Volunteer (full_name, birth_date, phone, email, city, med_book_valid_until, personal_data_consent)
            VALUES (N'Никитин Артём Владимирович', '2002-04-12', N'+79001234567', N'nikitin@mail.ru',
                N'Москва', DATEADD(YEAR, 2, GETDATE()), 1);

        IF NOT EXISTS (SELECT 1 FROM Volunteer WHERE email = N'volkova@mail.ru')
            INSERT INTO Volunteer (full_name, birth_date, phone, email, city, med_book_valid_until, personal_data_consent)
            VALUES (N'Волкова Ольга Дмитриевна', '1997-08-24', N'+79002345678', N'volkova@mail.ru',
                N'Санкт-Петербург', DATEADD(YEAR, 1, GETDATE()), 1);

        IF NOT EXISTS (SELECT 1 FROM Volunteer WHERE email = N'lebedev@mail.ru')
            INSERT INTO Volunteer (full_name, birth_date, phone, email, city, med_book_valid_until, personal_data_consent)
            VALUES (N'Лебедев Максим Игоревич', '2004-01-17', N'+79003456789', N'lebedev@mail.ru',
                N'Москва', DATEADD(MONTH, 8, GETDATE()), 1);

        IF NOT EXISTS (SELECT 1 FROM Volunteer WHERE email = N'zakharova@mail.ru')
            INSERT INTO Volunteer (full_name, birth_date, phone, email, city, med_book_valid_until, personal_data_consent)
            VALUES (N'Захарова София Андреевна', '2000-12-05', N'+79004567890', N'zakharova@mail.ru',
                N'Казань', DATEADD(YEAR, 1, GETDATE()), 1);

        IF NOT EXISTS (SELECT 1 FROM Volunteer WHERE email = N'egorov@mail.ru')
            INSERT INTO Volunteer (full_name, birth_date, phone, email, city, med_book_valid_until, personal_data_consent)
            VALUES (N'Егоров Никита Сергеевич', '1995-06-30', N'+79005678901', N'egorov@mail.ru',
                N'Екатеринбург', DATEADD(YEAR, 3, GETDATE()), 1);

        IF NOT EXISTS (SELECT 1 FROM Volunteer WHERE email = N'belova@mail.ru')
            INSERT INTO Volunteer (full_name, birth_date, phone, email, city, med_book_valid_until, personal_data_consent)
            VALUES (N'Белова Виктория Павловна', '2003-03-08', N'+79006789012', N'belova@mail.ru',
                N'Новосибирск', DATEADD(YEAR, 1, GETDATE()), 1);

        IF NOT EXISTS (SELECT 1 FROM Volunteer WHERE email = N'kozlov@mail.ru')
            INSERT INTO Volunteer (full_name, birth_date, phone, email, city, med_book_valid_until, personal_data_consent)
            VALUES (N'Козлов Андрей Михайлович', '1999-10-11', N'+79007890123', N'kozlov@mail.ru',
                N'Москва', DATEADD(YEAR, 2, GETDATE()), 1);

        IF NOT EXISTS (SELECT 1 FROM Volunteer WHERE email = N'fedorova@mail.ru')
            INSERT INTO Volunteer (full_name, birth_date, phone, email, city, med_book_valid_until, personal_data_consent)
            VALUES (N'Фёдорова Алина Романовна', '2001-05-27', N'+79008901234', N'fedorova@mail.ru',
                N'Санкт-Петербург', DATEADD(MONTH, 10, GETDATE()), 1);
        GO

        INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
        SELECT v.volunteer_id, N'nikitin', N'nikitin123', N'Волонтёр', 1, DATEADD(DAY, -18, GETDATE())
        FROM Volunteer v
        WHERE v.email = N'nikitin@mail.ru'
          AND NOT EXISTS (SELECT 1 FROM SystemUser u WHERE u.login_name = N'nikitin');

        INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
        SELECT v.volunteer_id, N'volkova', N'volkova123', N'Волонтёр', 1, DATEADD(DAY, -17, GETDATE())
        FROM Volunteer v
        WHERE v.email = N'volkova@mail.ru'
          AND NOT EXISTS (SELECT 1 FROM SystemUser u WHERE u.login_name = N'volkova');

        INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
        SELECT v.volunteer_id, N'lebedev', N'lebedev123', N'Волонтёр', 1, DATEADD(DAY, -15, GETDATE())
        FROM Volunteer v
        WHERE v.email = N'lebedev@mail.ru'
          AND NOT EXISTS (SELECT 1 FROM SystemUser u WHERE u.login_name = N'lebedev');

        INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
        SELECT v.volunteer_id, N'zakharova', N'zakharova123', N'Волонтёр', 1, DATEADD(DAY, -14, GETDATE())
        FROM Volunteer v
        WHERE v.email = N'zakharova@mail.ru'
          AND NOT EXISTS (SELECT 1 FROM SystemUser u WHERE u.login_name = N'zakharova');

        INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
        SELECT v.volunteer_id, N'egorov', N'egorov123', N'Волонтёр', 1, DATEADD(DAY, -12, GETDATE())
        FROM Volunteer v
        WHERE v.email = N'egorov@mail.ru'
          AND NOT EXISTS (SELECT 1 FROM SystemUser u WHERE u.login_name = N'egorov');

        INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
        SELECT v.volunteer_id, N'belova', N'belova123', N'Волонтёр', 1, DATEADD(DAY, -9, GETDATE())
        FROM Volunteer v
        WHERE v.email = N'belova@mail.ru'
          AND NOT EXISTS (SELECT 1 FROM SystemUser u WHERE u.login_name = N'belova');

        INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
        SELECT v.volunteer_id, N'kozlov', N'kozlov123', N'Волонтёр', 1, DATEADD(DAY, -6, GETDATE())
        FROM Volunteer v
        WHERE v.email = N'kozlov@mail.ru'
          AND NOT EXISTS (SELECT 1 FROM SystemUser u WHERE u.login_name = N'kozlov');

        INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role, is_active, created_at)
        SELECT v.volunteer_id, N'fedorova', N'fedorova123', N'Волонтёр', 1, DATEADD(DAY, -3, GETDATE())
        FROM Volunteer v
        WHERE v.email = N'fedorova@mail.ru'
          AND NOT EXISTS (SELECT 1 FROM SystemUser u WHERE u.login_name = N'fedorova');
        GO

        INSERT INTO Volunteer_Skill (volunteer_id, skill_id, year_confirmed)
        SELECT v.volunteer_id, s.skill_id, x.year_confirmed
        FROM (VALUES
            (N'nikitin@mail.ru',   N'Первая помощь',            2024),
            (N'nikitin@mail.ru',   N'Вождение автомобиля',      2022),
            (N'volkova@mail.ru',   N'Английский язык',          2023),
            (N'volkova@mail.ru',   N'Организация мероприятий',  2024),
            (N'lebedev@mail.ru',   N'Веб-разработка',           2024),
            (N'lebedev@mail.ru',   N'Работа с детьми',          2023),
            (N'zakharova@mail.ru', N'Работа с пожилыми людьми', 2023),
            (N'zakharova@mail.ru', N'Первая помощь',            2024),
            (N'egorov@mail.ru',    N'Вождение автомобиля',      2021),
            (N'egorov@mail.ru',    N'Организация мероприятий',  2024),
            (N'belova@mail.ru',    N'Английский язык',          2023),
            (N'belova@mail.ru',    N'Работа с детьми',          2024),
            (N'kozlov@mail.ru',    N'Первая помощь',            2022),
            (N'kozlov@mail.ru',    N'Организация мероприятий',  2023),
            (N'fedorova@mail.ru',  N'Немецкий язык',            2022),
            (N'fedorova@mail.ru',  N'Работа с пожилыми людьми', 2024)
        ) AS x(email, skill_name, year_confirmed)
        JOIN Volunteer v ON v.email = x.email
        JOIN Skill s ON s.skill_name = x.skill_name
        WHERE NOT EXISTS (
            SELECT 1 FROM Volunteer_Skill vs
            WHERE vs.volunteer_id = v.volunteer_id AND vs.skill_id = s.skill_id
        );
        GO

        DECLARE @today DATETIME = CAST(CAST(GETDATE() AS DATE) AS DATETIME);

        UPDATE [Event]
        SET date_start = DATEADD(HOUR, 9, DATEADD(DAY, -21, @today)),
            date_end   = DATEADD(HOUR, 14, DATEADD(DAY, -21, @today)),
            status     = N'Завершено'
        WHERE event_name = N'Субботник в парке';

        UPDATE [Event]
        SET date_start = DATEADD(HOUR, 10, DATEADD(DAY, 14, @today)),
            date_end   = DATEADD(HOUR, 18, DATEADD(DAY, 14, @today)),
            status     = N'Запланировано'
        WHERE event_name = N'Помощь детскому дому';

        UPDATE [Event]
        SET date_start = DATEADD(HOUR, 17, DATEADD(DAY, 32, @today)),
            date_end   = DATEADD(HOUR, 22, DATEADD(DAY, 32, @today)),
            status     = N'Запланировано'
        WHERE event_name = N'Благотворительный концерт';

        UPDATE [Event]
        SET date_start = DATEADD(HOUR, 10, DATEADD(DAY, 2, @today)),
            date_end   = DATEADD(HOUR, 16, DATEADD(DAY, 2, @today)),
            status     = N'Запланировано'
        WHERE event_name = N'Эко-акция «Чистая набережная»';

        UPDATE [Event]
        SET date_start = DATEADD(HOUR, 11, DATEADD(DAY, 40, @today)),
            date_end   = DATEADD(HOUR, 19, DATEADD(DAY, 40, @today)),
            status     = N'Запланировано'
        WHERE event_name = N'Спортивный фестиваль';

        UPDATE [Event]
        SET date_start = DATEADD(HOUR, 12, DATEADD(DAY, 21, @today)),
            date_end   = DATEADD(HOUR, 20, DATEADD(DAY, 21, @today)),
            status     = N'Отменено'
        WHERE event_name = N'Книжная ярмарка';
        GO

        DECLARE @today DATETIME = CAST(CAST(GETDATE() AS DATE) AS DATETIME);
        DECLARE @past30 DATETIME = DATEADD(DAY, -30, @today);
        DECLARE @past14 DATETIME = DATEADD(DAY, -14, @today);
        DECLARE @d4  DATETIME = DATEADD(DAY, 4,  @today);
        DECLARE @d7  DATETIME = DATEADD(DAY, 7,  @today);
        DECLARE @d10 DATETIME = DATEADD(DAY, 10, @today);
        DECLARE @d18 DATETIME = DATEADD(DAY, 18, @today);
        DECLARE @d25 DATETIME = DATEADD(DAY, 25, @today);
        DECLARE @d45 DATETIME = DATEADD(DAY, 45, @today);
        DECLARE @d55 DATETIME = DATEADD(DAY, 55, @today);
        DECLARE @d65 DATETIME = DATEADD(DAY, 65, @today);
        DECLARE @d75 DATETIME = DATEADD(DAY, 75, @today);
        DECLARE @d95 DATETIME = DATEADD(DAY, 95, @today);

        IF NOT EXISTS (SELECT 1 FROM [Event] WHERE event_name = N'Городской субботник «Чистые улицы»')
            INSERT INTO [Event] (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id)
            VALUES (N'Городской субботник «Чистые улицы»',
                DATEADD(HOUR, 9, @past30), DATEADD(HOUR, 14, @past30),
                N'Парк «Измайлово», Москва', 2,
                N'Городская уборка, озеленение и раздельный сбор отходов.',
                N'Завершено', (SELECT user_id FROM SystemUser WHERE login_name = N'manager1'));

        IF NOT EXISTS (SELECT 1 FROM [Event] WHERE event_name = N'Помощь приюту «Верный друг»')
            INSERT INTO [Event] (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id)
            VALUES (N'Помощь приюту «Верный друг»',
                DATEADD(HOUR, 10, @past14), DATEADD(HOUR, 16, @past14),
                N'Приют «Верный друг», Санкт-Петербург', 4,
                N'Выгул животных, уборка вольеров и сбор корма для приюта.',
                N'Завершено', (SELECT user_id FROM SystemUser WHERE login_name = N'manager4'));

        IF NOT EXISTS (SELECT 1 FROM [Event] WHERE event_name = N'Осенний марафон добрых дел')
            INSERT INTO [Event] (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id)
            VALUES (N'Осенний марафон добрых дел',
                DATEADD(HOUR, 10, @d4), DATEADD(HOUR, 18, @d4),
                N'Парк «Сокольники», Москва', 1,
                N'Помощь семьям, мастер-классы и сбор школьных принадлежностей.',
                N'Запланировано', (SELECT user_id FROM SystemUser WHERE login_name = N'manager2'));

        IF NOT EXISTS (SELECT 1 FROM [Event] WHERE event_name = N'Эко-десант в Кузьминках')
            INSERT INTO [Event] (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id)
            VALUES (N'Эко-десант в Кузьминках',
                DATEADD(HOUR, 9, @d7), DATEADD(HOUR, 14, @d7),
                N'Парк «Кузьминки», Москва', 2,
                N'Уборка лесопарковой зоны, посадка кустарников и эко-квест.',
                N'Запланировано', (SELECT user_id FROM SystemUser WHERE login_name = N'manager3'));

        IF NOT EXISTS (SELECT 1 FROM [Event] WHERE event_name = N'День народного единства')
            INSERT INTO [Event] (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id)
            VALUES (N'День народного единства',
                DATEADD(HOUR, 16, @d10), DATEADD(HOUR, 21, @d10),
                N'ДК «Заря», Санкт-Петербург', 3,
                N'Праздничный концерт, встреча гостей и работа фотозоны.',
                N'Запланировано', (SELECT user_id FROM SystemUser WHERE login_name = N'manager1'));

        IF NOT EXISTS (SELECT 1 FROM [Event] WHERE event_name = N'Донорская акция «Капля жизни»')
            INSERT INTO [Event] (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id)
            VALUES (N'Донорская акция «Капля жизни»',
                DATEADD(HOUR, 8, @d18), DATEADD(HOUR, 15, @d18),
                N'Центр крови им. О.К. Гаврилова, Москва', 4,
                N'Сопровождение доноров, работа регистрации и чайной зоны.',
                N'Запланировано', (SELECT user_id FROM SystemUser WHERE login_name = N'manager2'));

        IF NOT EXISTS (SELECT 1 FROM [Event] WHERE event_name = N'Зимняя ярмарка мастеров')
            INSERT INTO [Event] (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id)
            VALUES (N'Зимняя ярмарка мастеров',
                DATEADD(HOUR, 12, @d25), DATEADD(HOUR, 20, @d25),
                N'Центр современной культуры «Смена», Казань', 3,
                N'Ярмарка ручных изделий, помощь мастерам и организация сцены.',
                N'Запланировано', (SELECT user_id FROM SystemUser WHERE login_name = N'manager4'));

        IF NOT EXISTS (SELECT 1 FROM [Event] WHERE event_name = N'Новогодний спектакль для детей')
            INSERT INTO [Event] (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id)
            VALUES (N'Новогодний спектакль для детей',
                DATEADD(HOUR, 11, @d45), DATEADD(HOUR, 18, @d45),
                N'Детский дом №5, Москва', 1,
                N'Новогоднее представление, подарки и игры с детьми.',
                N'Запланировано', (SELECT user_id FROM SystemUser WHERE login_name = N'manager3'));

        IF NOT EXISTS (SELECT 1 FROM [Event] WHERE event_name = N'Благотворительный забег «Снежинка»')
            INSERT INTO [Event] (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id)
            VALUES (N'Благотворительный забег «Снежинка»',
                DATEADD(HOUR, 9, @d55), DATEADD(HOUR, 14, @d55),
                N'Стадион «Динамо», Москва', 5,
                N'Регистрация участников, выдача номеров и поддержка на трассе.',
                N'Запланировано', (SELECT user_id FROM SystemUser WHERE login_name = N'manager2'));

        IF NOT EXISTS (SELECT 1 FROM [Event] WHERE event_name = N'Рождественские чтения')
            INSERT INTO [Event] (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id)
            VALUES (N'Рождественские чтения',
                DATEADD(HOUR, 10, @d65), DATEADD(HOUR, 17, @d65),
                N'Центральная библиотека, Санкт-Петербург', 6,
                N'Литературные мастер-классы и помощь в организации лекций.',
                N'Запланировано', (SELECT user_id FROM SystemUser WHERE login_name = N'manager1'));

        IF NOT EXISTS (SELECT 1 FROM [Event] WHERE event_name = N'Зимний фестиваль «Свет города»')
            INSERT INTO [Event] (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id)
            VALUES (N'Зимний фестиваль «Свет города»',
                DATEADD(HOUR, 12, @d75), DATEADD(HOUR, 22, @d75),
                N'Набережная озера Кабан, Казань', 3,
                N'Световые инсталляции, работа с гостями и сопровождение площадок.',
                N'Запланировано', (SELECT user_id FROM SystemUser WHERE login_name = N'manager4'));

        IF NOT EXISTS (SELECT 1 FROM [Event] WHERE event_name = N'Эко-акция «Чистый январь»')
            INSERT INTO [Event] (event_name, date_start, date_end, location, event_type_id, description, status, coordinator_id)
            VALUES (N'Эко-акция «Чистый январь»',
                DATEADD(HOUR, 10, @d95), DATEADD(HOUR, 16, @d95),
                N'Парк «Кузьминки», Москва', 2,
                N'Зимняя уборка парка, сортировка отходов и просветительская программа.',
                N'Запланировано', (SELECT user_id FROM SystemUser WHERE login_name = N'manager3'));
        GO

        INSERT INTO Assignment (volunteer_id, event_id, role_id, hours_actual, confirmed)
        SELECT v.volunteer_id, e.event_id, r.role_id, x.hours_actual, x.confirmed
        FROM (VALUES
            (N'nikitin@mail.ru',   N'Городской субботник «Чистые улицы»', N'Участник',     CAST(5.00 AS DECIMAL(5,2)), 1),
            (N'volkova@mail.ru',   N'Городской субботник «Чистые улицы»', N'Помощник',     CAST(5.00 AS DECIMAL(5,2)), 1),
            (N'lebedev@mail.ru',   N'Городской субботник «Чистые улицы»', N'Участник',     CAST(4.50 AS DECIMAL(5,2)), 1),
            (N'zakharova@mail.ru', N'Помощь приюту «Верный друг»',        N'Участник',     CAST(6.00 AS DECIMAL(5,2)), 1),
            (N'egorov@mail.ru',    N'Помощь приюту «Верный друг»',        N'Организатор',  CAST(6.00 AS DECIMAL(5,2)), 1),
            (N'belova@mail.ru',    N'Помощь приюту «Верный друг»',        N'Помощник',     CAST(5.00 AS DECIMAL(5,2)), 1),

            (N'kozlov@mail.ru',    N'Осенний марафон добрых дел',         N'Координатор',  CAST(NULL AS DECIMAL(5,2)), 1),
            (N'fedorova@mail.ru',  N'Осенний марафон добрых дел',         N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'nikitin@mail.ru',   N'Осенний марафон добрых дел',         N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),

            (N'volkova@mail.ru',   N'Эко-десант в Кузьминках',            N'Организатор',  CAST(NULL AS DECIMAL(5,2)), 1),
            (N'lebedev@mail.ru',   N'Эко-десант в Кузьминках',            N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'zakharova@mail.ru', N'Эко-десант в Кузьминках',            N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),

            (N'egorov@mail.ru',    N'День народного единства',            N'Участник',     CAST(NULL AS DECIMAL(5,2)), 1),
            (N'belova@mail.ru',    N'День народного единства',            N'Помощник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'kozlov@mail.ru',    N'День народного единства',            N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),

            (N'fedorova@mail.ru',  N'Донорская акция «Капля жизни»',      N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'nikitin@mail.ru',   N'Донорская акция «Капля жизни»',      N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'volkova@mail.ru',   N'Донорская акция «Капля жизни»',      N'Помощник',     CAST(NULL AS DECIMAL(5,2)), 1),

            (N'lebedev@mail.ru',   N'Зимняя ярмарка мастеров',            N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'zakharova@mail.ru', N'Зимняя ярмарка мастеров',            N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'egorov@mail.ru',    N'Зимняя ярмарка мастеров',            N'Организатор',  CAST(NULL AS DECIMAL(5,2)), 1),

            (N'belova@mail.ru',    N'Новогодний спектакль для детей',     N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'kozlov@mail.ru',    N'Новогодний спектакль для детей',     N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'fedorova@mail.ru',  N'Новогодний спектакль для детей',     N'Помощник',     CAST(NULL AS DECIMAL(5,2)), 1),

            (N'nikitin@mail.ru',   N'Благотворительный забег «Снежинка»', N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'volkova@mail.ru',   N'Благотворительный забег «Снежинка»', N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'lebedev@mail.ru',   N'Благотворительный забег «Снежинка»', N'Организатор',  CAST(NULL AS DECIMAL(5,2)), 1),

            (N'zakharova@mail.ru', N'Рождественские чтения',              N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'egorov@mail.ru',    N'Рождественские чтения',              N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'belova@mail.ru',    N'Рождественские чтения',              N'Помощник',     CAST(NULL AS DECIMAL(5,2)), 1),

            (N'kozlov@mail.ru',    N'Зимний фестиваль «Свет города»',     N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'fedorova@mail.ru',  N'Зимний фестиваль «Свет города»',     N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'nikitin@mail.ru',   N'Зимний фестиваль «Свет города»',     N'Организатор',  CAST(NULL AS DECIMAL(5,2)), 1),

            (N'volkova@mail.ru',   N'Эко-акция «Чистый январь»',          N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'lebedev@mail.ru',   N'Эко-акция «Чистый январь»',          N'Участник',     CAST(NULL AS DECIMAL(5,2)), 0),
            (N'zakharova@mail.ru', N'Эко-акция «Чистый январь»',          N'Помощник',     CAST(NULL AS DECIMAL(5,2)), 1)
        ) AS x(email, event_name, role_name, hours_actual, confirmed)
        JOIN Volunteer v ON v.email = x.email
        JOIN [Event] e ON e.event_name = x.event_name
        JOIN Role r ON r.role_name = x.role_name
        WHERE NOT EXISTS (
            SELECT 1 FROM Assignment a
            WHERE a.volunteer_id = v.volunteer_id
              AND a.event_id = e.event_id
              AND a.role_id = r.role_id
        );
        GO

        IF NOT EXISTS (SELECT 1 FROM Partner WHERE partner_name = N'АО «Тепло сердец»')
            INSERT INTO Partner (partner_name, inn, contact_person, phone, email, support_amount, contract_number, contract_date)
            VALUES (N'АО «Тепло сердец»', N'7712345678', N'Мельникова О.С.', N'+74951234567',
                N'teplo@mail.ru', 120000, N'Т-2026-07', DATEADD(DAY, -45, GETDATE()));

        IF NOT EXISTS (SELECT 1 FROM Partner WHERE partner_name = N'ООО «Северный ветер»')
            INSERT INTO Partner (partner_name, inn, contact_person, phone, email, support_amount, contract_number, contract_date)
            VALUES (N'ООО «Северный ветер»', N'7812345670', N'Громов Д.А.', N'+78127654321',
                N'nord@mail.ru', 80000, N'С-2026-08', DATEADD(DAY, -20, GETDATE()));
        GO

        INSERT INTO Event_Partner (event_id, partner_id, amount)
        SELECT e.event_id, p.partner_id, x.amount
        FROM (VALUES
            (N'Осенний марафон добрых дел',         N'ООО «Добро»',          CAST(40000 AS DECIMAL(12,2))),
            (N'Донорская акция «Капля жизни»',      N'Фонд «Помощь»',       CAST(60000 AS DECIMAL(12,2))),
            (N'Новогодний спектакль для детей',     N'АО «Тепло сердец»',   CAST(80000 AS DECIMAL(12,2))),
            (N'Благотворительный забег «Снежинка»', N'ООО «Северный ветер»', CAST(50000 AS DECIMAL(12,2))),
            (N'Зимний фестиваль «Свет города»',     N'ООО «Добро»',          CAST(35000 AS DECIMAL(12,2))),
            (N'Эко-акция «Чистый январь»',          N'ООО «Северный ветер»', CAST(30000 AS DECIMAL(12,2)))
        ) AS x(event_name, partner_name, amount)
        JOIN [Event] e ON e.event_name = x.event_name
        JOIN Partner p ON p.partner_name = x.partner_name
        WHERE NOT EXISTS (
            SELECT 1 FROM Event_Partner ep
            WHERE ep.event_id = e.event_id AND ep.partner_id = p.partner_id
        );
        GO

        -- 14. Дополнение для медкнижки (версия 4)
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Volunteer') AND name = N'med_book_status')
            ALTER TABLE Volunteer ADD med_book_status NVARCHAR(20) NOT NULL DEFAULT N'Не загружена';
        GO

        IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'chk_med_book_status')
            ALTER TABLE Volunteer ADD CONSTRAINT chk_med_book_status CHECK (med_book_status IN (N'Не загружена', N'На проверке', N'Подтверждена', N'Отклонена', N'Просрочена'));
        GO

        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Volunteer') AND name = N'med_book_scan_path')
            ALTER TABLE Volunteer ADD med_book_scan_path NVARCHAR(500) NULL;
        GO

        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Volunteer') AND name = N'med_book_uploaded_at')
            ALTER TABLE Volunteer ADD med_book_uploaded_at DATETIME NULL;
        GO

        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Volunteer') AND name = N'med_book_verified_by')
            ALTER TABLE Volunteer ADD med_book_verified_by INT NULL;
        GO

        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Volunteer') AND name = N'med_book_verified_at')
            ALTER TABLE Volunteer ADD med_book_verified_at DATETIME NULL;
        GO

        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Volunteer') AND name = N'med_book_notes')
            ALTER TABLE Volunteer ADD med_book_notes NVARCHAR(MAX) NULL;
        GO

        IF OBJECT_ID(N'dbo.med_book_verified_by_FK') IS NULL
            ALTER TABLE Volunteer ADD CONSTRAINT med_book_verified_by_FK FOREIGN KEY (med_book_verified_by) REFERENCES SystemUser(user_id) ON DELETE SET NULL;
        GO

        -- Пересоздаём триггер медкнижки (CREATE TRIGGER — первой инструкцией батча)
        IF OBJECT_ID(N'dbo.trg_assignment_medbook') IS NOT NULL
            DROP TRIGGER trg_assignment_medbook;
        GO

        CREATE TRIGGER trg_assignment_medbook
        ON Assignment
        AFTER INSERT, UPDATE
        AS
        BEGIN
            SET NOCOUNT ON;
            IF EXISTS (
                SELECT 1
                FROM inserted i
                JOIN Event e ON e.event_id = i.event_id
                JOIN EventType et ON et.event_type_id = e.event_type_id
                JOIN Volunteer v ON v.volunteer_id = i.volunteer_id
                WHERE et.type_name IN (N'Социальное', N'Благотворительное', N'Образовательное')
                  AND (v.med_book_status <> N'Подтверждена'
                       OR v.med_book_valid_until IS NULL
                       OR v.med_book_valid_until < CAST(GETDATE() AS DATE))
            )
            BEGIN
                RAISERROR(N'Для участия в мероприятии требуется действующая медицинская книжка.', 16, 1);
                ROLLBACK TRANSACTION;
            END
        END;
        GO

        -- Установка статуса для существующих волонтёров
        UPDATE Volunteer
        SET med_book_status = N'Не загружена'
        WHERE med_book_status IS NULL;
        GO

        -- Демо: даты из прошлых версий считаем подтверждёнными, просроченные метим
        UPDATE Volunteer
        SET med_book_status = N'Подтверждена'
        WHERE (med_book_status IS NULL OR med_book_status = N'Не загружена')
          AND med_book_valid_until IS NOT NULL
          AND med_book_valid_until >= CAST(GETDATE() AS DATE);
        GO

        UPDATE Volunteer
        SET med_book_status = N'Просрочена'
        WHERE med_book_status = N'Подтверждена'
          AND med_book_valid_until < CAST(GETDATE() AS DATE);
        GO

        -- 15. Обсуждение мероприятий (версия 5)
        IF OBJECT_ID(N'dbo.EventComment') IS NULL
        BEGIN
            CREATE TABLE EventComment (
                comment_id INT PRIMARY KEY IDENTITY(1,1),
                event_id   INT           NOT NULL,
                user_id    INT           NOT NULL,
                text       NVARCHAR(2000) NOT NULL,
                created_at DATETIME      NOT NULL DEFAULT GETDATE(),
                FOREIGN KEY (event_id) REFERENCES Event(event_id)     ON DELETE CASCADE,
                FOREIGN KEY (user_id)  REFERENCES SystemUser(user_id) ON DELETE CASCADE
            );
        END;
        GO

        -- Демо-комментарии: к событию 2 (Помощь детскому дому)
        IF NOT EXISTS (SELECT 1 FROM EventComment WHERE event_id = 2)
        BEGIN
            INSERT INTO EventComment (event_id, user_id, text, created_at)
            SELECT e.event_id, u.user_id, N'Друзья! Сбор у входа в 9:45, форма удобная. Вопросы — сюда.', DATEADD(DAY, -5, GETDATE())
            FROM [Event] e
            JOIN SystemUser u ON u.login_name = N'manager1'
            WHERE e.event_name = N'Помощь детскому дому';

            INSERT INTO EventComment (event_id, user_id, text, created_at)
            SELECT e.event_id, u.user_id, N'Буду, помогу с мастер-классами. Возьму краски и бумагу.', DATEADD(DAY, -4, GETDATE())
            FROM [Event] e
            JOIN SystemUser u ON u.login_name = N'ivanov'
            WHERE e.event_name = N'Помощь детскому дому';
        END;
        GO

        """;
}
