# 表格数据编辑组件使用说明

## 自定义表头

- 如果需要字段为必填，则在字段名加上前缀 `*`；
- 如果需要字段验证数据格式，则字段定义为对象类型，`text` 属性为文本，`validator` 为验证函数，返回**null**则默认为校验通过，否则返回为校验不通过的提示信息。

```javascript
const header = {
            "id": {
                text: '编号',
                validator: function (arg) {
                    if (arg.length > 5) {
                        return '编号格式过长，不能超过5位！';
                    }
                    return null;
                }
            },
            "*name": "姓名",
            "age": {
                text: '年龄',
                validator: function (arg) {
                    const b = /^\d+$/g.test(arg);
                    if (!b) {
                        return '年龄格式错误！';
                    }
                    return null;
                },
            },
            "*address": "家庭住址",
            "job": "工作"
        };
```

## 初始化组件

### xtable.init()

- ```javascript
  const XTABLE = xtable.init("<指定初始化组件的容器ID>", {editing: true, ......});
  ```

- 支持自定义配置项，参考`xtable.defaultSetting`;

## 方法

### sourceFrom({header, body})

初始化数据为一个行列结构的二维数组:`[[]]`

```javascript
XTABLE.sourceFrom({
            header: header,
            body: [[]]
        });
```

### getResult({callback, callback})

获取结果，传入2个回调数据：

如果有字段验证函数，未通过验证的数据提示信息为`error`回调函数**第一个参数**，数据为**第二个参数**, 未通过的数据行号为**第三个参数**，未通过的详细数据前后默认使用`*`(`defaultSetting.invalidFormat`)号包裹。

```javascript
XTABLE.getResult({
                success: function (data) {
                    console.log("获取结果成功！");
                    console.table(data);
                },
                error: function (err, data, rowids) {
                    console.log(err);
                    console.table(data);
                }
            });
```

### empty()

清空数据。

