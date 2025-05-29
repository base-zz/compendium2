/**
 * Convert a value between metric and imperial units
 * @param value - The value to convert
 * @param unit - The unit of the value (e.g., 'm', 'ft', 'm/s', 'knots')
 * @param useImperial - Whether to convert to imperial units
 * @returns The converted value
 */
export function convertByPreference(value: number, unit: string, useImperial: boolean): number;
