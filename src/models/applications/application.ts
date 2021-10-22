import { ResourceStage } from "..";

export type Application = {
  name: string,
  subsystems: ResourceStage[];
}