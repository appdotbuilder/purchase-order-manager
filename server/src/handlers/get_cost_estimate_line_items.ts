import { type IdInput, type CostEstimateLineItem } from '../schema';

export async function getCostEstimateLineItems(input: IdInput): Promise<CostEstimateLineItem[]> {
    // This is a placeholder implementation! Real code should be implemented here.
    // The goal of this handler is fetching all line items for a specific cost estimate.
    // Only BSP and DAU roles can access line items.
    // Input.id represents the cost_estimate_id.
    return [];
}