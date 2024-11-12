export type Command<IContext extends object, TBody> = (
    body: TBody,
    options?: {
        abortSignal?: AbortSignal,
        context: IContext
    }
) => unknown | Promise<unknown>;

export type Commands<IContext extends object> = {
    [cmd: string]: Command<IContext, any>;
};
export function buildCommand<C extends Commands<IContext>, IContext extends Object>(command: C): C {
    return command;
};

// export class CommandBuilder<IContext extends object> {
//     constructor() { }
//     createCommand<C extends Commands<IContext>>(command: C): C {
//         return command;
//     };
// }