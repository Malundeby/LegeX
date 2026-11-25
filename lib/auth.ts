/**
 * Only allow redirects to paths inside this app. Blocks "//evil.com",
 * "/\\evil.com" and absolute URLs, which would otherwise turn ?next= into an
 * open redirect.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

/** Translate the Supabase auth errors users actually see into Norwegian. */
export function authErrorMessage(message: string | undefined) {
  if (!message) return "Noe gikk galt. Prøv igjen.";
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) return "Feil e-post eller passord.";
  if (m.includes("email not confirmed"))
    return "E-posten er ikke bekreftet ennå. Sjekk innboksen din for bekreftelseslenken.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Det finnes allerede en konto med denne e-posten. Logg inn, eller bruk «Glemt passord».";
  if (m.includes("password should be at least") || m.includes("password is too short"))
    return "Passordet må være minst 8 tegn.";
  if (m.includes("weak") || m.includes("pwned"))
    return "Passordet er for svakt eller kjent fra datalekkasjer. Velg et annet.";
  if (m.includes("same as the old") || m.includes("should be different"))
    return "Det nye passordet må være forskjellig fra det gamle.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return "For mange forsøk. Vent litt og prøv igjen.";
  if (m.includes("invalid email") || m.includes("unable to validate email"))
    return "Ugyldig e-postadresse.";
  if (m.includes("session") && m.includes("missing"))
    return "Lenken er utløpt. Be om en ny.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Fikk ikke kontakt med serveren. Sjekk nettforbindelsen.";

  return message;
}

export const MIN_PASSWORD_LENGTH = 8;
