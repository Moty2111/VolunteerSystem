#!/usr/bin/env node
// Stand-in for `dotnet run` in launcher tests; no database or .NET SDK required.
import http from 'node:http';
const target = new URL(process.argv[process.argv.indexOf('--urls') + 1]);
http.createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ service: 'VolunteerSystem.Api' }));
}).listen(Number(target.port), target.hostname);
