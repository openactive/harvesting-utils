# Examples

`harvestRPDE()` has many configuration options, different state variables that can be passed in, optional features that can be enabled, and differening logging functions that can be supplied. However, at its simplest it only needs a few parameters passed in to run.

## simple-rpde-harvester
This example RPDE harvester demonstrates the bare minimum needed to implement `harvestRPDE()`. 
It can be run by running the following command:
```
node examples/simple-rpde-harvester.js
```

## A more complex example
The `harvestRPDE()` function was originally written as part of `openactive-broker-microservice` in `openactive-test-suite`. It has since been abstracted out, and use of this library can be seen in `openactive-broker-microservice/app.js`.