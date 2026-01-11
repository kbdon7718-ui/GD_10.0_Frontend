import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useData } from '../../utils/dataContext';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Save, X, TrendingUp, TrendingDown } from 'lucide-react';
import { useSubmitOnce } from '../../utils/useSubmitOnce';
import { formatDate } from '../../utils/dateFormat';
import { useMediaQuery } from '../../utils/useMediaQuery';

const CASH_IN_CATEGORIES = [
  'Sales Revenue', 'Scrap Sales', 'Dealer Payment', 'Customer Payment', 'Other Income'
];

const CASH_OUT_CATEGORIES = [
  'Supplier Payment', 'Expense', 'Wages', 'Rent', 'Utilities', 'Other Expense'
];

export function RokadiManager() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { rokadiTransactions, addRokadiTransaction, updateRokadiTransaction, deleteRokadiTransaction, rokadiAccounts } = useData();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    transactionType: 'Cash In',
    paymentMode: 'cash',
    category: 'Sales Revenue',
    description: '',
    amount: 0,
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      transactionType: 'Cash In',
      paymentMode: 'cash',
      category: 'Sales Revenue',
      description: '',
      amount: 0,
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const calculateBalance = () => {
    let balance = 0;
    const sortedTransactions = [...rokadiTransactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    sortedTransactions.forEach(txn => {
      if (txn.transactionType === 'Cash In') {
        balance += txn.amount;
      } else {
        balance -= txn.amount;
      }
    });
    
    return balance;
  };

  const [isSubmitting, wrap] = useSubmitOnce();

  const handleSubmit = wrap((e) => {
    e.preventDefault();
    
    const currentBalance = calculateBalance();
    const balanceAfterTransaction = formData.transactionType === 'Cash In' 
      ? currentBalance + formData.amount 
      : currentBalance - formData.amount;
    
    // Determine account mapping: for debits, cash payments use cash account, upi/bank use bank account
    let account_id = formData.account_id || null;
    if (formData.transactionType === 'Cash Out') {
      if (formData.paymentMode === 'cash') {
        account_id = rokadiAccounts.find(a => a.account_type === 'cash')?.id || account_id;
      } else {
        // upi or bank -> use bank account
        account_id = rokadiAccounts.find(a => a.account_type === 'bank')?.id || account_id;
      }
    }

    if (editingId) {
      updateRokadiTransaction(editingId, { ...formData, account_id, balanceAfterTransaction });
      toast.success('Rokadi transaction updated!');
    } else {
      addRokadiTransaction({ ...formData, account_id, balanceAfterTransaction });
      toast.success('Rokadi transaction added!');
    }
    
    resetForm();
  };

  const handleEdit = (transaction) => {
    setFormData({
      date: transaction.date,
      transactionType: transaction.transactionType,
      paymentMode: transaction.paymentMode || 'cash',
      category: transaction.category,
      description: transaction.description,
      amount: transaction.amount,
    });
    setEditingId(transaction.id);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteRokadiTransaction(id);
      toast.success('Transaction deleted!');
    }
  };

  const totalCashIn = rokadiTransactions
    .filter(t => t.transactionType === 'Cash In')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCashOut = rokadiTransactions
    .filter(t => t.transactionType === 'Cash Out')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = calculateBalance();

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Cash In</CardTitle>
          </CardHeader>


          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-green-600">₹{totalCashIn.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Cash Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-red-600">₹{totalCashOut.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
              ₹{currentBalance.toLocaleString()}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Form & Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rokadi (Cash) Transactions</CardTitle>
              <CardDescription>Track daily cash inflows and outflows</CardDescription>
            </div>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isAdding && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionType">Transaction Type</Label>
                  <Select 
                    value={formData.transactionType} 
                    onValueChange={(value) => {
                      setFormData({ 
                        ...formData, 
                        transactionType: value,
                        category: value === 'Cash In' ? 'Sales Revenue' : 'Supplier Payment'
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash In">Cash In</SelectItem>
                      <SelectItem value="Cash Out">Cash Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Select
                    value={formData.paymentMode}
                    onValueChange={(value) => setFormData({ ...formData, paymentMode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.transactionType === 'Cash In' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Transaction details..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                  </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {isDesktop ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                      <TableHead>Payment</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rokadiTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No transactions yet. Add your first transaction above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rokadiTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            transaction.transactionType === 'Cash In'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {transaction.transactionType}
                          </span>
                        </TableCell>
                        <TableCell>{transaction.paymentMode || (transaction.account_id && transaction.account_id.includes('bank') ? 'bank' : 'cash')}</TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className={transaction.transactionType === 'Cash In' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.transactionType === 'Cash In' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className={transaction.balanceAfterTransaction >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ₹{transaction.balanceAfterTransaction.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(transaction)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(transaction.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-3">
              {rokadiTransactions.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No transactions yet. Add your first transaction above.</p>
              ) : (
                rokadiTransactions.map((transaction) => {
                  const isIn = transaction.transactionType === 'Cash In';
                  const amountText = `${isIn ? '+' : '-'}₹${Number(transaction.amount || 0).toLocaleString()}`;
                  return (
                    <Card key={transaction.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{transaction.category}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{formatDate(transaction.date)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                              isIn
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {transaction.transactionType}
                            </span>
                            <p className={`mt-1 text-sm font-semibold ${isIn ? 'text-green-600' : 'text-red-600'}`}>{amountText}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Description</p>
                          <p className="text-sm text-gray-900 dark:text-white break-words">{transaction.description || '—'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Payment</p>
                          <p className="text-sm text-gray-900 dark:text-white">{transaction.paymentMode || (transaction.account_id && transaction.account_id.includes('bank') ? 'bank' : 'cash')}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                            <p className={`text-sm font-semibold ${Number(transaction.balanceAfterTransaction || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{Number(transaction.balanceAfterTransaction || 0).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(transaction)} aria-label="Edit">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(transaction.id)} aria-label="Delete">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
