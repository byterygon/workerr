export function uuid() {
    var temp_url = URL.createObjectURL(new Blob());
    var uuid = temp_url.toString();
    URL.revokeObjectURL(temp_url);
    return uuid.substr(uuid.lastIndexOf("/") + 1); // remove prefix (e.g. blob:null/, blob:www.test.com/, ...)
}

export type Command = {
    [cmd in string]: (
        body: any,
        context?: { signal?: AbortSignal }
    ) => any | Promise<any>;
};
// export type CommandArg<TBody extends any = any> = [
//   body?: TBody,
//   { signal: AbortSignal}
// ];

export function createCommand<C extends Command>(command: C) {
    return command as unknown as {
        [key in keyof C]: (arg: Parameters<C[key]>[0]) => ReturnType<C[key]>;
    };
}
