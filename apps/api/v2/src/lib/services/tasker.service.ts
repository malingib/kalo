import { getTasker, type Tasker } from "@kalo/platform-libraries/tasker";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TaskerService {
  private readonly tasker: Tasker;

  constructor() {
    this.tasker = getTasker();
  }

  getTasker(): Tasker {
    return this.tasker;
  }
}
