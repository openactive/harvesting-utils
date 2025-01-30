const { default: axios } = require('axios');
const { performance } = require('perf_hooks');
const { FeedPageChecker } = require('@openactive/rpde-validator');
const sleep = require('util').promisify(setTimeout);

const { createFeedContext } = require('./feed-context-utils');
const { jsonParseAllowingBigInts } = require('./utils');

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
 * @returns {Promise<import('./models/HarvestRpde').HarvestRpdeResponse>} Only returns if there is a fatal error.
 */
async function baseHarvestRPDE({
  baseUrl,
  feedContextIdentifier,
  headers,
  processPage,
  onReachedEndOfFeed,
  onProcessedPage,
  onRetryDueToHttpError,
  // onError,
  // onFeedNotFoundError,
  isOrdersFeed,
  state: { context } = {
    context: null,
  },
  // eslint-disable-next-line no-unused-vars
  loggingFns: { log, logError, logErrorDuringHarvest } = {
    log: console.log,
    logError: console.error,
    logErrorDuringHarvest: x => console.error(`\n\n${x}\n\n\n\n\n\n\n\n\n`), // Ensure messages are displayed above the multibar output
  },
  config: {
    howLongToSleepAtFeedEnd,
    // WAIT_FOR_HARVEST,
    // VALIDATE_ONLY,
    // VERBOSE,
    // ORDER_PROPOSALS_FEED_IDENTIFIER,
    REQUEST_LOGGING_ENABLED,
  } = {
    // WAIT_FOR_HARVEST: true,
    // VALIDATE_ONLY: false,
    // VERBOSE: false,
    // ORDER_PROPOSALS_FEED_IDENTIFIER: null,
    REQUEST_LOGGING_ENABLED: false,
  },
  options: { multibar, pauseResume } = { multibar: null, pauseResume: null },
}, isLosslessMode = false) {
  // const stopMultibar = () => {
  //   // TODO: To prevent extraneous output, ensure that multibar.stop is only called if the multibar is already active (e.g. by wrapping the multibar to allow us to set it to null when not in use)
  //   if (multibar) multibar.stop();
  // };
  const pageDescriptiveIdentifier = (url, thisHeaders) => `RPDE feed ${feedContextIdentifier} page "${url}" (request headers: ${JSON.stringify(thisHeaders)})`;
  let isInitialHarvestComplete = false;
  let numberOfRetries = 0;
  // TODO2 make context something that is only internal to this lib. And it
  // shouldn't take multibar. It can be exposed to the client via the callbacks,
  // but the client and lib should not be expected to both mutate this object!
  if (!context) context = createFeedContext(feedContextIdentifier, baseUrl, multibar);

  let url = baseUrl;

  // One instance of FeedPageChecker per feed, as it maintains state relating to the feed
  const feedChecker = new FeedPageChecker();

  // Harvest forever, until a 404 is encountered
  for (; ;) {
    // If harvesting is paused, block using the mutex
    if (pauseResume) await pauseResume.waitIfPaused();

    const headersForThisRequest = await headers();

    try {
      const axiosConfig = {
        headers: headersForThisRequest,
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
        // // TODO3 stop multibar on unexpcted-non-http-error
        // stopMultibar();
        // logErrorDuringHarvest(`\nFATAL ERROR: ${pageDescriptiveIdentifier(url, headersForThisRequest)} with response code ${response.status} is not valid JSON:\n\nResponse: ${response.data}`);
        // // TODO: Provide context to the error callback
        const error = new Error(`${pageDescriptiveIdentifier(url, headersForThisRequest)} with response code ${response.status} is not valid JSON:\n\nResponse: ${response.data}`);
        return {
          error: {
            type: 'unexpected-non-http-error',
            reqUrl: url,
            reqHeaders: headersForThisRequest,
            error,
            message: error.message,
          },
        };
        // onError();
        // return;
      }

      // Low fidelity data must be used for validation as validator cannot deal with BigInts.
      // High fidelity data contains modified as a string that contains a BigInt. This breaks RPDE validation rules that
      // state that modified can't be a string representation of a number.
      const validationJson = response.data.lowFidelityData;

      // Validate RPDE page using RPDE Validator, noting that for non-2xx state.pendingGetOpportunityResponses that we want to retry axios will have already thrown an error above
      const rpdeValidationErrors = feedChecker.validateRpdePage({
        url,
        json: validationJson,
        pageIndex: context.pageIndex,
        contentType: response.headers['content-type'],
        cacheControl: response.headers['cache-control'],
        status: response.status,
        isInitialHarvestComplete,
        isOrdersFeed,
      });

      if (rpdeValidationErrors.length > 0) {
        // // TODO3 stop multibar on rpde-validation-error
        // stopMultibar();
        // logErrorDuringHarvest(`\nFATAL ERROR: RPDE Validation Error(s) found on ${pageDescriptiveIdentifier(url, headersForThisRequest)}:\n${rpdeValidationErrors.map(error => `- ${error.message.split('\n')[0]}`).join('\n')}\n`);
        // // TODO: Provide context to the error callback
        return {
          error: {
            type: 'rpde-validation-error',
            reqUrl: url,
            reqHeaders: headersForThisRequest,
            rpdeValidationErrors,
          },
        };
        // onError();
        // return;
      }

      const json = isLosslessMode ? response.data.highFidelityData : response.data.lowFidelityData;
      context.currentPage = url;
      if (json.next === url && json.items.length === 0) {
        // // TODO3 move this into onReachedEndOfFeed & add isInitialHarvestComplete, feedContext, responseTime
        // if (!isInitialHarvestComplete) {
        //   if (context._progressbar) {
        //     context._progressbar.update(context.validatedItems, {
        //       pages: context.pageIndex,
        //       responseTime: Math.round(responseTime),
        //       ...progressFromContext(context),
        //       status: context.items === 0 ? 'Harvesting Complete (No items to validate)' : 'Harvesting Complete, Validating...',
        //     });
        //     context._progressbar.setTotal(context.totalItemsQueuedForValidation);
        //   }
        //   isInitialHarvestComplete = true;
        // }
        await onReachedEndOfFeed({
          lastPageUrl: url,
          isInitialHarvestComplete,
          // feedContext: context,
          responseTime,
        });
        isInitialHarvestComplete = true;
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
        context.pageIndex += 1;
        // TODO2 call some function to update page number
        context.items += json.items.length;
        delete context.sleepMode;
        if (REQUEST_LOGGING_ENABLED) {
          const kind = json.items && json.items[0] && json.items[0].kind;
          log(
            `RPDE kind: ${kind}, page: ${context.pageIndex}, length: ${json.items.length
            }, next: '${json.next}'`,
          );
        }
        // eslint-disable-next-line no-loop-func
        await processPage(json, feedContextIdentifier, () => isInitialHarvestComplete);
        await onProcessedPage({
          reqUrl: url,
          isInitialHarvestComplete,
          responseTime,
        });
        // // TODO3 onProcessedPage(isInitialHarvestComplete, feedContext)
        // if (!isInitialHarvestComplete && context._progressbar) {
        //   context._progressbar.update(context.validatedItems, {
        //     pages: context.pageIndex,
        //     responseTime: Math.round(responseTime),
        //     ...progressFromContext(context),
        //   });
        //   context._progressbar.setTotal(context.totalItemsQueuedForValidation);
        // }
        url = json.next;
      }
      numberOfRetries = 0;
    } catch (error) {
      // ~~~~ THE NEW STUFF ~~~~
      if (!error.isAxiosError) {
        // // If a non-axios error, quit the application immediately
        // stopMultibar();
        // logErrorDuringHarvest(`FATAL ERROR for ${pageDescriptiveIdentifier(url, headersForThisRequest)}: ${error.message}\n${error.stack}`);
        // // TODO: Provide context to the error callback
        return {
          error: {
            type: 'unexpected-non-http-error',
            reqUrl: url,
            reqHeaders: headersForThisRequest,
            error,
            message: `Error for ${pageDescriptiveIdentifier(url, headersForThisRequest)}: ${error.message}\n${error.stack}`,
          },
        };
        // await onUnexpectedError(url, headersForThisRequest, error);
        // return;
      }
      if (error.response?.status === 404 || error.response?.status === 410) {
        // As per
        // https://openactive.io/realtime-paged-data-exchange/#http-status-codes,
        // consider this endpoint in an error state and do not retry. If 404,
        // simply stop polling feed
        // // TODO3 put this into feed-not-found callback in Broker
        // if (multibar) multibar.remove(context._progressbar);
        return {
          error: {
            type: 'feed-not-found',
            reqUrl: url,
            reqHeaders: headersForThisRequest,
            resStatusCode: error.response.status,
            error,
          },
        };
        // await onFeedNotFoundError(url, headersForThisRequest, error.response.status, error);
        // return;
      }
      // Otherwise, it's an HTTP error, for which we'll attempt to retry
      logErrorDuringHarvest(`Error ${error?.response?.status ?? 'without response'} for ${pageDescriptiveIdentifier(url, headersForThisRequest)} (attempt ${numberOfRetries}): ${error.message}.${error.response ? `\n\nResponse: ${typeof error.response.data?.lowFidelityData === 'object' ? JSON.stringify(error.response.data.lowFidelityData, null, 2) : error.response.data}` : ''}`);
      // Force retry, after a delay, up to 12 times
      if (numberOfRetries < 12) {
        numberOfRetries += 1;
        const delay = 5000;
        await onRetryDueToHttpError(url, headersForThisRequest, error.response.status, error, delay, numberOfRetries);
        await sleep(delay);
      } else {
        // // TODO3 stop multibar on retry-limit-exceeded-for-http-error
        // stopMultibar();
        // logErrorDuringHarvest(`\nFATAL ERROR: Retry limit exceeded for ${pageDescriptiveIdentifier(url, headersForThisRequest)}\n`);
        return {
          error: {
            type: 'retry-limit-exceeded-for-http-error',
            reqUrl: url,
            reqHeaders: headersForThisRequest,
            resStatusCode: error.response.status,
            error,
            numberOfRetries,
          },
        };
        // await onRetryLimitExceededForHttpError(url, headersForThisRequest, error.response.status, error, numberOfRetries);
        // // TODO: Provide context to the error callback
        // onError();
        // return;
      }
      // // ~~~~ THE OLD STUFF ~~~~
      // // Do not wait for the Orders feed if failing (as it might be an auth error)
      // if ((WAIT_FOR_HARVEST || VALIDATE_ONLY) && isOrdersFeed) {
      //   onReachedEndOfFeed();
      // }
      // // TODO This code is unfortunately coupled with code in Broker Microservice (https://github.com/openactive/openactive-test-suite/tree/master/packages/openactive-broker-microservice),
      // // in which a "FatalError" can be thrown by a `processPage(..)` callback. This should be decoupled.
      // if (error.name === 'FatalError') {
      //   // If a fatal error, quit the application immediately
      //   stopMultibar();
      //   logErrorDuringHarvest(`\nFATAL ERROR for ${pageDescriptiveIdentifier(url, headersForThisRequest)}: ${error.message}\n`);
      //   // TODO: Provide context to the error callback
      //   onError();
      //   return;
      // }
      // if (!error.isAxiosError) {
      //   // If a non-axios error, quit the application immediately
      //   stopMultibar();
      //   logErrorDuringHarvest(`FATAL ERROR for ${pageDescriptiveIdentifier(url, headersForThisRequest)}: ${error.message}\n${error.stack}`);
      //   // TODO: Provide context to the error callback
      //   onError();
      //   return;
      // }
      // if (error.response?.status === 404 || error.response?.status === 410) {
      //   // As per
      //   // https://openactive.io/realtime-paged-data-exchange/#http-status-codes,
      //   // consider this endpoint in an error state and do not retry. If 404,
      //   // simply stop polling feed
      //   if (multibar) multibar.remove(context._progressbar);
      //   await onFeedNotFoundError(url, headersForThisRequest, error.response.status);
      //   return;
      // }
      // logErrorDuringHarvest(`Error ${error?.response?.status ?? 'without response'} for ${pageDescriptiveIdentifier(url, headersForThisRequest)} (attempt ${numberOfRetries}): ${error.message}.${error.response ? `\n\nResponse: ${typeof error.response.data?.lowFidelityData === 'object' ? JSON.stringify(error.response.data.lowFidelityData, null, 2) : error.response.data}` : ''}`);
      // // Force retry, after a delay, up to 12 times
      // if (numberOfRetries < 12) {
      //   numberOfRetries += 1;
      //   await sleep(5000);
      // } else {
      //   stopMultibar();
      //   logErrorDuringHarvest(`\nFATAL ERROR: Retry limit exceeded for ${pageDescriptiveIdentifier(url, headersForThisRequest)}\n`);
      //   // TODO: Provide context to the error callback
      //   onError();
      //   return;
      // }
    }
  }
}

/**
 * @param {HarvestRpdeArgs} args
 *
 * @returns {Promise<import('./models/HarvestRpde').HarvestRpdeResponse>} Only returns if there is a fatal error.
 */
function harvestRPDE(args) {
  return baseHarvestRPDE(args, false);
}

/**
 * @param {HarvestRpdeArgs} args
 *
 * @returns {Promise<import('./models/HarvestRpde').HarvestRpdeResponse>} Only returns if there is a fatal error.
 */
function harvestRPDELossless(args) {
  return baseHarvestRPDE(args, true);
}

module.exports = { harvestRPDE, harvestRPDELossless };
