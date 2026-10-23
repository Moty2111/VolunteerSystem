using System.Net;
using System.Net.Sockets;
using Microsoft.AspNetCore.Connections;
using VolunteerSystem.Server.Services;

// Regression test using a real Kestrel bind failure, without SQL Server or NuGet test packages.
using var listener = new TcpListener(IPAddress.Loopback, 0);
listener.Start();
var address = $"http://127.0.0.1:{((IPEndPoint)listener.LocalEndpoint).Port}";
var provider = new DisposalSensitiveLoggerProvider();
var builder = WebApplication.CreateBuilder(Array.Empty<string>());
builder.Logging.ClearProviders();
builder.Services.AddSingleton<ILoggerProvider>(_ => provider);
builder.WebHost.UseUrls(address);
var app = builder.Build();

try
{
    await app.RunAsync();
    throw new Exception("Expected Kestrel to reject the occupied port.");
}
catch (IOException exception)
{
    Check(provider.IsDisposed, "RunAsync must have disposed the logging provider.");

    // Reproduce the secondary error in the old catch block on all platforms.
    try
    {
        app.Logger.LogCritical("Previous startup error handler");
        throw new Exception("Expected the disposed logging provider to reject logging.");
    }
    catch (AggregateException loggingError)
    {
        Check(loggingError.InnerExceptions.Any(error => error is ObjectDisposedException),
            "The secondary logging failure must wrap ObjectDisposedException.");
    }

    using var output = new StringWriter();
    StartupFailureReporter.Report(exception, output);
    var message = output.ToString();
    Check(message.Contains(address), "Diagnostics must preserve the actual failing address.");
    Check(message.Contains(nameof(AddressInUseException)), "Diagnostics must preserve the original exception chain.");
    Check(message.Contains("npm run dev"), "A bind failure must explain how to select a free port.");
    Console.WriteLine("PASS: occupied port is reported after host disposal without using its logger.");
}

using (var output = new StringWriter())
{
    StartupFailureReporter.Report(new IOException("Disk read failed", new UnauthorizedAccessException("Access denied")), output);
    var message = output.ToString();
    Check(message.Contains("Disk read failed") && message.Contains("Access denied"),
        "Non-port I/O failures must preserve their original cause.");
    Check(!message.Contains("уже занят"), "Unrelated I/O failures must not be labeled as port conflicts.");
    Console.WriteLine("PASS: unrelated I/O failures retain their original cause.");
}

static void Check(bool condition, string message)
{
    if (!condition) throw new Exception(message);
}

sealed class DisposalSensitiveLoggerProvider : ILoggerProvider
{
    public bool IsDisposed { get; private set; }
    public ILogger CreateLogger(string categoryName) => new DisposalSensitiveLogger(this);
    public void Dispose() => IsDisposed = true;

    private sealed class DisposalSensitiveLogger(DisposalSensitiveLoggerProvider provider) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state,
            Exception? exception, Func<TState, Exception?, string> formatter)
        {
            ObjectDisposedException.ThrowIf(provider.IsDisposed, provider);
        }
    }
}
