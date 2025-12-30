import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();

// Helper function to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export function DataProvider({ children }) {
  // Initialize state with localStorage or default values
  const [truckDriverTransactions, setTruckDriverTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maalInRecords, setMaalInRecords] = useState([]);
  const [rokadiTransactions, setRokadiTransactions] = useState([]);
  const [feriwalaRecords, setFeriwalaRecords] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [kabadiwala, setKabadiwala] = useState([]);
  const [kabadiwalaTransactions, setKabadiwalaTransactions] = useState([]);
  const [partners, setPartners] = useState([]);
  const [partnerWithdrawals, setPartnerWithdrawals] = useState([]);
  const [parties, setParties] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  // Keep a single cash account and a single bank account for Rokadi
  // Only single cash and single bank account for Rokadi
  const [rokadiAccounts, setRokadiAccounts] = useState([
    { id: 'rokadi_cash', accountName: 'Cash Account', balance: 145230, account_type: 'cash' },
    { id: 'rokadi_bank', accountName: 'Bank Account', balance: 250000, account_type: 'bank' },
  ]);

  // On mount, migrate all transactions from any old cash account (e.g., '1', 'Cash Account 1') to 'rokadi_cash', and remove old cash accounts
  useEffect(() => {
    setRokadiAccounts(prev => prev.filter(acc => acc.id === 'rokadi_cash' || acc.id === 'rokadi_bank'));
    setRokadiTransactions(prev => prev.map(txn => {
      // Migrate old cash account transactions
      if (txn.account_id === '1' || txn.account_id === 'Cash Account 1') {
        return { ...txn, account_id: 'rokadi_cash' };
      }
      // Migrate old bank account transactions (e.g., HDFC)
      if (txn.account_id === 'hdfc' || txn.account_id === 'HDFC' || txn.account_id === 'Bank Account HDFC') {
        return { ...txn, account_id: 'rokadi_bank' };
      }
      return txn;
    }));
  }, []);
  const [materialRates, setMaterialRates] = useState([
    { id: '1', materialType: 'Iron', baseRate: 40, lastUpdated: new Date().toISOString() },
    { id: '2', materialType: 'Plastic', baseRate: 25, lastUpdated: new Date().toISOString() },
    { id: '3', materialType: 'Paper', baseRate: 15, lastUpdated: new Date().toISOString() },
    { id: '4', materialType: 'Copper', baseRate: 300, lastUpdated: new Date().toISOString() },
    { id: '5', materialType: 'Aluminium', baseRate: 120, lastUpdated: new Date().toISOString() },
  ]);
  const [vendorCustomRates, setVendorCustomRates] = useState([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadData = (key, setter) => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          setter(JSON.parse(stored));
        } catch (e) {
          console.error(`Error loading ${key}:`, e);
        }
      }
    };

    loadData('scrapco_truck_drivers', setTruckDriverTransactions);
    loadData('scrapco_expenses', setExpenses);
    loadData('scrapco_maal_in', setMaalInRecords);
    loadData('scrapco_rokadi', setRokadiTransactions);
    loadData('scrapco_feriwala', setFeriwalaRecords);
    loadData('scrapco_bank_accounts', setBankAccounts);
    loadData('scrapco_bank_transactions', setBankTransactions);
    loadData('scrapco_workers', setWorkers);
    loadData('scrapco_attendance', setAttendance);
    loadData('scrapco_kabadiwala', setKabadiwala);
    loadData('scrapco_kabadiwala_transactions', setKabadiwalaTransactions);
    loadData('scrapco_partners', setPartners);
    loadData('scrapco_partner_withdrawals', setPartnerWithdrawals);
    loadData('scrapco_parties', setParties);
    loadData('scrapco_sales_orders', setSalesOrders);
    loadData('scrapco_rokadi_accounts', setRokadiAccounts);
    loadData('scrapco_material_rates', setMaterialRates);
    loadData('scrapco_vendor_custom_rates', setVendorCustomRates);
  }, []);

  // Save data to localStorage whenever state changes
  const persist = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  useEffect(() => persist('scrapco_truck_drivers', truckDriverTransactions), [truckDriverTransactions]);
  useEffect(() => persist('scrapco_expenses', expenses), [expenses]);
  useEffect(() => persist('scrapco_maal_in', maalInRecords), [maalInRecords]);
  useEffect(() => persist('scrapco_rokadi', rokadiTransactions), [rokadiTransactions]);
  useEffect(() => persist('scrapco_feriwala', feriwalaRecords), [feriwalaRecords]);
  useEffect(() => persist('scrapco_bank_accounts', bankAccounts), [bankAccounts]);
  useEffect(() => persist('scrapco_bank_transactions', bankTransactions), [bankTransactions]);
  useEffect(() => persist('scrapco_workers', workers), [workers]);
  useEffect(() => persist('scrapco_attendance', attendance), [attendance]);
  useEffect(() => persist('scrapco_kabadiwala', kabadiwala), [kabadiwala]);
  useEffect(() => persist('scrapco_kabadiwala_transactions', kabadiwalaTransactions), [kabadiwalaTransactions]);
  useEffect(() => persist('scrapco_partners', partners), [partners]);
  useEffect(() => persist('scrapco_partner_withdrawals', partnerWithdrawals), [partnerWithdrawals]);
  useEffect(() => persist('scrapco_parties', parties), [parties]);
  useEffect(() => persist('scrapco_sales_orders', salesOrders), [salesOrders]);
  useEffect(() => persist('scrapco_rokadi_accounts', rokadiAccounts), [rokadiAccounts]);
  useEffect(() => persist('scrapco_material_rates', materialRates), [materialRates]);
  useEffect(() => persist('scrapco_vendor_custom_rates', vendorCustomRates), [vendorCustomRates]);

  // Utility CRUD helper
  const addItem = (setter, item) => setter(prev => [...prev, { ...item, id: generateId() }]);
  const updateItem = (setter, id, updates) =>
    setter(prev => prev.map(i => (i.id === id ? { ...i, ...updates } : i)));
  const deleteItem = (setter, id) => setter(prev => prev.filter(i => i.id !== id));

  const value = {
    // Data
    truckDriverTransactions,
    expenses,
    maalInRecords,
    rokadiTransactions,
    rokadiAccounts,
    feriwalaRecords,
    bankAccounts,
    bankTransactions,
    workers,
    attendance,
    kabadiwala,
    kabadiwalaTransactions,
    partners,
    partnerWithdrawals,
    parties,
    salesOrders,
    materialRates,
    vendorCustomRates,

    // Generic CRUD
    addTruckDriverTransaction: (item) => addItem(setTruckDriverTransactions, item),
    updateTruckDriverTransaction: (id, updates) => updateItem(setTruckDriverTransactions, id, updates),
    deleteTruckDriverTransaction: (id) => deleteItem(setTruckDriverTransactions, id),

    addExpense: (item) => addItem(setExpenses, item),
    updateExpense: (id, updates) => updateItem(setExpenses, id, updates),
    deleteExpense: (id) => deleteItem(setExpenses, id),

    addMaalIn: (item) => addItem(setMaalInRecords, item),
    updateMaalIn: (id, updates) => updateItem(setMaalInRecords, id, updates),
    deleteMaalIn: (id) => deleteItem(setMaalInRecords, id),

    addRokadiTransaction: (item) => addItem(setRokadiTransactions, item),
    updateRokadiTransaction: (id, updates) => updateItem(setRokadiTransactions, id, updates),
    deleteRokadiTransaction: (id) => deleteItem(setRokadiTransactions, id),

    addFeriwalaRecord: (item) => addItem(setFeriwalaRecords, item),
    updateFeriwalaRecord: (id, updates) => updateItem(setFeriwalaRecords, id, updates),
    deleteFeriwalaRecord: (id) => deleteItem(setFeriwalaRecords, id),

    addBankAccount: (item) => addItem(setBankAccounts, item),
    updateBankAccount: (id, updates) => updateItem(setBankAccounts, id, updates),
    deleteBankAccount: (id) => deleteItem(setBankAccounts, id),

    addBankTransaction: (item) => addItem(setBankTransactions, item),
    updateBankTransaction: (id, updates) => updateItem(setBankTransactions, id, updates),
    deleteBankTransaction: (id) => deleteItem(setBankTransactions, id),

    addWorker: (item) => addItem(setWorkers, item),
    updateWorker: (id, updates) => updateItem(setWorkers, id, updates),
    deleteWorker: (id) => deleteItem(setWorkers, id),

    addAttendance: (item) => addItem(setAttendance, item),
    updateAttendance: (id, updates) => updateItem(setAttendance, id, updates),
    deleteAttendance: (id) => deleteItem(setAttendance, id),

    addKabadiwala: (item) => addItem(setKabadiwala, item),
    updateKabadiwala: (id, updates) => updateItem(setKabadiwala, id, updates),
    deleteKabadiwala: (id) => deleteItem(setKabadiwala, id),

    addKabadiwalaTransaction: (item) => addItem(setKabadiwalaTransactions, item),
    updateKabadiwalaTransaction: (id, updates) => updateItem(setKabadiwalaTransactions, id, updates),
    deleteKabadiwalaTransaction: (id) => deleteItem(setKabadiwalaTransactions, id),

    addPartner: (item) => addItem(setPartners, item),
    updatePartner: (id, updates) => updateItem(setPartners, id, updates),
    deletePartner: (id) => deleteItem(setPartners, id),

    addPartnerWithdrawal: (item) => addItem(setPartnerWithdrawals, item),
    updatePartnerWithdrawal: (id, updates) => updateItem(setPartnerWithdrawals, id, updates),
    deletePartnerWithdrawal: (id) => deleteItem(setPartnerWithdrawals, id),

    addParty: (item) => addItem(setParties, item),
    updateParty: (id, updates) => updateItem(setParties, id, updates),
    deleteParty: (id) => deleteItem(setParties, id),

    addSalesOrder: (item) => addItem(setSalesOrders, item),
    updateSalesOrder: (id, updates) => updateItem(setSalesOrders, id, updates),
    deleteSalesOrder: (id) => deleteItem(setSalesOrders, id),

    addRokadiAccount: (item) => addItem(setRokadiAccounts, item),
    updateRokadiAccount: (id, updates) => updateItem(setRokadiAccounts, id, updates),
    deleteRokadiAccount: (id) => deleteItem(setRokadiAccounts, id),

    addMaterialRate: (item) => addItem(setMaterialRates, item),
    updateMaterialRate: (id, updates) => updateItem(setMaterialRates, id, updates),
    deleteMaterialRate: (id) => deleteItem(setMaterialRates, id),

    addVendorCustomRate: (item) => addItem(setVendorCustomRates, item),
    updateVendorCustomRate: (id, updates) => updateItem(setVendorCustomRates, id, updates),
    deleteVendorCustomRate: (id) => deleteItem(setVendorCustomRates, id),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
