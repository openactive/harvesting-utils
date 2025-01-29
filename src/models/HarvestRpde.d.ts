import { AxiosError } from 'axios';
import { FeedContext } from './FeedContext';
import { RpdePageProcessor } from './RpdePageProcessor';

// When this is more typed, turn this into HarvestRpdeArgs<T> when T is the type of `modified`. modified can etiher be
// string or number depending on if it is a lossless harvest or not.

export type HarvestRpdeArgs = {
  baseUrl: string; // TODO: rename to feedUrl
  feedContextIdentifier: string;
  headers: () => Promise<{ [key: string]: string }>;
  processPage: RpdePageProcessor;
  /**
   * Callback is called when the feed has (successfully) reached its end - when
   * all items have been harvested.
   *
   * This is not the end of harvesting, as the feed will continue to be polled
   * afterwards for updates.
   */
  onReachedEndOfFeed: (lastPageUrl: string) => Promise<void>;
  onRetryDueToHttpError: (
    reqUrl: string,
    reqHeaders: Record<string, string>,
    resStatusCode: number,
    error: AxiosError,
    /** Number of milliseconds that the harvester will wait before the next retry */
    delayMs: number,
    /** Number of retries that have been attempted so far on this request */
    numberOfRetries: number
  ) => Promise<void>;
  // /**
  //  * Callback is called when the retry limit is exceeded for an HTTP error.
  //  *
  //  * At this point, the feed harvesting has stopped
  //  */
  // onRetryLimitExceededForHttpError: (
  //   url: string,
  //   headers: Record<string, string>,
  //   error: AxiosError,
  //   numberOfRetries: number
  // ) => Promise<void>;
  // onError: () => void;
  // /**
  //  * Callback is called if a feed response is ever 404 or 410.
  //  *
  //  * The expected behaviour is described in the OpenActive specification:
  //  * https://openactive.io/realtime-paged-data-exchange/#http-status-codes.
  //  *
  //  * So, when this happens, the feed harvesting stops.
  //  */
  // onFeedNotFoundError: (
  //   reqUrl: string,
  //   reqHeaders: Record<string, string>,
  //   resStatusCode: number
  // ) => Promise<void>;
  isOrdersFeed: boolean;
  /* The following parameters are optional, and are currently very openactive-broker-microservice specific.
   * In the future these should be removed or abstracted away. This comment highlights some potential fixes:
   * https://github.com/openactive/harvesting-utils/pull/1/files#r1499134370
   */
  state?: {
    context?: FeedContext; // TODO: rename to feedContext
    startTime: Date;
  };
  loggingFns?: {
    log?: (message?: any, ...optionalParams: any[]) => void;
    logError?: (message?: any, ...optionalParams: any[]) => void;
    logErrorDuringHarvest?: (message?: any, ...optionalParams: any[]) => void;
  };
  config?: {
    howLongToSleepAtFeedEnd?: () => number;
    // WAIT_FOR_HARVEST?: boolean;
    // VALIDATE_ONLY?: boolean;
    // VERBOSE?: boolean;
    // ORDER_PROPOSALS_FEED_IDENTIFIER?: string;
    REQUEST_LOGGING_ENABLED?: boolean;
  };
  options?: {
    multibar?: import("cli-progress").MultiBar;
    pauseResume?: { waitIfPaused: () => Promise<void> };
  };
};

export type HarvestRpdeResponse = {
  error: {
    type: 'unexpected-non-http-error';
    reqUrl: string;
    reqHeaders: Record<string, string>;
    error: Error;
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
