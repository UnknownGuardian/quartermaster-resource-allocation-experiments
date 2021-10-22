import { Stage, FIFOServiceQueue, Event, metronome, normal, exponential, stats } from "@byu-se/quartermaster";
import { SAMPLE_DURATION } from ".";
import { ResourceStage } from "../..";
import { SeededMath } from "../../../util";

export class Database extends ResourceStage {
  public load: number = 0;

  public concurrent: number = 0;
  public latencyA = 0.06;
  public latencyB = 1.06;
  public latencyBase = 30;

  public availability = 0.9995;
  public deadlockThreshold = 70;
  public deadlockAvailability = 0.7;

  constructor() {
    super(10, 1);
    this.inQueue = new FIFOServiceQueue(0, 300);

    metronome.setInterval(() => {
      stats.record("loadFromY", this.load);
      stats.record("zCapacity", this.inQueue.getNumWorkers() || 0);
      this.load = 0;
    }, SAMPLE_DURATION)

  }

  protected async add(event: Event): Promise<void> {
    this.load++;
    return super.add(event);
  }

  async workOn(event: Event): Promise<void> {
    const avail = SeededMath.random();

    this.concurrent++;
    const mean = this.latencyBase + exponential(this.latencyA, this.latencyB, this.concurrent);
    const std = 5 + mean / 500;
    const latency = this.seededNormal(mean, std);

    await metronome.wait(latency);

    if (this.concurrent >= this.deadlockThreshold) {
      if (avail > this.deadlockAvailability) {
        this.concurrent--;
        throw "fail";
      }
    } else {
      if (avail > this.availability) {
        this.concurrent--;
        throw "fail";
      }
    }
    this.concurrent--;
  }

  private seededNormal(mean: number, std: number): number {
    return Math.floor(this.seededStandardNormal() * std + mean);
  }

  private seededStandardNormal(): number {
    let u: number = 0;
    let v: number = 0;
    while (u == 0)
      u = SeededMath.random();
    while (v == 0)
      v = SeededMath.random();
    const value = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    if (isNaN(value)) {
      console.error("NAN achieved with values", u, v)
    }
    return value
  }
}