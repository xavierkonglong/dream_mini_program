# 图片资源目录

## 背景图片

微信小程序支持本地图片，但需要使用`<image>`标签而不是CSS的`background-image`。

### 背景图片使用方法：

#### 1. 将图片放在此目录
- 文件名：`index.png`（首页背景）
- 文件名：`dreamAnalysisResult.png`（结果页背景）
- 格式：PNG（支持透明背景）
- 尺寸：建议 750x1334 或更高分辨率
- 内容：梦幻水彩天空图，包含云朵和星星

#### 2. 在WXML中使用
```xml
<!-- 首页背景 -->
<image class="background-image" src="../../assets/images/index.png" mode="aspectFill"></image>

<!-- 结果页背景 -->
<image class="background-image" src="../../assets/images/dreamAnalysisResult.png" mode="aspectFill"></image>
```

#### 3. 在WXSS中设置样式
```css
.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
```

### 微信小程序图片使用规则：

#### ✅ 可以使用本地图片的场景：
- `<image>` 标签的 `src` 属性
- `<cover-image>` 标签
- 组件中的图片属性

#### ❌ 不能使用本地图片的场景：
- CSS `background-image` 属性
- CSS `content` 属性
- 其他CSS背景相关属性

### 当前实现
项目已配置为使用本地背景图片：
- `index.png` - 首页背景图片
- `dreamAnalysisResult.png` - 结果页背景图片
- `community.png` - 社区页背景图片（梦幻水彩风格）
- `person.png` - 个人页背景图片（梦幻星空风格）

## 其他图片资源

其他图片文件也可以放在此目录下，通过`<image>`标签引用：
```xml
<image src="../../assets/images/your-image.jpg" mode="aspectFit"></image>
```
