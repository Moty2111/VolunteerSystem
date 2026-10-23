using Microsoft.AspNetCore.Connections;

namespace VolunteerSystem.Server.Services;

internal static class StartupFailureReporter
{
    public static void Report(IOException exception, TextWriter output)
    {
        // Run/RunAsync disposes the host, including logging providers, before
        // rethrowing startup failures. Diagnostics here must not use app.Logger.
        output.WriteLine("Не удалось запустить API. Исходная ошибка:");
        output.WriteLine(exception);

        for (Exception? cause = exception; cause is not null; cause = cause.InnerException)
        {
            if (cause is not AddressInUseException) continue;

            output.WriteLine(
                "Порт в сообщении выше уже занят. Остановите предыдущий запуск этого проекта " +
                "в Visual Studio или терминале и повторите запуск. " +
                "Для автоматического выбора свободного порта запустите «npm run dev» " +
                "в корне репозитория.");
            break;
        }
    }
}
