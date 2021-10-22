import { Stage } from "@byu-se/quartermaster";

/**
 * A high-level abstraction of an ASG (auto scaling group) which permits applications
 * to be modeled using Quartermaster in their typical usage (a stage represents all
 * the instances of a subsystem) and allows for data center information to be used
 * to influence the scale of a subsystem.
 */
export abstract class ResourceStage extends Stage {
  public instances: number = 0;

  constructor(public instanceMemoryAsk: number, public instanceCoresAsk: number) {
    super();
  }

  public scale(instances: number): void {
    this.instances = instances;
  }
  public toString(): string {
    return `Subsystem ${this.constructor.name}: instances = ${this.instances}, instanceMemoryAsk = ${this.instanceMemoryAsk}, instanceCoresAsk = ${this.instanceCoresAsk}`
  }
}