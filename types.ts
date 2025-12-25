export type ProductCategory = 
  | 'TOP' | 'DRESS' | 'TROUSER' | 'KURTI' | 'T-SHIRT' 
  | 'SHIRT' | 'SKIRT' | 'JACKET' | 'OTHER';

export interface ColorDefinition {
  name: string;
  hex: string;
}

export interface AppSettings {
  category: ProductCategory;
  targetColors: ColorDefinition[];
  fabricType: string;
  fabricAwareness: boolean;
  printProtection: boolean;
  colorAccuracy: boolean;
  edgePrecision: boolean;
}

export interface ProcessedResult {
  color: ColorDefinition;
  url: string;
}

export interface ProcessedImage {
  id: string;
  originalUrl: string; // Base64 or Object URL
  results: ProcessedResult[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMsg?: string;
  activeResultIndex?: number; // UI state for which result is currently showing
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'TOP', 'DRESS', 'TROUSER', 'KURTI', 'T-SHIRT', 'SHIRT', 'SKIRT', 'JACKET', 'OTHER'
];

export const COLOR_PRESETS: ColorDefinition[] = [
  { name: 'Deep Wine Maroon', hex: '#6A1F2B' },
  { name: 'Rust Orange', hex: '#B7410E' },
  { name: 'Sage Green', hex: '#9CAF88' },
  { name: 'Mocha Brown', hex: '#6F4E37' },
  { name: 'Classic Blue', hex: '#0F4C81' },
  { name: 'Emerald', hex: '#009B77' },
  { name: 'Charcoal', hex: '#36454F' },
  { name: 'Soft Pink', hex: '#FFD1DC' },
];