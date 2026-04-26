import { Box, Card, CardContent, Chip, MenuItem, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import Button from '../../../component/MyCustomButton';
import { listAuditLogs, listAuditResources } from '../../../services/adminService';

type AuditLogItem = {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  userId: string;
  details: string;
};

const AuditLogsPage = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [userId, setUserId] = useState('');

  const [submittedFrom, setSubmittedFrom] = useState('');
  const [submittedTo, setSubmittedTo] = useState('');
  const [submittedAction, setSubmittedAction] = useState('');
  const [submittedResource, setSubmittedResource] = useState('');
  const [submittedUserId, setSubmittedUserId] = useState('');

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [resources, setResources] = useState<string[]>([]);

  const loadLogs = async () => {
    const response = await listAuditLogs({
      from: submittedFrom ? new Date(submittedFrom).toISOString() : undefined,
      to: submittedTo ? new Date(submittedTo).toISOString() : undefined,
      resource: submittedResource || undefined,
      userId: submittedUserId || undefined,
    });

    const mapped = response.map((log) => ({
      id: String(log.id),
      timestamp: log.timestamp,
      action: log.action || '-',
      resource: log.resource || '-',
      userId: String(log.userId || '-'),
      details: log.details || '-',
    }));

    setLogs(mapped);
  };

  useEffect(() => {
    loadLogs();
  }, [submittedAction, submittedFrom, submittedResource, submittedTo, submittedUserId]);

  useEffect(() => {
    const loadResources = async () => {
      const response = await listAuditResources();
      setResources(response);
    };

    loadResources();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction = submittedAction
        ? String(log.action || '')
            .toLowerCase()
            .includes(submittedAction.toLowerCase())
        : true;
      return matchesAction;
    });
  }, [logs, submittedAction]);

  const applyFilter = () => {
    setSubmittedFrom(from.trim());
    setSubmittedTo(to.trim());
    setSubmittedAction(action.trim());
    setSubmittedResource(resource.trim());
    setSubmittedUserId(userId.trim());
  };

  const clearFilter = () => {
    setFrom('');
    setTo('');
    setAction('');
    setResource('');
    setUserId('');
    setSubmittedFrom('');
    setSubmittedTo('');
    setSubmittedAction('');
    setSubmittedResource('');
    setSubmittedUserId('');
  };

  return (
    <Box sx={{ p: 4, backgroundColor: '#F8FAFC', minHeight: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
          Audit Logs
        </Typography>
        <Typography sx={{ color: '#64748B' }}>
          Review activity trails with date range and user-based filters.
        </Typography>
      </Box>

      <Box
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2, mb: 3 }}
      >
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Total logs
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {logs.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Visible logs
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {filtered.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748B' }}>
              Unique actions
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {new Set(logs.map((log) => log.action)).size}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Filter Logs
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr)) auto auto',
              gap: 2,
            }}
          >
            <TextField
              label="From"
              type="datetime-local"
              slotProps={{ inputLabel: { shrink: true } }}
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <TextField
              label="To"
              type="datetime-local"
              slotProps={{ inputLabel: { shrink: true } }}
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
            <TextField
              label="Action"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            />
            <TextField
              select
              label="Resource"
              value={resource}
              onChange={(event) => setResource(event.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {resources.map((resourceItem) => (
                <MenuItem key={resourceItem} value={resourceItem}>
                  {resourceItem}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="User ID"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            />
            <Button onClick={applyFilter}>Filter</Button>
            <Button onClick={clearFilter}>Clear</Button>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
        {filtered.length === 0 ? (
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <CardContent>
              <Typography sx={{ color: '#64748B' }}>
                No logs found for the selected filters.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          filtered.map((log) => (
            <Card key={log.id} sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {log.action}
                    </Typography>
                    <Typography sx={{ color: '#64748B' }}>{log.resource}</Typography>
                  </Box>
                  <Chip
                    label={log.userId}
                    size="small"
                    sx={{ backgroundColor: '#FCE7EF', color: '#E4477D', fontWeight: 700 }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
                  <strong>Timestamp:</strong> {log.timestamp}
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569' }}>
                  {log.details}
                </Typography>
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};

export default AuditLogsPage;
