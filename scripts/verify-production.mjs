import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

// Exercise the production artifact before Vercel can mark its build successful.
const portProbe = createServer();
portProbe.listen(0, '127.0.0.1');
await once(portProbe, 'listening');
const { port } = portProbe.address();
await new Promise(resolve => portProbe.close(resolve));

const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    env: { ...process.env, NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { output = (output + data).slice(-8000); });
let startupError;
server.on('error', error => { startupError = error; });
try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
        if (startupError) throw startupError;
        if (server.exitCode !== null) throw new Error('Production server exited before becoming ready');
        try {
            const response = await fetch(base, { signal: AbortSignal.timeout(1000) });
            await response.arrayBuffer();
            if (response.ok) { ready = true; break; }
        } catch { /* The server may still be starting. */ }
        await delay(250);
    }
    if (!ready) throw new Error('Production server did not become ready');
    const tests = spawn(process.execPath, ['--test', 'tests/framework-smoke.test.mjs'], {
        env: { ...process.env, SMOKE_TEST_URL: base }, stdio: 'inherit',
    });
    const [code] = await once(tests, 'exit');
    if (code !== 0) throw new Error('Production smoke tests failed');
} catch (error) {
    console.error(output);
    throw error;
} finally {
    if (server.exitCode === null && server.pid) {
        const exited = once(server, 'exit');
        server.kill('SIGTERM');
        const force = setTimeout(() => server.kill('SIGKILL'), 3000);
        force.unref();
        await exited;
        clearTimeout(force);
    }
}
