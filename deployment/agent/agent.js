const WebSocket = require('ws');
const { spawn } = require('child_process');
const os = require('os');

const BACKEND_URL = process.env.BACKEND_WS_URL || 'ws://deployment-service:8082';
const VM_ID = process.env.VM_ID;
const VM_TOKEN = process.env.VM_TOKEN;
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL || '30000', 10);

if (!VM_ID || !VM_TOKEN) {
    console.error('VM_ID and VM_TOKEN environment variables are required');
    process.exit(1);
}

let ws;
let shellProcess = null;
let heartbeatTimer = null;
let reconnectTimer = null;

function connect() {
    const url = `${BACKEND_URL}/ws/agent/${VM_ID}/${VM_TOKEN}`;
    console.log(`Connecting to ${url}...`);

    ws = new WebSocket(url);

    ws.on('open', () => {
        console.log('Connected to backend');
        startHeartbeat();
    });

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            handleMessage(msg);
        } catch (err) {
            console.error('Failed to parse message:', err.message);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`Disconnected: ${code} ${reason}`);
        stopShell();
        stopHeartbeat();
        scheduleReconnect();
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
        ws.close();
    });
}

function handleMessage(msg) {
    switch (msg.type) {
        case 'registered':
            console.log(`Registered as agent for VM ${msg.vmId}`);
            break;
        case 'start_shell':
            startShell();
            break;
        case 'stop_shell':
            stopShell();
            break;
        default:
            // Shell input — forward to shell process
            if (shellProcess && shellProcess.stdin.writable) {
                shellProcess.stdin.write(msg);
            }
            break;
    }
}

function startShell() {
    if (shellProcess) return;
    console.log('Starting shell...');

    shellProcess = spawn('/bin/bash', [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, TERM: 'xterm-256color' },
    });

    shellProcess.stdout.on('data', (data) => {
        send({ type: 'shell_output', data: data.toString('base64') });
    });

    shellProcess.stderr.on('data', (data) => {
        send({ type: 'shell_output', data: data.toString('base64') });
    });

    shellProcess.on('exit', (code) => {
        console.log(`Shell exited with code ${code}`);
        shellProcess = null;
        send({ type: 'shell_output', data: Buffer.from(`\r\n$ Process exited with code ${code}\r\n`).toString('base64') });
    });

    shellProcess.on('error', (err) => {
        console.error('Shell error:', err.message);
        shellProcess = null;
    });
}

function stopShell() {
    if (shellProcess) {
        console.log('Stopping shell...');
        shellProcess.kill('SIGTERM');
        shellProcess = null;
    }
}

function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
        send({ type: 'heartbeat', timestamp: Date.now() });
    }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    console.log('Reconnecting in 5 seconds...');
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
    }, 5000);
}

connect();

process.on('SIGINT', () => {
    stopShell();
    stopHeartbeat();
    if (ws) ws.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    stopShell();
    stopHeartbeat();
    if (ws) ws.close();
    process.exit(0);
});
