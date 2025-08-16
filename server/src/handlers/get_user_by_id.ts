import { db } from '../db';
import { usersTable } from '../db/schema';
import { type IdInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserById = async (input: IdInput): Promise<User | null> => {
  try {
    // Query user by ID
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    // Return null if user not found
    if (result.length === 0) {
      return null;
    }

    // Return the user (no numeric conversions needed for this schema)
    return result[0];
  } catch (error) {
    console.error('Get user by ID failed:', error);
    throw error;
  }
};