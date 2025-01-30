export type FeedContext = {
  currentPage: string;
  pageIndex: number;
  items: number;
  responseTimes: number[];
  totalItemsQueuedForValidation: number;
  validatedItems: number;
  sleepMode?: boolean;
  timeToHarvestCompletion?: string;
};