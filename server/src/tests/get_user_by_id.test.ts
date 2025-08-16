import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type IdInput, type CreateUserInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';
import { eq } from 'drizzle-orm';

// Test input for creating a user
const testUserInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'ADMIN',
  is_active: true
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create a test user first
    const insertResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const createdUser = insertResult[0];
    const input: IdInput = { id: createdUser.id };

    // Test the handler
    const result = await getUserById(input);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.username).toEqual('testuser');
    expect(result!.email).toEqual('test@example.com');
    expect(result!.full_name).toEqual('Test User');
    expect(result!.role).toEqual('ADMIN');
    expect(result!.is_active).toEqual(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    // Test with non-existent user ID
    const input: IdInput = { id: 999999 };

    const result = await getUserById(input);

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    const user1Input: CreateUserInput = {
      username: 'user1',
      email: 'user1@example.com',
      full_name: 'User One',
      role: 'ADMIN',
      is_active: true
    };

    const user2Input: CreateUserInput = {
      username: 'user2',
      email: 'user2@example.com',
      full_name: 'User Two',
      role: 'BSP',
      is_active: false
    };

    // Insert both users
    const insertResult1 = await db.insert(usersTable)
      .values(user1Input)
      .returning()
      .execute();

    const insertResult2 = await db.insert(usersTable)
      .values(user2Input)
      .returning()
      .execute();

    const user1Id = insertResult1[0].id;
    const user2Id = insertResult2[0].id;

    // Test retrieving first user
    const result1 = await getUserById({ id: user1Id });
    expect(result1).not.toBeNull();
    expect(result1!.username).toEqual('user1');
    expect(result1!.role).toEqual('ADMIN');
    expect(result1!.is_active).toEqual(true);

    // Test retrieving second user
    const result2 = await getUserById({ id: user2Id });
    expect(result2).not.toBeNull();
    expect(result2!.username).toEqual('user2');
    expect(result2!.role).toEqual('BSP');
    expect(result2!.is_active).toEqual(false);
  });

  it('should handle user with all roles correctly', async () => {
    const roles = ['SUPERADMIN', 'ADMIN', 'UNIT_KERJA', 'BSP', 'KKF', 'DAU'] as const;
    
    for (const role of roles) {
      const userInput: CreateUserInput = {
        username: `user_${role.toLowerCase()}`,
        email: `${role.toLowerCase()}@example.com`,
        full_name: `User ${role}`,
        role: role,
        is_active: true
      };

      // Create user
      const insertResult = await db.insert(usersTable)
        .values(userInput)
        .returning()
        .execute();

      const userId = insertResult[0].id;

      // Test retrieval
      const result = await getUserById({ id: userId });
      expect(result).not.toBeNull();
      expect(result!.role).toEqual(role);
      expect(result!.username).toEqual(`user_${role.toLowerCase()}`);
    }
  });

  it('should verify data consistency with database', async () => {
    // Create a user
    const insertResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get user through handler
    const handlerResult = await getUserById({ id: createdUser.id });

    // Get user directly from database
    const dbResult = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    // Both should return the same data
    expect(handlerResult).not.toBeNull();
    expect(dbResult).toHaveLength(1);
    
    const dbUser = dbResult[0];
    expect(handlerResult!.id).toEqual(dbUser.id);
    expect(handlerResult!.username).toEqual(dbUser.username);
    expect(handlerResult!.email).toEqual(dbUser.email);
    expect(handlerResult!.full_name).toEqual(dbUser.full_name);
    expect(handlerResult!.role).toEqual(dbUser.role);
    expect(handlerResult!.is_active).toEqual(dbUser.is_active);
    expect(handlerResult!.created_at.getTime()).toEqual(dbUser.created_at.getTime());
    expect(handlerResult!.updated_at.getTime()).toEqual(dbUser.updated_at.getTime());
  });
});