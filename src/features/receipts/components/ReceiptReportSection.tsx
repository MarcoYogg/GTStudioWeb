import { useState } from 'react';
import { fetchReceipts } from '../receipts.service';
import { calcMonthlyReport } from '../receipts.utils';
import type { MonthlyReport } from '../receipts.utils';
import { formatMoney } from '../../../lib/utils/money';

export default function ReceiptReportSection() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [utilities, setUtilities] = useState(2000);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const receipts = await fetchReceipts();
      // Filter receipts by selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthReceipts = receipts.filter((r) => {
        const d = new Date(r.createdAt);
        return r.status === 'approved' && d.getFullYear() === year && d.getMonth() + 1 === month;
      });

      const result = calcMonthlyReport(monthReceipts);
      setReport({ ...result, utilities });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="receipt-report card">
      <h3>月報表</h3>
      <div className="report-controls">
        <div className="form-field report-field">
          <label className="form-label">月份</label>
          <input
            className="form-input"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
        <div className="form-field report-field">
          <label className="form-label">水電費用</label>
          <input
            className="form-input"
            type="number"
            value={utilities}
            onChange={(e) => setUtilities(Number(e.target.value) || 0)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading} style={{ alignSelf: 'flex-end' }}>
          {loading ? '計算中…' : '產生報表'}
        </button>
      </div>

      {report && (
        <div className="report-results">
          <table className="report-table">
            <tbody>
              <tr>
                <td className="report-label">核准收據總額</td>
                <td className="report-value">{formatMoney(report.approvedTotal)}</td>
              </tr>
              <tr>
                <td className="report-label">固定租金</td>
                <td className="report-value">{formatMoney(report.rent)}</td>
              </tr>
              <tr>
                <td className="report-label">水電費用</td>
                <td className="report-value">{formatMoney(report.utilities)}</td>
              </tr>
              <tr className="report-total">
                <td className="report-label">總支出</td>
                <td className="report-value">{formatMoney(report.totalExpenses)}</td>
              </tr>
              <tr className="report-per-person">
                <td className="report-label">每人均攤 (8人)</td>
                <td className="report-value">{formatMoney(report.perPerson)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}