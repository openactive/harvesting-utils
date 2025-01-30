/**
 * In-progress information about the feed being harvested.
 */
export type FeedContext = {
  /**
   * URL of the current page being harvested.
   */
  currentPage: string;
  /**
   * Index of the current page being harvested (the first page is 0, then 1,
   * etc).
   */
  pageIndex: number;
  /**
   * Number of items that have been harvested so far (in total).
   */
  items: number;
  /**
   * Array of the the response times for the last 5 pages.
   * The last item is the most recent response time.
   */
  responseTimes: number[];
  // TODO these fields are not used in this project, but are instead used in the
  // Broker Microservice. They should be moved from here and into that project.
  totalItemsQueuedForValidation: number;
  validatedItems: number;
  sleepMode?: boolean;
  timeToHarvestCompletion?: string;
};