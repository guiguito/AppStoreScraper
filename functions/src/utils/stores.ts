export const STORES = {
  APP_STORE: 'appstore',
  PLAY_STORE: 'playstore',
} as const;

export type StoreType = typeof STORES[keyof typeof STORES];

export function isValidStore(store: string): store is StoreType {
  return Object.values(STORES).includes(store as StoreType);
}
