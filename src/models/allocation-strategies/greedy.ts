import { ResourceStage } from "..";
import { Application } from "../applications";
import { Fleet } from "../data-centers/example";
import { AllocationStrategy } from "./";

/**
 * Adds and scales up the entire application uniformly.
 */
export class GreedyAllocation implements AllocationStrategy {
  addApplication(fleet: Fleet, app: Application): void {
    const askedCores = sum(app.subsystems.map(x => x.instanceCoresAsk));
    const askedMemory = sum(app.subsystems.map(x => x.instanceMemoryAsk));
    let allocatedCores = 0;
    let allocatedMemory = 0;

    // completes if we get the number of cores (no conditions about memory)
    allocation: while (allocatedCores < askedCores) {
      for (let i = 0; i < app.subsystems.length; i++) {
        const subsystem = app.subsystems[i];
        const { receivedMemory, receivedCores } = this.scaleUpSubsystem(fleet, app, subsystem)

        // early exit if no cores granted
        if (receivedCores == 0) {
          break allocation;
        }
        allocatedCores += receivedCores;
        allocatedMemory += receivedMemory;
      }
    }

    console.log(`GreedyAllocation allocated ${allocatedMemory}/${askedMemory} memory and ${allocatedCores}/${askedCores} cores for the ${app.name} application.`)
  }
  scaleApplication(fleet: Fleet, app: Application): void {

  }
  scaleUpSubsystem(fleet: Fleet, app: Application, subsystem: ResourceStage): { receivedMemory: number, receivedCores: number } {
    const askMemory = subsystem.instanceMemoryAsk;
    const askCores = subsystem.instanceCoresAsk;

    // this strategy requires both core and memory requirements to be fulfilled completely
    // otherwise, it will not grant the ask.
    if (fleet.usedCores + askCores < fleet.cores && fleet.usedMemory + askMemory < fleet.memory) {
      fleet.usedCores += askCores;
      fleet.usedMemory += askMemory;
      subsystem.scale(subsystem.instances + 1);
      return { receivedMemory: askMemory, receivedCores: askCores }
    }
    return { receivedMemory: 0, receivedCores: 0 }
  }
}

function sum(arr: number[]): number {
  return arr.reduce((acc, cur) => acc + cur, 0);
}