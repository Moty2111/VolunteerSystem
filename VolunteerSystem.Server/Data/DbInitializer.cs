using System.Text;
using Microsoft.Data.SqlClient;

namespace VolunteerSystem.Server.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(IConfiguration config, ILogger logger)
    {
        var connString = config.GetConnectionString("DefaultConnection")!;
        var builder = new SqlConnectionStringBuilder(connString);
        var targetDb = builder.InitialCatalog;

        // Проверяем — есть ли уже такая БД
        builder.InitialCatalog = "master";
        var masterConn = builder.ConnectionString;

        await using (var conn = new SqlConnection(masterConn))
        {
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(
                "SELECT 1 FROM sys.databases WHERE name = @name", conn);
            cmd.Parameters.AddWithValue("@name", targetDb);
            var exists = await cmd.ExecuteScalarAsync() != null;
            if (exists)
            {
                logger.LogInformation("БД {Db} уже существует — инициализация не требуется", targetDb);
                return;
            }
        }

        logger.LogInformation("БД {Db} не найдена — создаём из встроенного скрипта…", targetDb);

        var batches = SplitByGo(BootstrapScript);

        await using (var conn = new SqlConnection(masterConn))
        {
            await conn.OpenAsync();
            foreach (var raw in batches)
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

        logger.LogInformation("БД {Db} успешно создана и заполнена тестовыми данными", targetDb);
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
    // Встроенный SQL-скрипт (raw string literal, .NET 10 / C# 13+)
    // ============================================================
    private const string BootstrapScript = """
        -- ============================================================
        -- Создание БД IS_Volunteer и заполнение тестовыми данными
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
            volunteer_id          INT PRIMARY KEY IDENTITY(1,1),
            full_name             NVARCHAR(200) NOT NULL,
            birth_date            DATE          NOT NULL,
            phone                 NVARCHAR(20)  NOT NULL,
            email                 NVARCHAR(150) NOT NULL UNIQUE,
            city                  NVARCHAR(100) NOT NULL,
            med_book_valid_until  DATE          NULL,
            personal_data_consent BIT           NOT NULL DEFAULT 0,
            is_active             BIT           NOT NULL DEFAULT 1,
            created_at            DATETIME      NOT NULL DEFAULT GETDATE(),
            CONSTRAINT chk_volunteer_birth CHECK (birth_date <= DATEADD(YEAR, -14, GETDATE()))
        );
        GO

        -- 3. Пользователи системы
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
            FOREIGN KEY (volunteer_id) REFERENCES Volunteer(volunteer_id) ON DELETE SET NULL
        );
        GO

        CREATE UNIQUE INDEX uq_systemuser_volunteer
            ON SystemUser(volunteer_id)
            WHERE volunteer_id IS NOT NULL;
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

        -- 11.2. Медкнижка для соц/благотв./образовательных
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

        -- 14.1. Справочники
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

        -- 14.2. Волонтёры
        INSERT INTO Volunteer (full_name, birth_date, phone, email, city, med_book_valid_until, personal_data_consent)
        VALUES
            (N'Иванов Иван Иванович',     '2000-05-14', N'+79001112233', N'ivanov@mail.ru',     N'Москва',          '2026-12-31', 1),
            (N'Петрова Анна Сергеевна',   '1998-11-02', N'+79004445566', N'petrova@mail.ru',    N'Санкт-Петербург', '2025-06-30', 1),
            (N'Сидоров Пётр Алексеевич',  '2005-03-21', N'+79007778899', N'sidorov@mail.ru',    N'Москва',          NULL,         1),
            (N'Кузнецова Мария Олеговна', '2001-07-19', N'+79002223344', N'kuznetsova@mail.ru', N'Казань',          '2027-01-15', 1);
        GO

        -- 14.3. Пользователи (пароли в открытом виде — для отладки!)
        INSERT INTO SystemUser (volunteer_id, login_name, password_hash, system_role) VALUES
            (NULL, N'admin',       N'admin123',       N'Администратор'),
            (NULL, N'manager1',    N'manager1123',    N'Менеджер'),
            (1,    N'ivanov',      N'ivanov123',      N'Волонтёр'),
            (2,    N'petrova',     N'petrova123',     N'Волонтёр'),
            (3,    N'sidorov',     N'sidorov123',     N'Волонтёр'),
            (4,    N'kuznetsova',  N'kuznetsova123',  N'Волонтёр');
        GO

        -- 14.4. Навыки волонтёров
        INSERT INTO Volunteer_Skill (volunteer_id, skill_id, year_confirmed) VALUES
            (1, 3, 2023), (1, 4, 2022), (1, 5, 2024),
            (2, 1, 2021), (2, 6, 2023),
            (3, 2, 2024),
            (4, 3, 2024), (4, 7, 2023), (4, 8, 2024);
        GO

        -- 14.5. Мероприятия
        INSERT INTO Event (event_name, date_start, date_end, location, event_type_id, status, coordinator_id) VALUES
            (N'Субботник в парке',         '2026-04-15 09:00', '2026-04-15 14:00', N'Парк Сокольники', 2, N'Завершено',     2),
            (N'Помощь детскому дому',      '2026-05-20 10:00', '2026-05-20 18:00', N'Детский дом №5',  1, N'Запланировано', 2),
            (N'Благотворительный концерт', '2026-06-10 17:00', '2026-06-10 22:00', N'ДК Заря',         4, N'Запланировано', 2);
        GO

        -- 14.6. Назначения
        INSERT INTO Assignment (volunteer_id, event_id, role_id, hours_actual, confirmed) VALUES
            (1, 1, 6, 5.0, 1),
            (2, 1, 1, 5.0, 1),
            (4, 1, 6, 5.0, 1),
            (1, 2, 6, NULL, 0),
            (4, 2, 6, NULL, 0);
        GO

        -- 14.7. Партнёры
        INSERT INTO Partner (partner_name, inn, contact_person, phone, email, support_amount, contract_number, contract_date) VALUES
            (N'ООО «Добро»',   N'7701234567', N'Смирнов А.А.', N'+74951112233', N'dobro@mail.ru',   150000, N'Д-2026-01', '2026-01-15'),
            (N'Фонд «Помощь»', N'7809876543', N'Орлова Е.В.',  N'+78123334455', N'pomosh@mail.ru',  200000, N'П-2026-03', '2026-02-20');
        GO

        -- 14.8. Партнёры ↔ Мероприятия
        INSERT INTO Event_Partner (event_id, partner_id, amount) VALUES
            (1, 1, 50000),
            (2, 1, 30000),
            (2, 2, 70000),
            (3, 2, 100000);
        GO
        """;
}