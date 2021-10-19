import {ContractPromise, u128} from "near-sdk-as";
import {Context, ContractPromiseBatch, logging, storage} from "near-sdk-core"
import {MIN_ACCOUNT_BALANCE, XCC_GAS} from "../../../utils"
import {Task, TASK_KEY, TaskStatus} from "./models";

@nearBindgen
export class TaskContract {
    init(name: string, description: string, attachedDeposit: u128): void {
        // contract may only be initialized once
        assert(!is_initialized(), "Contract is already initialized.");

        // storing task metadata requires some storage staking (balance locked to offset cost of data storage)
        assert(
            u128.ge(Context.attachedDeposit, MIN_ACCOUNT_BALANCE),
            "Minimum account balance must be attached to initialize this contract (3 NEAR)"
        );

        assert(name.length > 0, "Task name may not be blank");

        Task.create(name, description, attachedDeposit)
    }

    get_task(): Task {
        return Task.get()
    }

    assign_task_to_me(): void {
        let task = Task.get()

        assert(task.assigner == null, "Task is already assigned")

        task.assigner = Context.sender

        Task.set(task)
    }

    start_processing_task(): void {
        let task = Task.get()

        assert(task.assigner == Context.sender, "The task is not assigned to you")
        assert(task.status == TaskStatus.OPEN, "Task can't be moved to review. Invalid status: " + task.status.toString())

        task.status = TaskStatus.IN_PROGRESS

        Task.set(task)
    }

    send_task_to_review(): void {
        let task = Task.get()

        assert(task.assigner == Context.sender, "The task is not assigned to you")
        assert(task.status == TaskStatus.IN_PROGRESS, "Task can't be moved to review. Invalid status: " + task.status.toString())

        task.status = TaskStatus.WAITING_FOR_REVIEW

        Task.set(task)
    }


    complete_task(): void {
        let task = Task.get()

        assert(task.owner == Context.sender, "Only owner can complete task")

        let promise = ContractPromiseBatch.create(task.assigner)
            .transfer(u128.sub(task.attachedDeposit, u128.mul(u128.fromU64(XCC_GAS), u128.from(2))))

        promise.then(Context.contractName).function_call("on_transfer_completed", '{}', u128.Zero,
            XCC_GAS)

        Task.set(task)
    }

    on_transfer_completed(): void {
        let task = Task.get()
        let results = ContractPromise.getResults();
        let rewardsSent = results[0];

        switch (rewardsSent.status) {
            case 0:
                // promise result is not complete
                logging.log("Sending rewards for [ " + task.assigner + " ] is pending")
                break;
            case 1:
                // promise result is complete and successful
                logging.log("Sending rewards for [ " + task.assigner + " ] succeeded")
                task.status = TaskStatus.COMPLETED
                Task.set(task)
                break;
            case 2:
                // promise result is complete and failed
                logging.log("Sending rewards for [ " + task.assigner + " ] failed")
                break;

            default:
                logging.log("Unexpected value for promise result [" + rewardsSent.status.toString() + "]");
                break;
        }
    }


}

function is_initialized(): bool {
    return storage.hasKey(TASK_KEY);
}
