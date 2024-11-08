const { default: axios } = require('axios');
const { performance } = require('perf_hooks');
const { FeedPageChecker } = require('@openactive/rpde-validator');
const sleep = require('util').promisify(setTimeout);

const { createFeedContext, progressFromContext } = require('./feed-context-utils');
const { millisToMinutesAndSeconds, jsonParseAllowingBigInts } = require('./utils');

const DEFAULT_HOW_LONG_TO_SLEEP_AT_FEED_END = 500;

/**
 * @typedef {import('./models/FeedContext').FeedContext} FeedContext
 * @typedef {import('./models/RpdePageProcessor').RpdePageProcessor} RpdePageProcessor
 * @typedef {import('./models/HarvestRpde').HarvestRpdeArgs} HarvestRpdeArgs
 */

/**
 * @param {HarvestRpdeArgs} args
 * @param {boolean} [isLosslessMode=false] If true, the high-fidelity data TODO
 *
 * @returns {Promise<void>} Only returns if there is a fatal error.
 */
async function baseHarvestRPDE({
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
}, isLosslessMode = false) {
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
        transformResponse: (data) => {
          let lowFidelityData;
          try {
            lowFidelityData = JSON.parse(data);
          } catch (error) {
            // Return the original data if parsing fails
            return data;
          }
          const highFidelityData = /** @type {any} */(jsonParseAllowingBigInts(data));
          // Store `modified`s as strings if 'items' exists
          const rpdeItemsWithStringModifieds = highFidelityData.items?.map(item => ({
            ...item,
            modified: String(item.modified),
          }));

          return {
            lowFidelityData,
            highFidelityData: { ...highFidelityData, items: rpdeItemsWithStringModifieds },
          };
        },
      };

      const timerStart = performance.now();
      // Axios will throw an error if the status code is not 2xx
      const response = await axios.get(url, axiosConfig);
      const timerEnd = performance.now();
      const responseTime = timerEnd - timerStart;

      if (!response.data || typeof response.data !== 'object' || !response.data.lowFidelityData || typeof response.data.lowFidelityData !== 'object') {
        if (multibar) multibar.stop();
        logErrorDuringHarvest(`\nFATAL ERROR: RPDE feed ${feedContextIdentifier} page "${url}" with response code ${response.status} is not valid JSON:\n\nResponse: ${response.data}`);
        // TODO: Provide context to the error callback
        onError();
        return;
      }

      // Low fidelity data must be used for validation as validator cannot deal with BigInts.
      // High fidelity data contains modified as a string that contains a BigInt. This breaks RPDE validation rules that
      // state that modified can't be a string representation of a number.
      const validationJson = response.data.lowFidelityData;

      // Validate RPDE page using RPDE Validator, noting that for non-2xx state.pendingGetOpportunityResponses that we want to retry axios will have already thrown an error above
      const rpdeValidationErrors = feedChecker.validateRpdePage({
        url,
        json: validationJson,
        pageIndex: context.pages,
        contentType: response.headers['content-type'],
        cacheControl: response.headers['cache-control'],
        status: response.status,
        isInitialHarvestComplete,
        isOrdersFeed,
      });

      if (rpdeValidationErrors.length > 0) {
        if (multibar) multibar.stop();
        logErrorDuringHarvest(`\nFATAL ERROR: RPDE Validation Error(s) found on RPDE feed ${feedContextIdentifier} page "${url}":\n${rpdeValidationErrors.map(error => `- ${error.message.split('\n')[0]}`).join('\n')}\n`);
        // TODO: Provide context to the error callback
        onError();
        return;
      }

      const json = isLosslessMode ? response.data.highFidelityData : response.data.lowFidelityData;
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
      // TODO This code is unfortunately coupled with code in Broker Microservice (https://github.com/openactive/openactive-test-suite/tree/master/packages/openactive-broker-microservice),
      // in which a "FatalError" can be thrown by a `processPage(..)` callback. This should be decoupled.
      if (error.name === 'FatalError') {
        // If a fatal error, quit the application immediately
        if (multibar) multibar.stop();
        logErrorDuringHarvest(`\nFATAL ERROR for RPDE feed ${feedContextIdentifier} page "${url}": ${error.message}\n`);
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
      if (error.response?.status === 404 || error.response?.status === 410) {
        // As per https://openactive.io/realtime-paged-data-exchange/#http-status-codes, consider this endpoint in an error state and do not retry
        // If 404, simply stop polling feed
        if ((WAIT_FOR_HARVEST || VALIDATE_ONLY) && !isOrdersFeed) { await onFeedEnd(); }
        if (multibar) multibar.remove(context._progressbar);
        feedContextMap.delete(feedContextIdentifier);
        if (feedContextIdentifier.indexOf(ORDER_PROPOSALS_FEED_IDENTIFIER) === -1) logErrorDuringHarvest(`Not Found error for RPDE feed ${feedContextIdentifier} page "${url}", feed will be ignored.`);
        return;
      }
      logErrorDuringHarvest(`Error ${error?.response?.status ?? 'without response'} for RPDE feed ${feedContextIdentifier} page "${url}" (attempt ${numberOfRetries}): ${error.message}.${error.response ? `\n\nResponse: ${typeof error.response.data?.lowFidelityData === 'object' ? JSON.stringify(error.response.data.lowFidelityData, null, 2) : error.response.data}` : ''}`);
      // Force retry, after a delay, up to 12 times
      if (numberOfRetries < 12) {
        numberOfRetries += 1;
        await sleep(5000);
      } else {
        if (multibar) multibar.stop();
        logErrorDuringHarvest(`\nFATAL ERROR: Retry limit exceeded for RPDE feed ${feedContextIdentifier} page "${url}"\n`);
        // TODO: Provide context to the error callback
        onError();
        return;
      }
    }
  }
}

/**
 * @param {HarvestRpdeArgs} args
 *
 * @returns {Promise<void>} Only returns if there is a fatal error.
 */
function harvestRPDE(args) {
  return baseHarvestRPDE(args, false);
}

/**
 * @param {HarvestRpdeArgs} args
 *
 * @returns {Promise<void>} Only returns if there is a fatal error.
 */
function harvestRPDELossless(args) {
  return baseHarvestRPDE(args, true);
}

module.exports = { harvestRPDE, harvestRPDELossless };
