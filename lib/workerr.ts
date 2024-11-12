import { Commands } from "./command";
import { MainThreadTypePayloadMap, MessageData, WorkerMessageTypePayLoadMap } from "./message"
import { toError, uuid } from "./utils";
declare var self: DedicatedWorkerGlobalScope;

export class Workerr<IContext extends object> {
    public context: IContext
    private commands
    private constructor(commands: Commands<IContext>) {
        this.commands = commands
        this.context = {} as IContext


        const listener = async  <K extends keyof MainThreadTypePayloadMap>(ev: MessageEvent<MessageData<MainThreadTypePayloadMap, K>>) => {
            switch (ev.data.messageType) {
                case "context:update":
                    this.context = ev.data.messagePayload as IContext
                    Workerr.postMessage({
                        messageType: "context:ack",
                        messagePayload: {
                            messageId: ev.data.messageId
                        }
                    })
                    break
                case "excecute:start": {
                    const message = ev.data as MessageData<MainThreadTypePayloadMap, "excecute:start">
                    try {
                        if (message.messagePayload.cmd in this.commands) {
                            const result = await this.commands[message.messagePayload.cmd](message.messagePayload.params, {
                                context: {
                                    ...this.context,
                                    ...message.messagePayload.context ?? {}
                                },
                                abortSignal: message.messagePayload.abortSignal
                            })
                            Workerr.postMessage({ messageType: "excecute:response", messagePayload: { messageId: message.messageId, result } })
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
    public static async create<IContext extends object>(commands: Commands<IContext>, cb?: () => Promise<unknown>) {
        this.postMessage({ messageType: "initialization:start", messagePayload: undefined });
        try {
            await cb?.()

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
        } catch (err) {
            this.postMessage({ messageType: "initialization:error", messagePayload: toError(err) })
        }

        return new Workerr<IContext>(commands)
    }
    private static postMessage<K extends keyof WorkerMessageTypePayLoadMap>(message: Omit<MessageData<WorkerMessageTypePayLoadMap, K>, "messageId" | "timestamp"> & Partial<Pick<MessageData<WorkerMessageTypePayLoadMap, K>, "messageId" | "timestamp">>) {
        self.postMessage({
            ...message,
            messageId: message.messageId ?? uuid(),
            timestamp: message.timestamp ?? Date.now(),
        } as MessageData<WorkerMessageTypePayLoadMap, K>
        )

    }
}