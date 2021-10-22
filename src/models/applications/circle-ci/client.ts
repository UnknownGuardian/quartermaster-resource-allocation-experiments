import { Stage, Event, metronome, stats } from "@byu-se/quartermaster";
import { SAMPLE_DURATION } from ".";
import { ResourceStage } from "../..";
import { mean } from "../../../util";


type Hook = (event: Event) => void

/**
 * No request queue/pool
 * No dependency queue/pool
 */
export class Client extends ResourceStage {
  // stats
  public load: number = 0;
  public latencies: number[] = [];
  public availabilities: number[] = [];
  public events: Event[] = [];


  // internal behavior
  public beforeHook: Hook | null = null;

  constructor(public wrapped: Stage) {
    super(1, 10);
    metronome.setInterval(() => {
      stats.record("tick", metronome.now());
      stats.record("loadFromSimulation", this.load);
      stats.record("meanLatencyFromY", mean(this.latencies));
      stats.record("meanAvailabilityFromY", mean(this.availabilities));
      stats.record("events", this.events);
      this.load = 0;
      this.latencies = [];
      this.availabilities = [];
      this.events = [];
    }, SAMPLE_DURATION)
  }


  protected async add(event: Event): Promise<void> {
    this.load++;
    return super.add(event);
  }

  async workOn(event: Event): Promise<void> {
    if (this.beforeHook)
      this.beforeHook(event);

    const n = metronome.now();
    //await this.wrapped.accept(event).finally(() => this.latencies.push(metronome.now() - n));
    try {
      await this.wrapped.accept(event)
      this.availabilities.push(1);
    } catch (e) {
      this.availabilities.push(0);
      throw e;
    } finally {
      this.events.push(event);
      this.latencies.push(metronome.now() - n)
    }
  }

}