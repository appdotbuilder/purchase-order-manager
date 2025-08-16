import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput, UpdateUserInput, UserRole } from '../../../server/src/schema';

interface UserManagementProps {
  currentUser: User;
  isMockMode?: boolean;
}

// Mock data for demo mode
const MOCK_USERS: User[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@company.com',
    full_name: 'System Administrator',
    role: 'SUPERADMIN',
    is_active: true,
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15')
  },
  {
    id: 2,
    username: 'bsp_user',
    email: 'bsp@company.com',
    full_name: 'BSP Manager',
    role: 'BSP',
    is_active: true,
    created_at: new Date('2024-01-16'),
    updated_at: new Date('2024-01-16')
  },
  {
    id: 3,
    username: 'dau_user',
    email: 'dau@company.com',
    full_name: 'DAU Approver',
    role: 'DAU',
    is_active: true,
    created_at: new Date('2024-01-17'),
    updated_at: new Date('2024-01-17')
  },
  {
    id: 4,
    username: 'unit_kerja',
    email: 'unit@company.com',
    full_name: 'Unit Kerja Staff',
    role: 'UNIT_KERJA',
    is_active: true,
    created_at: new Date('2024-01-18'),
    updated_at: new Date('2024-01-18')
  }
];

export function UserManagement({ currentUser, isMockMode = false }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state for creating users
  const [createFormData, setCreateFormData] = useState<CreateUserInput>({
    username: '',
    email: '',
    full_name: '',
    role: 'UNIT_KERJA',
    is_active: true
  });

  // Form state for editing users
  const [editFormData, setEditFormData] = useState<UpdateUserInput>({
    id: 0,
    username: '',
    email: '',
    full_name: '',
    role: 'UNIT_KERJA',
    is_active: true
  });

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isMockMode) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setUsers(MOCK_USERS);
      } else {
        const result = await trpc.getUsers.query();
        setUsers(result);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      if (!isMockMode) {
        // Fallback to mock data if API fails
        setUsers(MOCK_USERS);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isMockMode]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isMockMode) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        const newUser: User = {
          id: Math.max(...users.map(u => u.id)) + 1,
          ...createFormData,
          created_at: new Date(),
          updated_at: new Date()
        };
        setUsers((prev: User[]) => [...prev, newUser]);
      } else {
        const newUser = await trpc.createUser.mutate(createFormData);
        setUsers((prev: User[]) => [...prev, newUser]);
      }
      setIsCreateDialogOpen(false);
      setCreateFormData({
        username: '',
        email: '',
        full_name: '',
        role: 'UNIT_KERJA',
        is_active: true
      });
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      const updatedUser = await trpc.updateUser.mutate(editFormData);
      setUsers((prev: User[]) => 
        prev.map((user: User) => user.id === updatedUser.id ? updatedUser : user)
      );
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteUser.mutate({ id: userId });
      setUsers((prev: User[]) => prev.filter((user: User) => user.id !== userId));
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active
    });
    setIsEditDialogOpen(true);
  };

  const getRoleColor = (role: UserRole) => {
    const colors = {
      SUPERADMIN: 'bg-purple-100 text-purple-800 border-purple-300',
      ADMIN: 'bg-red-100 text-red-800 border-red-300',
      UNIT_KERJA: 'bg-blue-100 text-blue-800 border-blue-300',
      BSP: 'bg-green-100 text-green-800 border-green-300',
      KKF: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      DAU: 'bg-indigo-100 text-indigo-800 border-indigo-300'
    };
    return colors[role];
  };

  const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'SUPERADMIN', label: 'Super Admin' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'UNIT_KERJA', label: 'Unit Kerja' },
    { value: 'BSP', label: 'BSP' },
    { value: 'KKF', label: 'KKF' },
    { value: 'DAU', label: 'DAU' }
  ];

  if (currentUser.role !== 'SUPERADMIN') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access user management features.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>👥 User Management</CardTitle>
              <CardDescription>
                Manage system users and their roles. Only Super Admins can access this section.
                {isMockMode && <span className="text-orange-600"> (Demo Mode - Changes are simulated)</span>}
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>➕ Add User</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the system with appropriate role permissions.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="username" className="text-right">
                        Username
                      </Label>
                      <Input
                        id="username"
                        value={createFormData.username}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
                        }
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={createFormData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                        }
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="full_name" className="text-right">
                        Full Name
                      </Label>
                      <Input
                        id="full_name"
                        value={createFormData.full_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData((prev: CreateUserInput) => ({ ...prev, full_name: e.target.value }))
                        }
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role" className="text-right">
                        Role
                      </Label>
                      <Select
                        value={createFormData.role}
                        onValueChange={(value: UserRole) =>
                          setCreateFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="is_active" className="text-right">
                        Active
                      </Label>
                      <Switch
                        id="is_active"
                        checked={createFormData.is_active}
                        onCheckedChange={(checked: boolean) =>
                          setCreateFormData((prev: CreateUserInput) => ({ ...prev, is_active: checked }))
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create User'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && users.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No users found. Create your first user!</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-gray-500">
                            @{user.username} • {user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.created_at.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            disabled={isLoading}
                          >
                            ✏️ Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isLoading || user.id === currentUser.id}
                              >
                                🗑️ Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the user
                                  {' '}<strong>{user.full_name}</strong> from the system.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-username" className="text-right">
                  Username
                </Label>
                <Input
                  id="edit-username"
                  value={editFormData.username || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateUserInput) => ({ ...prev, username: e.target.value }))
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-full_name" className="text-right">
                  Full Name
                </Label>
                <Input
                  id="edit-full_name"
                  value={editFormData.full_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateUserInput) => ({ ...prev, full_name: e.target.value }))
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  Role
                </Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(value: UserRole) =>
                    setEditFormData((prev: UpdateUserInput) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-is_active" className="text-right">
                  Active
                </Label>
                <Switch
                  id="edit-is_active"
                  checked={editFormData.is_active}
                  onCheckedChange={(checked: boolean) =>
                    setEditFormData((prev: UpdateUserInput) => ({ ...prev, is_active: checked }))
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
    </div>
  );
}