
export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';

export interface AdData {
  headline: string;
  headlineFont: string;
  headlineSize: string;
  headlineLineHeight: string;
  subheadline: string;
  subheadlineFont: string;
  subheadlineSize: string;
  subheadlineLineHeight: string;
  cta: string;
  ctaFont: string;
  ctaSize: string;
  imageUrl: string;
  theme: 'dark' | 'gold' | 'minimal';
  aspectRatio: AspectRatio;
  showBadge: boolean;
  promptStrategy: string;
}

export interface GenerationStatus {
  loading: boolean;
  error: string | null;
}
