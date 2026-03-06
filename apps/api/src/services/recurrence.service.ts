import rrulePkg from 'rrule'
const { RRule } = rrulePkg

/**
 * Compute the next occurrence of an rrule after a given date.
 * @param rruleStr RFC 5545 RRULE string (without DTSTART)
 * @param dtstart The DTSTART anchor for the rule
 * @param after Compute the occurrence after this date
 * @returns Next occurrence Date, or null if the recurrence is exhausted
 */
export function computeNextOccurrence(
  rruleStr: string,
  dtstart: Date,
  after: Date,
): Date | null {
  try {
    const options = RRule.parseString(rruleStr)
    const rule = new RRule({ ...options, dtstart })
    return rule.after(after, false)
  } catch (err) {
    console.error('Failed to compute next occurrence:', err)
    return null
  }
}

/**
 * Human-readable description of an rrule string
 */
export function describeRRule(rruleStr: string, dtstart: Date): string {
  try {
    const options = RRule.parseString(rruleStr)
    const rule = new RRule({ ...options, dtstart })
    return rule.toText()
  } catch {
    return rruleStr
  }
}
