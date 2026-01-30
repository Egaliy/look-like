// Локальное хранилище для работы без базы данных
// Использует localStorage для персистентности между сессиями

interface ReviewSet {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ImageAsset {
  id: string;
  reviewSetId: string;
  url: string;
  order: number;
  title: string | null;
  createdAt: string;
}

interface ReviewLink {
  id: string;
  token: string;
  reviewSetId: string;
  maxSessions: number;
  allowResume: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Rating {
  id: string;
  reviewLinkId: string;
  imageId: string;
  decision: "like" | "dislike";
  timestamp: string;
  orderIndex: number;
  sessionId: string | null;
}

class LocalStorage {
  private getStorageKey(key: string) {
    return `likethat_${key}`;
  }

  private getData<T>(key: string): T[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(this.getStorageKey(key));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setData<T>(key: string, data: T[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(data));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }

  // Review Sets
  getReviewSets(): ReviewSet[] {
    return this.getData<ReviewSet>("reviewSets");
  }

  createReviewSet(data: Omit<ReviewSet, "id" | "createdAt" | "updatedAt">): ReviewSet {
    const sets = this.getReviewSets();
    const newSet: ReviewSet = {
      ...data,
      id: `set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sets.push(newSet);
    this.setData("reviewSets", sets);
    return newSet;
  }

  getReviewSet(id: string): ReviewSet | null {
    const sets = this.getReviewSets();
    return sets.find((s) => s.id === id) || null;
  }

  // Image Assets
  getImages(reviewSetId: string): ImageAsset[] {
    const images = this.getData<ImageAsset>("images");
    return images.filter((img) => img.reviewSetId === reviewSetId);
  }

  createImage(data: Omit<ImageAsset, "id" | "createdAt">): ImageAsset {
    const images = this.getData<ImageAsset>("images");
    const newImage: ImageAsset = {
      ...data,
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    images.push(newImage);
    this.setData("images", images);
    return newImage;
  }

  // Review Links
  getLinks(reviewSetId: string): ReviewLink[] {
    const links = this.getData<ReviewLink>("links");
    return links.filter((link) => link.reviewSetId === reviewSetId);
  }

  createLink(data: Omit<ReviewLink, "id" | "token" | "createdAt" | "updatedAt">): ReviewLink {
    const links = this.getData<ReviewLink>("links");
    // Генерируем токен на клиенте
    const array = new Uint8Array(32);
    if (typeof window !== "undefined" && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback для старых браузеров
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    const newLink: ReviewLink = {
      ...data,
      id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      token,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    links.push(newLink);
    this.setData("links", links);
    return newLink;
  }

  getLinkByToken(token: string): ReviewLink | null {
    const links = this.getData<ReviewLink>("links");
    return links.find((link) => link.token === token) || null;
  }

  // Ratings
  getRatings(reviewLinkId: string): Rating[] {
    const ratings = this.getData<Rating>("ratings");
    return ratings.filter((r) => r.reviewLinkId === reviewLinkId);
  }

  upsertRating(data: Omit<Rating, "id" | "timestamp">): Rating {
    const ratings = this.getData<Rating>("ratings");
    const existing = ratings.find(
      (r) => r.reviewLinkId === data.reviewLinkId && r.imageId === data.imageId
    );

    if (existing) {
      const updated = { ...existing, ...data, timestamp: new Date().toISOString() };
      const index = ratings.indexOf(existing);
      ratings[index] = updated;
      this.setData("ratings", ratings);
      return updated;
    } else {
      const newRating: Rating = {
        ...data,
        id: `rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
      ratings.push(newRating);
      this.setData("ratings", ratings);
      return newRating;
    }
  }
}

// Server-side: используем глобальное in-memory хранилище
// Данные сохраняются между запросами в рамках одного процесса Node.js
const globalStorage = {
  reviewSets: [] as ReviewSet[],
  images: [] as ImageAsset[],
  links: [] as ReviewLink[],
  ratings: [] as Rating[],
};

class InMemoryStorage {
  private get reviewSets() {
    return globalStorage.reviewSets;
  }
  private get images() {
    return globalStorage.images;
  }
  private get links() {
    return globalStorage.links;
  }
  private get ratings() {
    return globalStorage.ratings;
  }

  getReviewSets(): ReviewSet[] {
    return this.reviewSets;
  }

  createReviewSet(data: Omit<ReviewSet, "id" | "createdAt" | "updatedAt">): ReviewSet {
    const newSet: ReviewSet = {
      ...data,
      id: `set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalStorage.reviewSets.push(newSet);
    return newSet;
  }

  getReviewSet(id: string): ReviewSet | null {
    return this.reviewSets.find((s) => s.id === id) || null;
  }

  getImages(reviewSetId: string): ImageAsset[] {
    return this.images.filter((img) => img.reviewSetId === reviewSetId);
  }

  createImage(data: Omit<ImageAsset, "id" | "createdAt">): ImageAsset {
    const newImage: ImageAsset = {
      ...data,
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    globalStorage.images.push(newImage);
    return newImage;
  }

  getLinks(reviewSetId: string): ReviewLink[] {
    return this.links.filter((link) => link.reviewSetId === reviewSetId);
  }

  createLink(data: Omit<ReviewLink, "id" | "token" | "createdAt" | "updatedAt">): ReviewLink {
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const newLink: ReviewLink = {
      ...data,
      id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      token,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalStorage.links.push(newLink);
    return newLink;
  }

  getLinkByToken(token: string): ReviewLink | null {
    return this.links.find((link) => link.token === token) || null;
  }

  getRatings(reviewLinkId: string): Rating[] {
    return this.ratings.filter((r) => r.reviewLinkId === reviewLinkId);
  }

  upsertRating(data: Omit<Rating, "id" | "timestamp">): Rating {
    const existing = this.ratings.find(
      (r) => r.reviewLinkId === data.reviewLinkId && r.imageId === data.imageId
    );

    if (existing) {
      const updated = { ...existing, ...data, timestamp: new Date().toISOString() };
      const index = globalStorage.ratings.indexOf(existing);
      globalStorage.ratings[index] = updated;
      return updated;
    } else {
      const newRating: Rating = {
        ...data,
        id: `rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
      globalStorage.ratings.push(newRating);
      return newRating;
    }
  }
}

// Singleton для server-side
const inMemoryStorage = new InMemoryStorage();

export const storage =
  typeof window !== "undefined" ? new LocalStorage() : inMemoryStorage;

export type { ReviewSet, ImageAsset, ReviewLink, Rating };
