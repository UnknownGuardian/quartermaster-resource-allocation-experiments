export const SAMPLE_DURATION = 1000;

import { unparse, parse } from "papaparse"
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { stats, simulation, Event, metronome, MathFunctions } from "@byu-se/quartermaster";
import { CircleCIModel } from "./circle-ci-model";
import { createModelOriginal } from "./model_original";
import { createModelA } from "./model_a";
import { createModelB } from "./model_b";
import { createModelC } from "./model_c";
import { SeededMath } from "../../../util";



// Quartermaster Functions for Workers
export async function runJob(outputDir: string, model: string, work: { id: number, inputs: number[] }[]): Promise<void> {
  const simOutputDir = join(outputDir, model, "sim");

  for (let i = 0; i < work.length; i++) {
    const id = work[i].id;
    const params = work[i].inputs;

    console.log(`Simulation: ${i + 1}/${work.length}`, params)
    await runInstance(model, params, simOutputDir, id);
  }
}

function getModelFromModelName(modelName: string): CircleCIModel {
  if (modelName == "O")
    return createModelOriginal()
  if (modelName == "A")
    return createModelA();
  if (modelName == "B")
    return createModelB();
  if (modelName == "C")
    return createModelC();
  throw `Cannot find a model with name ${modelName}`;
}

function reset() {
  // reset the environment
  simulation.reset();
  metronome.resetCurrentTime();
  stats.reset();
  SeededMath.reseed();
  // 2 samples to see if stuff changes.
  SeededMath.random();
  SeededMath.random();

  MathFunctions.random = SeededMath.random
}

const t1 = 8000;
const t2End = 20000;

function scenario(model: CircleCIModel, params: number[]) {
  simulation.keyspaceMean = 1000;
  simulation.keyspaceStd = 200;

  //simulation.eventsPer1000Ticks = 4500;
  simulation.eventsPer1000Ticks = params[0];
  metronome.setTimeout(() => {
    simulation.eventsPer1000Ticks = params[3];
  }, t1)

  model.db.latencyBase = params[1];
  model.db.availability = params[2];
}

async function runInstance(modelName: string, params: number[], simOutputDir: string, id: number) {
  reset()
  const model = getModelFromModelName(modelName);
  scenario(model, params);

  const eventsToSend = Math.floor((t1 / 1000 * params[0]) + ((t2End - t1) / 1000 * params[3]) + 5000);
  const events = await simulation.run(model.client, eventsToSend);

  const accepted = events.filter(x => x.response === "success")
  const rejected = events.filter(x => x.response != "success")

  const meanQueueTimeAccepted = (events: Event[]) => {
    return events.reduce((acc: number, curr: Event) => {
      const stage = curr.stageTimes.find(x => x.stage == 'BuildService');
      return acc + (stage?.queueTime || 0);
    }, 0) / events.length
  }

  const queueTimeCounter = (acc: number, curr: Event) => {
    const stage = curr.stageTimes.find(x => x.stage == 'BuildService');
    return acc + (stage?.queueTime || 0);
  };


  const meanQueueTime = model.service.time.queueTime / events.length;
  const meanQueueTimeSuccess = accepted.reduce(queueTimeCounter, 0) / accepted.length;
  const meanQueueTimeFailed = rejected.reduce(queueTimeCounter, 0) / rejected.length;
  stats.max('mean-time-in-queue', meanQueueTime);
  stats.max('mean-time-in-queue-success', meanQueueTimeSuccess);
  stats.max('mean-time-in-queue-failed', meanQueueTimeFailed);

  stats.max('throughput', events.length / metronome.now());
  stats.max('recovery-time', metronome.now());

  //stats.summary();

  /*
  console.log('rejected-queue-events', stats.get('rejected-queue-events'))
  console.log('max-queue-size', stats.get('max-queue-size'))
  console.log('mean-time-in-queue', meanQueueTime);
  console.log('mean-time-in-queue-success', meanQueueTimeSuccess);
  console.log('mean-time-in-queue-failed', meanQueueTimeFailed);

  console.log('throughput', events.length / metronome.now());
  console.log('recovery-time', metronome.now());
  */

  const file = join(simOutputDir, `${modelName}-${id}-out.csv`)
  record(file);
}



export function record(filename: string): void {
  const tick: number[] = stats.getRecorded("tick");
  const loadFromX: number[] = stats.getRecorded("loadFromX");
  const loadFromY: number[] = stats.getRecorded("loadFromY");
  const meanLatencyFromY: number[] = stats.getRecorded("meanLatencyFromY");
  const meanLatencyFromZ: number[] = stats.getRecorded("meanLatencyFromZ");
  const meanAvailabilityFromY: number[] = stats.getRecorded("meanAvailabilityFromY");
  const meanAvailabilityFromZ: number[] = stats.getRecorded("meanAvailabilityFromZ");
  const throughput: number[] = stats.getRecorded("throughput");
  const zCapacity: number[] = stats.getRecorded("zCapacity");
  const queueSize: number[] = stats.getRecorded("queue-size");

  const rows: IncidentPollRow[] = tick.map<IncidentPollRow>((_, index) => {
    return {
      tick: tick[index],
      loadFromX: loadFromX[index],
      loadFromY: loadFromY[index],
      meanLatencyFromY: meanLatencyFromY[index],
      meanLatencyFromZ: meanLatencyFromZ[index],
      meanAvailabilityFromY: meanAvailabilityFromY[index],
      meanAvailabilityFromZ: meanAvailabilityFromZ[index],
      throughput: throughput[index],
      zCapacity: zCapacity[index],
      queueSize: queueSize[index]
    }
  });


  const csv = unparse(rows);
  writeFileSync(filename, csv)
}


/**
 * (R) If it has the word "mean", then it is a per event.
 * Otherwise, it may be 
 * 1) (V) the value at the end of the time slice
 * 2) (C) a count of how many things happened during the time slice
 * 3) (-1) unimplemented
 */
export type IncidentPollRow = {
  tick: number
  loadFromX: number, // C
  loadFromY: number, // C
  meanLatencyFromY: number, // R
  meanLatencyFromZ: number, // R
  meanAvailabilityFromY: number, // R
  meanAvailabilityFromZ: number, // R
  throughput: number, // R
  zCapacity: number, // V
}