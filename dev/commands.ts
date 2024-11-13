import { CommandBuilder } from "../lib/command";


export interface Context {
    baseZero: number
}

const builder = new CommandBuilder<Context>()
export const commands = builder.buildAsyncRequest({
    sum({ a, b }: { a: number; b: number }, { context }) {
        return context.baseZero + a + b
    },
    abort({ }, { context, abortSignal }) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(1)
            }, 10000)
            abortSignal?.addEventListener("abort", (e) => {
                reject((e.target as AbortSignal).reason)
            }, { once: true })

        })
    },
    transferable({ uint8 }: { uint8: Uint8Array }, { transferObject }) {
        transferObject([uint8.buffer])
        setTimeout(() => {
            console.log(uint8.byteLength)
        }, 100)
        return {
            uint8
        }
    }
})

export type Commands = typeof commands