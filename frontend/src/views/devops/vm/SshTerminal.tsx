import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { C} from '../../../theme/tokens';

interface SshTerminalProps {
    vmId: string;
    vmName: string;
    sshInfo: { host: string; port: number; user: string; privateKeyPath: string } | null;
}

const WS_BASE = (() => {
    const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (explicitBaseUrl) {
        return explicitBaseUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');
    }
    const host = import.meta.env.VITE_API_HOST || 'localhost';
    const port = import.meta.env.VITE_API_PORT || '6060';
    return `ws://${host}:${port}`;
})();

const SshTerminal = ({ vmId, vmName }: SshTerminalProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            cursorStyle: 'bar',
            fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", "SF Mono", monospace',
            fontSize: 14,
            lineHeight: 1.3,
            theme: {
                background: '#1a1a2e',
                foreground: '#e0e0e0',
                cursor: C.brand,
                cursorAccent: '#1a1a2e',
                selectionBackground: `${C.brand}44`,
                black: '#1a1a2e',
                red: '#f44336',
                green: '#4caf50',
                yellow: '#ff9800',
                blue: '#2196f3',
                magenta: C.brand,
                cyan: '#00bcd4',
                white: '#e0e0e0',
                brightRed: '#ff5252',
                brightGreen: '#69f0ae',
                brightYellow: '#ffd740',
                brightBlue: '#448aff',
                brightMagenta: '#ff80ab',
                brightCyan: '#84ffff',
                brightWhite: '#ffffff'
            },
            scrollback: 10000,
            allowProposedApi: true,
            rightClickSelectsWord: true
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(containerRef.current);
        fitAddon.fit();
        termRef.current = term;

        term.writeln(`\x1b[1;38;5;204m╔══════════════════════════════════════╗\x1b[0m`);
        term.writeln(`\x1b[1;38;5;204m║\x1b[0m  SSH Terminal — \x1b[1m${vmName}\x1b[0m${' '.repeat(Math.max(0, 18 - vmName.length))}\x1b[1;38;5;204m║\x1b[0m`);
        term.writeln(`\x1b[1;38;5;204m╚══════════════════════════════════════╝\x1b[0m`);
        term.writeln('\x1b[33mConnecting...\x1b[0m');

        // ── WebSocket connection (HttpOnly cookie auth via same-origin handshake) ──
        const wsUrl = `${WS_BASE}/ws/ssh/${vmId}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            term.writeln('\x1b[32mConnected.\x1b[0m\r\n');
            // Send terminal size
            const dims = fitAddon.proposeDimensions();
            if (dims) {
                ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
            }
        };

        ws.onmessage = (event) => {
            if (event.data instanceof Blob) {
                event.data.arrayBuffer().then((buf) => {
                    term.write(new Uint8Array(buf));
                });
            } else {
                term.write(event.data);
            }
        };

        ws.onerror = () => {
            term.writeln('\r\n\x1b[31mWebSocket connection error.\x1b[0m');
        };

        ws.onclose = (event) => {
            term.writeln(`\r\n\x1b[33mConnection closed (${event.code}).\x1b[0m`);
        };

        // ── Send keystrokes to WebSocket ──
        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        // ── Handle Ctrl+C/V at document level to prevent browser intercept ──
        const keyHandler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.key === 'V' || e.key === 'v')) {
                e.preventDefault();
                e.stopPropagation();
                if (e.key === 'V' || e.key === 'v') {
                    navigator.clipboard.readText().then((text) => {
                        if (text && ws.readyState === WebSocket.OPEN) {
                            ws.send(text);
                        }
                    }).catch(() => {});
                }
                if (e.key === 'C' || e.key === 'c') {
                    const sel = term.getSelection();
                    if (sel) {
                        navigator.clipboard.writeText(sel).catch(() => {});
                    }
                }
            }
        };
        document.addEventListener('keydown', keyHandler, true);

        // ── Right-click paste ──
        const contextHandler = (e: Event) => {
            e.preventDefault();
            navigator.clipboard.readText().then((text) => {
                if (text && ws.readyState === WebSocket.OPEN) {
                    ws.send(text);
                }
            }).catch(() => {});
        };
        containerRef.current.addEventListener('contextmenu', contextHandler);

        // ── Resize: send new dimensions ──
        const onResize = () => {
            const dims = fitAddon.proposeDimensions();
            if (dims && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
            }
        };
        const ro = new ResizeObserver(() => {
            try { fitAddon.fit(); onResize(); } catch { /* ignore */ }
        });
        ro.observe(containerRef.current);

        return () => {
            document.removeEventListener('keydown', keyHandler, true);
            ro.disconnect();
            ws.close();
            term.dispose();
            termRef.current = null;
            wsRef.current = null;
        };
    }, [vmId, vmName]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid #333'
            }}
        />
    );
};

export default SshTerminal;
