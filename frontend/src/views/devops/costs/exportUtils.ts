import { toast } from 'react-toastify';

import type { CostRecordResponse } from '../../../services/cloudPricerService';

export const exportToCSV = (data: CostRecordResponse[]) => {
    if (data.length === 0) return toast.info('No data to export');

    const headers = ['ID', 'ServiceEnv', 'Mode', 'PeriodStart', 'PeriodEnd', 'Compute', 'Storage', 'Network', 'Backup', 'OS', 'Total'];
    const rows = data.map(c => [
        c.id,
        c.serviceEnvironmentId,
        c.mode,
        c.periodStart,
        c.periodEnd,
        c.computeCost,
        c.storageCost,
        c.networkCost,
        c.backupCost,
        c.osCost,
        c.totalCost
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `costs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
};

export const exportToPDF = (data: CostRecordResponse[]) => {
    if (data.length === 0) return toast.info('No data to export');

    const totalAll = data.reduce((s, c) => s + c.totalCost, 0);
    const totalCompute = data.reduce((s, c) => s + c.computeCost, 0);
    const totalStorage = data.reduce((s, c) => s + c.storageCost, 0);
    const totalNetwork = data.reduce((s, c) => s + c.networkCost, 0);
    const totalBackup = data.reduce((s, c) => s + c.backupCost, 0);
    const totalOS = data.reduce((s, c) => s + c.osCost, 0);

    const win = window.open('', '_blank');
    if (!win) return toast.error('Popup blocked');

    win.document.write(`
        <html><head><title>Cost Report - ${new Date().toLocaleDateString()}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #27323F; }
            h1 { color: #E4477D; font-size: 24px; }
            h2 { color: #5E6E7E; font-size: 16px; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #E2E8F0; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background: #FCE7F3; color: #E4477D; font-weight: 700; }
            .total-row { font-weight: 700; background: #F8F5FA; }
            .summary { display: flex; gap: 20px; margin-top: 20px; }
            .summary-card { flex: 1; padding: 15px; border: 1px solid #E2E8F0; border-radius: 8px; }
            .summary-card .label { color: #5E6E7E; font-size: 12px; }
            .summary-card .value { font-size: 20px; font-weight: 700; color: #E4477D; }
        </style></head><body>
        <h1>Cloud Cost Report</h1>
        <p style="color:#5E6E7E">Generated on ${new Date().toLocaleString()}</p>

        <div class="summary">
            <div class="summary-card"><div class="label">Total Records</div><div class="value">${data.length}</div></div>
            <div class="summary-card"><div class="label">Total Cost</div><div class="value">$${totalAll.toFixed(2)}</div></div>
            <div class="summary-card"><div class="label">Compute</div><div class="value">$${totalCompute.toFixed(2)}</div></div>
            <div class="summary-card"><div class="label">Storage</div><div class="value">$${totalStorage.toFixed(2)}</div></div>
            <div class="summary-card"><div class="label">Network</div><div class="value">$${totalNetwork.toFixed(2)}</div></div>
        </div>

        <h2>Detailed Records</h2>
        <table>
            <tr><th>Mode</th><th>Period</th><th>Compute</th><th>Storage</th><th>Network</th><th>Backup</th><th>OS</th><th>Total</th></tr>
            ${data.map(c => `<tr>
                <td>${c.mode}</td>
                <td>${new Date(c.periodStart).toLocaleDateString()} — ${new Date(c.periodEnd).toLocaleDateString()}</td>
                <td>$${c.computeCost}</td><td>$${c.storageCost}</td><td>$${c.networkCost}</td>
                <td>$${c.backupCost}</td><td>$${c.osCost}</td><td><strong>$${c.totalCost.toFixed(2)}</strong></td>
            </tr>`).join('')}
            <tr class="total-row"><td colspan="2">TOTAL</td><td>$${totalCompute.toFixed(2)}</td><td>$${totalStorage.toFixed(2)}</td><td>$${totalNetwork.toFixed(2)}</td><td>$${totalBackup.toFixed(2)}</td><td>$${totalOS.toFixed(2)}</td><td>$${totalAll.toFixed(2)}</td></tr>
        </table>

        <script>window.onload = function() { window.print(); }</script>
        </body></html>
    `);
    win.document.close();
    toast.success('PDF report opened');
};