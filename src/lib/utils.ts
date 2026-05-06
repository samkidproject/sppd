import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert number to Roman numerals
 */
export function toRoman(num: number): string {
  const roman: { [key: number]: string } = {
    12: 'XII', 11: 'XI', 10: 'X', 9: 'IX', 8: 'VIII', 7: 'VII',
    6: 'VI', 5: 'V', 4: 'IV', 3: 'III', 2: 'II', 1: 'I'
  };
  return roman[num] || 'I';
}
