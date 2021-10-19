import {ContractPromise, u128} from "near-sdk-as";
import {Context, storage, env, ContractPromiseBatch, base58, logging} from "near-sdk-core"
import {AccountId, MIN_ACCOUNT_BALANCE, XCC_GAS} from "../../../utils"
import {TaskContainer, TaskInitArgs, CONTAINER_KEY, TaskNameAsArg} from "./models";

const CODE = includeBytes("../../../../build/release/task.wasm")

@nearBindgen
export class ContainerContract {

    init(): void {
        // contract may only be initialized once
        assert(!is_initialized(), "Contract is already initialized.");

        // storing task metadata requires some storage staking (balance locked to offset cost of data storage)
        assert(
            u128.ge(Context.attachedDeposit, MIN_ACCOUNT_BALANCE),
            "Minimum account balance must be attached to initialize this contract (3 NEAR)"
        );

        TaskContainer.create()

        logging.log("Task container was created")
    }

    get_task_list(): AccountId[] {
       return TaskContainer.getTaskList()
    }

    add_task(
        taskId: AccountId,
        name: string,
        description: string,
    ): void {
        const accountId = full_account_for(taskId)

        assert(env.isValidAccountID(accountId), "Task name must be valid NEAR account name")
        assert(!TaskContainer.has_task(accountId), "Task name already exists")

        logging.log("attempting to create task")

        let promise = ContractPromiseBatch.create(accountId)
            .create_account()
            .deploy_contract(Uint8Array.wrap(changetype<ArrayBuffer>(CODE)))
            .add_full_access_key(base58.decode(Context.senderPublicKey))

        promise.function_call(
            "init",
            new TaskInitArgs(name, description, Context.attachedDeposit),
            Context.attachedDeposit,
            XCC_GAS
        )

        promise.then(Context.contractName).function_call(
            "on_task_created",
            new TaskNameAsArg(accountId),
            u128.Zero,
            XCC_GAS
        )
    }

    on_task_created(taskId: AccountId): void {
        let results = ContractPromise.getResults();
        let taskCreated = results[0];

        switch (taskCreated.status) {
            case 0:
                // promise result is not complete
                logging.log("Task creation for [ " + full_account_for(taskId) + " ] is pending")
                break;
            case 1:
                // promise result is complete and successful
                logging.log("Task creation for [ " + full_account_for(taskId) + " ] succeeded")
                TaskContainer.add_task(taskId)
                break;
            case 2:
                // promise result is complete and failed
                logging.log("Task creation for [ " + full_account_for(taskId) + " ] failed")
                break;

            default:
                logging.log("Unexpected value for promise result [" + taskCreated.status.toString() + "]");
                break;
        }
    }
}

function is_initialized(): bool {
    return storage.hasKey(CONTAINER_KEY);
}

function full_account_for(task: string): string {
    return task + "." + Context.contractName
}
