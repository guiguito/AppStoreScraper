import { Request } from 'express';
import { Timestamp } from 'firebase-admin/firestore';

export interface ValidatedRequest extends Request {
  validatedParams?: {
    lang: string;
    country: string;
  };
}

export interface BaseReview {
  id: string;
  userName: string;
  text: string;
  score: number;
  version?: string;
  url?: string;
}

export interface PlayStoreReview extends BaseReview {
  date: string;
}

export interface AppStoreReview extends BaseReview {
  updated: string;
  title?: string;
}

export type GooglePlayReview = PlayStoreReview

export interface UnifiedReview {
  id: string;
  userName: string;
  text: string;
  score: number;
  version?: string;
  updated: string;
  url?: string;
  title: string;
  rating: number;
  store: 'appstore' | 'playstore';
  userUrl?: string;
  content?: string;
}

export interface GooglePlayApp {
  id: string;
  appId: string;
  title: string;
  description: string;
  summary: string;
  url: string;
  icon: string;
  developer: string;
  developerId: string;
  score: number;
  reviews: number;
  price: number;
  free: boolean;
  currency: string;
  scoreText: string;
  priceText: string;
  genre: string;
  genreId: string;
  familyGenre?: string;
  familyGenreId?: string;
  headerImage: string;
  screenshots: string[];
  video?: string;
  videoImage?: string;
  contentRating: string;
  adSupported: boolean;
  released: string;
  updated: number;
  version: string;
  recentChanges?: string;
  comments: string[];
  size?: string;
  androidVersion?: string;
  androidVersionText: string;
  developerInternalID?: string;
  developerEmail?: string;
  developerWebsite?: string;
  developerAddress?: string;
  privacyPolicy?: string;
  developerInternal?: boolean;
  preregister?: boolean;
  installsText?: string;
  minInstalls?: number;
  maxInstalls?: number;
  ratings?: number;
  histogram?: { [key: string]: number };
  sale?: boolean;
  saleTime?: string;
  originalPrice?: number;
  saleText?: string;
  offersIAP?: boolean;
  inAppProductPrice?: string;
  editorsChoice?: boolean;
  features?: {
    [key: string]: boolean;
  };
  similarApps?: string[];
  moreByDeveloper?: string[];
  appStoreUrl?: string;
  categories?: string[];
}

export interface RatingHistogramEntry {
  count: number;
  percentage: string;
}

export interface AppRatings {
  total: number;
  average: number;
  histogram: Record<string, RatingHistogramEntry>;
}

export interface UnifiedAppResult {
  id: string;
  title: string;
  icon: string;
  developer: string;
  developerId?: string;
  url: string;
  description: string;
  score: number;
  reviews?: number;
  ratings: AppRatings;
  price?: number;
  free?: boolean;
  currency?: string;
  version?: string;
  released?: string;
  updated?: string;
  size?: string;
  contentRating?: string;
  screenshots?: string[];
  genre?: string;
  genreId?: string | number;
  store: 'appstore' | 'playstore';
  // Privacy data from App Store
  privacyData?: {
    dataCategories?: Array<{
      category: string;
      purposes: string[];
      data: string[];
    }>;
    privacyTypes?: string[];
    privacyDetails?: any;
  };
  // Available countries and languages
  availableCountries?: Array<{
    code: string;
    name: string;
  }>;
  supportedLanguages?: string[];
}

export interface App {
  id: string;
  title: string;
  icon: string;
  developer: string;
  url: string;
  description?: string;
  score?: number;
}

export interface PlayStoreResult extends UnifiedAppResult {
  store: 'playstore';
  appId: string;
  description: string;
  reviews: number;
  price?: number;
  free: boolean;
  currency?: string;
}

export interface AppStoreResult extends UnifiedAppResult {
  store: 'appstore';
}

export interface CachedSentimentAnalysis {
  appId: string;
  country: string;
  analysis: SentimentAnalysisResponse;
  lastUpdated: Timestamp;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface SentimentAnalysisResponse {
  SentimentDistribution: {
    Positive: number;
    Neutral: number;
    Negative: number;
  };
  Positive: number;
  Neutral: number;
  Negative: number;
  TopIssues: Array<{
    Issue: string;
    Mentions: number;
    Description: string;
  }>;
  Insights: {
    OverallSentiment: string;
    KeyPatterns: string[];
  };
}

export const enum PlayStoreCategoryEnum {
  APPLICATION = 'APPLICATION',
  ANDROID_WEAR = 'ANDROID_WEAR',
  ART_AND_DESIGN = 'ART_AND_DESIGN',
  AUTO_AND_VEHICLES = 'AUTO_AND_VEHICLES',
  BEAUTY = 'BEAUTY',
  BOOKS_AND_REFERENCE = 'BOOKS_AND_REFERENCE',
  BUSINESS = 'BUSINESS',
  COMICS = 'COMICS',
  COMMUNICATION = 'COMMUNICATION',
  DATING = 'DATING',
  EDUCATION = 'EDUCATION',
  ENTERTAINMENT = 'ENTERTAINMENT',
  EVENTS = 'EVENTS',
  FINANCE = 'FINANCE',
  FOOD_AND_DRINK = 'FOOD_AND_DRINK',
  HEALTH_AND_FITNESS = 'HEALTH_AND_FITNESS',
  HOUSE_AND_HOME = 'HOUSE_AND_HOME',
  LIBRARIES_AND_DEMO = 'LIBRARIES_AND_DEMO',
  LIFESTYLE = 'LIFESTYLE',
  MAPS_AND_NAVIGATION = 'MAPS_AND_NAVIGATION',
  MEDICAL = 'MEDICAL',
  MUSIC_AND_AUDIO = 'MUSIC_AND_AUDIO',
  NEWS_AND_MAGAZINES = 'NEWS_AND_MAGAZINES',
  PARENTING = 'PARENTING',
  PERSONALIZATION = 'PERSONALIZATION',
  PHOTOGRAPHY = 'PHOTOGRAPHY',
  PRODUCTIVITY = 'PRODUCTIVITY',
  SHOPPING = 'SHOPPING',
  SOCIAL = 'SOCIAL',
  SPORTS = 'SPORTS',
  TOOLS = 'TOOLS',
  TRAVEL_AND_LOCAL = 'TRAVEL_AND_LOCAL',
  VIDEO_PLAYERS = 'VIDEO_PLAYERS',
  WEATHER = 'WEATHER',
  GAME = 'GAME',
  GAME_ACTION = 'GAME_ACTION',
  GAME_ADVENTURE = 'GAME_ADVENTURE',
  GAME_ARCADE = 'GAME_ARCADE',
  GAME_BOARD = 'GAME_BOARD',
  GAME_CARD = 'GAME_CARD',
  GAME_CASINO = 'GAME_CASINO',
  GAME_CASUAL = 'GAME_CASUAL',
  GAME_EDUCATIONAL = 'GAME_EDUCATIONAL',
  GAME_MUSIC = 'GAME_MUSIC',
  GAME_PUZZLE = 'GAME_PUZZLE',
  GAME_RACING = 'GAME_RACING',
  GAME_ROLE_PLAYING = 'GAME_ROLE_PLAYING',
  GAME_SIMULATION = 'GAME_SIMULATION',
  GAME_SPORTS = 'GAME_SPORTS',
  GAME_STRATEGY = 'GAME_STRATEGY',
  GAME_TRIVIA = 'GAME_TRIVIA',
  GAME_WORD = 'GAME_WORD',
  FAMILY = 'FAMILY'
}
