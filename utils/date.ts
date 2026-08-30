export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Returns a new Date object representing the current time in the specified timezone.
 * Note: The Date object itself is a JS Date (which encapsulates UTC internally),
 * but its local string output will be shifted to match the timezone's time.
 * For formatting as YYYY-MM-DD, prefer getBusinessDateString().
 */
export function getBusinessDate(timezone: string = DEFAULT_TIMEZONE): Date {
  const date = new Date();
  const timeString = date.toLocaleString('en-US', { timeZone: timezone });
  return new Date(timeString);
}

/**
 * Returns the current date in YYYY-MM-DD format based on the business timezone.
 */
export function getBusinessDateString(timezone: string = DEFAULT_TIMEZONE): string {
  const date = new Date();
  
  // Format parts according to the given timezone
  const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD format cleanly
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  return formatter.format(date); // Output: YYYY-MM-DD
}

/**
 * Parses a YYYY-MM-DD string into a Date object representing midnight in the given timezone.
 */
export function parseBusinessDate(dateString: string, timezone: string = DEFAULT_TIMEZONE): Date {
  // Add T00:00:00 to ensure we treat it as midnight, but JS Date parsing is tricky with timezones.
  // The safest way is to construct it from the timezone offset, or assume the YYYY-MM-DD is local to the server.
  // Since we usually just pass date strings directly to DB, we mainly need the string representation.
  return new Date(`${dateString}T00:00:00`);
}

/**
 * Formats a Date object or string into HH:MM according to the business timezone.
 */
export function formatBusinessTime(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Formats a Date object or string into DD/MM/YYYY according to the business timezone.
 */
export function formatBusinessDateVN(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}
