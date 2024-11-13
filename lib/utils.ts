export function uuid() {
    const temp_url = URL.createObjectURL(new Blob());
    const uuid = temp_url.toString();
    URL.revokeObjectURL(temp_url);
    return uuid.substr(uuid.lastIndexOf("/") + 1); // remove prefix (e.g. blob:null/, blob:www.test.com/, ...)
}

export function toError(err: unknown) {
    if (err instanceof Error) {
        return err;
    } else if (typeof err === 'string') {
        return new Error(err);
    } else if (typeof err === 'object' && err !== null) {
        try {
            const errorMessage = JSON.stringify(err, getCircularReplacer());
            return new Error(errorMessage);
        } catch (e) {
            return new Error('An error occurred, but it could not be stringified.');
        }
    } else {
        return new Error(String(err));
    }
}

function getCircularReplacer() {
    const seen = new WeakSet();
    return (_key: string | number | Symbol, value: any) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    };
}


// type ExtractContext<B<A extends Any>, T> = T extends B<infer A> ? A : never;