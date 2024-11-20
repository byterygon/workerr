import { expect, test, describe, it, vi, beforeEach } from 'vitest'
import { WorkerrController } from '../lib/workerrController'
import { Workerr } from '../lib/workerrThread'

class WorkerMock implements Worker {
    private port: MessagePort
    constructor(port: MessagePort) {
        this.port = port
    }
    onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null
    onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = null

    postMessage(message: any, transfer?: Transferable[] | StructuredSerializeOptions): void {
        this.port.postMessage(message, transfer as Transferable[])
    }
    terminate(): void {
        this.port.close()
    }
    addEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void {
        //@ts-ignore
        this.port.addEventListener(type, listener, options)

    }
    removeEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void {
        //@ts-ignore
        this.port.removeEventListener(type, listener, options)

    }
    dispatchEvent(event: Event): boolean {
        return this.port.dispatchEvent(event)
    }
    onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null

}




declare var port1: MessagePort


describe("Test Workerr Controller Flow", () => {
    beforeEach(() => {
        const messageChannel = new MessageChannel()
        vi.stubGlobal("port1", messageChannel.port1)
        vi.stubGlobal("self", messageChannel.port2)
    })
    it("Fast init", () => {
        WorkerrController.create({
            workerType: "instance",
            worker: () => new WorkerMock(port1),
            context: {}
        })

        Workerr.create({})

    })
    it("slow init", async () => {
        const workerrControllerPromise = WorkerrController.create({
            workerType: "instance",
            worker: () => new WorkerMock(port1),
            context: {}
        })
        setTimeout(() => {
            Workerr.create({})
        }, 5001)
        await expect(workerrControllerPromise).rejects.toThrowError()
    })
    it("Init with callback", async () => {
        const workerrControllerPromise = WorkerrController.create({
            workerType: "instance",
            worker: () => new WorkerMock(port1),
            context: {}
        })
        setTimeout(() => {
            Workerr.create({})
        }, 10000)
        console.log(await workerrControllerPromise)
        // await expect(workerrControllerPromise).rejects.toThrowError()?
    })
})