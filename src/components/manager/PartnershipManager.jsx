import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useData } from '../../utils/dataContext';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Save, X, Users2, TrendingDown } from 'lucide-react';
import { useSubmitOnce } from '../../utils/useSubmitOnce';
import { formatDate } from '../../utils/dateFormat';

export function PartnershipManager() {
  const { 
    partners, addPartner, updatePartner, deletePartner,
    partnerWithdrawals, addPartnerWithdrawal, updatePartnerWithdrawal, deletePartnerWithdrawal
  } = useData();
  
  const [activeTab, setActiveTab] = useState('partners');
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [isAddingWithdrawal, setIsAddingWithdrawal] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState(null);
  const [editingWithdrawalId, setEditingWithdrawalId] = useState(null);
  
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    capitalContribution: 0,
    profitSharePercentage: 0,
    status: 'Active',
  });

  const [withdrawalForm, setWithdrawalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    partnerId: '',
    amount: 0,
    purpose: '',
    paymentMode: 'Cash',
    referenceNumber: '',
    approvedBy: '',
  });

  const resetPartnerForm = () => {
    setPartnerForm({
      name: '',
      capitalContribution: 0,
      profitSharePercentage: 0,
      status: 'Active',
    });
    setIsAddingPartner(false);
    setEditingPartnerId(null);
  };

  const resetWithdrawalForm = () => {
    setWithdrawalForm({
      date: new Date().toISOString().split('T')[0],
      partnerId: '',
      amount: 0,
      purpose: '',
      paymentMode: 'Cash',
      referenceNumber: '',
      approvedBy: '',
    });
    setIsAddingWithdrawal(false);
    setEditingWithdrawalId(null);
  };

  const [isSubmittingPartner, wrapPartner] = useSubmitOnce();

  const handlePartnerSubmit = wrapPartner((e) => {
    e.preventDefault();
    
    if (editingPartnerId) {
      updatePartner(editingPartnerId, partnerForm);
      toast.success('Partner updated!');
    } else {
      addPartner(partnerForm);
      toast.success('Partner added!');
    }
    
    resetPartnerForm();
  });

  const [isSubmittingWithdrawal, wrapWithdrawal] = useSubmitOnce();

  const handleWithdrawalSubmit = wrapWithdrawal((e) => {
    e.preventDefault();
    
    if (editingWithdrawalId) {
      updatePartnerWithdrawal(editingWithdrawalId, withdrawalForm);
      toast.success('Withdrawal updated!');
    } else {
      addPartnerWithdrawal(withdrawalForm);
      toast.success('Withdrawal recorded!');
    }
    
    resetWithdrawalForm();
  });

  const handleEditPartner = (partner) => {
    setPartnerForm(partner);
    setEditingPartnerId(partner.id);
    setIsAddingPartner(true);
  };

  const handleEditWithdrawal = (withdrawal) => {
    setWithdrawalForm({
      date: withdrawal.date,
      partnerId: withdrawal.partnerId,
      amount: withdrawal.amount,
      purpose: withdrawal.purpose,
      paymentMode: withdrawal.paymentMode,
      referenceNumber: withdrawal.referenceNumber || '',
      approvedBy: withdrawal.approvedBy || '',
    });
    setEditingWithdrawalId(withdrawal.id);
    setIsAddingWithdrawal(true);
  };

  const handleDeletePartner = (id) => {
    if (window.confirm('Are you sure? This will also delete all withdrawals for this partner.')) {
      deletePartner(id);
      partnerWithdrawals.filter(w => w.partnerId === id).forEach(w => deletePartnerWithdrawal(w.id));
      toast.success('Partner deleted!');
    }
  };

  const handleDeleteWithdrawal = (id) => {
    if (window.confirm('Are you sure you want to delete this withdrawal?')) {
      deletePartnerWithdrawal(id);
      toast.success('Withdrawal deleted!');
    }
  };

  const totalCapital = partners.reduce((sum, p) => sum + p.capitalContribution, 0);
  const totalWithdrawals = partnerWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const activePartners = partners.filter(p => p.status === 'Active');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-emerald-600" />
              <span className="text-emerald-600">{activePartners.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Capital</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-green-600">₹{totalCapital.toLocaleString()}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Withdrawals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-red-600">₹{totalWithdrawals.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="partners">Partners ({partners.length})</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        {/* ===== Partners Tab ===== */}
        <TabsContent value="partners">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Business Partners</CardTitle>
                  <CardDescription>Manage partnership details and profit sharing</CardDescription>
                </div>
                {!isAddingPartner && (
                  <Button onClick={() => setIsAddingPartner(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Partner
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {isAddingPartner && (
                <form onSubmit={handlePartnerSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Partner Name</Label>
                      <Input
                        id="name"
                        value={partnerForm.name}
                        onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="capitalContribution">Capital Contribution (₹)</Label>
                      <Input
                        id="capitalContribution"
                        type="number"
                        step="0.01"
                        value={partnerForm.capitalContribution}
                        onChange={(e) => setPartnerForm({ ...partnerForm, capitalContribution: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profitSharePercentage">Profit Share (%)</Label>
                      <Input
                        id="profitSharePercentage"
                        type="number"
                        step="0.01"
                        max="100"
                        value={partnerForm.profitSharePercentage}
                        onChange={(e) => setPartnerForm({ ...partnerForm, profitSharePercentage: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={partnerForm.status} 
                        onValueChange={(value) => setPartnerForm({ ...partnerForm, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">
                      <Save className="mr-2 h-4 w-4" />
                      {editingPartnerId ? 'Update' : 'Save'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetPartnerForm}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners.length === 0 ? (
                  <div className="col-span-full text-center text-gray-500 py-8">
                    No partners yet. Add your first partner above.
                  </div>
                ) : (
                  partners.map((partner) => {
                    const withdrawals = partnerWithdrawals.filter(w => w.partnerId === partner.id);
                    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
                    
                    return (
                      <Card key={partner.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{partner.name}</CardTitle>
                              <p className="text-sm text-gray-500">{partner.profitSharePercentage}% Profit Share</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              partner.status === 'Active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {partner.status}
                            </span>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-500">Capital Contribution</p>
                            <p className="text-emerald-600">₹{partner.capitalContribution.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total Withdrawals</p>
                            <p className="text-red-600">₹{totalWithdrawn.toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditPartner(partner)} className="flex-1">
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeletePartner(partner.id)} className="flex-1">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Withdrawals Tab ===== */}
        <TabsContent value="withdrawals">
          {/* ...rest of code unchanged */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
