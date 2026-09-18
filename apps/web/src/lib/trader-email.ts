export class TraderEmailConflictError extends Error {
  readonly existingPartnerId: number;

  constructor(existingPartnerId: number, message: string) {
    super(message);
    this.name = 'TraderEmailConflictError';
    this.existingPartnerId = existingPartnerId;
  }
}

export function traderEmailSignupDecision(
  existingPartnerId: number | null,
  currentPartnerId: number
): 'create' | 'reuse' | 'conflict' {
  if (existingPartnerId == null) return 'create';
  if (existingPartnerId === currentPartnerId) return 'reuse';
  return 'conflict';
}

export function traderEmailConflictMessage(
  existingPartnerId: number,
  currentPartnerId: number
) {
  if (existingPartnerId === currentPartnerId) {
    return 'A trader with this email already exists.';
  }
  return 'This email is already registered with another firm.';
}
