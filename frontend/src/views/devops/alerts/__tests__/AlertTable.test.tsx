import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AlertTable from '../AlertTable';
import type { AlertResponse } from '../../../../services/interfaces/cloudPricer';

// i18n : renvoie la clé, ce qui suffit pour repérer les colonnes/libellés.
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const makeAlert = (status: string, id = 'a1'): AlertResponse => ({
    id,
    tenantId: 't1',
    serviceEnvironmentId: 'se1',
    type: 'QUOTA',
    metric: 'CPU',
    threshold: 80,
    actualValue: 95,
    severity: 'CRITICAL',
    status,
    message: 'CPU over threshold',
    createdAt: '2026-01-01T00:00:00Z',
    acknowledgedBy: null,
    resolvedAt: null,
});

const noop = { onAcknowledge: vi.fn(), onResolve: vi.fn(), onDelete: vi.fn() };

describe('AlertTable — gating des actions par permission', () => {
    beforeEach(() => vi.clearAllMocks());

    it('masque toute la colonne Actions quand canManage=false', () => {
        render(
            <AlertTable
                alerts={[makeAlert('OPEN', 'a1'), makeAlert('RESOLVED', 'a2')]}
                canManage={false}
                {...noop}
            />
        );

        expect(screen.queryByText('alerts.columnActions')).not.toBeInTheDocument();
        expect(screen.queryByText('alerts.actionAck')).not.toBeInTheDocument();
        expect(screen.queryByText('alerts.actionResolve')).not.toBeInTheDocument();
        expect(screen.queryByText('alerts.actionDelete')).not.toBeInTheDocument();
    });

    it('affiche les actions Acknowledge/Resolve/Delete quand canManage=true', () => {
        render(
            <AlertTable alerts={[makeAlert('OPEN')]} canManage {...noop} />
        );

        expect(screen.getByText('alerts.columnActions')).toBeInTheDocument();
        expect(screen.getByText('alerts.actionAck')).toBeInTheDocument();
        expect(screen.getByText('alerts.actionResolve')).toBeInTheDocument();
        expect(screen.getByText('alerts.actionDelete')).toBeInTheDocument();
    });

    it('une alerte ACK propose Resolve mais plus Acknowledge', () => {
        render(
            <AlertTable alerts={[makeAlert('ACK')]} canManage {...noop} />
        );

        expect(screen.queryByText('alerts.actionAck')).not.toBeInTheDocument();
        expect(screen.getByText('alerts.actionResolve')).toBeInTheDocument();
    });

    it('une alerte RESOLVED ne propose ni Acknowledge ni Resolve', () => {
        render(
            <AlertTable alerts={[makeAlert('RESOLVED')]} canManage {...noop} />
        );

        expect(screen.queryByText('alerts.actionAck')).not.toBeInTheDocument();
        expect(screen.queryByText('alerts.actionResolve')).not.toBeInTheDocument();
        // La suppression reste disponible pour un gestionnaire.
        expect(screen.getByText('alerts.actionDelete')).toBeInTheDocument();
    });
});
