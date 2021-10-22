import { Application } from "..";
import { createModelB } from "./model_b";


export function createCircleCIApplication(): Application {
  const b = createModelB();
  return {
    name: "CircleCI",
    subsystems: [b.client, b.service, b.db]
  }
}
