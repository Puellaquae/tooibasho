import { createApp } from 'vue';
import App from './App.vue';
import browser from 'webextension-polyfill';
import { Message } from './types';

const app = createApp(App).mount('#app');

browser.runtime.onMessage.addListener(async (message: Message) => {
    console.log(`Received ${message.message} Message`);
    if (message.message === 'awake') {
        return {};
    } else if (message.message === 'url') {
        (app as unknown as { addUrl: (url: string) => void }).addUrl(message.url);
        return {};
    }
});