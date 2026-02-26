// Auto-derive name from email prefix (first 5 alphanumeric chars)
export function deriveNameFromEmail(email: string): string {
  const prefix = email.split('@')[0];
  const clean = prefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7);
  if (!clean) return 'Alias';
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

// Extract first name from Google profile
export function deriveNameFromGoogle(profile: any): string {
  const fullName = profile.displayName || profile.name?.givenName || '';
  const firstName = fullName.split(' ')[0];
  return firstName || deriveNameFromEmail(profile.emails[0].value);
}