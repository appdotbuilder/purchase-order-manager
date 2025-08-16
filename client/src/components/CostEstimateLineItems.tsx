import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/utils/trpc';
import type { User, CostEstimateLineItem, CreateCostEstimateLineItemInput, UpdateCostEstimateLineItemInput } from '../../../server/src/schema';

interface CostEstimateLineItemsProps {
  costEstimateId: number;
  currentUser: User;
  canEdit: boolean;
  isMockMode?: boolean;
}

// Mock data for demo mode
const MOCK_LINE_ITEMS: Record<number, CostEstimateLineItem[]> = {
  1: [
    {
      id: 1,
      cost_estimate_id: 1,
      description: 'Microsoft Office 365 - 50 licenses',
      quantity: 50,
      unit_price: 120.00,
      total_price: 6000.00,
      created_at: new Date('2024-01-21')
    },
    {
      id: 2,
      cost_estimate_id: 1,
      description: 'Adobe Creative Suite - 10 licenses',
      quantity: 10,
      unit_price: 600.00,
      total_price: 6000.00,
      created_at: new Date('2024-01-21')
    },
    {
      id: 3,
      cost_estimate_id: 1,
      description: 'Antivirus Software - Enterprise',
      quantity: 1,
      unit_price: 13000.00,
      total_price: 13000.00,
      created_at: new Date('2024-01-21')
    }
  ],
  2: [
    {
      id: 4,
      cost_estimate_id: 2,
      description: 'HVAC Filter Replacement',
      quantity: 20,
      unit_price: 45.00,
      total_price: 900.00,
      created_at: new Date('2024-01-22')
    },
    {
      id: 5,
      cost_estimate_id: 2,
      description: 'Thermostat Calibration',
      quantity: 5,
      unit_price: 150.00,
      total_price: 750.00,
      created_at: new Date('2024-01-22')
    },
    {
      id: 6,
      cost_estimate_id: 2,
      description: 'Ductwork Cleaning',
      quantity: 1,
      unit_price: 6850.00,
      total_price: 6850.00,
      created_at: new Date('2024-01-22')
    }
  ]
};

export function CostEstimateLineItems({ costEstimateId, currentUser, canEdit, isMockMode = false }: CostEstimateLineItemsProps) {
  const [lineItems, setLineItems] = useState<CostEstimateLineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState<CostEstimateLineItem | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state for creating line items
  const [createFormData, setCreateFormData] = useState<CreateCostEstimateLineItemInput>({
    cost_estimate_id: costEstimateId,
    description: '',
    quantity: 1,
    unit_price: 0
  });

  // Form state for editing line items
  const [editFormData, setEditFormData] = useState<UpdateCostEstimateLineItemInput>({
    id: 0,
    description: '',
    quantity: 1,
    unit_price: 0
  });

  const loadLineItems = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isMockMode) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        const mockItems = MOCK_LINE_ITEMS[costEstimateId] || [];
        setLineItems(mockItems);
      } else {
        const result = await trpc.getCostEstimateLineItems.query({ id: costEstimateId });
        setLineItems(result);
      }
    } catch (error) {
      console.error('Failed to load line items:', error);
      if (!isMockMode) {
        // Fallback to mock data if API fails
        const mockItems = MOCK_LINE_ITEMS[costEstimateId] || [];
        setLineItems(mockItems);
      }
    } finally {
      setIsLoading(false);
    }
  }, [costEstimateId, isMockMode]);

  useEffect(() => {
    loadLineItems();
  }, [loadLineItems]);

  const handleCreateLineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newLineItem = await trpc.createCostEstimateLineItem.mutate(createFormData);
      setLineItems((prev: CostEstimateLineItem[]) => [...prev, newLineItem]);
      setIsCreateDialogOpen(false);
      setCreateFormData({
        cost_estimate_id: costEstimateId,
        description: '',
        quantity: 1,
        unit_price: 0
      });
    } catch (error) {
      console.error('Failed to create line item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditLineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineItem) return;
    
    setIsLoading(true);
    try {
      const updatedLineItem = await trpc.updateCostEstimateLineItem.mutate(editFormData);
      setLineItems((prev: CostEstimateLineItem[]) => 
        prev.map((item: CostEstimateLineItem) => item.id === updatedLineItem.id ? updatedLineItem : item)
      );
      setIsEditDialogOpen(false);
      setSelectedLineItem(null);
    } catch (error) {
      console.error('Failed to update line item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLineItem = async (id: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteCostEstimateLineItem.mutate({ id });
      setLineItems((prev: CostEstimateLineItem[]) => prev.filter((item: CostEstimateLineItem) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete line item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (lineItem: CostEstimateLineItem) => {
    setSelectedLineItem(lineItem);
    setEditFormData({
      id: lineItem.id,
      description: lineItem.description,
      quantity: lineItem.quantity,
      unit_price: lineItem.unit_price
    });
    setIsEditDialogOpen(true);
  };

  const totalCost = lineItems.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">📋 Bill of Quantities</CardTitle>
            {canEdit && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">➕ Add Line Item</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Line Item</DialogTitle>
                    <DialogDescription>
                      Add a new line item to the bill of quantities.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateLineItem}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={createFormData.description}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCreateFormData((prev: CreateCostEstimateLineItemInput) => ({ 
                              ...prev, 
                              description: e.target.value 
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={createFormData.quantity}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCreateFormData((prev: CreateCostEstimateLineItemInput) => ({ 
                                ...prev, 
                                quantity: parseInt(e.target.value) || 1 
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="unit_price">Unit Price</Label>
                          <Input
                            id="unit_price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={createFormData.unit_price}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCreateFormData((prev: CreateCostEstimateLineItemInput) => ({ 
                                ...prev, 
                                unit_price: parseFloat(e.target.value) || 0 
                              }))
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Total: ${(createFormData.quantity * createFormData.unit_price).toFixed(2)}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Adding...' : 'Add Line Item'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && lineItems.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : lineItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No line items found.</p>
              {canEdit && (
                <p className="text-sm text-gray-400">Add line items to create the bill of quantities.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((lineItem: CostEstimateLineItem) => (
                      <TableRow key={lineItem.id}>
                        <TableCell className="font-medium">
                          {lineItem.description}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {lineItem.quantity}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${lineItem.unit_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${lineItem.total_price.toFixed(2)}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(lineItem)}
                                disabled={isLoading}
                              >
                                ✏️ Edit
                              </Button>
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
                                      the line item <strong>{lineItem.description}</strong>.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteLineItem(lineItem.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Total Summary */}
              <div className="flex justify-end border-t pt-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Total Cost</div>
                  <div className="text-lg font-bold font-mono">${totalCost.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Line Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Line Item</DialogTitle>
            <DialogDescription>
              Update line item information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditLineItem}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editFormData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateCostEstimateLineItemInput) => ({ 
                      ...prev, 
                      description: e.target.value 
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-quantity">Quantity</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    min="1"
                    value={editFormData.quantity || 1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: UpdateCostEstimateLineItemInput) => ({ 
                        ...prev, 
                        quantity: parseInt(e.target.value) || 1 
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-unit_price">Unit Price</Label>
                  <Input
                    id="edit-unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.unit_price || 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: UpdateCostEstimateLineItemInput) => ({ 
                        ...prev, 
                        unit_price: parseFloat(e.target.value) || 0 
                      }))
                    }
                  />
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Total: ${((editFormData.quantity || 1) * (editFormData.unit_price || 0)).toFixed(2)}
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
    </div>
  );
}