import { GreedyAllocation } from "../models/allocation-strategies";
import { createCircleCIApplication } from "../models/applications/circle-ci/circle-ci-app";
import { Fleet } from "../models/data-centers/example";

const fleet = new Fleet(80, 20);
const allocationStrategy = new GreedyAllocation();
fleet.setAllocationStrategy(allocationStrategy);

const circleCI = createCircleCIApplication();
fleet.addApplications([circleCI]);


console.log(fleet.toString());
console.log(circleCI.toString());
