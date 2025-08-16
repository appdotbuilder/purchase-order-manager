import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import { CostEstimateLineItems } from '@/components/CostEstimateLineItems';
import type { User, CostEstimate, CreateCostEstimateInput, UpdateCostEstimateInput, CostEstimateStatus, PurchaseOrder } from '../../../server/src/schema';

interface CostEstimateManagementProps {
  currentUser: User;
  isMockMode?: boolean;
}

// Mock data for demo mode
const MOCK_COST_ESTIMATES: CostEstimate[] = [
  {
    id: 1,
    purchase_order_id: 2,
    title: 'Software License Cost Breakdown',
    description: 'Detailed cost analysis for annual software licenses',
    created_by: 2,
    approved_by: null,
    status: 'PENDING_APPROVAL',
    total_cost: 25000.00,
    created_at: new Date('2024-01-21'),
    updated_at: new Date('2024-01-21')
  },
  {
    id: 2,
    purchase_order_id: 3,
    title: 'Building Maintenance BOQ',
    description: 'Bill of quantities for HVAC maintenance project',
    created_by: 2,
    approved_by: 3,
    status: 'APPROVED',
    total_cost: 8500.00,
    created_at: new Date('2024-01-22'),
    updated_at: new Date('2024-01-23')
  }
];

const MOCK_PURCHASE_ORDERS_FOR_CE: PurchaseOrder[] = [
  {
    id: 2,
    po_number: 'PO-2024-002',
    title: 'Software Licenses',
    description: 'Annual software license renewals',
    requested_by: 1,
    approved_by: 2,
    status: 'APPROVED',
    total_amount: 25000.00,
    created_at: new Date('2024-01-19'),
    updated_at: new Date('2024-01-21')
  },
  {
    id: 3,
    po_number: 'PO-2024-003',
    title: 'Building Maintenance',
    description: 'HVAC system maintenance and repairs',
    requested_by: 1,
    approved_by: 2,
    status: 'APPROVED',
    total_amount: 8500.00,
    created_at: new Date('2024-01-18'),
    updated_at: new Date('2024-01-22')
  }
];

export function CostEstimateManagement({ currentUser, isMockMode = false }: CostEstimateManagementProps) {
  const [costEstimates, setCostEstimates] = useState<CostEstimate[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCostEstimate, setSelectedCostEstimate] = useState<CostEstimate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isLineItemsDialogOpen, setIsLineItemsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state for creating cost estimates
  const [createFormData, setCreateFormData] = useState<CreateCostEstimateInput>({
    purchase_order_id: 0,
    title: '',
    description: null,
    total_cost: 0
  });

  // Form state for editing cost estimates
  const [editFormData, setEditFormData] = useState<UpdateCostEstimateInput>({
    id: 0,
    title: '',
    description: null,
    total_cost: 0
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isMockMode) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setCostEstimates(MOCK_COST_ESTIMATES);
        setPurchaseOrders(MOCK_PURCHASE_ORDERS_FOR_CE);
      } else {
        const [costEstimatesResult, purchaseOrdersResult] = await Promise.all([
          trpc.getCostEstimates.query(),
          trpc.getPurchaseOrders.query()
        ]);
        setCostEstimates(costEstimatesResult);
        setPurchaseOrders(purchaseOrdersResult);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      if (!isMockMode) {
        // Fallback to mock data if API fails
        setCostEstimates(MOCK_COST_ESTIMATES);
        setPurchaseOrders(MOCK_PURCHASE_ORDERS_FOR_CE);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isMockMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCostEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newCostEstimate = await trpc.createCostEstimate.mutate(createFormData);
      setCostEstimates((prev: CostEstimate[]) => [...prev, newCostEstimate]);
      setIsCreateDialogOpen(false);
      setCreateFormData({
        purchase_order_id: 0,
        title: '',
        description: null,
        total_cost: 0
      });
    } catch (error) {
      console.error('Failed to create cost estimate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCostEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCostEstimate) return;
    
    setIsLoading(true);
    try {
      const updatedCostEstimate = await trpc.updateCostEstimate.mutate(editFormData);
      setCostEstimates((prev: CostEstimate[]) => 
        prev.map((ce: CostEstimate) => ce.id === updatedCostEstimate.id ? updatedCostEstimate : ce)
      );
      setIsEditDialogOpen(false);
      setSelectedCostEstimate(null);
    } catch (error) {
      console.error('Failed to update cost estimate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveCostEstimate = async (id: number, approved: boolean) => {
    setIsLoading(true);
    try {
      const updatedCostEstimate = await trpc.approveCostEstimate.mutate({ id, approved });
      setCostEstimates((prev: CostEstimate[]) =>
        prev.map((ce: CostEstimate) => ce.id === updatedCostEstimate.id ? updatedCostEstimate : ce)
      );
    } catch (error) {
      console.error('Failed to approve/reject cost estimate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCostEstimate = async (id: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteCostEstimate.mutate({ id });
      setCostEstimates((prev: CostEstimate[]) => prev.filter((ce: CostEstimate) => ce.id !== id));
    } catch (error) {
      console.error('Failed to delete cost estimate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (costEstimate: CostEstimate) => {
    setSelectedCostEstimate(costEstimate);
    setEditFormData({
      id: costEstimate.id,
      title: costEstimate.title,
      description: costEstimate.description,
      total_cost: costEstimate.total_cost
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (costEstimate: CostEstimate) => {
    setSelectedCostEstimate(costEstimate);
    setIsViewDialogOpen(true);
  };

  const openLineItemsDialog = (costEstimate: CostEstimate) => {
    setSelectedCostEstimate(costEstimate);
    setIsLineItemsDialogOpen(true);
  };

  const getStatusColor = (status: CostEstimateStatus) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 border-green-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status];
  };

  const getPurchaseOrderTitle = (id: number) => {
    const po = purchaseOrders.find((po: PurchaseOrder) => po.id === id);
    return po ? po.title : 'Unknown PO';
  };

  const canApprove = (costEstimate: CostEstimate) => {
    return currentUser.role === 'DAU' && costEstimate.status === 'PENDING_APPROVAL';
  };

  const canEdit = (costEstimate: CostEstimate) => {
    return (['BSP', 'DAU'].includes(currentUser.role) && costEstimate.status === 'DRAFT') ||
           ['SUPERADMIN', 'ADMIN'].includes(currentUser.role);
  };

  const canDelete = (costEstimate: CostEstimate) => {
    return (['BSP', 'DAU'].includes(currentUser.role) && costEstimate.status === 'DRAFT') ||
           ['SUPERADMIN', 'ADMIN'].includes(currentUser.role);
  };

  const canManage = ['BSP', 'DAU', 'SUPERADMIN', 'ADMIN'].includes(currentUser.role);

  const filteredCostEstimates = costEstimates.filter((ce: CostEstimate) => {
    if (statusFilter === 'all') return true;
    return ce.status === statusFilter;
  });

  const statusCounts = costEstimates.reduce((acc, ce) => {
    acc[ce.status] = (acc[ce.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const approvedPurchaseOrders = purchaseOrders.filter((po: PurchaseOrder) => po.status === 'APPROVED');

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access cost estimate management features.
            Only BSP and DAU roles can manage cost estimates.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimates</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costEstimates.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <span className="text-2xl">⏳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.PENDING_APPROVAL || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.APPROVED || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <span className="text-2xl">📝</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.DRAFT || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Cost Estimates Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>💰 Cost Estimates & Bill of Quantities</CardTitle>
              <CardDescription>
                Manage cost estimates and bills of quantities for approved purchase orders.
                {isMockMode && <span className="text-orange-600"> (Demo Mode - Changes are simulated)</span>}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              {['BSP'].includes(currentUser.role) && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>➕ New Cost Estimate</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create Cost Estimate</DialogTitle>
                      <DialogDescription>
                        Create a new cost estimate for an approved purchase order.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateCostEstimate}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="purchase_order_id">Purchase Order</Label>
                          <Select
                            value={createFormData.purchase_order_id.toString()}
                            onValueChange={(value: string) =>
                              setCreateFormData((prev: CreateCostEstimateInput) => ({ 
                                ...prev, 
                                purchase_order_id: parseInt(value) 
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a purchase order" />
                            </SelectTrigger>
                            <SelectContent>
                              {approvedPurchaseOrders.map((po: PurchaseOrder) => (
                                <SelectItem key={po.id} value={po.id.toString()}>
                                  {po.po_number} - {po.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            value={createFormData.title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCreateFormData((prev: CreateCostEstimateInput) => ({ ...prev, title: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={createFormData.description || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                              setCreateFormData((prev: CreateCostEstimateInput) => ({ 
                                ...prev, 
                                description: e.target.value || null 
                              }))
                            }
                            rows={3}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="total_cost">Total Cost</Label>
                          <Input
                            id="total_cost"
                            type="number"
                            step="0.01"
                            min="0"
                            value={createFormData.total_cost}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCreateFormData((prev: CreateCostEstimateInput) => ({ 
                                ...prev, 
                                total_cost: parseFloat(e.target.value) || 0 
                              }))
                            }
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Creating...' : 'Create Cost Estimate'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && costEstimates.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredCostEstimates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                {statusFilter === 'all' 
                  ? 'No cost estimates found. Create your first cost estimate!' 
                  : `No cost estimates with status "${statusFilter}" found.`
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Purchase Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCostEstimates.map((costEstimate: CostEstimate) => (
                    <TableRow key={costEstimate.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{costEstimate.title}</div>
                          {costEstimate.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {costEstimate.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {getPurchaseOrderTitle(costEstimate.purchase_order_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(costEstimate.status)}>
                          {costEstimate.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        ${costEstimate.total_cost.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {costEstimate.created_at.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openViewDialog(costEstimate)}
                          >
                            👁️ View
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openLineItemsDialog(costEstimate)}
                          >
                            📋 Line Items
                          </Button>
                          
                          {canEdit(costEstimate) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(costEstimate)}
                              disabled={isLoading}
                            >
                              ✏️ Edit
                            </Button>
                          )}
                          
                          {canApprove(costEstimate) && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApproveCostEstimate(costEstimate.id, true)}
                                disabled={isLoading}
                              >
                                ✅ Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleApproveCostEstimate(costEstimate.id, false)}
                                disabled={isLoading}
                              >
                                ❌ Reject
                              </Button>
                            </>
                          )}
                          
                          {canDelete(costEstimate) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={isLoading}
                                >
                                  🗑️ Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete
                                    the cost estimate <strong>{costEstimate.title}</strong>.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteCostEstimate(costEstimate.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Cost Estimate</DialogTitle>
            <DialogDescription>
              Update cost estimate information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCostEstimate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateCostEstimateInput) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditFormData((prev: UpdateCostEstimateInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-total_cost">Total Cost</Label>
                <Input
                  id="edit-total_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.total_cost || 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateCostEstimateInput) => ({ 
                      ...prev, 
                      total_cost: parseFloat(e.target.value) || 0 
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Cost Estimate Details</DialogTitle>
            <DialogDescription>
              {selectedCostEstimate?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedCostEstimate && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Title</Label>
                  <p className="text-sm">{selectedCostEstimate.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedCostEstimate.status)}>
                      {selectedCostEstimate.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Purchase Order</Label>
                <p className="text-sm">{getPurchaseOrderTitle(selectedCostEstimate.purchase_order_id)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Description</Label>
                <p className="text-sm">{selectedCostEstimate.description || 'No description provided'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Total Cost</Label>
                  <p className="text-sm font-mono">${selectedCostEstimate.total_cost.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <p className="text-sm">{selectedCostEstimate.created_at.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Line Items Dialog */}
      <Dialog open={isLineItemsDialogOpen} onOpenChange={setIsLineItemsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cost Estimate Line Items</DialogTitle>
            <DialogDescription>
              {selectedCostEstimate?.title} - Bill of Quantities
            </DialogDescription>
          </DialogHeader>
          {selectedCostEstimate && (
            <CostEstimateLineItems 
              costEstimateId={selectedCostEstimate.id} 
              currentUser={currentUser}
              canEdit={canEdit(selectedCostEstimate)}
              isMockMode={isMockMode}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}