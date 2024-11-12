export type Command<IContext extends object, TBody> = (
    body: TBody,
    options?: {
        abortSignal?: AbortSignal,
        context: IContext
    }
) => unknown | Promise<unknown>;

export type Commands<IContext extends object> = {
    [cmd in string]: (
        body: any,
        context?: { abortSignal?: AbortSignal, context: IContext }
    ) => any | Promise<any>;
};
// export type CommandArg<TBody extends any = any> = [
//   body?: TBody,
//   { signal: AbortSignal}
// ];

export function buildCommand<C extends Commands<IContext>, IContext extends object>(command: C) {
    return command as unknown as {
        [key in keyof C]: (arg: Parameters<C[key]>[0]) => ReturnType<C[key]>;
    };
}

// export class CommandBuilder<IContext extends object> {
//     constructor() { }
//     createCommand<C extends Commands<IContext>>(command: C): C {
//         return command;
//     };
// }