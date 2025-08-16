import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
async function createTestUser(userData: CreateUserInput) {
  const result = await db.insert(usersTable)
    .values({
      ...userData,
      created_at: new Date(),
      updated_at: new Date()
    })
    .returning()
    .execute();
  
  return result[0];
}

// Test user data
const testUserData: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'UNIT_KERJA',
  is_active: true
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user username', async () => {
    // Create a test user first
    const createdUser = await createTestUser(testUserData);
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      username: 'updatedusername'
    };

    const result = await updateUser(updateInput);

    // Verify the update
    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual('updatedusername');
    expect(result.email).toEqual(testUserData.email);
    expect(result.full_name).toEqual(testUserData.full_name);
    expect(result.role).toEqual(testUserData.role);
    expect(result.is_active).toEqual(testUserData.is_active);
    expect(result.created_at).toEqual(createdUser.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update user email', async () => {
    const createdUser = await createTestUser(testUserData);
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      email: 'updated@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.email).toEqual('updated@example.com');
    expect(result.username).toEqual(testUserData.username);
  });

  it('should update user full_name', async () => {
    const createdUser = await createTestUser(testUserData);
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      full_name: 'Updated Full Name'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.full_name).toEqual('Updated Full Name');
    expect(result.username).toEqual(testUserData.username);
    expect(result.email).toEqual(testUserData.email);
  });

  it('should update user role', async () => {
    const createdUser = await createTestUser(testUserData);
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      role: 'ADMIN'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.role).toEqual('ADMIN');
    expect(result.username).toEqual(testUserData.username);
  });

  it('should update user is_active status', async () => {
    const createdUser = await createTestUser(testUserData);
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.is_active).toEqual(false);
    expect(result.username).toEqual(testUserData.username);
  });

  it('should update multiple fields simultaneously', async () => {
    const createdUser = await createTestUser(testUserData);
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      username: 'multifieldupdate',
      email: 'multifield@example.com',
      full_name: 'Multi Field Update',
      role: 'ADMIN',
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual('multifieldupdate');
    expect(result.email).toEqual('multifield@example.com');
    expect(result.full_name).toEqual('Multi Field Update');
    expect(result.role).toEqual('ADMIN');
    expect(result.is_active).toEqual(false);
    expect(result.created_at).toEqual(createdUser.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should save updated user to database', async () => {
    const createdUser = await createTestUser(testUserData);
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      username: 'dbupdatetest',
      email: 'dbupdate@example.com'
    };

    await updateUser(updateInput);

    // Query the database to verify the update was persisted
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(updatedUsers[0].username).toEqual('dbupdatetest');
    expect(updatedUsers[0].email).toEqual('dbupdate@example.com');
    expect(updatedUsers[0].full_name).toEqual(testUserData.full_name);
    expect(updatedUsers[0].role).toEqual(testUserData.role);
    expect(updatedUsers[0].is_active).toEqual(testUserData.is_active);
    expect(updatedUsers[0].updated_at).toBeInstanceOf(Date);
    expect(updatedUsers[0].updated_at > createdUser.updated_at).toBe(true);
  });

  it('should return existing user when no fields are provided to update', async () => {
    const createdUser = await createTestUser(testUserData);
    const originalUpdatedAt = createdUser.updated_at;
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual(createdUser.username);
    expect(result.email).toEqual(createdUser.email);
    expect(result.full_name).toEqual(createdUser.full_name);
    expect(result.role).toEqual(createdUser.role);
    expect(result.is_active).toEqual(createdUser.is_active);
    expect(result.created_at).toEqual(createdUser.created_at);
    expect(result.updated_at).toEqual(originalUpdatedAt);
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999,
      username: 'nonexistent'
    };

    await expect(updateUser(updateInput))
      .rejects
      .toThrow(/User with id 99999 not found/i);
  });

  it('should handle updating user with all role types', async () => {
    const roles = ['SUPERADMIN', 'ADMIN', 'UNIT_KERJA', 'BSP', 'KKF', 'DAU'] as const;
    
    for (const role of roles) {
      const createdUser = await createTestUser({
        ...testUserData,
        username: `roletest${role.toLowerCase()}`,
        email: `roletest${role.toLowerCase()}@example.com`
      });
      
      const updateInput: UpdateUserInput = {
        id: createdUser.id,
        role: role
      };

      const result = await updateUser(updateInput);

      expect(result.role).toEqual(role);
      expect(result.id).toEqual(createdUser.id);
    }
  });

  it('should properly handle boolean false for is_active', async () => {
    const createdUser = await createTestUser({
      ...testUserData,
      is_active: true
    });
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.is_active).toEqual(false);
    expect(typeof result.is_active).toBe('boolean');
  });

  it('should update timestamp correctly when partial update is made', async () => {
    const createdUser = await createTestUser(testUserData);
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      username: 'timestamptest'
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdUser.updated_at.getTime());
    expect(result.created_at).toEqual(createdUser.created_at);
  });
});