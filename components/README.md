# 组件目录

此目录用于存放小程序的自定义组件。

## 组件结构

每个组件应包含以下四个文件：
- `index.js` - 组件逻辑
- `index.json` - 组件配置
- `index.wxml` - 组件结构
- `index.wxss` - 组件样式

## 组件命名规范

- 使用小写字母和连字符
- 组件名称应具有描述性
- 避免使用特殊字符和空格

## 组件配置

在组件的 `index.json` 中配置组件：

```json
{
  "component": true,
  "usingComponents": {}
}
```

## 组件开发规范

1. **组件逻辑** (`index.js`)
   - 使用 `Component()` 构造函数
   - 定义组件的属性、数据、方法
   - 使用 `properties` 定义外部传入的属性
   - 使用 `data` 定义组件内部数据
   - 使用 `methods` 定义组件方法

2. **组件配置** (`index.json`)
   - 设置 `component: true`
   - 配置依赖的其他组件

3. **组件结构** (`index.wxml`)
   - 使用 `<slot>` 插槽
   - 合理使用数据绑定
   - 注意组件的作用域

4. **组件样式** (`index.wxss`)
   - 使用组件样式隔离
   - 遵循设计规范
   - 注意样式优先级

## 常用组件示例

### 按钮组件 (button)
- 支持不同样式和尺寸
- 支持加载状态
- 支持禁用状态

### 输入框组件 (input)
- 支持不同类型
- 支持验证
- 支持清空功能

### 卡片组件 (card)
- 支持标题和内容
- 支持操作按钮
- 支持自定义样式

### 列表组件 (list)
- 支持不同布局
- 支持加载更多
- 支持空状态

## 组件使用

在页面中引入组件：

```json
{
  "usingComponents": {
    "custom-button": "/components/button/index",
    "custom-input": "/components/input/index"
  }
}
```

在页面中使用组件：

```xml
<custom-button 
  type="primary" 
  size="large"
  bind:tap="onButtonTap"
>
  点击我
</custom-button>
```

## 组件通信

1. **父组件向子组件传值**
   - 通过 `properties` 定义属性
   - 在父组件中设置属性值

2. **子组件向父组件传值**
   - 使用 `triggerEvent` 触发自定义事件
   - 在父组件中监听事件

3. **组件间通信**
   - 使用事件总线
   - 使用全局数据
   - 使用存储

## 注意事项

- 组件名称不能与内置组件重名
- 注意组件的作用域隔离
- 合理使用插槽和属性
- 注意组件的生命周期
- 做好组件的错误处理



