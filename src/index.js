/* eslint-disable */

// 来源于@d2-projects/vue-table-export 有改动

import './_blob'
import FileSaver from 'file-saver'
import XLSX from 'xlsx'

const RANGE_KEY = '!ref' // sheet范围key，没有内容的sheet没有!ref属性
const IMPORT_ERR_MSG = '导入失败，请检查文件！'

const basedate = new Date(1899, 11, 30, 0, 0, 0) // 2209161600000
const dnthresh =
  basedate.getTime() +
  (new Date().getTimezoneOffset() - basedate.getTimezoneOffset()) * 60000

function datenum(v, date1904) {
  let epoch = v.getTime()
  if (date1904) epoch -= 1462 * 24 * 60 * 60 * 1000
  return (epoch - dnthresh) / (24 * 60 * 60 * 1000)
}

// 解析excel的日期时间
function parseDate(dateCode) {
  const {y, m, d, H, M, S} = XLSX.SSF.parse_date_code(dateCode)

  return new Date(`${y}/${m}/${d} ${H}:${M}:${S}`).getTime()
}

/**
 * 将传进来的二维数组处理成xlsx需要的数据格式
 * @param data [[], ..., []]
 * @return {{}}
 */
function sheet_from_array_of_arrays(data) {
  let worksheet = {}
  // s: 开始的行数，列数
  // e: 结束的行数，列数
  let range = {s: {c: 0, r: 0}, e: {c: 0, r: data.length}}
  for (let R = 0; R !== data.length; ++R) {
    for (let C = 0; C !== data[R].length; ++C) {
      // 结束取最大值
      if (range.e.c < C) range.e.c = C
      let cell = {v: data[R][C]}
      if (cell.v === null || cell.v === undefined) continue
      // 单元格地址B5由对象表示{c:1, r:4}
      let cell_ref = XLSX.utils.encode_cell({c: C, r: R})

      // 格式化 number, boolean, Date
      if (typeof cell.v === 'number') cell.t = 'n'
      else if (typeof cell.v === 'boolean') cell.t = 'b'
      else if (cell.v instanceof Date) {
        cell.t = 'n'
        cell.z = XLSX.SSF._table[14]
        cell.v = datenum(cell.v)
      } else cell.t = 's'

      worksheet[cell_ref] = cell
    }
  }
  // 设置填充区域
  worksheet[RANGE_KEY] = XLSX.utils.encode_range(range)
  return worksheet
}

/**
 * 创建工作表对象
 * @return {Workbook}
 * @constructor
 */
function Workbook() {
  if (!(this instanceof Workbook)) return new Workbook()
  this.SheetNames = []
  this.Sheets = {}
}

/**
 * 将字符串转字符流
 * @param str 需要转换的字符串
 * @return {ArrayBuffer}
 */
function s2ab(str) {
  const buf = new ArrayBuffer(str.length)
  let view = new Uint8Array(buf)
  for (let i = 0; i !== str.length; ++i) {
    view[i] = str.charCodeAt(i) & 0xff
  }
  return buf
}
function getIndexByKey(header, name) {
  return header.lastIndexOf(name)
}
// 设置图片大小
function getImageList(imageKeys, data, header, imgWidth) {
  return imageKeys.map(key =>
    data.map((item, index) => ({
      key,
      url: item[key.prop],
      col: getIndexByKey(header, key.label) + 1,
      row: index + 2,
      width: imgWidth,
      height: imgWidth
    }))
  )
}
//
// 获取图片base64格式
function getBase64(file) {
  return new Promise(function(resolve, reject) {
    // let reader = new FileReader();
    // let imgResult = "";
    // reader.readAsDataURL(file);
    // reader.onload = function () {
    //   imgResult = reader.result;
    // };
    // reader.onerror = function (error) {
    //   reject(error);
    // };
    // reader.onloadend = function () {
    //   resolve(imgResult);
    // };
    console.log('6666666666666666666666666', file)
    //   let requestInstance = new Request('http://localhost:7001/api/common/getBase64', {
    //     method: 'post',
    //     headers: {
    //         'Content-Type': 'application/json;charset=utf-8'
    //     },
    //     mode:'no-cors',
    //     body: {"url": file}
    // })
    fetch('http://172.19.58.21:7001/api/common/getBase64', {
      method: 'post',
      // headers: {
      //     'Content-Type': 'application/json;charset=utf-8'
      // },
      mode: 'no-cors',
      body: JSON.stringify({url: file})
    })
      .then(function(response) {
        return response.json()
      })
      .then(resp => {
        resolve(resp.url)
      })
    // var img = document.createElement('img');
    //         img.onload =function() {
    //           var canvas = document.createElement("canvas");
    //           canvas.width = img.width;
    //           canvas.height = img.height;
    //           console.log(img);
    //           var ctx = canvas.getContext("2d");
    //           ctx.drawImage(img, 0, 0, img.width, img.height);
    //           var dataURL = canvas.toDataURL("image/jpg");

    //             resolve(dataURL);

    //         }
    //         img.crossOrigin = 'anonymous';
    //          img.src = file+"&timeStamp="+new Date();
    // document.body.appendChild(img);
  })
}
// 添加图片到sheet
async function addPicToSheet(imageList, imageKeys, workbook, worksheet) {
  if (imageKeys.length > 0) {
    await Promise.all(
      imageList.map(async imgArr => {
        return await Promise.all(
          imgArr.map(item => {
            const {url, width, height, row, col} = item
            // 因为有的图片是不存在的需要判断
            if (url) {
              return getBase64(url).then(res => {
                console.log('!!!!!!!!!!', res)
                if (!url) return
                const imgType = url
                  .split('?')[0]
                  .substring(url.split('?')[0].lastIndexOf('.') + 1)
                  .toLowerCase()
                const id = workbook.addImage({
                  base64: res,
                  extension: imgType
                })
                worksheet.addImage(id, {
                  tl: {col: col - 1, row: row - 1},
                  ext: {width, height}
                })
                worksheet.getRow(row).height = height
                // // 去掉背景链接
                worksheet.getRow(row).getCell(item.key.name).value = ''
              })
            }
            return item
          })
        )
      })
    )
  }
}
/**
 * 将json转换为字符串
 * @param columns Array excel表头数组，数据格式为[{label: '', props: ''}] 与element-ui table传入的数据格式一致
 * @param data Array excel内容数组，数据格式字段名称需要跟props一致 与element-ui table传入的数据格式一致
 * @param fileName String 文件名 default download
 * @param header String 导出的表头名
 * @param merges Array 导出的表头合并的单元格, 数据格式['A1', 'E1']， 表示合并从A1到E1的单元格
 * @param callback Function 成功后的回调
 */
export async function exportExcel(
  {
    columns = [],
    data = [],
    imageKeys = [],
    fileName = 'download',
    header = null,
    merges = []
  },
  callback = () => {}
) {
  let workbook = new Workbook()
  // 处理数据格式
  const head = columns.map(e => e.label)
  const data2D = data.map(row =>
    columns.map(col => {
      return row[col.prop]
    })
  )

  data2D.unshift(head)
  if (header) {
    data2D.unshift([header])
  }
  const worksheetName = 'Sheet'

  let worksheet = sheet_from_array_of_arrays(data2D)

  // 处理图片
  const imageList = getImageList(imageKeys, data, head, 100)
  // 添加图片到sheet
  await addPicToSheet(imageList, imageKeys, workbook, worksheet)

  if (typeof merges[0] === 'string' && merges.length === 2) merges = [merges] // just one # ['A1', 'C1'] = > [['A1', 'C1']]
  merges = merges.map(i => (i instanceof Array ? {s: i[0], e: i[1]} : i)) // be sort :) # ['A1', 'C1'] => { s: 'A1', e: 'C3' }
  worksheet['!merges'] = merges
  let cols = columns.map(elems => {
    return {wch: elems.width ? elems.width : 20}
  })
  worksheet['!cols'] = cols

  workbook.SheetNames.push(worksheetName)
  workbook.Sheets[worksheetName] = worksheet

  const workbookOut = XLSX.write(workbook, {
    bookType: 'xlsx',
    bookSST: false,
    type: 'binary'
  })

  FileSaver.saveAs(
    new Blob([s2ab(workbookOut)], {type: 'application/octet-stream'}),
    fileName + '.xlsx'
  )
  callback()
}

/**
 * 兼容模拟点击 兼容Firefox 47.0.2 and 62.0.2.
 * @param node dom节点
 */
function click(node) {
  try {
    node.dispatchEvent(new MouseEvent('click'))
  } catch (e) {
    const evt = document.createEvent('MouseEvents')
    evt.initMouseEvent(
      'click',
      true,
      true,
      window,
      0,
      0,
      0,
      80,
      20,
      false,
      false,
      false,
      false,
      0,
      null
    )
    node.dispatchEvent(evt)
  }
}

/**
 * 将xlsx文件转为json对象，json对象格式为：{columns: [{label: '', props: ''}], data: [数据格式字段名称需要跟props一致 与element-ui table传入的数据格式一致]}
 * @param callback Function 返回数据为多个sheet的数据，数据格式为[{columns:[...],data:[[...],...]}, ...]
 * @param ignore Array 需要忽略的单元格范围 eg: ['A1', 'K1']，默认不忽略
 */
export function importExcel(ignore = [], callback = () => {}) {
  const inputId = 'import-excel-input'
  // 支持的导入的数据类型
  const supportFileType = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]

  let input = document.getElementById(inputId)
  if (!input || input.type !== 'file') {
    input = document.createElement('input')
    input.id = inputId
    input.type = 'file'
    input.accept = supportFileType.join(',')
    input.style.display = 'none'
    document.getElementsByTagName('body')[0].append(input)
  }

  input.onchange = e => {
    if (e.target.files && e.target.files.length) {
      // 判断文件类型
      const file = e.target.files[0]
      // 重置上传文本框值
      input.value = ''

      parseExcel(file, ignore, callback)
    }
  }

  /**
   * 判断传入项是否在数组中
   * @param array
   * @param item
   * @return {boolean}
   */
  const ifInArray = (array, item) => {
    for (let inner in array) {
      if (item === inner) {
        return true
      }
    }
    return false
  }

  setTimeout(() => {
    click(input)
  })
}

export function parseExcel(file, ignore = [], callback = () => {}) {
  if (!checkExcelFile(file.name)) {
    alert('文件类型必须是.xlsx,xls中的一种')
    return
  }

  // 支持Safari6.0以上，Opera12.02以上，IE10以上，chrome7以上
  const reader = new FileReader()

  reader.onload = e => {
    let sheetTable = null
    try {
      sheetTable = _parseExcel(e.target.result)
    } catch (err) {
      alert(IMPORT_ERR_MSG)
    }

    // callback在try外执行，否则callback报的错也会被catch
    if (sheetTable !== null) {
      callback(sheetTable)
    }
  }

  reader.onerror = () => {
    alert(IMPORT_ERR_MSG)
  }

  // 读取文件的 ArrayBuffer 数据对象 ArrayBuffer 对象用来表示通用的、固定长度的原始二进制数据缓冲区
  reader.readAsArrayBuffer(file)

  /**
   * 根据文件名判断是否为excel文件
   * @param filename 文件名
   * @return {boolean} true: 为excel文件 false: 不为excel文件
   */
  function checkExcelFile(filename) {
    if (!filename) return false
    const suffix = filename.substr(filename.lastIndexOf('.'))
    return '.xls' === suffix || '.xlsx' === suffix
  }

  /**
   * 将ArrayBuffer 数据对象处理为字符串 http://javascript.ruanyifeng.com/stdlib/arraybuffer.html
   * @param data ArrayBuffer 数据
   */
  const fixdata = data => {
    let str = ''
    let l = 0
    const w = 10240
    for (; l < data.byteLength / w; ++l) {
      str += String.fromCharCode.apply(
        null,
        new Uint8Array(data.slice(l * w, l * w + w))
      )
    }
    str += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w)))
    return str
  }

  /**
   * 获取头部项
   * @param sheet worksheet数据
   * @return {Array}
   */
  const getHeaderRow = sheet => {
    const headers = []
    const range = XLSX.utils.decode_range(sheet[RANGE_KEY])
    let C
    const R = range.s.r
    for (C = range.s.c; C <= range.e.c; ++C) {
      const cell = sheet[XLSX.utils.encode_cell({c: C, r: R})]
      if (cell && cell.t) {
        headers.push(XLSX.utils.format_cell(cell))
      }
    }
    return headers
  }

  // 解析excel 生成数组数据
  function _parseExcel(data) {
    const fixedData = fixdata(data)
    // btoa是binary to ascii 将binary的数据用ascii码表示
    const workbook = XLSX.read(btoa(fixedData), {type: 'base64'})
    // 读取多个sheet表
    let sheetTable = []
    const sheetList = workbook.Sheets
    if (sheetList) {
      Object.keys(sheetList).forEach(key => {
        const worksheet = sheetList[key]
        if (RANGE_KEY in worksheet) {
          if (ignore && ignore.length) {
            const wsRefArr = worksheet[RANGE_KEY].split(':')
            const startCellRowNum = ignore[0].replace(/[a-zA-Z]+/, '') || 0
            const startCellRowStr = ignore[0].replace(/[0-9]+/, '') || 'A'
            const endCellRowNum = ignore[1].replace(/[a-zA-Z]+/, '') || 0
            const maxNum =
              startCellRowNum > endCellRowNum ? startCellRowNum : endCellRowNum
            worksheet[RANGE_KEY] = `${startCellRowStr}${+maxNum + 1}:${
              wsRefArr[1]
            }`
          }
          // 将时间格式处理为字符串 todo 读取excel中date格式的时候，有时候t值会是'n', 而不是'd'，
          // 通过判断cell中的t值为'n'的时候，判断'v'值是否跟'w'值是否相同来判断cell中的数值类型为date
          Object.keys(worksheet).forEach(key => {
            if (
              worksheet[key].t === 'd' ||
              (worksheet[key].t === 'n' &&
                String(worksheet[key].v) !== worksheet[key].w)
            ) {
              worksheet[key].v = parseDate(worksheet[key].v)
            }
          })
          const columns = getHeaderRow(worksheet) || []
          const data = XLSX.utils.sheet_to_json(worksheet) || {}
          sheetTable.push({
            columns,
            data
          })
        }
      })
    }
    return sheetTable
  }
}
