import { WorkerrController } from "../workerrController";
import { Commands, Context } from "./commands";


const main = async () => {
    const workerController = await WorkerrController.create<Commands, Context>({
        'workerType': "instance",
        worker: () => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
        context: {baseZero: 1}
    })
    const result = await workerController.excecuteAsync("sum", {a: 10, b: 20})
    console.log(result)
}

main()