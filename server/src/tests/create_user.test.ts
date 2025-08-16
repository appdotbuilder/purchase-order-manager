import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'ADMIN',
  is_active: true
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all provided fields', async () => {
    const result = await createUser(testInput);

    // Verify all fields are set correctly
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.role).toEqual('ADMIN');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].role).toEqual('ADMIN');
    expect(users[0].is_active).toEqual(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create user with default is_active value', async () => {
    const inputWithoutActive: CreateUserInput = {
      username: 'defaultuser',
      email: 'default@example.com',
      full_name: 'Default User',
      role: 'UNIT_KERJA',
      is_active: true // Zod applies default, so we include it
    };

    const result = await createUser(inputWithoutActive);

    expect(result.is_active).toEqual(true);
    expect(result.username).toEqual('defaultuser');
    expect(result.role).toEqual('UNIT_KERJA');
  });

  it('should handle different user roles', async () => {
    const roles: Array<CreateUserInput['role']> = ['SUPERADMIN', 'ADMIN', 'UNIT_KERJA', 'BSP', 'KKF', 'DAU'];

    for (const role of roles) {
      const input: CreateUserInput = {
        username: `user_${role.toLowerCase()}`,
        email: `${role.toLowerCase()}@example.com`,
        full_name: `User ${role}`,
        role: role,
        is_active: true
      };

      const result = await createUser(input);
      expect(result.role).toEqual(role);
      expect(result.username).toEqual(`user_${role.toLowerCase()}`);
    }
  });

  it('should create inactive user when specified', async () => {
    const inactiveInput: CreateUserInput = {
      username: 'inactiveuser',
      email: 'inactive@example.com',
      full_name: 'Inactive User',
      role: 'BSP',
      is_active: false
    };

    const result = await createUser(inactiveInput);

    expect(result.is_active).toEqual(false);
    expect(result.username).toEqual('inactiveuser');

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].is_active).toEqual(false);
  });

  it('should throw error for duplicate username', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same username
    const duplicateInput: CreateUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com',
      full_name: 'Different User',
      role: 'KKF',
      is_active: true
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should throw error for duplicate email', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      username: 'differentuser',
      email: 'test@example.com', // Same email
      full_name: 'Different User',
      role: 'DAU',
      is_active: true
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should set created_at and updated_at timestamps', async () => {
    const beforeCreate = new Date();
    const result = await createUser(testInput);
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});