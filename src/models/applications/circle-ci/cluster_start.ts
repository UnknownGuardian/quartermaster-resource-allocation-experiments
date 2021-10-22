import cluster, { worker } from 'cluster';
import { cpus } from 'os';
import process from 'process';
import { unparse, parse } from "papaparse"
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "fs";
import { join } from "path";
import { runJob } from '.';


type ProgressMessage = { id: number, current: number, total: number }
type PrimaryCommand = { cmd: string, data: any }
type WorkerCommand = { cmd: string, data: any }

/**
 * Might look something like this:
 * 
 * Primary reads simulation.json and input_params.txt
 * Decides how many workers, N, to spin up. (1 less than ALL CPUs)
 * Divides the input_params into N groups
 * Sends input_params group to applicable worker
 * After worker finishes each, it reports completion rate  (todo)
 *       and writes file with correct ID
 * 
 * Master periodically prints out progress of each
 * When master gets all, it terminates (todo)
 */

type Work = { id: number, inputs: number[] }
type Job = { outputDir: string, model: string, work: Work[] }
const jobs: Job[] = [];


let numWorkersDoingSomething = 0;
let printInterval: NodeJS.Timeout;


// When updating to Node 16, this needs to be cluster.isPrimary
if (cluster.isMaster) {
  primaryStartup();
} else {
  workerStartup();
}

function primaryStartup(): void {

  // Read the inputs needed to run the simulations
  const outputDirectory = join(__dirname, "..", "..", "..", "out", "case-studies");

  // Consisting of 1) The simulation JSON 
  const simulationPath = join(outputDirectory, "simulation.json");
  const simulationData = require(simulationPath);
  const scenarioName = simulationData.scenario;

  // and 2) The inputs to each simulation
  const paramPath = join(outputDirectory, "param_values.txt");
  const paramFile = readFileSync(paramPath, 'utf-8')
  const paramCSV: number[][] = parse(paramFile, { delimiter: " ", dynamicTyping: true }).data as number[][];

  // Prepare a new directory for a copy of the inputs and all the outputs to be dumped
  const timeseriesDir = join(outputDirectory, `results-${scenarioName}-${+new Date()}`)
  mkdirSync(timeseriesDir);
  copyFileSync(paramPath, join(timeseriesDir, "param_values.txt"))
  copyFileSync(simulationPath, join(timeseriesDir, "simulation.json"))
  for (const model of simulationData.models) {
    const modelDir = join(timeseriesDir, model)
    mkdirSync(modelDir);
    const outputDir = join(timeseriesDir, model, "sim");
    mkdirSync(outputDir);
  }

  // break up the inputs into chunks we can send to workers
  createJobs(timeseriesDir, simulationData, paramCSV);


  const progressMessages: ProgressMessage[] = [];

  printInterval = setInterval(() => {
    console.log(`\t\t\t\t\t\t\t\t\t\t\t\t${jobs.length} Jobs Available`);
  }, 10_000);

  function messageHandler(msg: PrimaryCommand) {
    if (msg.cmd == "progress_report") {
      const prog = msg.data as ProgressMessage;
      progressMessages[prog.id] = prog;
    }
    else if (msg.cmd == "request_task") {
      const workerId = msg.data as string;
      assignTask(workerId);
    }
    //progressMessages[msg.id] = msg;
  }

  const allowedCPUS: number = process.argv.length > 2 ? parseInt(process.argv[2]) : -1;
  if (allowedCPUS == -1) {
    const numCPUs = cpus().length;
    const cpusToUse = numCPUs > 2 ? numCPUs - 1 : 1;
    console.log(`Defaulting to ${cpusToUse} threads`)
    for (let i = 0; i < cpusToUse; i++) {
      cluster.fork();
      numWorkersDoingSomething++;
    }
  } else {
    console.log(`Configured to use ${allowedCPUS} threads`)
    for (let i = 0; i < allowedCPUS; i++) {
      cluster.fork();
      numWorkersDoingSomething++;
    }
  }

  for (const id in cluster.workers) {
    // add progressListeners
    cluster.workers[id]?.on('message', messageHandler);
  }
  console.log("Master is Up");
  console.log(`${jobs.length} Jobs Available`)
}

// PRIMARY FUNCTIONS
function createJobs(outputDir: string, simulationData: any, paramCSV: number[][]): void {
  const workSize = 10;

  for (const model of simulationData.models) {
    let work: Work[] = [];
    // loop to data.length - 1 since last row is empty
    for (let i = 0; i < paramCSV.length - 1; i++) {
      work.push({ id: i, inputs: paramCSV[i] })
      if (work.length >= workSize) {
        jobs.push({ outputDir, model, work });
        work = [];
      }
    }
    // remainder
    if (work.length > 0) {
      jobs.push({ outputDir, model, work });
    }
  }
}

function assignTask(workerId: string): void {
  const first = jobs.shift();
  if (first) {
    cluster.workers[workerId]?.send({ cmd: "assign_task", data: first })
    return;
  }

  numWorkersDoingSomething--;
  console.log(`[P] No more tasks available! (Jobs: ${jobs.length}, Workers Still Running: ${numWorkersDoingSomething})`)
  if (numWorkersDoingSomething == 0) {
    clearInterval(printInterval);
    console.log('[P] Simulation Complete.')

    for (var id in cluster.workers) {
      cluster.workers[id]?.kill();
    }

    // exit the master process
    process.exit(0);
  }
}


// WORKER FUNCTIONS
function workerStartup(): void {
  console.log(`[Worker] ${process.pid} started`);
  // set up communications
  process.on('message', workerMessageHandler);

  // request first task
  if (process)
    process.send!({ cmd: "request_task", data: cluster.worker.id })
}

async function workerMessageHandler(msg: WorkerCommand): Promise<void> {
  if (msg.cmd == "assign_task") {
    const job = msg.data as Job;
    console.log(`[Worker] ${process.pid} got a Task: Model ${job.model}, ${job.work.length} inputs to run`);

    // process job
    await runJob(job.outputDir, job.model, job.work);

    // get another task if there is any
    process.send!({ cmd: "request_task", data: cluster.worker.id })
    return;
  }
  console.warn(`[Worker] ${process.pid} got unhandled Message (${msg.cmd})`);
}


