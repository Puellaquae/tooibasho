const hasArrayBuffer = typeof ArrayBuffer === 'function';
const { toString } = Object.prototype;

function isArrayBuffer(value: unknown): boolean {
    return hasArrayBuffer && (value instanceof ArrayBuffer || toString.call(value) === '[object ArrayBuffer]');
}

function pathJoin(...paths: string[]): string {
    return paths.join('/');
}

export { isArrayBuffer, pathJoin }