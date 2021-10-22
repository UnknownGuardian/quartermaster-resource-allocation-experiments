import { createCircleCIApplication } from "../models/applications/circle-ci/circle-ci-app";
import { Fleet } from "../models/data-centers/example";

const fleet = new Fleet();
const circleCI = createCircleCIApplication();
fleet.addApplications([circleCI]);
