
export type InvokeHandlers<IContext extends object> = {
    [cmd in string]: (
        body: any,
        options: { abortSignal?: AbortSignal, context: IContext, transferObject: (transfer: Transferable[]) => void }
    ) => any | Promise<any>;
};
// export type CommandArg<TBody extends any = any> = [
//   body?: TBody,
//   { signal: AbortSignal}
// ];

// export type StreamCommands<IContext extends object> = {
//     [cmd in string]: (body: any, options: {
//         abortSignal?: 
//     })
// }


export class CommandBuilder<IContext extends object> {
    constructor() { }
    buildInvokeHandlers<C extends InvokeHandlers<IContext>>(command: C): C {
        return command;
    };
}