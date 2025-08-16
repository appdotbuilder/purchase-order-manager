import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type IdInput, type CreateUserInput } from '../schema';
import { deleteUser } from '../handlers/delete_user';
import { eq } from 'drizzle-orm';

const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'ADMIN',
  is_active: true
};

const createTestUser = async (): Promise<number> => {
  const result = await db.insert(usersTable)
    .values(testUser)
    .returning({ id: usersTable.id })
    .execute();
  return result[0].id;
};

describe('deleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing user', async () => {
    // Create test user
    const userId = await createTestUser();

    // Delete the user
    const input: IdInput = { id: userId };
    const result = await deleteUser(input);

    expect(result.success).toBe(true);

    // Verify user is deleted from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(0);
  });

  it('should throw error when user does not exist', async () => {
    const input: IdInput = { id: 999999 };

    await expect(deleteUser(input)).rejects.toThrow(/User with id 999999 not found/i);
  });

  it('should not affect other users when deleting one user', async () => {
    // Create multiple test users
    const userId1 = await createTestUser();
    
    const user2 = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com', 
        full_name: 'Test User 2',
        role: 'UNIT_KERJA',
        is_active: true
      })
      .returning({ id: usersTable.id })
      .execute();
    const userId2 = user2[0].id;

    // Delete only the first user
    const input: IdInput = { id: userId1 };
    const result = await deleteUser(input);

    expect(result.success).toBe(true);

    // Verify first user is deleted
    const deletedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId1))
      .execute();
    expect(deletedUser).toHaveLength(0);

    // Verify second user still exists
    const remainingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId2))
      .execute();
    expect(remainingUser).toHaveLength(1);
    expect(remainingUser[0].username).toBe('testuser2');
  });

  it('should handle deletion of user with different roles', async () => {
    // Create a SUPERADMIN user
    const superAdminUser = await db.insert(usersTable)
      .values({
        username: 'superadmin',
        email: 'superadmin@example.com',
        full_name: 'Super Admin',
        role: 'SUPERADMIN',
        is_active: true
      })
      .returning({ id: usersTable.id })
      .execute();
    const superAdminId = superAdminUser[0].id;

    // Delete the SUPERADMIN user
    const input: IdInput = { id: superAdminId };
    const result = await deleteUser(input);

    expect(result.success).toBe(true);

    // Verify user is deleted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, superAdminId))
      .execute();

    expect(users).toHaveLength(0);
  });

  it('should handle deletion of inactive user', async () => {
    // Create an inactive user
    const inactiveUser = await db.insert(usersTable)
      .values({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        full_name: 'Inactive User',
        role: 'BSP',
        is_active: false
      })
      .returning({ id: usersTable.id })
      .execute();
    const inactiveUserId = inactiveUser[0].id;

    // Delete the inactive user
    const input: IdInput = { id: inactiveUserId };
    const result = await deleteUser(input);

    expect(result.success).toBe(true);

    // Verify user is deleted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, inactiveUserId))
      .execute();

    expect(users).toHaveLength(0);
  });
});