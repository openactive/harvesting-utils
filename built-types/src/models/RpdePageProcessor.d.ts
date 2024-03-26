export type RpdePageProcessor = {
  (rpdePage: any, feedIdentifier: string, isInitialHarvestComplete: () => boolean): Promise<void>;
}