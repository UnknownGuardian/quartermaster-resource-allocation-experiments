import { ResourceStage } from "..";

export class Application {
  constructor(public name: string, public subsystems: ResourceStage[]) { }
  public toString(): string {
    let subsystemToStrings = "";
    for (const s of this.subsystems) {
      subsystemToStrings += "\t" + s.toString() + "\n"
    }
    return `Application: ${this.name}\n` + "=============================\n" + subsystemToStrings;
  }
}