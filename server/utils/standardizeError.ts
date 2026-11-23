/**
 * Creates a standardized error object from various error types
 * This helps provide consistent error formatting across the application
 */
export const standardizeError = (error: unknown): Error => {
  // If error is already an Error instance, return it directly
  if (error instanceof Error) {
    return error;
  }

  // If error is a string, create a new Error with that message
  if (typeof error === "string") {
    return new Error(error);
  }

  // If error is an object, try to extract useful information
  if (typeof error === "object" && error !== null) {
    const message = (error as any).message || JSON.stringify(error);
    const newError = new Error(message);
    // Add original error as property for debugging
    (newError as any).originalError = error;
    return newError;
  }

  // Fallback for other error types
  return new Error(`Unknown error: ${String(error)}`);
};
