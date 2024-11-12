import { buildCommand } from "../command";


export const commands = buildCommand({
    sum({ a, b }: { a: number; b: number }) {
        return a + b
    }
})

export type Commands = typeof commands