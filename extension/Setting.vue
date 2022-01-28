<template>
  <n-form label-placement="left" label-width="auto">
    <n-form-item
      v-for="(item, key) in SETTING_FORM"
      :key="key"
      :label="item.label"
    >
      <n-switch v-model:value="setting[key]" v-if="item.type === 'switch'" />
      <n-radio-group
        v-model:value="setting[key]"
        v-if="item.type === 'radio'"
        :name="key"
      >
        <n-radio
          v-for="(s, k) in item.selections"
          :value="k"
          :name="key"
          :key="k"
        >
          {{ s.label }}
        </n-radio>
      </n-radio-group>
      <n-checkbox-group
        v-if="item.type === 'select'"
        v-model:value="setting[key]"
      >
        <n-checkbox
          v-for="(v, k) in item.selections"
          :key="k"
          :label="v.label"
          :value="k"
        />
      </n-checkbox-group>
      <n-input
        v-if="item.type === 'text'"
        type="text"
        v-model:value="setting[key]"
      />
    </n-form-item>
  </n-form>
  <div style="display: flex; justify-content: flex-end">
    <n-space>
      <n-button @click="resetSetting" attr-type="button"> 重置 </n-button>
      <n-button
        @click="applySetting"
        attr-type="button"
        type="primary"
      >
        应用
      </n-button>
    </n-space>
  </div>
  <pre :style="{ fontFamily: 'Cascadia Code' }"
    >{{ JSON.stringify(setting, null, 2) }}
  </pre>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  NForm,
  NFormItem,
  NSwitch,
  NRadioGroup,
  NRadio,
  NInput,
  NCheckboxGroup,
  NCheckbox,
  NButton,
  NSpace,
  useMessage,
} from "naive-ui";
import {
  SETTING_FORM,
  DEFAULT_SETTING,
  setSetting,
  getSetting,
} from "./global";

export default defineComponent({
  components: {
    NForm,
    NFormItem,
    NSwitch,
    NRadioGroup,
    NRadio,
    NInput,
    NCheckboxGroup,
    NCheckbox,
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
    return {
      saving: false,
      SETTING_FORM,
      setting: DEFAULT_SETTING,
    };
  },
  async mounted() {
    this.setting = await getSetting();
  },
  methods: {
    async applySetting() {
      await setSetting(JSON.parse(JSON.stringify(this.setting)));
    },
    async resetSetting() {
      this.setting = DEFAULT_SETTING;
      await this.applySetting();
    },
  },
});
</script>