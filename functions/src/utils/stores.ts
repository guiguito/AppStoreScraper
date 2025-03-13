export const STORES = {
  APP_STORE: 'appstore',
  PLAY_STORE: 'playstore',
} as const;

// Collection type constants
export const COLLECTION_TYPES = {
  CATEGORY: 'category',
  DEVELOPER: 'developer',
  COLLECTION: 'collection',
  NEW_APPLICATIONS: 'newapplications',
  NEW_PAID_APPLICATIONS: 'newpaidapplications',
  NEW_FREE_APPLICATIONS: 'newfreeapplications',
  TOP_GROSSING_APPLICATIONS: 'topgrossingapplications',
  TOP_PAID_APPLICATIONS: 'toppaidapplications',
  TOP_FREE_APPLICATIONS: 'topfreeapplications',
  TOP_SELLING_FREE: 'topselling_free',
  TOP_SELLING_PAID: 'topselling_paid',
  TOP_GROSSING: 'topgrossing',
} as const;

export type StoreType = typeof STORES[keyof typeof STORES];

export function isValidStore(store: string): store is StoreType {
  return Object.values(STORES).includes(store as StoreType);
}
