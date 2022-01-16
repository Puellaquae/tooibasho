<template>
  <n-space vertical>
    <n-input-group>
      <n-input v-model:value="inputUrl" type="test" placeholder="请输入网址" />
      <n-button type="primary" @click="handleNewUrl"> 添加 </n-button>
    </n-input-group>
    <n-space align="center">
      <n-statistic label="已选" :value="selectedItems.length">
        <template #suffix>/ {{ items.size }}</template>
      </n-statistic>
      <n-popover
        trigger="hover"
        :disabled="btnStatus !== 'fin'"
        placement="right"
      >
        <template #trigger>
          <n-button type="primary" :loading="inArchiving" @click="archive">
            {{ btnStatusInfo[btnStatus] }}
          </n-button>
        </template>
        <span> 对于已完成项将不会纳入后续存档打包内容。 </span>
      </n-popover>
    </n-space>
    <n-tree
      block-line
      cascade
      checkable
      default-expand-all
      virtual-scroll
      style="height: calc(100vh - 240px)"
      :leaf-only="true"
      :selectable="false"
      :data="data"
      :checked-keys="selectedItems"
      @update:checked-keys="selectedUpdate"
    />
  </n-space>
</template>

<script lang="ts">
import { defineComponent, h, VNodeChild } from "vue";
import {
  NTree,
  NInput,
  NInputGroup,
  NButton,
  useMessage,
  NStatistic,
  NSpace,
  NPopover,
} from "naive-ui";

import { ArchiveItem, TooiBasho } from "../src/index";
import BilibiliZhuanlan from "../src/bilibili/zhuanlan";
import { ZipArchiver } from "../src/archiver/zip";
import { pathJoin } from "../src/utils";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const tooibasho = new TooiBasho();
tooibasho.addPlugin(new BilibiliZhuanlan());
const zipper = new ZipArchiver();

type ItemStatus = "skip" | "ready" | "fin" | "err";
type BtnStatus = "ready" | "downloading" | "packaging" | "fin";
const itemStatusInfo: { [K in ItemStatus]: string } = {
  skip: "跳过",
  ready: "下载",
  fin: "完成",
  err: "失败",
};
const btnStatusInfo: { [K in BtnStatus]: string } = {
  ready: "存档并导出",
  downloading: "存档中",
  packaging: "打包中",
  fin: "完成",
};

interface TreeData {
  label: string;
  pathId: string | number;
  key: number | string;
  isLeaf: boolean;
  children?: TreeData[];
  suffix?: string | (() => VNodeChild);
  prefix?: string | (() => VNodeChild);
}

export default defineComponent({
  components: {
    NTree,
    NInputGroup,
    NInput,
    NButton,
    NStatistic,
    NSpace,
    NPopover,
  },
  setup() {
    const message = useMessage();
    return {
      message,
    };
  },
  data() {
    let data: TreeData[] = [];
    return {
      inputUrl: "",
      data,
      items: new Map<string, { status: ItemStatus; item: ArchiveItem }>(),
      selectedItems: new Array<string>(),
      inArchiving: false,
      btnStatus: "ready" as BtnStatus,
      btnStatusInfo,
    };
  },
  methods: {
    handleNewUrl() {
      this.addUrl(this.inputUrl);
      this.inputUrl = "";
    },
    async addUrl(url: string) {
      const gen = tooibasho.detect(url);
      const message = this.message.loading(`解析 ${url} 中`, { duration: 0 });
      let count = 0;
      for await (const item of gen) {
        count++;
        message.content = `已发现 ${count} 项，解析 ${url} 中`;
        this.newItem(item);
      }
      message.type = "success";
      message.content = `共发现 ${count} 项，解析 ${url} 完毕`;
      await sleep(1000);
      message.destroy();
    },
    newItem(item: ArchiveItem) {
      let curtree = this.data;
      let pathJoin = "";
      for (const path of item.catalogPath) {
        pathJoin += path.id + "/";
        let nexttree = curtree.find((t) => t.pathId === path.id);
        if (!nexttree) {
          nexttree = {
            label: path.name,
            pathId: path.id,
            children: [],
            key: pathJoin,
            isLeaf: false,
          };
          curtree.push(nexttree);
        }
        curtree = nexttree.children = nexttree.children ?? [];
      }
      const key = pathJoin + item.name;
      if (!curtree.some((i) => i.key === key)) {
        curtree.push({
          label: item.title,
          pathId: item.name,
          key,
          isLeaf: true,
          suffix: () =>
            h("span", null, itemStatusInfo[this.items.get(key)!.status]),
        });
        this.items.set(key, { status: "ready", item });
        this.selectedItems.push(key);
      }
    },
    async archive() {
      if (this.btnStatus === "fin") {
        this.btnStatus = "ready";
        return;
      }
      this.inArchiving = true;
      this.btnStatus = "downloading";
      const downItems = this.selectedItems
        .filter((k) => {
          const status = this.items.get(k)?.status;
          if (status === "ready") {
            return true;
          } else if (status === "err") {
            this.items.get(k)!.status = "ready";
            return true;
          }
          return false;
        })
        .map((k) => this.items.get(k)!.item);
      const gen = tooibasho.archive(downItems, zipper);
      for await (const i of gen) {
        const key = pathJoin(
          ...i.item.catalogPath.map((p) => p.id.toString()),
          i.item.name
        );
        this.items.get(key)!.status = i.success ? "fin" : "err";
      }
      this.btnStatus = "packaging";
      await zipper.package();
      this.inArchiving = false;
      this.btnStatus = "fin";
    },
    selectedUpdate(v: string[]) {
      if (!this.inArchiving) {
        this.selectedItems.forEach((i) => {
          if (!v.includes(i) && this.items.get(i)?.status === "ready") {
            this.items.get(i)!.status = "skip";
          }
        });
        this.selectedItems = v;
        this.selectedItems.forEach((i) => {
          if (this.items.get(i)?.status === "skip") {
            this.items.get(i)!.status = "ready";
          }
        });
      }
    },
  },
});
</script>

<style>
</style>