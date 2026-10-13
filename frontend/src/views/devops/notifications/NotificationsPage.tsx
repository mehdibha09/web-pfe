import { Box } from '@mui/material';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PaginationBar from '../../../components/PaginationBar';
import { useCallback, useEffect, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getStoredUser } from '../../../services/core/authStorage';
import {
    countUnreadNotifications,
    deleteNotification,
    listNotificationsPaginated,
    markAllAsRead,
    markAsRead,
    type NotificationResponse
} from '../../../services/notificationService';
import NotificationHeader from './NotificationHeader';
import NotificationStats from './NotificationStats';
import NotificationTable from './NotificationTable';
import { C} from '../../../theme/tokens';

const API_BASE_URL = (() => {
    const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (explicitBaseUrl) return explicitBaseUrl.replace(/\/$/, '');
    const host = import.meta.env.VITE_API_HOST || 'localhost';
    const port = import.meta.env.VITE_API_PORT || '6060';
    const apiPath = (import.meta.env.VITE_API_PATH || '/api/v1').replace(/^\/+/, '/');
    return `http://${host}:${port}${apiPath}`.replace(/\/$/, '');
})();

const NotificationsPage = () => {
    const [user] = useState(getStoredUser());
    const userId = user?.userId;
    const tenantId = user?.tenantId;
    const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(0);

    const fetchData = useCallback(async () => {
        if (!userId) return;
        try {
            const [result, unread] = await Promise.all([
                listNotificationsPaginated(userId, page, PAGE_SIZE),
                countUnreadNotifications(userId)
            ]);
            setNotifications(result.items);
            setTotalElements(result.total);
            setUnreadCount(unread);
        } catch (err) {
            console.error('Failed to load notifications', err);
        } finally {
            setLoading(false);
        }
    }, [userId, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
        if (page >= pageCount && page > 0) setPage(pageCount - 1);
    }, [totalElements]);

    useEffect(() => {
        if (!userId) return;
        const ctrl = new AbortController();
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let closed = false;

        const connect = async () => {
            try {
                await fetchEventSource(`${API_BASE_URL}/notifications/stream`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: ctrl.signal,
                    onmessage: (event) => {
                        if (event.event !== 'notification') return;
                        try {
                            const data = JSON.parse(event.data);
                            setNotifications((prev) => {
                                if (prev.some((n) => n.id === data.id)) return prev;
                                const newNotif: NotificationResponse = {
                                    id: data.id,
                                    userId: userId,
                                    title: data.title,
                                    message: data.message,
                                    type: data.type,
                                    read: false,
                                    tenantId: tenantId ?? '',
                                    link: data.link || null,
                                    createdAt: data.timestamp,
                                    updatedAt: data.timestamp,
                                };
                                return [newNotif, ...prev];
                            });
                            setUnreadCount((prev) => prev + 1);
                        } catch {
                            // ignore parse errors
                        }
                    },
                    onclose: () => {
                        if (!closed && !ctrl.signal.aborted) {
                            if (reconnectTimer) clearTimeout(reconnectTimer);
                            reconnectTimer = setTimeout(() => { if (!closed) connect(); }, 3000);
                        }
                    },
                    onerror: () => {
                        // fetchEventSource closes the stream after onerror; schedule a
                        // reconnection so the list keeps updating after a transient
                        // disconnect (previously ctrl.abort() froze it forever).
                        if (!closed && !ctrl.signal.aborted) {
                            if (reconnectTimer) clearTimeout(reconnectTimer);
                            reconnectTimer = setTimeout(() => { if (!closed) connect(); }, 3000);
                        }
                    }
                });
            } catch {
                // connection closed or aborted — will be reconnected via onclose
            }
        };

        connect();

        return () => {
            closed = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            ctrl.abort();
        };
    }, [userId, tenantId]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark as read', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!userId) return;
        try {
            await markAllAsRead(userId);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteNotification(id);
            const wasUnread = notifications.find((n) => n.id === id && !n.read);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to delete notification', err);
        }
    };

    const displayed = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

    const pageCount = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    useEffect(() => { setPage(0); }, [filter]);

    if (loading) {
        return <LoadingSpinner size={28} variant="block" />;
    }

    return (
        <Box sx={{ p: 4 }}>
            <NotificationHeader unreadCount={unreadCount} onMarkAllAsRead={handleMarkAllAsRead} />
            <NotificationStats
                totalCount={notifications.length}
                unreadCount={unreadCount}
                filter={filter}
                onFilterChange={setFilter}
            />
            <NotificationTable
                displayed={displayed}
                filter={filter}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
            />
            <PaginationBar page={page + 1} pageCount={pageCount} total={totalElements} onPageChange={(p) => setPage(p - 1)} />
        </Box>
    );
};

export default NotificationsPage;
