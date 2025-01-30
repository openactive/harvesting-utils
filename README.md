# harvesting-utils
Utils library for harvesting [RPDE feeds](https://openactive.io/realtime-paged-data-exchange/).

## Version 0.X.X

This library is currently in version 0.X.X, which means that the API will not be stable until 1.0.0.

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

Indefinitely harvests an RPDE feed, following the ["expected consumer behaviour" described in the RPDE spec](https://openactive.io/realtime-paged-data-exchange/#expected-consumer-behaviour).

**N.B.** This function will run indefinitely, and only return if a fatal error occurs. For this reason, you will generally **not** want to run `await harvestRPDE(..)`.

#### Parameters

The parameters for this function are typed and documented in [HarvestRpde.d.ts](./src/models/HarvestRpde.d.ts).

### harvestRpdeLossless
`harvestRpdeLossless` has the same function signature as `harvestRpde`. However it is capable of handling `modified` values that are too large for JavaScript numbers to handle natively ie > 2^53. This is handled by storing them as strings in memory. 

For more guidance on how to handle these values, see [here](https://developer.openactive.io/using-data/harvesting-opportunity-data/large-integers-in-javascript).

## Developing
### TypeScript

The code is written in native JS, but uses TypeScript to check for type errors. TypeScript uses JSDoc annotations to determine types (See: [Type Checking JavaScript Files](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html)) from our native .js files.

In order for these types to be used by other projects, they must be saved to [TypeScript Declaration files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html). This is enabled by our tsconfig.json, which specifies that declaration files are to be generated and saved to `built-types/` (As an aside, the reason that the package's types must be saved to .d.ts files is due to TypeScript not automatically using JS defined types from libraries. There is a good reason for this and proposals to allow it to work at least for certain packages. See some of the discussion here: https://github.com/microsoft/TypeScript/issues/33136).

For this reason, TypeScript types should be generated after code changes to make sure that consumers of this library can use the new types. The openactive-test-suite project does this automatically in its pre-commit hook, which calls `npm run gen-types`

TypeScript-related scripts:

- `check-types`: This uses the `tsconfig.check.json` config, which does not emit any TS declaration files - all it does is check that there are no type errors. This is used for code tests.
- `gen-types`: This uses the `tsconfig.gen.json` config, which emits TS declaration files into `built-types/`.

  Additionally, it copies programmer-created `.d.ts` files from our source code (e.g. `src/types/Criteria.d.ts`) into `built-types/`. This is because our code references these types, so they must be in the `built-types/` directory so that the relative paths match (e.g. so that `import('../types/Criteria').Criteria` works).
