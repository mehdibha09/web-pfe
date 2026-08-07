import { useEffect, useRef, useCallback, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

type UseSseOptions = {
    url: string;
    headers?: Record<string, string>;
    enabled?: boolean;
    onMessage: (data: any) => void;
    onError?: (error: any) => void;
    reconnectInterval?: number;
};

/**
 * Stable SSE hook: `headers` and `onMessage` are kept in refs so a re-render
 * never triggers a reconnect. The connection only (re)opens when `url` or
 * `enabled` actually change.
 */
export const useSse = ({ url, headers, enabled = true, onMessage, onError, reconnectInterval = 5000 }: UseSseOptions) => {
    const abortRef = useRef<AbortController | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [connected, setConnected] = useState(false);

    const urlRef = useRef(url);
    const headersRef = useRef(headers);
    const onMessageRef = useRef(onMessage);
    const onErrorRef = useRef(onError);
    const enabledRef = useRef(enabled);
    const reconnectIntervalRef = useRef(reconnectInterval);
    urlRef.current = url;
    headersRef.current = headers;
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    enabledRef.current = enabled;
    reconnectIntervalRef.current = reconnectInterval;

    const cleanup = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        abortRef.current?.abort();
        abortRef.current = null;
        setConnected(false);
    }, []);

    const connect = useCallback(() => {
        if (!enabledRef.current || !urlRef.current) return;

        cleanup();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        (async () => {
            try {
                await fetchEventSource(urlRef.current, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        ...headersRef.current
                    },
                    signal: ctrl.signal,
                    onopen: async () => {
                        if (ctrl.signal.aborted) return;
                        setConnected(true);
                    },
                    onmessage: (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            onMessageRef.current(data);
                        } catch {
                            // non-JSON message, ignore
                        }
                    },
                    onclose: () => {
                        setConnected(false);
                        if (enabledRef.current && urlRef.current && !ctrl.signal.aborted) {
                            reconnectTimerRef.current = setTimeout(connect, reconnectIntervalRef.current);
                        }
                    },
                    onerror: (error) => {
                        setConnected(false);
                        onErrorRef.current?.(error);
                        ctrl.abort();
                        if (enabledRef.current && urlRef.current) {
                            reconnectTimerRef.current = setTimeout(connect, reconnectIntervalRef.current);
                        }
                    }
                });
            } catch {
                setConnected(false);
                if (enabledRef.current && urlRef.current) {
                    reconnectTimerRef.current = setTimeout(connect, reconnectIntervalRef.current);
                }
            }
        })();
    }, [cleanup]);

    useEffect(() => {
        connect();
        return cleanup;
    }, [url, enabled, connect, cleanup]);

    return { connected };
};
