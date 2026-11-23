import { collapseRows, isLikelyDev } from './presentation.js';
import { safetyCheck } from './safety.js';

/** Display only actionable, current-user listeners. Never a substitute for the
 * final identity/socket revalidation in terminatePort(). */
export function manageablePorts(rows, { uid = process.getuid?.(), ancestors = new Set() } = {}) {
  return collapseRows(rows)
    .filter(row => safetyCheck(row, { uid, ancestors, allRows: rows }) === null)
    .sort((a, b) => Number(isLikelyDev(b)) - Number(isLikelyDev(a)) || a.port - b.port || a.name.localeCompare(b.name));
}
