import type { SaleRecord } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';
import { Badge } from './ui';

const SHOP = import.meta.env.VITE_SHOP_NAME || 'Dukaan';

// The .print-area class makes this the only thing that prints (see index.css).
export default function SaleReceipt({ sale }: { sale: SaleRecord }) {
  return (
    <div className="print-area text-sm">
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-900">{SHOP}</p>
        <p className="text-slate-500">Receipt {sale.receiptNo ?? ''}</p>
        <p className="text-slate-500">{formatDateTime(sale.saleDate)}</p>
      </div>

      {sale.status === 'archived' && (
        <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-rose-700">
          <Badge tone="rose">archived</Badge> {sale.archiveReason}
        </div>
      )}

      <div className="mt-4 space-y-1 text-slate-600">
        <p>Customer: <span className="font-medium text-slate-900">{sale.customer?.fullName ?? 'Walk-in'}</span></p>
        {sale.createdBy && <p>Served by: {sale.createdBy.fullName}</p>}
      </div>

      <table className="mt-4 w-full">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <th className="py-2">Item</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Price</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sale.items.map((i, idx) => (
            <tr key={idx}>
              <td className="py-2">{i.name}</td>
              <td className="py-2 text-right">{i.quantity}</td>
              <td className="py-2 text-right">{formatMoney(i.unitPrice)}</td>
              <td className="py-2 text-right">{formatMoney(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-4 space-y-1 border-t border-slate-200 pt-3">
        <div className="flex justify-between text-base font-semibold text-slate-900"><dt>Total</dt><dd>{formatMoney(sale.total)}</dd></div>
        <div className="flex justify-between text-slate-600"><dt>Paid now</dt><dd>{formatMoney(sale.amountPaid)}</dd></div>
        {sale.amountDue > 0 && <div className="flex justify-between font-semibold text-rose-600"><dt>On credit</dt><dd>{formatMoney(sale.amountDue)}</dd></div>}
      </dl>

      {sale.note && <p className="mt-3 text-slate-500">Note: {sale.note}</p>}
    </div>
  );
}
