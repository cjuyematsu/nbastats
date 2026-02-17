/**
 * Anonymous User Identification Utility
 *
 * Provides a simple localStorage-based identifier for anonymous users
 * to enable voting without creating an account.
 *
 * Identifier persists for 7 days before expiring.
 */

const STORAGE_KEY = 'anonymous_vote_id';
const EXPIRATION_DAYS = 7;

interface StoredAnonymousId {
  id: string;
  expires: string;
}

/**
 * Gets or creates an anonymous identifier for the current user.
 * The identifier is stored in localStorage and persists for 7 days.
 *
 * @returns A unique anonymous identifier string
 */
export function getAnonymousId(): string {
  // Check for existing ID
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      const parsed: StoredAnonymousId = JSON.parse(stored);

      // Check if expired
      if (new Date(parsed.expires) > new Date()) {
        return parsed.id;
      }
    } catch (error) {
      console.error('Error parsing stored anonymous ID:', error);
      // Continue to generate new ID
    }
  }

  // Generate new ID
  const newId = generateNewId();
  const expires = new Date();
  expires.setDate(expires.getDate() + EXPIRATION_DAYS);

  // Store for future use
  const storageData: StoredAnonymousId = {
    id: newId,
    expires: expires.toISOString()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));

  return newId;
}

/**
 * Generates a new anonymous identifier.
 * Format: anon_{timestamp}_{random}
 *
 * @returns A newly generated anonymous identifier
 */
function generateNewId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 11); // 9 characters
  return `anon_${timestamp}_${random}`;
}

/**
 * Clears the stored anonymous identifier.
 * Useful for testing or allowing users to reset their anonymous identity.
 */
export function clearAnonymousId(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Checks if an anonymous ID exists and is valid.
 *
 * @returns true if a valid anonymous ID exists, false otherwise
 */
export function hasValidAnonymousId(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return false;
  }

  try {
    const parsed: StoredAnonymousId = JSON.parse(stored);
    return new Date(parsed.expires) > new Date();
  } catch {
    return false;
  }
}
