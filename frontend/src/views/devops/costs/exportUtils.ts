import { toast } from 'react-toastify';
import type { TFunction } from 'i18next';

import type { CostRecordResponse } from '../../../services/cloudPricerService';

const currencySymbol = (currency?: string) => (currency === 'EUR' ? '€' : '$');

export const exportToCSV = (data: CostRecordResponse[], t: TFunction) => {
    if (data.length === 0) return toast.info(t('costs.noDataToExport'));

    const headers = ['ID', t('costs.period'), 'Mode', 'Compute', 'Storage', 'Network', 'Backup', 'OS', 'Total'];
    const rows = data.map(c => [
        c.id,
        c.periodStart,
        c.periodEnd,
        c.mode,
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
    toast.success(t('costs.csvExported'));
};

export const exportToPDF = (data: CostRecordResponse[], t: TFunction, currency?: string) => {
    if (data.length === 0) return toast.info(t('costs.noDataToExport'));

    const totalAll = data.reduce((s, c) => s + c.totalCost, 0);
    const totalCompute = data.reduce((s, c) => s + c.computeCost, 0);
    const totalStorage = data.reduce((s, c) => s + c.storageCost, 0);
    const totalNetwork = data.reduce((s, c) => s + c.networkCost, 0);
    const totalBackup = data.reduce((s, c) => s + c.backupCost, 0);
    const totalOS = data.reduce((s, c) => s + c.osCost, 0);

    const sym = currencySymbol(currency);
    const isFr = t('costs.reportTitle') === 'Rapport des coûts cloud';
    const locale = isFr ? 'fr-FR' : 'en-GB';
    const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale);
    const fmtMoney = (v: number) => `${sym}${v.toFixed(2)}`;

    const win = window.open('', '_blank');
    if (!win) return toast.error(t('costs.pdfBlocked'));

    win.document.write(`
        <html><head><title>${t('costs.reportTitle')} - ${new Date().toLocaleDateString(locale)}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #27323F; }
            h1 { color: #E4477D; font-size: 24px; }
            h2 { color: #5E6E7E; font-size: 16px; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #E2E8F0; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background: #FCE7F3; color: #E4477D; font-weight: 700; }
            .total-row { font-weight: 700; background: #F8F5FA; }
            .summary { display: flex; gap: 20px; margin-top: 20px; flex-wrap: wrap; }
            .summary-card { flex: 1; min-width: 140px; padding: 15px; border: 1px solid #E2E8F0; border-radius: 8px; }
            .summary-card .label { color: #5E6E7E; font-size: 12px; }
            .summary-card .value { font-size: 20px; font-weight: 700; color: #E4477D; }
        </style></head><body>
        <h1>${t('costs.reportTitle')}</h1>
        <p style="color:#5E6E7E">${t('costs.generatedOn')} ${new Date().toLocaleString(locale)}</p>

        <div class="summary">
            <div class="summary-card"><div class="label">${t('costs.totalRecords')}</div><div class="value">${data.length}</div></div>
            <div class="summary-card"><div class="label">${t('costs.totalCost')}</div><div class="value">${fmtMoney(totalAll)}</div></div>
            <div class="summary-card"><div class="label">${t('costs.computeCost')}</div><div class="value">${fmtMoney(totalCompute)}</div></div>
            <div class="summary-card"><div class="label">${t('costs.storageCost')}</div><div class="value">${fmtMoney(totalStorage)}</div></div>
            <div class="summary-card"><div class="label">${t('costs.networkCost')}</div><div class="value">${fmtMoney(totalNetwork)}</div></div>
        </div>

        <h2>${t('costs.detailedRecords')}</h2>
        <table>
            <tr><th>Mode</th><th>${t('costs.period')}</th><th>${t('costs.computeCost')}</th><th>${t('costs.storageCost')}</th><th>${t('costs.networkCost')}</th><th>${t('costs.backupCost')}</th><th>${t('costs.osCost')}</th><th>${t('costs.totalCost')}</th></tr>
            ${data.map(c => `<tr>
                <td>${c.mode}</td>
                <td>${fmtDate(c.periodStart)} — ${fmtDate(c.periodEnd)}</td>
                <td>${fmtMoney(c.computeCost)}</td><td>${fmtMoney(c.storageCost)}</td><td>${fmtMoney(c.networkCost)}</td>
                <td>${fmtMoney(c.backupCost)}</td><td>${fmtMoney(c.osCost)}</td><td><strong>${fmtMoney(c.totalCost)}</strong></td>
            </tr>`).join('')}
            <tr class="total-row"><td colspan="2">${t('costs.totalLabel')}</td><td>${fmtMoney(totalCompute)}</td><td>${fmtMoney(totalStorage)}</td><td>${fmtMoney(totalNetwork)}</td><td>${fmtMoney(totalBackup)}</td><td>${fmtMoney(totalOS)}</td><td>${fmtMoney(totalAll)}</td></tr>
        </table>

        <script>window.onload = function() { window.print(); }</script>
        </body></html>
    `);
    win.document.close();
    toast.success(t('costs.pdfReportOpened'));
};
