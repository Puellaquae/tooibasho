import { Message } from './types';

window.addEventListener('message', function (event) {
    const message = event.data as Message;
    if (message.message === "codeRun") {
        const func = new Function(message.code)
        const res = func();
        window.parent.postMessage(res, "*");
    }
});