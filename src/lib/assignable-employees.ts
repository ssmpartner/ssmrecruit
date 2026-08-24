import type { Employee } from './mock-data';

/**
 * Rollen, die grundsätzlich KEINE Lead-Zuweisungen erhalten dürfen
 * und deshalb auch nicht in Zuweisungs-Dropdowns erscheinen.
 */
export const NON_ASSIGNABLE_ROLES = ['hr', 'geschaeftsleitung'];

export function isAssignableEmployee(employee: Employee | undefined | null): boolean {
  if (!employee) return false;
  return !NON_ASSIGNABLE_ROLES.includes((employee.role || '').toLowerCase());
}

/** Filtert HR- und Geschäftsleitungs-Accounts aus einer Mitarbeiterliste. */
export function assignableEmployees(employees: Employee[] = []): Employee[] {
  return employees.filter(isAssignableEmployee);
}
