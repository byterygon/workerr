import PQueue from "p-queue";
import { MainThreadTypePayloadMap, MessageData, WorkerMessages } from "./message";
import { uuid } from "./utils";
import { InvokeHandlers } from "./command";
import EventEmitter from "events";


interface WorkerrControllerConstructorBase<IContext extends object> {
    concurrency?: number
    context: IContext
}
interface WorkerrControllerConstructorWithUrl {
    workerType: 'url';
    worker: string;
    workerOptions?: WorkerOptions;
}
interface WorkerrControllerConstructorWithFactory {
    workerType: 'instance';
    worker: (() => Worker)
}
export type WorkerControllerConstructor<IContext extends object> = WorkerrControllerConstructorBase<IContext> & (WorkerrControllerConstructorWithUrl | WorkerrControllerConstructorWithFactory)

interface WorkerrControllerEventMap {
    "ready": []
}
export class WorkerrController<IRequests extends InvokeHandlers<IContext>, IContext extends object> {
    private worker: Worker
    private taskQueue: PQueue | undefined
    private concurrency: number
    private context: IContext
    private eventEmitter = new EventEmitter<WorkerrControllerEventMap>()

    private readyPromise: Promise<boolean>
    public ready = false
    private terminated = false

    // hide constructor, makesure WorkerrController only init by createWorkerrController
    private constructor(options: WorkerControllerConstructor<IContext>) {
        // eslint-disable-next-line no-useless-catch
        try {
            // init worker
            if (typeof options.worker === 'string') {
                let _workerOptions: WorkerOptions | undefined
                if ("workerOptions" in options) {
                    _workerOptions = options.workerOptions
                }
                this.worker = new Worker(options.worker, _workerOptions);
            } else {
                this.worker = options.worker()
            }
            this.context = options.context ?? {} as IContext
            // init queue, if concurrency is infinity -> don't have to use queue
            this.concurrency = options.concurrency || Infinity
            if (Number.isFinite(this.concurrency) && this.concurrency >= 1) {
                this.taskQueue = new PQueue({ concurrency: this.concurrency })
            }



            // wait worker warmup
            this.readyPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Cannot initialized worker"))
                }, 5 * 1000)
                const initializeListener = (event: MessageEvent<WorkerMessages>) => {
                    switch (event.data.messageType) {
                        case "initialization:start":
                            clearTimeout(timeout)
                            break

                        case "initialization:error":
                            reject(Error)
                            this.worker.removeEventListener("message", initializeListener)
                            break
                        case "initialization:complete":
                            this.ready = true
                            this.postMessage({
                                messageType: "initialization:ack",
                                messagePayload: undefined
                            })
                            this.updateContext(() => this.context)
                            this.worker.removeEventListener("message", initializeListener)
                            this.eventEmitter.emit("ready")
                            resolve(true)
                            break

                    }
                }
                this.worker.addEventListener("message", initializeListener)
            })



        } catch (error) {
            throw error
        }
    }
    public static create<IRequests extends InvokeHandlers<IContext>, IContext extends object = IRequests extends InvokeHandlers<infer _IContext> ? _IContext : never>(options: WorkerControllerConstructor<IContext>) {
        const workerrController = new WorkerrController<IRequests, IContext>(options)
        return workerrController
    }



    private postMessage<K extends keyof MainThreadTypePayloadMap>(message: Omit<MessageData<MainThreadTypePayloadMap, K>, "messageId" | "timestamp"> & Partial<Pick<MessageData<MainThreadTypePayloadMap, K>, "messageId" | "timestamp">>, options?: Transferable[] | StructuredSerializeOptions) {
        this.worker.postMessage({
            ...message,
            messageId: message.messageId ?? uuid(),
            timestamp: message.timestamp ?? Date.now(),
        } as MessageData<MainThreadTypePayloadMap, K>, options as Transferable[])
    }
    public async awaitReady() {
        await this.readyPromise
    }
    public async updateContext(updater: (context: IContext) => IContext) {
        if (this.terminated) {
            throw new Error("Workerr had been terminated")
        }
        this.context = updater(this.context)
        this.postMessage({
            messageType: "context:update",
            messagePayload: this.context
        })
    }
    private _invoke<IRequestName extends keyof IRequests>(cmd: IRequestName, params: Parameters<IRequests[IRequestName]>[0], options?: {
        abortSignal?: AbortSignal,
        transfer?: Transferable[]
    }) {
        return new Promise<ReturnType<IRequests[IRequestName]>>((resolve, reject) => {
            const messageId = uuid()
            let abortSignalChannelPort1: MessagePort | undefined
            let abortSignalChannelPort2: MessagePort | undefined
            if (options?.abortSignal) {
                const channel = new MessageChannel()
                abortSignalChannelPort1 = channel.port1
                abortSignalChannelPort2 = channel.port2

            }
            const abortListener = (ev: Event) => {
                const target = ev.target as AbortSignal
                abortSignalChannelPort1?.postMessage(target.reason)

            }

            options?.abortSignal?.addEventListener("abort", abortListener, { once: true })

            const listener = (event: MessageEvent<WorkerMessages>) => {
                let message = event.data
                if ((message.messageType === "excecute:error" || message.messageType === "excecute:response") && message.messagePayload.messageId === messageId) {

                    switch (message.messageType) {
                        case "excecute:response":
                            this.worker.removeEventListener("message", listener)
                            resolve(message.messagePayload.result as ReturnType<IRequests[IRequestName]>)
                            break
                        case "excecute:error": {
                            this.worker.removeEventListener("message", listener)
                            reject(message.messagePayload.error as ReturnType<IRequests[IRequestName]>)
                            break
                        }

                    }
                    options?.abortSignal?.removeEventListener("abort", abortListener)
                    abortSignalChannelPort1?.close()

                }
            }
            this.worker.addEventListener("message", listener)
            //TODO: add messageerror listener
            this.postMessage({
                messageType: "excecute:start",
                messagePayload: {
                    cmd: cmd as string,
                    params,
                    abortSignalChannelPort: abortSignalChannelPort2
                },
                messageId
            }, { transfer: [...options?.transfer ?? [], ...(abortSignalChannelPort2 ? [abortSignalChannelPort2] : [])] })
        })
    }
    public async invoke<IRequestName extends keyof IRequests>(cmd: IRequestName, params: Parameters<IRequests[IRequestName]>[0], options?: {
        abortSignal?: AbortSignal,
        transfer?: Transferable[]
    }) {
        if (this.terminated) {
            throw new Error("Workerr had been terminated")
        }
        if (this.taskQueue) {
            return this.taskQueue.add(({ signal }) => this._invoke(cmd, params, {
                ...options,
                abortSignal: signal
            }), { signal: options?.abortSignal })
        }
        return this._invoke(cmd, params, options)
    }
    public send() {
        if (this.terminated) {
            throw new Error("Workerr had been terminated")
        }
    }
    public streamingRequest() {
        if (this.terminated) {
            throw new Error("Workerr had been terminated")
        }
    }

    public addListener<Event extends keyof WorkerrControllerEventMap>(eventName: Event, listener: Event extends "ready" ? WorkerrControllerEventMap[Event] extends unknown[] ? (...args: WorkerrControllerEventMap[Event]) => void : never : never) {
        if (this.terminated) {
            throw new Error("Workerr had been terminated")
        }
        this.eventEmitter.addListener(eventName, listener)
    }

    public removeListener<Event extends keyof WorkerrControllerEventMap>(eventName: Event, listener: Event extends "ready" ? WorkerrControllerEventMap[Event] extends unknown[] ? (...args: WorkerrControllerEventMap[Event]) => void : never : never) {
        if (this.terminated) {
            throw new Error("Workerr had been terminated")
        }
        this.eventEmitter.removeListener(eventName, listener)
    }
    public removeAllListeners(eventName?: keyof WorkerrControllerEventMap) {
        if (this.terminated) {
            throw new Error("Workerr had been terminated")
        }
        this.eventEmitter.removeAllListeners(eventName)
    }
    public terminate() {
        this.worker.terminate()
        this.removeAllListeners()
    }
}