export type ProductCategory = 
  | 'TOP' | 'DRESS' | 'TROUSER' | 'KURTI' | 'T-SHIRT' 
  | 'SHIRT' | 'SKIRT' | 'JACKET' | 'OTHER';

export type ImageSize = '1K' | '2K' | '4K';
export type ModelTier = 'flash' | 'pro';

export interface ColorDefinition {
  name: string;
  hex: string;
  category?: string;
}

export interface AppSettings {
  category: ProductCategory;
  targetColors: ColorDefinition[];
  fabricType: string;
  fabricAwareness: boolean;
  printProtection: boolean;
  colorAccuracy: boolean;
  edgePrecision: boolean;
  batchConsistency: boolean;
  modelTier: ModelTier; // Added model selection
}

export interface GenerationSettings {
  prompt: string;
  imageSize: ImageSize;
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
}

export interface ProcessedResult {
  color?: ColorDefinition;
  url: string;
  prompt?: string;
  size?: ImageSize;
}

export interface ProcessedImage {
  id: string;
  originalUrl?: string;
  results: ProcessedResult[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMsg?: string;
  activeResultIndex?: number;
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'TOP', 'DRESS', 'TROUSER', 'KURTI', 'T-SHIRT', 'SHIRT', 'SKIRT', 'JACKET', 'OTHER'
];

export const COLOR_LIBRARY: Record<string, ColorDefinition[]> = {
  'Essentials': [
    { name: 'Pure White', hex: '#FFFFFF' },
    { name: 'Midnight Black', hex: '#1A1A1A' },
    { name: 'Heather Gray', hex: '#9B9B9B' },
    { name: 'Navy Blue', hex: '#000080' },
  ],
  'Fashion Tones': [
    { name: 'Deep Wine', hex: '#6A1F2B' },
    { name: 'Rust Orange', hex: '#B7410E' },
    { name: 'Sage Green', hex: '#9CAF88' },
    { name: 'Mocha Brown', hex: '#6F4E37' },
    { name: 'Soft Pink', hex: '#FFD1DC' },
  ],
  'Pantone Inspired': [
    { name: 'Peach Fuzz', hex: '#FFBE98' },
    { name: 'Horizon Blue', hex: '#7E9BB8' },
    { name: 'Bistro Green', hex: '#3D4A3D' },
    { name: 'Spicy Mustard', hex: '#D8AE47' },
    { name: 'Crimson', hex: '#B80F0A' },
  ],
  'Earth Palette': [
    { name: 'Terracotta', hex: '#E2725B' },
    { name: 'Olive Drab', hex: '#6B8E23' },
    { name: 'Sandstone', hex: '#D2B48C' },
    { name: 'Slate', hex: '#708090' },
  ]
};

export const COLOR_PRESETS: ColorDefinition[] = Object.values(COLOR_LIBRARY).flat();