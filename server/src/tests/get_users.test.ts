import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUsers: CreateUserInput[] = [
  {
    username: 'admin_user',
    email: 'admin@test.com',
    full_name: 'Admin User',
    role: 'ADMIN',
    is_active: true
  },
  {
    username: 'unit_kerja_user',
    email: 'unit@test.com',
    full_name: 'Unit Kerja User',
    role: 'UNIT_KERJA',
    is_active: true
  },
  {
    username: 'inactive_user',
    email: 'inactive@test.com',
    full_name: 'Inactive User',
    role: 'BSP',
    is_active: false
  }
];

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all users from database', async () => {
    // Create test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    expect(result.map(u => u.username)).toEqual(['admin_user', 'unit_kerja_user', 'inactive_user']);
    expect(result.map(u => u.email)).toEqual(['admin@test.com', 'unit@test.com', 'inactive@test.com']);
  });

  it('should return users with correct field types', async () => {
    // Create single test user
    await db.insert(usersTable)
      .values([testUsers[0]])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    
    const user = result[0];
    expect(typeof user.id).toBe('number');
    expect(typeof user.username).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.full_name).toBe('string');
    expect(typeof user.role).toBe('string');
    expect(typeof user.is_active).toBe('boolean');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should return users with all expected fields', async () => {
    // Create test user
    await db.insert(usersTable)
      .values([testUsers[0]])
      .execute();

    const result = await getUsers();
    const user = result[0];

    // Check all required fields exist
    expect(user.id).toBeDefined();
    expect(user.username).toEqual('admin_user');
    expect(user.email).toEqual('admin@test.com');
    expect(user.full_name).toEqual('Admin User');
    expect(user.role).toEqual('ADMIN');
    expect(user.is_active).toBe(true);
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should return users with different roles and statuses', async () => {
    // Create all test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    // Check we have users with different roles
    const roles = result.map(u => u.role);
    expect(roles).toContain('ADMIN');
    expect(roles).toContain('UNIT_KERJA');
    expect(roles).toContain('BSP');

    // Check we have both active and inactive users
    const activeStatuses = result.map(u => u.is_active);
    expect(activeStatuses).toContain(true);
    expect(activeStatuses).toContain(false);
  });

  it('should maintain database consistency', async () => {
    // Create test users
    const insertResult = await db.insert(usersTable)
      .values(testUsers)
      .returning()
      .execute();

    const result = await getUsers();

    // Should return same number of users as inserted
    expect(result).toHaveLength(insertResult.length);
    
    // IDs should match what was inserted
    const insertedIds = insertResult.map(u => u.id).sort();
    const fetchedIds = result.map(u => u.id).sort();
    expect(fetchedIds).toEqual(insertedIds);
  });

  it('should handle SUPERADMIN role correctly', async () => {
    const superAdminUser: CreateUserInput = {
      username: 'superadmin',
      email: 'super@test.com',
      full_name: 'Super Admin',
      role: 'SUPERADMIN',
      is_active: true
    };

    await db.insert(usersTable)
      .values([superAdminUser])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].role).toEqual('SUPERADMIN');
    expect(result[0].username).toEqual('superadmin');
  });
});