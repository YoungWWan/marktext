<template>
  <div class="pref-ai">
    <h4>{{ $t('aiSettings.title') }}</h4>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('aiSettings.provider.title') }}</h6>
      </template>
      <template #children>
        <cur-select
          :description="$t('aiSettings.provider.description')"
          :value="aiProvider"
          :options="providerOptions"
          :onChange="value => onSelectChange('aiProvider', value)"
        ></cur-select>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('aiSettings.model.title') }}</h6>
      </template>
      <template #children>
        <text-box
          :description="$t('aiSettings.model.description')"
          :input="aiModel"
          :onChange="value => onSelectChange('aiModel', value)"
          :defaultValue="$t('aiSettings.model.placeholder')"
        ></text-box>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('aiSettings.apiKey.title') }}</h6>
      </template>
      <template #children>
        <div class="api-key-section">
          <text-box
            :description="$t('aiSettings.apiKey.description')"
            :notes="$t('aiSettings.apiKey.notes')"
            :input="apiKeyInput"
            :onChange="value => onApiKeyChange(value)"
            :defaultValue="$t('aiSettings.apiKey.placeholder')"
          ></text-box>
        </div>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('aiSettings.agent.title') }}</h6>
      </template>
      <template #children>
        <cur-select
          :description="$t('aiSettings.agent.description')"
          :value="aiAgent"
          :options="agentOptions"
          :onChange="value => onSelectChange('aiAgent', value)"
        ></cur-select>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('aiSettings.baseUrl.title') }}</h6>
      </template>
      <template #children>
        <text-box
          :description="$t('aiSettings.baseUrl.description')"
          :notes="$t('aiSettings.baseUrl.notes')"
          :input="aiBaseUrl"
          :onChange="value => onSelectChange('aiBaseUrl', value)"
          :defaultValue="$t('aiSettings.baseUrl.placeholder')"
        ></text-box>
      </template>
    </compound>

    <!-- 测试连接按钮 -->
    <compound>
      <template #head>
        <h6 class="title">{{ $t('aiSettings.test.title') }}</h6>
      </template>
      <template #children>
        <div class="test-section">
          <p class="description">{{ $t('aiSettings.test.description') }}</p>
          <button
            class="test-btn"
            :class="{ 'testing': isTesting, 'success': testResult === 'success', 'error': testResult === 'error' }"
            @click="testConnection"
            :disabled="isTesting || !aiApiKey"
          >
            <span v-if="isTesting">{{ $t('aiSettings.test.testing') }}</span>
            <span v-else-if="testResult === 'success'">{{ $t('aiSettings.test.success') }}</span>
            <span v-else-if="testResult === 'error'">{{ $t('aiSettings.test.failed') }}</span>
            <span v-else>{{ $t('aiSettings.test.button') }}</span>
          </button>
          <p v-if="testMessage" class="test-message" :class="{ 'error': testResult === 'error' }">
            {{ testMessage }}
          </p>
        </div>
      </template>
    </compound>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import { mapState } from 'vuex'
import Compound from '../common/compound'
import CurSelect from '../common/select'
import TextBox from '../common/textBox'

const PROVIDERS = [
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenRouter', value: 'openrouter' }
]

const AGENTS = [
  { label: 'Default Coding Agent', value: 'build' },
  { label: 'Writing Assistant', value: 'write' },
  { label: 'Research Assistant', value: 'research' }
]

export default {
  name: 'AISettings',
  components: {
    Compound,
    CurSelect,
    TextBox
  },
  data () {
    return {
      providerOptions: PROVIDERS,
      agentOptions: AGENTS,
      localApiKey: '',
      isTesting: false,
      testResult: null, // null, 'success', 'error'
      testMessage: ''
    }
  },
  computed: {
    ...mapState({
      aiProvider: state => state.preferences.aiProvider || 'anthropic',
      aiModel: state => state.preferences.aiModel || 'claude-sonnet-4-20250514',
      aiApiKey: state => state.preferences.aiApiKey || '',
      aiAgent: state => state.preferences.aiAgent || 'build',
      aiBaseUrl: state => state.preferences.aiBaseUrl || ''
    }),
    apiKeyInput () {
      // 如果用户正在输入，显示输入的值，否则显示已保存的值
      return this.localApiKey || this.aiApiKey
    }
  },
  methods: {
    onSelectChange (type, value) {
      this.$store.dispatch('SET_SINGLE_PREFERENCE', { type, value })
    },
    onApiKeyChange (value) {
      this.localApiKey = value
      // 直接保存 API Key
      if (value !== undefined) {
        this.$store.dispatch('SET_SINGLE_PREFERENCE', { type: 'aiApiKey', value: value.trim() })
      }
    },
    async testConnection () {
      if (!this.aiApiKey || this.isTesting) return

      this.isTesting = true
      this.testResult = null
      this.testMessage = ''

      try {
        const result = await ipcRenderer.invoke('ai::test-connection', {
          provider: this.aiProvider,
          model: this.aiModel,
          apiKey: this.aiApiKey,
          baseUrl: this.aiBaseUrl
        })

        if (result.success) {
          this.testResult = 'success'
          this.testMessage = result.message || this.$t('aiSettings.test.successMessage')
        } else {
          this.testResult = 'error'
          this.testMessage = result.error || this.$t('aiSettings.test.errorMessage')
        }
      } catch (error) {
        this.testResult = 'error'
        this.testMessage = error.message || this.$t('aiSettings.test.errorMessage')
      } finally {
        this.isTesting = false
        // 5秒后重置状态
        setTimeout(() => {
          if (this.testResult) {
            this.testResult = null
            this.testMessage = ''
          }
        }, 5000)
      }
    }
  }
}
</script>

<style scoped>
.pref-ai {
  & .api-key-section {
    margin: 10px 0;
  }

  & .test-section {
    margin: 10px 0;

    & .description {
      font-size: 14px;
      color: var(--editorColor);
      margin-bottom: 12px;
    }

    & .test-btn {
      padding: 8px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      background: var(--themeColor);
      color: #fff;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        opacity: 0.9;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.testing {
        background: var(--editorColor30);
      }

      &.success {
        background: #4caf50;
      }

      &.error {
        background: #f44336;
      }
    }

    & .test-message {
      margin-top: 10px;
      font-size: 13px;
      color: var(--editorColor);

      &.error {
        color: #f44336;
      }
    }
  }
}
</style>
