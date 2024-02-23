export type RpdePageProcessor = (rpdePage: any, feedIdentifier: string, isInitialHarvestComplete: () => boolean) => Promise<void>;
export type FeedContext = import('./FeedContext').FeedContext;
/**
 * @typedef {(
*   rpdePage: any,
*   feedIdentifier: string,
*   isInitialHarvestComplete: () => boolean,
* ) => Promise<void>} RpdePageProcessor
*/
/**
 * @typedef {import('./FeedContext').FeedContext} FeedContext
 */
/**
 * @param {object} args
 * @param {string} args.baseUrl TODO: rename to feedUrl
 * @param {string} args.feedContextIdentifier
 * @param {() => Promise<Object.<string, string>>} args.headers
 * @param {RpdePageProcessor} args.processPage
 * @param {() => Promise<void>} args.onFeedEnd Callback which will be called when the feed has
 *   reached its end - when all items have been harvested.
 * @param {() => Promise<void>} args.onError
 * @param {boolean} args.isOrdersFeed
 *
 * The following parameters are optional, and are currently very openactive-broker-microservice specific.
 * In the future these should be removed or abstracted away. This comment highlights some potential fixes:
 * https://github.com/openactive/harvesting-utils/pull/1/files#r1499134370
 *
 * @param {object} [args.state]
 * @param {FeedContext} [args.state.context] TODO: rename to feedContext
 * @param {Map<string, FeedContext>} [args.state.feedContextMap]
 * @param {string[]} args.state.incompleteFeeds
 * @param {Date} args.state.startTime

 * @param {object} [args.loggingFns]
* @param {(message?: any, ...optionalParams: any[]) => void} [args.loggingFns.log]
* @param {(message?: any, ...optionalParams: any[]) => void} [args.loggingFns.logError]
* @param {(message?: any, ...optionalParams: any[]) => void} [args.loggingFns.logErrorDuringHarvest]
*
* @param {object} [args.config]
* @param {boolean} [args.config.WAIT_FOR_HARVEST]
* @param {boolean} [args.config.VALIDATE_ONLY]
* @param {boolean} [args.config.VERBOSE]
* @param {string} [args.config.ORDER_PROPOSALS_FEED_IDENTIFIER]
* @param {boolean} [args.config.REQUEST_LOGGING_ENABLED]
*
* @param {object} [args.options]
* @param {import('cli-progress').MultiBar} [args.options.multibar]
* @param {{waitIfPaused: () => Promise<void>}} [args.options.pauseResume]
 */
export function harvestRPDE({ baseUrl, feedContextIdentifier, headers, processPage, onFeedEnd, onError, isOrdersFeed, state: { context, feedContextMap, startTime, incompleteFeeds }, loggingFns: { log, logError, logErrorDuringHarvest }, config: { WAIT_FOR_HARVEST, VALIDATE_ONLY, VERBOSE, ORDER_PROPOSALS_FEED_IDENTIFIER, REQUEST_LOGGING_ENABLED }, options: { multibar, pauseResume }, }: {
    baseUrl: string;
    feedContextIdentifier: string;
    headers: () => Promise<{
        [x: string]: string;
    }>;
    processPage: RpdePageProcessor;
    onFeedEnd: () => Promise<void>;
    onError: () => Promise<void>;
    isOrdersFeed: boolean;
    state?: {
        context?: FeedContext;
        feedContextMap?: Map<string, FeedContext>;
        incompleteFeeds: string[];
        startTime: Date;
    };
    loggingFns?: {
        log?: (message?: any, ...optionalParams: any[]) => void;
        logError?: (message?: any, ...optionalParams: any[]) => void;
        logErrorDuringHarvest?: (message?: any, ...optionalParams: any[]) => void;
    };
    config?: {
        WAIT_FOR_HARVEST?: boolean;
        VALIDATE_ONLY?: boolean;
        VERBOSE?: boolean;
        ORDER_PROPOSALS_FEED_IDENTIFIER?: string;
        REQUEST_LOGGING_ENABLED?: boolean;
    };
    options?: {
        multibar?: any;
        pauseResume?: {
            waitIfPaused: () => Promise<void>;
        };
    };
}): Promise<void>;
