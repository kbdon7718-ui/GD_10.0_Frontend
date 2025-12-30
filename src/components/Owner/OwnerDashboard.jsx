import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { useData } from '../../utils/dataContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Utility to get today's date in yyyy-mm-dd
const todayStr = () => new Date().toISOString().split('T')[0];

export default function OwnerDashboard() {
  const { rokadiTransactions, expenses, maalInRecords, salesOrders } = useData();
  const today = todayStr();

  // Opening cash: yesterday's closing cash (or 0 if none)
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const openingCash = rokadiTransactions
    .filter(t => t.date === yesterday)
    .reduce((bal, t) => t.transactionType === 'Cash In' ? bal + t.amount : bal - t.amount, 0);

  // Today's transactions
  const todaysRokadi = rokadiTransactions.filter(t => t.date === today);
  const todaysExpenses = expenses.filter(e => e.date === today);
  const todaysSales = salesOrders.filter(s => s.date === today);
  const todaysPurchases = maalInRecords.filter(m => m.date === today);

  const todayExpensesTotal = todaysExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const todaySalesTotal = todaysSales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const todayPurchaseTotal = todaysPurchases.reduce((sum, m) => sum + (m.amount || 0), 0);

  // Closing cash: opening + cash in - cash out
  const cashIn = todaysRokadi.filter(t => t.transactionType === 'Cash In').reduce((sum, t) => sum + t.amount, 0);
  const cashOut = todaysRokadi.filter(t => t.transactionType === 'Cash Out').reduce((sum, t) => sum + t.amount, 0);
  const closingCash = openingCash + cashIn - cashOut;

  // Net profit
  const netProfit = todaySalesTotal - todayPurchaseTotal - todayExpensesTotal;

  // Chart data
  const summaryData = [
    { name: 'Sales', value: todaySalesTotal },
    { name: 'Purchase', value: todayPurchaseTotal },
    { name: 'Expenses', value: todayExpensesTotal },
    { name: 'Profit', value: netProfit },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Today’s Profit/Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
            ₹{netProfit.toLocaleString()} {netProfit >= 0 ? 'Profit' : 'Loss'}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cash Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Opening: ₹{openingCash.toLocaleString()}</div>
          <div>Closing: ₹{closingCash.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Maal In vs Maal Out (Today)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={summaryData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
