import { Command } from "../mainThread/utils";
import { ExecError, ExecResponse } from "../messages/exec";
import { Main2WorkerMsg } from "../messages/messages";

declare var self: DedicatedWorkerGlobalScope;
export class Workerr<CMD extends Command> {
    public id: string | null = null;

    constructor(command: CMD) {
        let interval = setInterval(() => {
            self.postMessage({ type: "ping" });
        }, 1000);
        const eventListener = async (msg: MessageEvent<Main2WorkerMsg>) => {
            switch (msg.data.type) {
                case "pong": {
                    clearInterval(interval);
                    this.id = msg.data.payload.id;
                    break;
                }
                case "exec-request": {
                    const { id, payload } = msg.data;
                    try {
                        const result = await command[payload.cmd](payload.body, {
                            signal: payload.signal,
                        });
                        const response: ExecResponse = {
                            id: id,
                            payload: result,
                            type: "exec-response",
                        };
                        self.postMessage(response);
                    } catch (err) {
                        const response: ExecError = {
                            id,
                            type: "exec-error",
                            payload: err,
                        };
                        self.postMessage(response);
                    }

                    break;
                }
            }
        };
        self.addEventListener("message", eventListener);
    }
}
