import { WorkerrController } from "../workerrController";
import { Commands } from "./commands";


const workerController = WorkerrController.create<Commands>({
    'workerType': "instance",
    worker: () => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })
}).then((wc) => {
    wc.excecuteAsync("sum", { a: 1, b: 1 }).then(console.log)
})