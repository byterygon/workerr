import PQueue from "p-queue";
import { MainThreadTypePayloadMap, MessageData, WorkerMessageTypePayLoadMap } from "./message";
import { uuid } from "./utils";
import { Commands } from "./command";



interface WorkerrControllerConstructorBase<IContext extends object> {
    concurrency?: number
    context?: IContext
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

export class WorkerrController<C extends Commands<IContext>, IContext extends object> {
    private worker: Worker
    private taskQueue: PQueue | undefined
    private concurrency: number
    private context: IContext
    // private eventEmitter = new EventEmitter<WorkerrControllerEventMap>()

    private readyPromise: Promise<boolean>
    public ready = false

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
            if (!Number.isFinite(this.concurrency) && this.concurrency >= 1) {
                this.taskQueue = new PQueue({ concurrency: this.concurrency })
            }



            // wait worker warmup
            this.readyPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Cannot initialized worker"))
                }, 5 * 1000)
                const initializeListener = (event: MessageEvent<MessageData<WorkerMessageTypePayLoadMap>>) => {
                    switch (event.data.messageType) {
                        case "initialization:start":
                            clearTimeout(timeout)
                            break

                        case "initialization:error":
                            reject(Error)
                            this.worker.removeEventListener("message", initializeListener)
                            break
                        case "initialization:complete":
                            resolve(true)
                            this.ready = true
                            this.postMessage({
                                messageType: "initialization:ack",
                                messagePayload: undefined
                            })
                            this.worker.removeEventListener("message", initializeListener)
                            break

                    }
                }
                this.worker.addEventListener("message", initializeListener)
            })



        } catch (error) {
            throw error
        }
    }
    public static async create<IContext extends object>(options: WorkerControllerConstructor<IContext>) {
        const workerrController = new WorkerrController(options)
        await workerrController.awaitReady()
        return workerrController
    }



    private postMessage<K extends keyof MainThreadTypePayloadMap>(message: Omit<MessageData<MainThreadTypePayloadMap, K>, "messageId" | "timestamp"> & Partial<Pick<MessageData<MainThreadTypePayloadMap, K>, "messageId" | "timestamp">>) {
        this.worker.postMessage({
            ...message,
            messageId: message.messageId ?? uuid(),
            timestamp: message.timestamp ?? Date.now(),
        } as MessageData<MainThreadTypePayloadMap, K>)
    }
    private async awaitReady() {
        await this.readyPromise
    }
    public async updateContext(context: IContext) {
        this.postMessage({
            messageType: "context:update",
            messagePayload: context
        })
    }
    private exec<K extends keyof C>(cmd: K, params: Parameters<C[K]>[0], options: Parameters<C[K]>[1]) {
        const listener = (event: MessageEvent<MessageData<WorkerMessageTypePayLoadMap>>) => {

        }
        this.worker.addEventListener("message", listener)


        this.postMessage({
            messageType: "excecute:start",
            messagePayload: {
                cmd: cmd as string,
                params, context: options?.context, abortSignal: options?.abortSignal
            }
        })
    }
    public async excecuteAsync() {

    }
    public stream() {

    }
}