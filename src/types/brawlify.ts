export interface BrawlifyListResponse<T> {
  list: T[];
}

export interface BrawlifyRarity {
  id?: number;
  name?: string;
  color?: string;
}

export interface BrawlifyClass {
  id?: number;
  name?: string;
}

export interface BrawlifyBrawler {
  id: number;
  avatarId?: number;
  name: string;
  hash?: string;
  path?: string;
  released?: boolean;
  link?: string;
  imageUrl?: string;
  imageUrl2?: string;
  imageUrl3?: string;
  class?: BrawlifyClass;
  rarity?: BrawlifyRarity;
  unlock?: string;
  description?: string;
  starPowers?: { id: number; name: string; path?: string; imageUrl?: string }[];
  gadgets?: { id: number; name: string; path?: string; imageUrl?: string }[];
}

export interface BrawlifyGameMode {
  id: number;
  scId?: number;
  name: string;
  hash?: string;
  scHash?: string;
  disabled?: boolean;
  color?: string;
  bgColor?: string;
  title?: string;
  description?: string;
  shortDescription?: string;
  link?: string;
  imageUrl?: string;
  imageUrl2?: string;
  lastActive?: number;
}

export interface BrawlifyMap {
  id: number;
  new?: boolean;
  disabled?: boolean;
  name: string;
  hash?: string;
  link?: string;
  imageUrl?: string;
  credit?: string;
  environment?: {
    id?: number;
    name?: string;
    hash?: string;
    imageUrl?: string;
  };
  gameMode?: BrawlifyGameMode;
  lastActive?: number;
  dataUpdated?: number;
}

export interface BrawlifyEvent {
  slot?: {
    id?: number;
    name?: string;
    emoji?: string;
  };
  startTime?: string;
  endTime?: string;
  map?: BrawlifyMap;
  modifier?: {
    id?: number;
    name?: string;
  };
}

export interface BrawlifyEventsResponse {
  active: BrawlifyEvent[];
  upcoming: BrawlifyEvent[];
}

export interface BrawlifyIconsResponse {
  player: Record<string, { id: number; name?: string; imageUrl?: string; imageUrl2?: string }>;
  club: Record<string, { id: number; imageUrl?: string }>;
}
