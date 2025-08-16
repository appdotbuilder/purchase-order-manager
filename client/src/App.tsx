import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserManagement } from '@/components/UserManagement';
import { PurchaseOrderManagement } from '@/components/PurchaseOrderManagement';
import { CostEstimateManagement } from '@/components/CostEstimateManagement';
import { trpc } from '@/utils/trpc';
import type { User } from '../../server/src/schema';

// Mock current user for demo - in real app this would come from authentication
const MOCK_CURRENT_USER: User = {
  id: 1,
  username: 'admin',
  email: 'admin@company.com',
  full_name: 'System Administrator',
  role: 'SUPERADMIN',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
};

// In case server is not available, use mock mode after timeout
const ENABLE_MOCK_MODE_TIMEOUT = 3000;

function App() {
  const [currentUser] = useState<User>(MOCK_CURRENT_USER);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'ok' | 'error' | 'mock'>('checking');
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Check server health on startup
  const checkHealth = useCallback(async () => {
    try {
      const result = await trpc.healthcheck.query();
      console.log('Health check successful:', result);
      setHealthStatus('ok');
      setConnectionAttempts(0);
    } catch (error) {
      console.error('Health check failed:', error);
      const newAttempts = connectionAttempts + 1;
      setConnectionAttempts(newAttempts);
      
      // After 3 attempts, switch to mock mode for demo purposes
      if (newAttempts >= 3) {
        console.log('Switching to mock mode for demo purposes');
        setHealthStatus('mock');
      } else {
        setHealthStatus('error');
        // Try again after a delay
        setTimeout(() => {
          setHealthStatus('checking');
          checkHealth();
        }, 2000);
      }
    }
  }, [connectionAttempts]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const getRoleColor = (role: string) => {
    const colors = {
      SUPERADMIN: 'bg-purple-100 text-purple-800 border-purple-300',
      ADMIN: 'bg-red-100 text-red-800 border-red-300',
      UNIT_KERJA: 'bg-blue-100 text-blue-800 border-blue-300',
      BSP: 'bg-green-100 text-green-800 border-green-300',
      KKF: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      DAU: 'bg-indigo-100 text-indigo-800 border-indigo-300'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getAccessibleTabs = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return ['dashboard', 'purchase-orders', 'cost-estimates', 'users'];
      case 'ADMIN':
        return ['dashboard', 'purchase-orders', 'cost-estimates'];
      case 'BSP':
        return ['dashboard', 'purchase-orders', 'cost-estimates'];
      case 'DAU':
        return ['dashboard', 'purchase-orders', 'cost-estimates'];
      case 'UNIT_KERJA':
      case 'KKF':
        return ['dashboard', 'purchase-orders'];
      default:
        return ['dashboard'];
    }
  };

  const accessibleTabs = getAccessibleTabs(currentUser.role);

  if (healthStatus === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to server...</p>
          <p className="text-sm text-gray-400 mt-2">Attempt {connectionAttempts + 1} of 3</p>
        </div>
      </div>
    );
  }

  if (healthStatus === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Unable to connect to the server. Retrying automatically...</p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock mode notification
  const isMockMode = healthStatus === 'mock';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                📋 Purchase Order Management
              </h1>
              {isMockMode && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                  🧪 Demo Mode
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser.full_name}</p>
                <div className="flex items-center space-x-2">
                  <Badge className={getRoleColor(currentUser.role)}>
                    {currentUser.role}
                  </Badge>
                  <span className="text-xs text-gray-500">{currentUser.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Mode Banner */}
      {isMockMode && (
        <div className="bg-orange-50 border-b border-orange-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🧪</span>
                <div>
                  <h3 className="text-sm font-medium text-orange-800">Demo Mode Active</h3>
                  <p className="text-xs text-orange-600">
                    Server connection failed. Using mock data for demonstration purposes.
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={checkHealth}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                Retry Connection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:grid-cols-none lg:flex">
            {accessibleTabs.includes('dashboard') && (
              <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            )}
            {accessibleTabs.includes('purchase-orders') && (
              <TabsTrigger value="purchase-orders">📝 Purchase Orders</TabsTrigger>
            )}
            {accessibleTabs.includes('cost-estimates') && (
              <TabsTrigger value="cost-estimates">💰 Cost Estimates</TabsTrigger>
            )}
            {accessibleTabs.includes('users') && (
              <TabsTrigger value="users">👥 Users</TabsTrigger>
            )}
          </TabsList>

          {/* Dashboard Tab */}
          {accessibleTabs.includes('dashboard') && (
            <TabsContent value="dashboard">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Purchase Orders
                    </CardTitle>
                    <span className="text-2xl">📋</span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{isMockMode ? '3' : '0'}</div>
                    <p className="text-xs text-muted-foreground">
                      All purchase orders in the system
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pending Approvals
                    </CardTitle>
                    <span className="text-2xl">⏳</span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{isMockMode ? '1' : '0'}</div>
                    <p className="text-xs text-muted-foreground">
                      Orders awaiting approval
                    </p>
                  </CardContent>
                </Card>

                {accessibleTabs.includes('cost-estimates') && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Cost Estimates
                      </CardTitle>
                      <span className="text-2xl">💰</span>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{isMockMode ? '2' : '0'}</div>
                      <p className="text-xs text-muted-foreground">
                        Active cost estimates
                      </p>
                    </CardContent>
                  </Card>
                )}

                {accessibleTabs.includes('users') && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Active Users
                      </CardTitle>
                      <span className="text-2xl">👥</span>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{isMockMode ? '4' : '0'}</div>
                      <p className="text-xs text-muted-foreground">
                        Registered system users
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card className="md:col-span-2 lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Role Permissions</CardTitle>
                    <CardDescription>
                      Your current role permissions and capabilities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Purchase Orders</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {['SUPERADMIN', 'ADMIN', 'UNIT_KERJA', 'BSP', 'KKF', 'DAU'].includes(currentUser.role) && (
                            <li>✅ Create, Read, Update, Delete</li>
                          )}
                          {['BSP', 'DAU'].includes(currentUser.role) && (
                            <li>✅ Approve Purchase Orders</li>
                          )}
                        </ul>
                      </div>
                      
                      {accessibleTabs.includes('cost-estimates') && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Cost Estimates</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {['BSP', 'DAU'].includes(currentUser.role) && (
                              <li>✅ Create, Read, Update, Delete</li>
                            )}
                            {currentUser.role === 'DAU' && (
                              <li>✅ Approve Cost Estimates</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {accessibleTabs.includes('users') && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">User Management</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {currentUser.role === 'SUPERADMIN' && (
                              <li>✅ Full User Management Access</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Purchase Orders Tab */}
          {accessibleTabs.includes('purchase-orders') && (
            <TabsContent value="purchase-orders">
              <PurchaseOrderManagement currentUser={currentUser} isMockMode={isMockMode} />
            </TabsContent>
          )}

          {/* Cost Estimates Tab */}
          {accessibleTabs.includes('cost-estimates') && (
            <TabsContent value="cost-estimates">
              <CostEstimateManagement currentUser={currentUser} isMockMode={isMockMode} />
            </TabsContent>
          )}

          {/* Users Tab */}
          {accessibleTabs.includes('users') && (
            <TabsContent value="users">
              <UserManagement currentUser={currentUser} isMockMode={isMockMode} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default App;