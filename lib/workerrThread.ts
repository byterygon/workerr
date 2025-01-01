import EventEmitter from "events";
import { InvokeHandlers } from "./command";
import { MainThreadMessages, MainThreadTypePayloadMap, MessageData, WorkerMessageTypePayLoadMap } from "./message"
import { toError, uuid } from "./utils";
declare var self: DedicatedWorkerGlobalScope;

interface WorkerrEventMap<IContext> {
    "context:update": [IContext]
}
interface WorkerrConstructor<IContext extends object> {
    invokeHandler: InvokeHandlers<IContext>
}
export class Workerr<IContext extends object> {
    public context: IContext
    private invokeHandler: InvokeHandlers<IContext>
    private emitter = new EventEmitter<WorkerrEventMap<IContext>>()
    private constructor({
        invokeHandler
    }: WorkerrConstructor<IContext>) {
        this.invokeHandler = invokeHandler
        this.context = {} as IContext


        const listener = async (ev: MessageEvent<MainThreadMessages>) => {
            switch (ev.data.messageType) {
                case "context:update":
                    this.context = ev.data.messagePayload as IContext
                    Workerr.postMessage({
                        messageType: "context:ack",
                        messagePayload: {
                            messageId: ev.data.messageId
                        }
                    })
                    this.emitter.emit("context:update", this.context)
                    break
                case "excecute:start": {
                    const message = ev.data as MessageData<MainThreadTypePayloadMap, "excecute:start">
                    try {
                        if (message.messagePayload.cmd in this.invokeHandler) {
                            let abortSignal: AbortSignal | undefined
                            if (message.messagePayload.abortSignalChannelPort) {
                                const controller = new AbortController()
                                abortSignal = controller.signal
                                message.messagePayload.abortSignalChannelPort.onmessage = (ev) => {
                                    controller.abort(ev.data)
                                    message.messagePayload.abortSignalChannelPort?.close()
                                }

                            }
                            let transfer: Transferable[] = []
                            const result = await this.invokeHandler[message.messagePayload.cmd](message.messagePayload.params, {
                                context:
                                    this.context,
                                abortSignal: abortSignal,
                                transferObject(t) {
                                    transfer.push(...t)
                                },
                            })
                            message.messagePayload.abortSignalChannelPort?.close()
                            Workerr.postMessage({ messageType: "excecute:response", messagePayload: { messageId: message.messageId, result } }, transfer)
                        } else {
                            throw new Error("Command is not supported")
                        }
                    } catch (err) {
                        const error = toError(err)
                        Workerr.postMessage({
                            messageType: "excecute:error",
                            messagePayload: {
                                messageId: ev.data.messageId,
                                error
                            }
                        })
                    }
                }
            }
        }
        self.addEventListener("message", listener)
    }
    public static async create<IContext extends object>(cb: () => Promise<WorkerrConstructor<IContext>>) {
        this.postMessage({ messageType: "initialization:start", messagePayload: undefined });
        try {

            const { invokeHandler } = await cb()
            await new Promise((resolve, reject) => {

                const listener = (ev: MessageEvent<MessageData<MainThreadTypePayloadMap>>) => {
                    if (ev.data.messageType === "initialization:ack") {
                        resolve(undefined)
                        self.removeEventListener("messageerror", errorListener)
                        self.removeEventListener("message", listener)
                    }
                }
                const errorListener = (ev: MessageEvent<unknown>) => {
                    self.removeEventListener("messageerror", errorListener)
                    self.removeEventListener("message", listener)
                    console.error("Unable to deserialized message:", ev.data)
                    reject(new Error("Unable to deserialized message"))
                }
                self.addEventListener("message", listener)
                self.addEventListener("messageerror", errorListener)
                this.postMessage({ messageType: "initialization:complete", messagePayload: undefined })
            })
            return new Workerr<IContext>({
                invokeHandler
            })
        } catch (err) {
            this.postMessage({ messageType: "initialization:error", messagePayload: toError(err) })
        }


    }
    private static postMessage<K extends keyof WorkerMessageTypePayLoadMap>(message: Omit<MessageData<WorkerMessageTypePayLoadMap, K>, "messageId" | "timestamp"> & Partial<Pick<MessageData<WorkerMessageTypePayLoadMap, K>, "messageId" | "timestamp">>, transfer?: Transferable[]) {
        self.postMessage({
            ...message,
            messageId: message.messageId ?? uuid(),
            timestamp: message.timestamp ?? Date.now(),
        } as MessageData<WorkerMessageTypePayLoadMap, K>, transfer as Transferable[]
        )

    }
    public addListener<K extends keyof WorkerrEventMap<IContext>>(eventName: K, listener: K extends "context:update" ? WorkerrEventMap<IContext>[K] extends unknown[] ? (...args: WorkerrEventMap<IContext>[K]) => void : never : never) {
        this.emitter.addListener(eventName, listener)
    }
    public removeListener<K extends keyof WorkerrEventMap<IContext>>(eventName: K, listener: K extends "context:update" ? WorkerrEventMap<IContext>[K] extends unknown[] ? (...args: WorkerrEventMap<IContext>[K]) => void : never : never) {

        this.emitter.removeListener(eventName, listener)
    }
    public removeAllListeners(eventName?: unknown) {
        this.emitter.removeAllListeners(eventName)

    }
}