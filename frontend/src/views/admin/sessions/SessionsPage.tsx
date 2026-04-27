import {
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../../../component/MyCustomButton';
import { listSessions, revokeSession } from '../../../services/adminService';
import { canRevokeSession } from '../../../services/authorization';
import { getStoredUser } from '../../../services/authStorage';

type SessionItem = {
  id: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  createdAt: string;
  lastActive: string;
  status: 'ACTIVE' | 'REVOKED';
};

const getDeviceType = (os: string): string => {
  if (!os || os === 'Unknown') return 'Desktop';
  const normalized = os.toLowerCase();
  if (
    normalized.includes('mobile') ||
    normalized.includes('android') ||
    normalized.includes('ios') ||
    normalized.includes('iphone') ||
    normalized.includes('ipad')
  ) {
    return 'Mobile Device';
  }
  if (normalized.includes('tablet')) {
    return 'Tablet';
  }
  return 'Desktop';
};

const toSessionItem = (session: any): SessionItem => ({
  id: String(session.id),
  deviceType: getDeviceType(session.os),
  browser: session.browser || 'Unknown Browser',
  os: session.os || 'Unknown OS',
  ipAddress: session.ipAddress || '-',
  location: session.localization || 'Unknown',
  createdAt: session.createdAt ? new Date(session.createdAt).toLocaleString() : '-',
  lastActive: session.expirationDate ? new Date(session.expirationDate).toLocaleString() : '-',
  status: session.revokedAt ? 'REVOKED' : 'ACTIVE',
});

const SessionsPage = () => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  const allowRevokeSession = currentUser ? canRevokeSession(currentUser) : false;

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await listSessions();
      setSessions(response.map(toSessionItem));
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load sessions';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());

    window.addEventListener('authUserUpdated', syncUser);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('authUserUpdated', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesSearch = search
        ? [
            session.deviceType,
            session.browser,
            session.os,
            session.location,
            session.ipAddress,
            session.status,
          ]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      const matchesStatus = filterStatus ? session.status === filterStatus : true;
      return matchesSearch && matchesStatus;
    });
  }, [filterStatus, search, sessions]);

  const handleRevokeSession = async (id: string) => {
    if (!allowRevokeSession) {
      toast.error('You do not have permission to revoke sessions');
      return;
    }

    try {
      await revokeSession(id);
      toast.success('Session revoked');
      await loadSessions();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to revoke session';
      toast.error(message);
    }
  };

  return (
    <Box sx={{ p: 4, backgroundColor: '#F8FAFC', minHeight: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
          Sessions
        </Typography>
        <Typography sx={{ color: '#64748B' }}>
          Manage active sessions with device type, browser, OS and IP details.
        </Typography>
      </Box>

      <Box
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2, mb: 3 }}
      >
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Active sessions
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {sessions.filter((s) => s.status === 'ACTIVE').length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Revoked sessions
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {sessions.filter((s) => s.status === 'REVOKED').length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Visible sessions
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {filteredSessions.length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Filter Sessions
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 2 }}>
            <TextField
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by device, browser, OS, location or IP"
            />
            <TextField
              select
              label="Status filter"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="ACTIVE">ACTIVE</MenuItem>
              <MenuItem value="REVOKED">REVOKED</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
        {loading ? (
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <CardContent>
              <Typography sx={{ color: '#64748B' }}>Loading sessions...</Typography>
            </CardContent>
          </Card>
        ) : filteredSessions.length === 0 ? (
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <CardContent>
              <Typography sx={{ color: '#64748B' }}>
                No sessions found for the selected filters.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          filteredSessions.map((session) => (
            <Card
              key={session.id}
              sx={{
                borderRadius: 3,
                border: '1px solid #E2E8F0',
                backgroundColor: session.status === 'REVOKED' ? '#FAFAFA' : '#FFFFFF',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {session.deviceType}
                    </Typography>
                    <Typography sx={{ color: '#64748B' }}>
                      {session.browser} · {session.os}
                    </Typography>
                  </Box>
                  <Chip
                    label={session.status}
                    size="small"
                    sx={{
                      backgroundColor: session.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                      color: session.status === 'ACTIVE' ? '#166534' : '#991B1B',
                      fontWeight: 700,
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      IP Address
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>{session.ipAddress}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Location
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>{session.location}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Created At
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>{session.createdAt}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Last Active
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>{session.lastActive}</Typography>
                  </Box>
                </Box>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={session.status === 'REVOKED' || !allowRevokeSession}
                >
                  {session.status === 'REVOKED' ? 'Revoked' : 'Revoke'}
                </Button>
              </CardActions>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};

export default SessionsPage;
