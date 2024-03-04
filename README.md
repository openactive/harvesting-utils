# harvesting-utils
Utils library for harvesting RPDE feeds

## Install
This library can be installed as an npm package using the following command:

```
$ npm install git://github.com/openactive/harvesting-utils.git
```

## Usage

```js
const { harvestRPDE } = require('@openactive/harvesting-utils')

harvestRPDE({
  baseUrl: '...',
  /* ...relevant parameters here */
});
```

## Examples
A very simple example of `harvestRPDE` can be found in `examples/simple-rpde-harvester.js`. For more information on this script see [here](./examples/README.md).

## API Reference
### harvestRPDE

#### Required Parameters
| Parameter | Type | Description |
| --------- | ---- | ----------- |
| baseUrl | string | Feed URL to harvest |
| feedContextIdentifier | string | Unique identifier for feed within the dataset eg ScheduledSession |
| headers | () => Promise<Object.<string,string>> | Function that returns headers needed to make a request to the feed URL |
| processPage | (rpdePage: any, feedIdentifier: string, isInitialHarvestComplete: () => boolean) => Promise<void> | Function that processes items in each page of the feed | 
| onFeedEnd | () => Promise<void> | Function that is called when the [last page](https://openactive.io/realtime-paged-data-exchange/#last-page-definition) of the feed is reached. This function may be called multiple times if new items are added after the first time `harvestRPDE()` reaches the last page |
| onError | () => Promise<void> | Function that is called if the harvest errors |
| isOrdersFeed | boolean | Is the feed an Orders feed? |

#### Optional Parameters
| Parameter | Type | Description |
| --------- | ---- | ----------- |
| state | object | Existing state can be passed in and manipulated within harvestRPDE() |
| state.context | FeedContext | Context about the feed. Default: new FeedContext(feedContextIdentifier,baseUrl, multibar) |
| state.feedContextMap | Map<string, FeedContext> | Map containing FeedContexts about this and other feeds within the dataset. Default: new Map() |
| state.incompleteFeeds | string[] | Array of feed identifiers which are not yet complete. Default: []  |
| state.startTime | Date | Start time of the harvest. Default: new Date()  |
| loggingFns | object | Logging functions for different cases |
| loggingFns.log | (message?: any, ...optionalParams: any[]) => void | Normal logging. Default: console.log  |
| loggingFns.logError | (message?: any, ...optionalParams: any[]) => void | Error logging. Default: console.error |
| loggingFns.logErrorDuringHarvest | (message?: any, ...optionalParams: any[]) => void | Error logging during the harvest Default: console.error |
| config| object | Configuration options |
| config.howLongToSleepAtFeedEnd | () => number | How long to wait, in milliseconds, before re-polling a feed after fetching the last page ([RPDE spec](https://openactive.io/realtime-paged-data-exchange/#polling-for-near-real-time-updates)). Default: `() => 500` |
| config.WAIT_FOR_HARVEST | boolean | Whether to wait for harvest to complete and run onFeedEnd() function. Default: true |
| config.VALIDATE_ONLY | boolean | TODO. Default: false |
| config.VERBOSE | boolean | Verbose logging. Default: false |
| config.ORDER_PROPOSALS_FEED_IDENTIFIER | string | TODO. Default: null |
| config.REQUEST_LOGGING_ENABLED | boolean | Extra logging around the request. Default: false  |
| options | object | Optional features |
| options.multibar | import('cli-progress').MultiBar | If using cli-progress.Multibar, this can be supplied and harvesting updates will be provided to the multibar. Default: null |
| options.pauseResume | {waitIfPaused: () => Promise<void>} | Function, if implemented, that can be used to pause harvesting. Default: null |

### createFeedContext
Function that creates a FeedContext object

#### Required Parameters
| Parameter | Type | Description |
| --------- | ---- | ----------- |
| feedContextIdentifier | string | Unique identifier for feed within the dataset eg ScheduledSession |
| baseUrl | string | Feed URL to harvest |

#### Optional Parameters
| Parameter | Type | Description |
| --------- | ---- | ----------- |
| multibar | import('cli-progress').MultiBar | If using cli-progress.Multibar, this can be supplied and context values will be provided to the multibar. Default: null |

### progressFromContext
Function that returns harvesting progress values from a FeedContext object

#### Required Parameters
| Parameter | Type | Description |
| --------- | ---- | ----------- |
| context | FeedContext | FeedContext object to get progress values from |


## Developing
### TypeScript

The code is written in native JS, but uses TypeScript to check for type errors. TypeScript uses JSDoc annotations to determine types (See: [Type Checking JavaScript Files](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html)) from our native .js files.

In order for these types to be used by other projects, they must be saved to [TypeScript Declaration files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html). This is enabled by our tsconfig.json, which specifies that declaration files are to be generated and saved to `built-types/` (As an aside, the reason that the package's types must be saved to .d.ts files is due to TypeScript not automatically using JS defined types from libraries. There is a good reason for this and proposals to allow it to work at least for certain packages. See some of the discussion here: https://github.com/microsoft/TypeScript/issues/33136).

For this reason, TypeScript types should be generated after code changes to make sure that consumers of this library can use the new types. The openactive-test-suite project does this automatically in its pre-commit hook, which calls `npm run gen-types`

TypeScript-related scripts:

- `check-types`: This uses the `tsconfig.check.json` config, which does not emit any TS declaration files - all it does is check that there are no type errors. This is used for code tests.
- `gen-types`: This uses the `tsconfig.gen.json` config, which emits TS declaration files into `built-types/`.

  Additionally, it copies programmer-created `.d.ts` files from our source code (e.g. `src/types/Criteria.d.ts`) into `built-types/`. This is because our code references these types, so they must be in the `built-types/` directory so that the relative paths match (e.g. so that `import('../types/Criteria').Criteria` works).
