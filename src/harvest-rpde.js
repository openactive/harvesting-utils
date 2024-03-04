const { default: axios } = require('axios');
const { performance } = require('perf_hooks');
const { FeedPageChecker } = require('@openactive/rpde-validator');
const sleep = require('util').promisify(setTimeout);

const { createFeedContext, progressFromContext } = require('./feed-context-utils');
const { millisToMinutesAndSeconds } = require('./utils');

const DEFAULT_HOW_LONG_TO_SLEEP_AT_FEED_END = 500;

/**
 * @typedef {(
*   rpdePage: any,
*   feedIdentifier: string,
*   isInitialHarvestComplete: () => boolean,
* ) => Promise<void>} RpdePageProcessor
*/

/**
 * @typedef {import('./models/FeedContext').FeedContext} FeedContext
 */

/**
 * @param {object} args
 * @param {string} args.baseUrl TODO: rename to feedUrl
 * @param {string} args.feedContextIdentifier
 * @param {() => Promise<Object.<string, string>>} args.headers
 * @param {RpdePageProcessor} args.processPage
 * @param {() => Promise<void>} args.onFeedEnd Callback which will be called when the feed has
 *   reached its end - when all items have been harvested.
 * @param {() => void} args.onError
 * @param {boolean} args.isOrdersFeed
 *
 * The following parameters are optional, and are currently very openactive-broker-microservice specific.
 * In the future these should be removed or abstracted away. This comment highlights some potential fixes:
 * https://github.com/openactive/harvesting-utils/pull/1/files#r1499134370
 *
 * @param {object} [args.state]
 * @param {FeedContext} [args.state.context] TODO: rename to feedContext
 * @param {Map<string, FeedContext>} [args.state.feedContextMap]
 * @param {Date} args.state.startTime

 * @param {object} [args.loggingFns]
* @param {(message?: any, ...optionalParams: any[]) => void} [args.loggingFns.log]
* @param {(message?: any, ...optionalParams: any[]) => void} [args.loggingFns.logError]
* @param {(message?: any, ...optionalParams: any[]) => void} [args.loggingFns.logErrorDuringHarvest]
*
* @param {object} [args.config]
* @param {() => number} [args.config.howLongToSleepAtFeedEnd]
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
async function harvestRPDE({
  baseUrl,
  feedContextIdentifier,
  headers,
  processPage,
  onFeedEnd,
  onError,
  isOrdersFeed,
  state: { context, feedContextMap, startTime } = {
    context: null, feedContextMap: new Map(), startTime: new Date(),
  },
  loggingFns: { log, logError, logErrorDuringHarvest } = {
    log: console.log, logError: console.error, logErrorDuringHarvest: console.error,
  },
  config: { howLongToSleepAtFeedEnd, WAIT_FOR_HARVEST, VALIDATE_ONLY, VERBOSE, ORDER_PROPOSALS_FEED_IDENTIFIER, REQUEST_LOGGING_ENABLED } = {
    WAIT_FOR_HARVEST: true, VALIDATE_ONLY: false, VERBOSE: false, ORDER_PROPOSALS_FEED_IDENTIFIER: null, REQUEST_LOGGING_ENABLED: false,
  },
  options: { multibar, pauseResume } = { multibar: null, pauseResume: null },
}) {
  let isInitialHarvestComplete = false;
  let numberOfRetries = 0;
  if (!context) context = createFeedContext(feedContextIdentifier, baseUrl, multibar);

  if (feedContextMap.has(feedContextIdentifier)) {
    throw new Error('Duplicate feed identifier not permitted within dataset distribution.');
  }
  feedContextMap.set(feedContextIdentifier, context);
  let url = baseUrl;

  // One instance of FeedPageChecker per feed, as it maintains state relating to the feed
  const feedChecker = new FeedPageChecker();

  // Harvest forever, until a 404 is encountered
  for (; ;) {
    // If harvesting is paused, block using the mutex
    if (pauseResume) await pauseResume.waitIfPaused();

    try {
      const axiosConfig = {
        headers: await headers(),
      };

      const timerStart = performance.now();
      const response = await axios.get(url, axiosConfig);
      const timerEnd = performance.now();
      const responseTime = timerEnd - timerStart;

      const json = response.data;

      // Validate RPDE page using RPDE Validator, noting that for non-2xx state.pendingGetOpportunityResponses that we want to retry axios will have already thrown an error above
      const rpdeValidationErrors = feedChecker.validateRpdePage({
        url,
        json,
        pageIndex: context.pages,
        contentType: response.headers['content-type'],
        cacheControl: response.headers['cache-control'],
        status: response.status,
        isInitialHarvestComplete,
        isOrdersFeed,
      });

      if (rpdeValidationErrors.length > 0) {
        if (multibar) multibar.stop();
        logError(`\nFATAL ERROR: RPDE Validation Error(s) found on RPDE feed ${feedContextIdentifier} page "${url}":\n${rpdeValidationErrors.map(error => `- ${error.message.split('\n')[0]}`).join('\n')}\n`);
        // TODO: Provide context to the error callback
        onError();
        return;
      }

      context.currentPage = url;
      if (json.next === url && json.items.length === 0) {
        if (!isInitialHarvestComplete) {
          if (context._progressbar) {
            context._progressbar.update(context.validatedItems, {
              pages: context.pages,
              responseTime: Math.round(responseTime),
              ...progressFromContext(context),
              status: context.items === 0 ? 'Harvesting Complete (No items to validate)' : 'Harvesting Complete, Validating...',
            });
            context._progressbar.setTotal(context.totalItemsQueuedForValidation);
          }
          isInitialHarvestComplete = true;
        }
        if (WAIT_FOR_HARVEST || VALIDATE_ONLY) {
          await onFeedEnd();
        } else if (VERBOSE) log(`Sleep mode poll for RPDE feed "${url}"`);
        context.sleepMode = true;
        if (context.timeToHarvestCompletion === undefined) context.timeToHarvestCompletion = millisToMinutesAndSeconds((new Date()).getTime() - startTime.getTime());
        // Potentially poll more slowly at the end of the feed
        await sleep(
          howLongToSleepAtFeedEnd
            ? howLongToSleepAtFeedEnd()
            : DEFAULT_HOW_LONG_TO_SLEEP_AT_FEED_END,
        );
      } else {
        context.responseTimes.push(responseTime);
        // Maintain a buffer of the last 5 items
        if (context.responseTimes.length > 5) context.responseTimes.shift();
        context.pages += 1;
        context.items += json.items.length;
        delete context.sleepMode;
        if (REQUEST_LOGGING_ENABLED) {
          const kind = json.items && json.items[0] && json.items[0].kind;
          log(
            `RPDE kind: ${kind}, page: ${context.pages}, length: ${json.items.length
            }, next: '${json.next}'`,
          );
        }
        // eslint-disable-next-line no-loop-func
        await processPage(json, feedContextIdentifier, () => isInitialHarvestComplete);
        if (!isInitialHarvestComplete && context._progressbar) {
          context._progressbar.update(context.validatedItems, {
            pages: context.pages,
            responseTime: Math.round(responseTime),
            ...progressFromContext(context),
          });
          context._progressbar.setTotal(context.totalItemsQueuedForValidation);
        }
        url = json.next;
      }
      numberOfRetries = 0;
    } catch (error) {
      // Do not wait for the Orders feed if failing (as it might be an auth error)
      if ((WAIT_FOR_HARVEST || VALIDATE_ONLY) && isOrdersFeed) {
        onFeedEnd();
      }
      if (error.name === 'FatalError') {
        // If a fatal error, quit the application immediately
        if (multibar) multibar.stop();
        logError(`\nFATAL ERROR for RPDE feed ${feedContextIdentifier} page "${url}": ${error.message}\n`);
        // TODO: Provide context to the error callback
        onError();
        return;
      }
      if (!error.isAxiosError) {
        // If a non-axios error, quit the application immediately
        if (multibar) multibar.stop();
        logErrorDuringHarvest(`FATAL ERROR for RPDE feed ${feedContextIdentifier} page "${url}": ${error.message}\n${error.stack}`);
        // TODO: Provide context to the error callback
        onError();
        return;
      }
      if (error.response?.status === 404) {
        // If 404, simply stop polling feed
        if ((WAIT_FOR_HARVEST || VALIDATE_ONLY) && !isOrdersFeed) { await onFeedEnd(); }
        if (multibar) multibar.remove(context._progressbar);
        feedContextMap.delete(feedContextIdentifier);
        if (feedContextIdentifier.indexOf(ORDER_PROPOSALS_FEED_IDENTIFIER) === -1) logErrorDuringHarvest(`Not Found error for RPDE feed ${feedContextIdentifier} page "${url}", feed will be ignored.`);
        return;
      }
      logErrorDuringHarvest(`Error ${error?.response?.status ?? 'without response'} for RPDE feed ${feedContextIdentifier} page "${url}" (attempt ${numberOfRetries}): ${error.message}.${error.response ? `\n\nResponse: ${typeof error.response.data === 'object' ? JSON.stringify(error.response.data, null, 2) : error.response.data}` : ''}`);
      // Force retry, after a delay, up to 12 times
      if (numberOfRetries < 12) {
        numberOfRetries += 1;
        await sleep(5000);
      } else {
        if (multibar) multibar.stop();
        logError(`\nFATAL ERROR: Retry limit exceeded for RPDE feed ${feedContextIdentifier} page "${url}"\n`);
        // TODO: Provide context to the error callback
        onError();
        return;
      }
    }
  }
}

module.exports = { harvestRPDE };
