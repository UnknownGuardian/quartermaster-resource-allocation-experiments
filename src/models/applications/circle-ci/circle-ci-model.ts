import { BuildService } from "./build-service";
import { Client } from "./client";
import { Database } from "./database"

export interface CircleCIModel {
  db: Database;
  service: BuildService
  client: Client
}