const hasArrayBuffer = typeof ArrayBuffer === 'function';
const { toString } = Object.prototype;

function isArrayBuffer(value: unknown): boolean {
    return hasArrayBuffer && (value instanceof ArrayBuffer || toString.call(value) === '[object ArrayBuffer]');
}

async function* combineAsyncGenerator<T>(...gens: AsyncGenerator<T, void, void>[]): AsyncGenerator<T, void, void> {
    const asyncIterators = gens;
    let count = asyncIterators.length;
    const never: Promise<void> = new Promise(() => { /* do nothing */ });
    async function getNext(asyncIterator: AsyncGenerator<T, void, void>, index: number) {
        const result = await asyncIterator.next();
        return ({
            index,
            result,
        });
    }
    interface Result { index: number; result: IteratorResult<T, void>; }
    const nextPromises: (Promise<Result> | Promise<void>)[] = asyncIterators.map(getNext);
    try {
        while (count) {
            const { index, result } = await Promise.race(nextPromises) as Result;
            if (result.done) {
                nextPromises[index] = never;
                count--;
            } else {
                nextPromises[index] = getNext(asyncIterators[index], index);
                yield result.value;
            }
        }
    } finally {
        // Stop all generators if someone fail
        for (const [index, iterator] of asyncIterators.entries())
            if (nextPromises[index] != never && iterator.return != null)
                iterator.return();
        // no await here - see https://github.com/tc39/proposal-async-iteration/issues/126
    }
}

export { isArrayBuffer, combineAsyncGenerator }