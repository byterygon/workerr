import PQueue from "p-queue";
import { WorkerrController } from "../lib/workerrController";
import { Commands, Context } from "./commands";

const delay = (time: number) => new Promise((_, reject) => {
    setTimeout(() => {
        reject(time)
    }, time)
})
const main = async () => {
    const workerController = await WorkerrController.create<Commands>({
        'workerType': "instance",
        worker: () => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
        context: { baseZero: 1 },
        concurrency: 1
    })


    // const result = await workerController.excecuteAsync("sum", { a: 10, b: 20 })
    // console.log(result)
    const controller = AbortSignal.timeout(1000)

    workerController.excecuteAsync("abort", {}, {
        abortSignal: controller
    }).then(console.log)
    workerController.excecuteAsync("sum", { a: 1, b: 2 }, {
    }).then(console.log)

    const uInt8Array = new Uint8Array(1024 * 1024 * 8).map((v, i) => i);
    workerController.excecuteAsync("transferable", { uint8: uInt8Array }, { transfer: [uInt8Array.buffer] }).then(({ uint8 }) => {
        console.log(uint8.length)
    })
    console.log(uInt8Array.byteLength);
}

main()


