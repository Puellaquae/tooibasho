<template>
  <n-space vertical>
    <n-input-group>
      <n-input v-model:value="inputUrl" type="test" placeholder="请输入网址" />
      <n-button type="primary" @click="handleNewUrl"> 添加 </n-button>
    </n-input-group>
    <n-space align="center">
      <n-button type="primary" :loading="inArchiving" @click="archive">
        {{ !inArchiving ? "存档" : "存档中" }}
      </n-button>
      <n-button type="primary" :loading="inPackaging" @click="packup">
        {{ !inPackaging ? "导出" : "导出中" }}
      </n-button>
    </n-space>
    <n-tree
      block-line
      cascade
      checkable
      default-expand-all
      virtual-scroll
      style="height: calc(100vh - 240px)"
      leaf-only
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
  NSpace,
} from "naive-ui";

import { ArchiveItem } from "../src/index";
import { ZipArchiver } from "../src/archiver/zip";
import { TooiBasho } from "./global";
import { join as pathJoin } from "path-browserify";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getKey(item: ArchiveItem): string {
  return pathJoin("", ...item.catalogPath.map((c) => c.id.toString()), item.name);
}

const zipper = new ZipArchiver();

// 添加后默认为 ready，skip 和 ready 可通过选择框转换，存档后变为 fin 或 err
// fin 会锁定住那一项阻止状态变换，err 会在再次存档变为 ready 或由选择框变为 skip
// loading 在 archive 中触发
type ItemStatus = "skip" | "ready" | "fin" | "err" | "loading";

const itemStatusInfo: { [K in ItemStatus]: string } = {
  skip: "不存档",
  ready: "待存档",
  fin: "待导出",
  err: "存档失败",
  loading: "存档中",
};

interface TreeData {
  label: string;
  pathId: string | number;
  key: number | string;
  isLeaf: boolean;
  children?: TreeData[];
  disabled?: boolean;
  suffix?: string | (() => VNodeChild);
  prefix?: string | (() => VNodeChild);
}

export default defineComponent({
  components: {
    NTree,
    NInputGroup,
    NInput,
    NButton,
    NSpace,
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
      items: new Map<
        string,
        { status: ItemStatus; key: string; item: ArchiveItem; leaf: TreeData }
      >(),
      selectedItems: new Array<string>(),
      inArchiving: false,
      inPackaging: false,
    };
  },
  methods: {
    handleNewUrl() {
      this.addUrl(this.inputUrl);
      this.inputUrl = "";
    },
    async addUrl(url: string) {
      const gen = TooiBasho.detect(url);
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
      let paths = "";
      for (const path of item.catalogPath) {
        paths = pathJoin(paths, path.id.toString());
        let nexttree = curtree.find((t) => t.pathId === path.id);
        if (!nexttree) {
          nexttree = {
            label: path.name,
            pathId: path.id,
            children: [],
            key: paths,
            isLeaf: false,
            suffix: () => {
              let status: Map<ItemStatus, number> = new Map();
              this.items.forEach((v) => {
                if (v.key.startsWith(paths)) {
                  if (!status.has(v.status)) {
                    status.set(v.status, 1);
                  } else {
                    status.set(v.status, status.get(v.status)! + 1);
                  }
                }
              });
              let display = "";
              let first = false;
              for (const [s, v] of status.entries()) {
                if (first) {
                  first = false;
                } else {
                  display += " ";
                }
                display += `${v}项${itemStatusInfo[s]}`;
              }
              return h("span", null, display);
            },
          };
          curtree.push(nexttree);
        }
        curtree = nexttree.children = nexttree.children ?? [];
      }
      const key = pathJoin(paths, item.name);
      if (!curtree.some((i) => i.key === key)) {
        const leaf = {
          label: item.title,
          pathId: item.name,
          key,
          isLeaf: true,
          suffix: () =>
            h("span", null, itemStatusInfo[this.items.get(key)!.status]),
        };
        curtree.push(leaf);
        this.items.set(key, { status: "ready", key, item, leaf });
        this.selectedItems.push(key);
      }
    },
    async archive() {
      this.inArchiving = true;
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
      const gen = TooiBasho.archive(downItems, zipper, (_index, item) => {
        this.items.get(getKey(item))!.status = "loading";
      });
      for await (const i of gen) {
        const key = getKey(i.item);
        const item = this.items.get(key);
        if (i.success) {
          item!.status = "fin";
          item!.leaf.disabled = true;
        } else {
          console.log(item);
          item!.status = "err";
        }
      }
      this.inArchiving = false;
    },
    async packup() {
      this.inPackaging = true;
      await zipper.package();
      this.inPackaging = false;
    },
    selectedUpdate(v: string[]) {
      if (!this.inArchiving && !this.inPackaging) {
        this.selectedItems.forEach((i) => {
          const item = this.items.get(i);
          if (
            !v.includes(i) &&
            (item?.status === "ready" || item?.status === "err")
          ) {
            item!.status = "skip";
          }
        });
        this.selectedItems = v;
        this.selectedItems.forEach((i) => {
          if (this.items.get(i)?.status === "skip") {
            this.items.get(i)!.status = "ready";
          }
        });
      } else {
        this.message.info("存档或导出中无法更改");
      }
    },
  },
});
</script>

<style>
</style>