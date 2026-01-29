<template>
  <div class="pref-image">
    <h4>{{ $t('image.title') }}</h4>
    <section class="image-ctrl">
      <div>{{ $t('image.insertBehavior.imageInsertAction') }}
        <el-tooltip class='item' effect='dark'
          content='Clipboard handling is only fully supported on macOS and Windows.'
          placement='top-start'>
          <i class="el-icon-info"></i>
        </el-tooltip>
      </div>
      <CurSelect :value="imageInsertAction" :options="localizedImageActions"
        :onChange="value => onSelectChange('imageInsertAction', value)"></CurSelect>
    </section>
    <Separator />
    <FolderSetting v-if="imageInsertAction === 'folder' || imageInsertAction === 'path'" />
    <Uploader v-if="imageInsertAction === 'upload'" />
  </div>
</template>

<script>
import Separator from '../common/separator'
import Uploader from './components/uploader'
import CurSelect from '@/prefComponents/common/select'
import FolderSetting from './components/folderSetting'

export default {
  components: {
    Separator,
    CurSelect,
    FolderSetting,
    Uploader
  },
  data () {
    return {}
  },
  computed: {
    imageInsertAction: {
      get: function () {
        return this.$store.state.preferences.imageInsertAction
      }
    },
    localizedImageActions () {
      return [
        { label: this.$t('imageInsertAction.upload'), value: 'upload' },
        { label: this.$t('imageInsertAction.folder'), value: 'folder' },
        { label: this.$t('imageInsertAction.path'), value: 'path' }
      ]
    }
  },
  methods: {
    onSelectChange (type, value) {
      this.$store.dispatch('SET_SINGLE_PREFERENCE', { type, value })
    }
  }
}
</script>

<style>
.pref-image {
  & .image-ctrl {
    font-size: 14px;
    margin: 20px 0;
    color: var(--editorColor);
    & label {
      display: block;
      margin: 20px 0;
    }
  }
}
</style>
