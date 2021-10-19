import { PersistentSet, storage, u128 } from "near-sdk-as"
import {AccountId} from "../../../utils";
import {TaskStatus} from "../../task/assembly/models";

export const CONTAINER_KEY = "task-container"

@nearBindgen
export class TaskContainer {

    static create(): void {
        this.set(new TaskContainer())
    }

    static get(): TaskContainer {
        return storage.getSome<TaskContainer>(CONTAINER_KEY)
    }

    static set(taskContainer: TaskContainer): void {
        storage.set(CONTAINER_KEY, taskContainer)
    }

    static getTaskList(): AccountId[] {
        return tasks.values()
    }

    static has_task(accountId: string): bool {
        return tasks.has(accountId);
    }

    static add_task(task: AccountId): void {
        tasks.add(task)
    }
}


@nearBindgen
export class TaskInitArgs {
    constructor(
        public name: string,
        public description: string,
        public attachedDeposit: u128
    ) { }
}

@nearBindgen
export class TaskNameAsArg {
    constructor(
        public taskId: AccountId
    ) { }
}

const tasks = new PersistentSet<AccountId>("t")
