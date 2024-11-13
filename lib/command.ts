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
        context: { abortSignal?: AbortSignal, context: IContext }
    ) => any | Promise<any>;
};
// export type CommandArg<TBody extends any = any> = [
//   body?: TBody,
//   { signal: AbortSignal}
// ];


export class CommandBuilder<IContext extends object> {
    constructor() { }
    buildAsyncRequest<C extends Commands<IContext>>(command: C): C {
        return command;
    };
}