import { AllocationStrategy, GreedyAllocation } from "../../allocation-strategies";
import { Application } from "../../applications";

export class Fleet {

  public allocationStrategy?: AllocationStrategy;

  public usedMemory: number = 0;
  public usedCores: number = 0;

  constructor(public memory: number, public cores: number) { }

  public addApplications(apps: Application[]): void {
    if (!this.allocationStrategy) {
      console.error("no allocation strategy defined");
      return;
    }
    for (let i = 0; i < apps.length; i++) {
      console.log(`Fleet.addApplication(${apps[i].name})`)
      this.allocationStrategy.addApplication(this, apps[i]);
    }
  }

  public setAllocationStrategy(allocationStrategy: GreedyAllocation) {
    this.allocationStrategy = allocationStrategy;
  }

  public toString(): string {
    return `Fleet (used/capacity): memory = ${this.usedMemory}/${this.memory}, cores = ${this.usedCores}/${this.cores}`;
  }
}