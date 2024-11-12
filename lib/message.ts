export interface WorkerMessageTypePayLoadMap {
    "initialization:start": undefined
    "initialization:complete": undefined
    "initialization:error": Error


    "context:update": unknown
    "context:ack": {
        messageId: string;
    }


    "excecute:accept": {
        messageId: string;
    }
    "excecute:response": {
        messageId: string;
        result: unknown
    }
    "excecute:error": Error


}
export interface MainThreadTypePayloadMap {
    "initialization:ack": undefined
    "context:update": unknown
    "context:ack": {
        messageId: string;
    }


    "excecute:start": {
        cmd: string;
        params: unknown;
        context: unknown;
        abortSignal?: AbortSignal
    }

    "stream:start": {
        port: MessagePort
        context: unknown
        abortSignal?: AbortSignal
    }
}
export interface MessageData<M extends WorkerMessageTypePayLoadMap | MainThreadTypePayloadMap, Type extends keyof M = keyof M> {
    messageId: string;
    messageType: Type;
    messagePayload: M[Type];
    timestamp: number
}