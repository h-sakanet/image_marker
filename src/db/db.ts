import Dexie, { type Table } from 'dexie';

export interface Deck {
  id?: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Marker {
  x: number;
  y: number;
  width: number;
  height: number;
  groupId?: string;
  isLocked?: boolean;
}

export interface ImageItem {
  id?: number;
  deckId: number;
  imageData: Blob | string; // Base64 or Blob
  order: number;
  markers: Marker[];
}

export class ImageMarkerDB extends Dexie {
  decks!: Table<Deck>;
  images!: Table<ImageItem>;

  constructor() {
    super('ImageMarkerDB');
    this.version(1).stores({
      decks: '++id, title, createdAt, updatedAt',
      images: '++id, deckId, order' // markers are stored as object, not indexed
    });
  }
}

export const db = new ImageMarkerDB();
