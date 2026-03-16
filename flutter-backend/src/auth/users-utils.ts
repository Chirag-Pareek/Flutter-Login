// src/auth/users-utils.ts

// Auto-derive name from email prefix (first 7 alphanumeric chars)
export function deriveNameFromEmail(email: string): string {
  const prefix = email.split('@')[0];
  const clean = prefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7);
  if (!clean) return 'Alias';
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

// Extract first name from Google profile - WITH SAFETY CHECKS ✅
export function deriveNameFromGoogle(profile: any): string {
  try {
    // Try to get name from various sources (safely)
    const fullName = 
      profile.displayName || 
      profile.name?.givenName || 
      profile.name?.familyName || 
      '';
    
    // Get first name from full name
    if (fullName && fullName.trim().length > 0) {
      const firstName = fullName.trim().split(' ')[0];
      if (firstName && firstName.length > 0) {
        return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
      }
    }
    
    // Fallback: try to derive from email (safely)
    const emails = profile.emails;
    if (Array.isArray(emails) && emails.length > 0 && emails[0]?.value) {
      return deriveNameFromEmail(emails[0].value);
    }
    
    // Final fallback
    return 'Alias';
    
  } catch (error) {
    console.warn('Error deriving name from Google profile:', error);
    return 'Alias';
  }
}
