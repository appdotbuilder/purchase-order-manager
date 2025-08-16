import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // First, check if the user exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUsers.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Prepare update data - only include fields that are provided
    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    
    if (input.username !== undefined) {
      updateData.username = input.username;
    }
    
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    
    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }
    
    if (input.role !== undefined) {
      updateData.role = input.role;
    }
    
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // If no fields to update, return the existing user
    if (Object.keys(updateData).length === 1) { // Only updated_at
      return existingUsers[0];
    }

    // Update the user
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};