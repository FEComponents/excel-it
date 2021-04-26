导出excel，该例子有1w条数据来自接口。

Here shows an example of export 10,000 rows data from api.

```vue
<template>
  <el-button
    type="success"
    @click="handleExportExcel"
    style="padding: 8px 20px; cursor: pointer">
    {{loading ? 'loading...' : 'export-excel'}}
  </el-button>
</template>

<script>
// in real project, you should import function like this
// import { exportExcel } from '@fecomponents/excel-it'

export default {
  name: 'StaticJsonExportToExcel',
  data() {
    return {
      loading: false,
      columns: [
        {label: 'ID', prop: 'id'},
        {label: '名称', prop: 'name'},
        {label: '创建日期', prop: 'createDate'},
        {label: '地址', prop: 'address'},
        {label: '邮编', prop: 'zip'},
        {label: '图片', prop: 'image'},
      ],
      data: [
        {
          id: 1,
          name: 'FairyEver',
          createDate: new Date(1553496965307),
          address: '北京市',
          zip: '100000',
          image:'http://img-oscs.opechk.com/hub/file/bf91b5cc22b753ee1080fbe2dc519189.png?x-oss-process=image/resize,m_lfit,h_100,w_100'
        }
      ]
    }
  },
  methods: {
    handleExportExcel() {
      this.loading = true

      // fetch(
      //   'https://easy-mock.com/mock/5c1b3895fe5907404e654045/femessage-mock/export-excel'
      // )
      //   .then(function(response) {
      //     return response.json()
      //   })
      //   .then(resp => {
          /**
           * 受限于 styleguide 无法使用 import
           * 因此在 styleguide 配置已经将
           * `exportExcel` 挂载到 `window`
           */
          exportExcel({
            columns: this.columns,
            data: this.data,
            fileName: 'json2excel',
            imageKeys:[{name: '图片', prop: 'image'}]
          }, () => {
            this.loading = false
          })
        // })
    }
  }
}
</script>
```
