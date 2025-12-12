export interface Investment {
  id: number;
  student_id: number;
  symbol: string;
  amount: number;
  cost_basis: number;
  currentPrice?: number;
  value?: number;
}

export interface Student {
  id: number;
  name: string;
  color: string;
  cash_balance: number;
  bank_balance: number;
  portfolio?: Investment[];
  totalValue?: number;
  profitLoss?: number;
  investmentValue?: number;
}

export interface WeeklySnapshot {
  id: number;
  student_id: number;
  week_number: number;
  total_value: number;
  profit_loss: number;
  timestamp: string;
}

export interface AppState {
  current_week: number;
}
