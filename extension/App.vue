<template>
  <n-message-provider>
    <n-card :bordered="false">
      <n-tabs type="line" size="large">
        <n-tab-pane name="archive" tab="存档" display-directive="show">
          <archiver ref="archiver" />
        </n-tab-pane>
        <n-tab-pane name="setting" tab="设置" display-directive="show">
          <setting />
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </n-message-provider>
  <iframe id="sandbox" src="sandbox.html" style="display: none;"></iframe>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { NMessageProvider, NCard, NTabs, NTabPane } from "naive-ui";
import Archiver from "./Archiver.vue";
import Setting from "./Setting.vue";
import { setCodeRunner } from "../src/utils";
import { Message } from "./types";

export default defineComponent({
  components: {
    NMessageProvider,
    NTabs,
    NCard,
    NTabPane,
    Archiver,
    Setting,
  },
  setup() {
    const archiver = ref<null | { addUrl: (url: string) => void }>(null);
    return {
      archiver,
    };
  },
  methods: {
    addUrl(url: string) {
      this.archiver?.addUrl(url);
    },
  },
  mounted() {
    const elem = document.getElementById("sandbox") as HTMLIFrameElement;
    setCodeRunner((code: string): unknown => {
      const promise = new Promise((resolve, reject) => {
        const listener = (event: MessageEvent<any>) => {
          window.removeEventListener("message", listener);
          resolve(event.data);
        }
        window.addEventListener("message", listener);
        elem.contentWindow?.postMessage({ message: "codeRun", code } as Message, "*");
      })
      return promise;
    });
  }
});
</script>

<style>
</style>