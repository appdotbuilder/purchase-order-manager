import { db } from '../db';
import { usersTable } from '../db/schema';
import { type IdInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteUser = async (input: IdInput): Promise<{ success: boolean }> => {
  try {
    // Check if user exists first
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .limit(1)
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Delete the user
    const result = await db.delete(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
};