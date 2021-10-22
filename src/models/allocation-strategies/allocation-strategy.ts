import { Application } from "../applications";
import { Fleet } from "../data-centers/example";

export interface AllocationStrategy {
  addApplication(fleet: Fleet, app: Application): void
  scaleApplication(fleet: Fleet, app: Application): void
};