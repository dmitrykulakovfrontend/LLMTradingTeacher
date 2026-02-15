import { NextRequest, NextResponse } from "next/server";

/**
 * Sanitizes a stock symbol by removing invalid characters
 */
export function sanitizeSymbol(symbol: string | null): string | null {
  if (!symbol) return null;
  const sanitized = symbol.replace(/[^a-zA-Z0-9.\-^]/g, "");
  return sanitized || null;
}

/**
 * Parses JSON body from request with error handling
 */
export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

/**
 * Creates a standardized error response
 */
export function errorResponse(message: string, status: number = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Validates that a required value exists
 */
export function validateRequired(value: unknown, fieldName: string): void {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
}

/**
 * Wraps an API route handler with error handling
 */
export function withErrorHandling<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T | { error: string }>> => {
    try {
      return await handler(request);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error("API Error:", message);
      return errorResponse(message, 500) as NextResponse<{ error: string }>;
    }
  };
}
