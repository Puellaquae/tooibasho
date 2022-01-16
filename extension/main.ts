import { createApp } from 'vue';
import App from './App.vue';
import browser from 'webextension-polyfill';

const app = createApp(App).mount('#app');

console.dir(app);

type Message = {
    message: 'awake'
} | {
    message: 'url',
    url: string
}

browser.runtime.onMessage.addListener(async (message: Message) => {
    console.log(`Received ${message.message} Message`);
    if (message.message === 'awake') {
        return {};
    } else if (message.message === 'url') {
        (app as unknown as { addUrl: (url: string) => void }).addUrl(message.url);
        return {};
    }
});