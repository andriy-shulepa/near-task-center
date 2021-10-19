import {Context, storage, u128} from "near-sdk-as"
import {AccountId} from "../../../utils";


export const TASK_KEY = "task"

@nearBindgen
export class Task {
    owner: AccountId = Context.sender;
    assigner: string;
    status: TaskStatus = TaskStatus.OPEN

    constructor(
        public name: string,
        public description: string,
        public attachedDeposit: u128
    ) {
    }

    static create(name: string, description: string, attachedDeposit: u128): void {
        this.set(new Task(name, description, attachedDeposit))
    }

    static get(): Task {
        return storage.getSome<Task>(TASK_KEY)
    }

    static set(task: Task): void {
        storage.set(TASK_KEY, task)
    }
}

export enum TaskStatus {
    OPEN = 0,
    IN_PROGRESS = 1,
    WAITING_FOR_REVIEW = 2,
    COMPLETED = 3
}
