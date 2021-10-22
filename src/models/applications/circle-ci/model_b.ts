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
  Retry,
} from "@byu-se/quartermaster";
import { Database } from "./database"
import { BuildService } from "./build-service"
import { Client } from "./client";
import { CircleCIModel } from "./circle-ci-model";

export function createModelB(): CircleCIModel {
  const db = new Database();
  const retry = new Retry(db);
  const service = new BuildService(retry);
  service.inQueue.setNumWorkers(50);
  const client = new Client(service);
  return {
    db, service, client
  }
}