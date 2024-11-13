import { CommandBuilder } from "../command";


export interface Context {
    baseZero: number
}

const builder = new CommandBuilder<Context>()
export const commands = builder.buildCommand({
    sum({ a, b }: { a: number; b: number } , {context}) {
        return context.baseZero + a + b
    }
})

export type Commands = typeof commands