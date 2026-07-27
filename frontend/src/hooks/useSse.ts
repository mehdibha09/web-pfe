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

export const useSse = ({ url, headers, enabled = true, onMessage, onError, reconnectInterval = 5000 }: UseSseOptions) => {
    const abortRef = useRef<AbortController | null>(null);
    const [connected, setConnected] = useState(false);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;

    const connect = useCallback(() => {
        if (!enabled || !url) return;

        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        (async () => {
            try {
                await fetchEventSource(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    },
                    signal: ctrl.signal,
                    onopen: async () => {
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
                        if (enabled) {
                            setTimeout(connect, reconnectInterval);
                        }
                    },
                    onerror: (error) => {
                        setConnected(false);
                        onError?.(error);
                        ctrl.abort();
                        if (enabled) {
                            setTimeout(connect, reconnectInterval);
                        }
                    }
                });
            } catch {
                setConnected(false);
                if (enabled) {
                    setTimeout(connect, reconnectInterval);
                }
            }
        })();
    }, [url, headers, enabled, onError, reconnectInterval]);

    useEffect(() => {
        connect();
        return () => {
            abortRef.current?.abort();
            setConnected(false);
        };
    }, [connect]);

    return { connected };
};
