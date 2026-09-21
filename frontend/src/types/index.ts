export type Role = 'admin' | 'cashier';

export interface User {
  id: string;
  fullName: string;
  username: string;
  role: Role;
}

export interface Customer {
  _id: string;
  fullName: string;
  phone: string;
  address: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  fullName: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface CustomerTotals {
  totalPurchases: number;
  totalCredit: number;
  totalPaid: number;
  outstanding: number;
}

export type CustomerWithTotals = Customer & { totals: CustomerTotals };

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CustomerListResponse {
  data: CustomerWithTotals[];
  pagination: Pagination;
}

export type PaymentType = 'cash' | 'credit' | 'partial';

export interface SaleItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  _id: string;
  saleDate: string;
  items: SaleItem[];
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentType: PaymentType;
}

export interface Payment {
  _id: string;
  paidAt: string;
  amount: number;
  method: string;
  note?: string;
}

export interface LedgerEntry {
  id: string;
  type: 'sale' | 'payment';
  date: string;
  description: string;
  amount: number;
  debtChange: number;
  balance: number;
}

export interface CustomerProfile {
  customer: Customer;
  totals: CustomerTotals;
  sales: Sale[];
  payments: Payment[];
  ledger: LedgerEntry[];
}

export interface CustomerRef {
  _id: string;
  fullName: string;
}

export interface RecentSale {
  _id: string;
  saleDate: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentType: PaymentType;
  customer: CustomerRef | null;
}

export interface RecentPayment {
  _id: string;
  paidAt: string;
  amount: number;
  method: string;
  customer: CustomerRef | null;
}

export interface LowStockProduct {
  _id: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
  unit: string;
}

export interface DashboardData {
  today: { totalSales: number; cashSales: number; creditSales: number; paymentsReceived: number; salesCount: number };
  debt: { totalOutstanding: number; customersWithDebt: number };
  counts: { customers: number; products: number; lowStock: number };
  lowStockProducts: LowStockProduct[];
  recentSales: RecentSale[];
  recentDebts: RecentSale[];
  recentPayments: RecentPayment[];
  chart: { date: string; sales: number; payments: number }[];
}

// ---------- products ----------
export interface Product {
  _id: string;
  name: string;
  sku?: string;
  category: string;
  unit: string;
  costPrice?: number; // hidden from cashiers by the API
  sellPrice: number;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  sku?: string;
  category?: string;
  unit?: string;
  costPrice?: number;
  sellPrice: number;
  stock?: number;
  lowStockThreshold?: number;
}

// ---------- sales ----------
export interface SaleRecord {
  _id: string;
  receiptNo?: string;
  saleDate: string;
  items: SaleItem[];
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentType: PaymentType;
  status: 'active' | 'archived';
  note?: string;
  archiveReason?: string;
  customer: { _id: string; fullName: string; phone?: string } | null;
  createdBy: { _id: string; fullName: string } | null;
}

export interface SaleInput {
  customerId?: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  paymentType: PaymentType;
  amountPaid?: number;
  note?: string;
}

// ---------- payments & debts ----------
export type PaymentMethod = 'cash' | 'mobile_money' | 'bank' | 'other';

export interface PaymentRecord {
  _id: string;
  paidAt: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
  status: 'active' | 'archived';
  archiveReason?: string;
  customer: { _id: string; fullName: string; phone?: string } | null;
  receivedBy: { _id: string; fullName: string } | null;
}

export interface DebtRow extends Customer {
  totals: CustomerTotals;
  lastPaymentAt: string | null;
  lastCreditAt: string | null;
}

// ---------- reports, users, activity ----------
export interface ReportData {
  range: { from: string; to: string };
  summary: {
    salesCount: number;
    totalSales: number;
    cashAtSale: number;
    creditGiven: number;
    paymentsReceived: number;
    cashCollected: number;
    revenue: number;
    cost: number;
    profit: number;
  };
  byPaymentType: { type: PaymentType; count: number; total: number }[];
  chart: { date: string; sales: number; payments: number }[];
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
  topDebtors: { _id: string; fullName: string; phone: string; outstanding: number }[];
}

export interface AdminUser {
  _id: string;
  fullName: string;
  username: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface ActivityEntry {
  _id: string;
  action: string;
  entity: string;
  description: string;
  createdAt: string;
  user: { _id: string; fullName: string; username: string } | null;
}
