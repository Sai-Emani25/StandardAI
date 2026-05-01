import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { stemmer } from 'stemmer';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMs(ms: number): string {
  return `${ms.toFixed(0)}MS`;
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour12: false }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
}

export function getQueryStems(text: string): Set<string> {
  const stopwords = new Set([
    'for', 'the', 'and', 'with', 'needs', 'materials', 'buildings', 
    'construction', 'standard', 'requirement', 'this', 'that', 
    'these', 'those', 'highly', 'very', 'only', 'would', 'should',
    'could', 'where', 'when', 'which', 'from', 'also'
  ]);
  
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopwords.has(word))
      .map(word => stemmer(word))
  );
}
