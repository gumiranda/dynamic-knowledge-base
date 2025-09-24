export interface IVersionable {
  version: number;
  createNewVersion(): IVersionable;
}