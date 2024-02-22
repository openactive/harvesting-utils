export type FeedContext = {
  currentPage: string;
  pages: number;
  items: number;
  responseTimes: number[];
  totalItemsQueuedForValidation: number;
  validatedItems: number;
  sleepMode?: boolean;
  timeToHarvestCompletion?: string;

  _progressbar?: any; // Underscore prefix hides this value from /status page
};