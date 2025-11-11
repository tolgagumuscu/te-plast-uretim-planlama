// Helper to robustly parse various date/time formats from the Excel file
export const parseGanttDate = (dateInput: string | Date | null | undefined): Date | null => {
  if (dateInput instanceof Date) {
    return dateInput;
  }

  // Handle number type which might come from JSON if not converted to string first
  if (typeof dateInput === 'number') {
    dateInput = String(dateInput);
  }

  if (typeof dateInput !== 'string' || !dateInput.trim()) {
    return null;
  }

  try {
    const parts = dateInput.split(' ');
    const datePart = parts[0];

    if (!datePart) return null;

    // Use regex to be flexible with separators (., /, -) and enforce d/m/y format.
    const dateMatch = datePart.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    
    if (!dateMatch) {
      // If regex fails, check if it's an Excel serial date number
      const serial = parseFloat(dateInput);
      if (!isNaN(serial) && serial > 0) {
        // Excel serial date to JS date conversion.
        // The number 25569 is days between 1900-01-01 and 1970-01-01, adjusted for Excel's 1900 leap year bug.
        const date = new Date((serial - 25569) * 86400 * 1000);
        // The above calculation is in UTC, we need to adjust for the local timezone offset
        const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
        if (!isNaN(adjustedDate.getTime())) {
          return adjustedDate;
        }
      }
      
      // Fallback for other formats JS might understand (e.g., ISO)
      const parsed = new Date(dateInput);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    const [, dayStr, monthStr, yearStr] = dateMatch;
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    let year = parseInt(yearStr, 10);

    if (year < 100) {
      year += 2000;
    }

    if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    let hours = 0;
    let minutes = 0;
    const timePart = parts[1];

    if (timePart && timePart.includes(':')) {
      const timeComponents = timePart.split(':').map(Number);
      hours = timeComponents[0] || 0;
      minutes = timeComponents[1] || 0;
      if (isNaN(hours) || isNaN(minutes)) {
          hours = 0;
          minutes = 0;
      }
    }
    
    // Month is 0-indexed in JS Date. Parsing as D.M.Y.
    return new Date(year, month - 1, day, hours, minutes);
  } catch (e) {
    console.error("Failed to parse date string:", dateInput, e);
    return null;
  }
};

// Formats a JS Date object into the string format required by dhtmlx-gantt
export const formatGanttDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
};


// Formats a JS Date object into a consistent DD.MM.YYYY HH:mm:ss string for the AI
export const getFormattedDate = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
};

// Parses a downtime string (HH:mm:ss) into total hours.
export const parseDowntimeToHours = (timeStr: string | null | undefined): number => {
  if (!timeStr || typeof timeStr !== 'string') {
    return 0;
  }
  const parts = timeStr.split(':').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return 0;
  }
  const [hours, minutes, seconds] = parts;
  return hours + minutes / 60 + seconds / 3600;
};