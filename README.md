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

harvestRPDE(
  ...relevant parameters here
);
```

## Examples
A very simple example of `harvestRPDE` can be found in `examples/simple-rpde-harvester.js`. For more information on this script see [here](./examples/README.md).

## API Reference
### harvestRPDE

#### Required Parameters
| Parameter | Type | Description |
| --------- | ---- | ----------- |
| args| object | Arguments |
| baseUrl | string | Feed URL to harvest |
| feedContextIdentifier | string | Unique identifier for feed within the dataset eg ScheduledSession |
| headers | () => Promise<Object.<string,string>> | Function that returns headers needed to make a request to the feed URL |
| processPage | (rpdePage: any, feedIdentifier: string, isInitialHarvestComplete: () => boolean) => Promise<void> | Function that processes items in each page of the feed | 
| onFeedEnd | () => Promise<void> | Function that is called once the feed has been fully harvested |
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
