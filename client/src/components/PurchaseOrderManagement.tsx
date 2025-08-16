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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { User, PurchaseOrder, CreatePurchaseOrderInput, UpdatePurchaseOrderInput, PurchaseOrderStatus, ApprovePurchaseOrderInput } from '../../../server/src/schema';

interface PurchaseOrderManagementProps {
  currentUser: User;
  isMockMode?: boolean;
}

// Mock data for demo mode
const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 1,
    po_number: 'PO-2024-001',
    title: 'Office Equipment Purchase',
    description: 'Computers, printers, and office supplies for new department',
    requested_by: 1,
    approved_by: null,
    status: 'PENDING_APPROVAL',
    total_amount: 15000.00,
    created_at: new Date('2024-01-20'),
    updated_at: new Date('2024-01-20')
  },
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
    status: 'PROGRESS',
    total_amount: 8500.00,
    created_at: new Date('2024-01-18'),
    updated_at: new Date('2024-01-22')
  }
];

export function PurchaseOrderManagement({ currentUser, isMockMode = false }: PurchaseOrderManagementProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state for creating purchase orders
  const [createFormData, setCreateFormData] = useState<CreatePurchaseOrderInput>({
    title: '',
    description: null,
    total_amount: 0
  });

  // Form state for editing purchase orders
  const [editFormData, setEditFormData] = useState<UpdatePurchaseOrderInput>({
    id: 0,
    title: '',
    description: null,
    total_amount: 0
  });

  const loadPurchaseOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isMockMode) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setPurchaseOrders(MOCK_PURCHASE_ORDERS);
      } else {
        const result = await trpc.getPurchaseOrders.query();
        setPurchaseOrders(result);
      }
    } catch (error) {
      console.error('Failed to load purchase orders:', error);
      if (!isMockMode) {
        // Fallback to mock data if API fails
        setPurchaseOrders(MOCK_PURCHASE_ORDERS);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isMockMode]);

  useEffect(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  const handleCreatePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isMockMode) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        const newPurchaseOrder: PurchaseOrder = {
          id: Math.max(...purchaseOrders.map(po => po.id)) + 1,
          po_number: `PO-2024-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
          ...createFormData,
          requested_by: currentUser.id,
          approved_by: null,
          status: 'DRAFT',
          created_at: new Date(),
          updated_at: new Date()
        };
        setPurchaseOrders((prev: PurchaseOrder[]) => [...prev, newPurchaseOrder]);
      } else {
        const newPurchaseOrder = await trpc.createPurchaseOrder.mutate(createFormData);
        setPurchaseOrders((prev: PurchaseOrder[]) => [...prev, newPurchaseOrder]);
      }
      setIsCreateDialogOpen(false);
      setCreateFormData({
        title: '',
        description: null,
        total_amount: 0
      });
    } catch (error) {
      console.error('Failed to create purchase order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchaseOrder) return;
    
    setIsLoading(true);
    try {
      const updatedPurchaseOrder = await trpc.updatePurchaseOrder.mutate(editFormData);
      setPurchaseOrders((prev: PurchaseOrder[]) => 
        prev.map((po: PurchaseOrder) => po.id === updatedPurchaseOrder.id ? updatedPurchaseOrder : po)
      );
      setIsEditDialogOpen(false);
      setSelectedPurchaseOrder(null);
    } catch (error) {
      console.error('Failed to update purchase order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovePurchaseOrder = async (id: number, approved: boolean) => {
    setIsLoading(true);
    try {
      const updatedPurchaseOrder = await trpc.approvePurchaseOrder.mutate({ id, approved });
      setPurchaseOrders((prev: PurchaseOrder[]) =>
        prev.map((po: PurchaseOrder) => po.id === updatedPurchaseOrder.id ? updatedPurchaseOrder : po)
      );
    } catch (error) {
      console.error('Failed to approve/reject purchase order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePurchaseOrder = async (id: number) => {
    setIsLoading(true);
    try {
      await trpc.deletePurchaseOrder.mutate({ id });
      setPurchaseOrders((prev: PurchaseOrder[]) => prev.filter((po: PurchaseOrder) => po.id !== id));
    } catch (error) {
      console.error('Failed to delete purchase order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (purchaseOrder: PurchaseOrder) => {
    setSelectedPurchaseOrder(purchaseOrder);
    setEditFormData({
      id: purchaseOrder.id,
      title: purchaseOrder.title,
      description: purchaseOrder.description,
      total_amount: purchaseOrder.total_amount
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (purchaseOrder: PurchaseOrder) => {
    setSelectedPurchaseOrder(purchaseOrder);
    setIsViewDialogOpen(true);
  };

  const getStatusColor = (status: PurchaseOrderStatus) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 border-green-300',
      PROGRESS: 'bg-blue-100 text-blue-800 border-blue-300',
      COMPLETED: 'bg-purple-100 text-purple-800 border-purple-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status];
  };

  const canApprove = (purchaseOrder: PurchaseOrder) => {
    return ['BSP', 'DAU'].includes(currentUser.role) && 
           purchaseOrder.status === 'PENDING_APPROVAL';
  };

  const canEdit = (purchaseOrder: PurchaseOrder) => {
    return purchaseOrder.status === 'DRAFT' || 
           ['SUPERADMIN', 'ADMIN'].includes(currentUser.role);
  };

  const canDelete = (purchaseOrder: PurchaseOrder) => {
    return purchaseOrder.status === 'DRAFT' || 
           ['SUPERADMIN', 'ADMIN'].includes(currentUser.role);
  };

  const filteredPurchaseOrders = purchaseOrders.filter((po: PurchaseOrder) => {
    if (statusFilter === 'all') return true;
    return po.status === statusFilter;
  });

  const statusCounts = purchaseOrders.reduce((acc, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <span className="text-2xl">📋</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
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
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <span className="text-2xl">🔄</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.PROGRESS || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.COMPLETED || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Purchase Orders Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>📝 Purchase Orders</CardTitle>
              <CardDescription>
                Manage purchase orders with comprehensive workflow and approval process.
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
                  <SelectItem value="PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>➕ New Purchase Order</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create Purchase Order</DialogTitle>
                    <DialogDescription>
                      Create a new purchase order. It will start in DRAFT status.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreatePurchaseOrder}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={createFormData.title}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCreateFormData((prev: CreatePurchaseOrderInput) => ({ ...prev, title: e.target.value }))
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
                            setCreateFormData((prev: CreatePurchaseOrderInput) => ({ 
                              ...prev, 
                              description: e.target.value || null 
                            }))
                          }
                          rows={3}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="total_amount">Total Amount</Label>
                        <Input
                          id="total_amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={createFormData.total_amount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCreateFormData((prev: CreatePurchaseOrderInput) => ({ 
                              ...prev, 
                              total_amount: parseFloat(e.target.value) || 0 
                            }))
                          }
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Creating...' : 'Create Purchase Order'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && purchaseOrders.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredPurchaseOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                {statusFilter === 'all' 
                  ? 'No purchase orders found. Create your first purchase order!' 
                  : `No purchase orders with status "${statusFilter}" found.`
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchaseOrders.map((purchaseOrder: PurchaseOrder) => (
                    <TableRow key={purchaseOrder.id}>
                      <TableCell className="font-mono text-sm">
                        {purchaseOrder.po_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{purchaseOrder.title}</div>
                          {purchaseOrder.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {purchaseOrder.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(purchaseOrder.status)}>
                          {purchaseOrder.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        ${purchaseOrder.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {purchaseOrder.created_at.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openViewDialog(purchaseOrder)}
                          >
                            👁️ View
                          </Button>
                          
                          {canEdit(purchaseOrder) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(purchaseOrder)}
                              disabled={isLoading}
                            >
                              ✏️ Edit
                            </Button>
                          )}
                          
                          {canApprove(purchaseOrder) && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApprovePurchaseOrder(purchaseOrder.id, true)}
                                disabled={isLoading}
                              >
                                ✅ Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleApprovePurchaseOrder(purchaseOrder.id, false)}
                                disabled={isLoading}
                              >
                                ❌ Reject
                              </Button>
                            </>
                          )}
                          
                          {canDelete(purchaseOrder) && (
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
                                    the purchase order <strong>{purchaseOrder.po_number}</strong>.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePurchaseOrder(purchaseOrder.id)}
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
            <DialogTitle>Edit Purchase Order</DialogTitle>
            <DialogDescription>
              Update purchase order information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditPurchaseOrder}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdatePurchaseOrderInput) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditFormData((prev: UpdatePurchaseOrderInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-total_amount">Total Amount</Label>
                <Input
                  id="edit-total_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.total_amount || 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdatePurchaseOrderInput) => ({ 
                      ...prev, 
                      total_amount: parseFloat(e.target.value) || 0 
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
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              {selectedPurchaseOrder?.po_number}
            </DialogDescription>
          </DialogHeader>
          {selectedPurchaseOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Title</Label>
                  <p className="text-sm">{selectedPurchaseOrder.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedPurchaseOrder.status)}>
                      {selectedPurchaseOrder.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Description</Label>
                <p className="text-sm">{selectedPurchaseOrder.description || 'No description provided'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Total Amount</Label>
                  <p className="text-sm font-mono">${selectedPurchaseOrder.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <p className="text-sm">{selectedPurchaseOrder.created_at.toLocaleDateString()}</p>
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
    </div>
  );
}