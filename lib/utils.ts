export function uuid() {
    const temp_url = URL.createObjectURL(new Blob());
    const uuid = temp_url.toString();
    URL.revokeObjectURL(temp_url);
    return uuid.substr(uuid.lastIndexOf("/") + 1); // remove prefix (e.g. blob:null/, blob:www.test.com/, ...)
}

export function toError(err: unknown) {
    if (err instanceof Error) {
        // Nếu err đã là một Error object, trả về chính nó
        return err;
    } else if (typeof err === 'string') {
        // Nếu err là một chuỗi, tạo một Error object mới với message đó
        return new Error(err);
    } else if (typeof err === 'object' && err !== null) {
        // Nếu err là một object, cố gắng stringify nó để tạo message
        try {
            const errorMessage = JSON.stringify(err, getCircularReplacer());
            return new Error(errorMessage);
        } catch (e) {
            // Nếu stringify thất bại (do tham chiếu vòng), sử dụng một message mặc định
            return new Error('An error occurred, but it could not be stringified.');
        }
    } else {
        // Với các loại dữ liệu khác (number, boolean, undefined, null, symbol)
        return new Error(String(err));
    }
}

// Hàm phụ trợ để xử lý tham chiếu vòng khi stringify
function getCircularReplacer() {
    const seen = new WeakSet();
    return (key: string | number | Symbol, value: any) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    };
}