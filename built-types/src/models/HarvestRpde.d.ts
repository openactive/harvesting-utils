import { AxiosError } from 'axios';
import { FeedContext } from './FeedContext';
import { RpdePageProcessor } from './RpdePageProcessor';

// When this is more typed, turn this into HarvestRpdeArgs<T> when T is the type of `modified`. modified can etiher be
// string or number depending on if it is a lossless harvest or not.

export type HarvestRpdeArgs = {
  /**
   * Feed URL to harvest
   */
  baseUrl: string;
  /**
   * Unique identifier for feed within the dataset eg ScheduledSession
   */
  feedContextIdentifier: string;
  /**
   * Function that returns headers needed to make a request to the feed URL
   */
  headers: () => Promise<{ [key: string]: string }>;
  /**
   * Callback is called when a page (that is NOT the last page - for the last
   * page, see onReachedEndOfFeed) has been processed.
   *
   * It contains all the items in the page. Use this to process each item e.g.
   * store it, validate it, etc.
   */
  processPage: (args: {
    rpdePage: any,
    feedContextIdentifier: string;
    isInitialHarvestComplete: () => boolean;
    reqUrl: string;
    responseTime: number;
  }) => Promise<void>;
  /**
   * Callback is called when the feed's [last
   * page](https://openactive.io/realtime-paged-data-exchange/#last-page-definition)
   * has been (successfully) reached - and so when all items in the feed have
   * been processed..
   *
   * This is not the end of harvesting, as the feed will continue to be polled
   * afterwards for updates.
   *
   * This function may be called multiple times if new items are added after the
   * first time `harvestRPDE()` reaches the last page.
   */
  onReachedEndOfFeed: ({
    lastPageUrl: string,
    isInitialHarvestComplete: boolean,
    // feedContext: FeedContext,
    responseTime: number,
  }) => Promise<void>;
  /**
   * Callback is called when a request to the feed fails due to an HTTP error.
   *
   * Note that harvester will then retry the request afterwards, but you may
   * e.g. want to log the error here.
   */
  onRetryDueToHttpError?: (
    reqUrl: string,
    reqHeaders: Record<string, string>,
    resStatusCode: number,
    error: AxiosError,
    /** Number of milliseconds that the harvester will wait before the next retry */
    delayMs: number,
    /** Number of retries that have been attempted so far on this request */
    numberOfRetries: number
  ) => Promise<void>;
  /**
   * This callback (if provided) is called before each new request to the feed.
   *
   * This can be useful for these scenarios:
   *
   * 1. If the feed has a rate limit.
   * 2. To pause harvesting.
   */
  optionallyWaitBeforeNextRequest?: () => Promise<void>;
  /**
   * Is the feed an Orders feed?
   */
  isOrdersFeed: boolean;
  /**
   * Optional logging functions. Defaults will be used if not provided.
   */
  loggingFns?: {
    /** Normal logging. Default: console.log */
    log?: (message?: any, ...optionalParams: any[]) => void;
    /** Error logging. Default: console.error */
    logError?: (message?: any, ...optionalParams: any[]) => void;
    /** Error logging during the harvest. Default: console.error */
    logErrorDuringHarvest?: (message?: any, ...optionalParams: any[]) => void;
  };
  config?: {
    /**
     * How long to wait, in milliseconds, before re-polling a feed after
     * fetching the last page ([RPDE
     * spec](https://openactive.io/realtime-paged-data-exchange/#polling-for-near-real-time-updates)).
     * Default: `() => 500`
     */
    howLongToSleepAtFeedEnd?: () => number;
    /**
     * Whether to include extra logging around each feed request.
     */
    REQUEST_LOGGING_ENABLED?: boolean;
  };
  /**
   * @deprecated TODO this arg is only used by Broker Microservice, so that it
   *   can share its context with the harvestRPDE function. This should be cleaned
   *   up so that each project manages their own contexts separately.
   *
   * If provided, harvestRPDE will start with this FeedContext, rather than its
   * usual behaviour of creating its own FeedContext.
   */
  overrideContext?: FeedContext;
};

export type HarvestRpdeResponse = {
  error: {
    type: 'unexpected-non-http-error';
    reqUrl: string;
    reqHeaders: Record<string, string>;
    error: Error;
    message: string;
  } | {
    type: 'feed-not-found';
    reqUrl: string;
    reqHeaders: Record<string, string>;
    resStatusCode: number;
    error: Error;
  } | {
    type: 'retry-limit-exceeded-for-http-error';
    reqUrl: string;
    reqHeaders: Record<string, string>;
    resStatusCode: number;
    error: Error;
    numberOfRetries: number;
  } | {
    type: 'rpde-validation-error';
    reqUrl: string;
    reqHeaders: Record<string, string>;
    // TODO get the type for these
    rpdeValidationErrors: unknown[];
  }
};
