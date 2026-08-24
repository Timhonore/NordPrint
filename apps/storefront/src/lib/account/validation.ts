/**
 * Field rules shared by the form and the server actions.
 *
 * Deliberately not in `actions.ts`: a `"use server"` module may only export
 * async functions, and the form needs these synchronously so it can tell the
 * customer before the round trip.
 *
 * The server validates again regardless — client-side validation is a
 * courtesy, never a control.
 */

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Adgangskoden skal være mindst 8 tegn.";
  if (password.length > 128) return "Adgangskoden må højst være 128 tegn.";
  return null;
}

export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Indtast en gyldig e-mailadresse.";
  return null;
}
