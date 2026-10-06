export class UserFacingError extends Error {}

export function userFacingMessage(error: unknown): string {
  return error instanceof UserFacingError
    ? error.message
    : "LinguaLoom could not complete the request. Please try again.";
}
