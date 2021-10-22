/**
 * An exploration which demonstrates the queue growing and processing halting
 * after traffic exceeds 1900 events / 1000 ticks.
 * 
 * This exploration exists to prove the design of the Database and Build
 * Service appropriately mock the architecture and problems listed in the 
 * incident report.
 * 
 */

import {
  metronome,
  Retry,
  simulation,
  stats, Event, eventSummary, stageSummary
} from "@byu-se/quartermaster";
import { Database } from "./database"
import { BuildService } from "./build-service"
import { Client } from "./client";
import { record } from ".";
import { CircleCIModel } from "./circle-ci-model";


export function createModelOriginal(): CircleCIModel {
  const db = new Database();
  const retry = new Retry(db);
  const service = new BuildService(retry);
  const client = new Client(service);
  //service.inQueue.setCapacity(10000);
  //retry.attempts = 1;

  return {
    db, service, client
  }
}

