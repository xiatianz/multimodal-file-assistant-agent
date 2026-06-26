# Mobile Optimization Spec

## 1. 视口与滚动问题修复 (Viewport & Scrolling)
**问题:**
`body` 和 `#__next` 层使用 `h-screen overflow-hidden`，在移动端容易受 Safari 等浏览器底栏影响（100vh 会导致底部被挡）。
**方案:**
- 使用 `100dvh` 或者 `h-[100dvh]` 替代 `h-screen`，以正确适应移动端地址栏的伸缩。
- 输入区域使用更稳健的 safe-area-inset 适配。

## 2. 头部栏按钮拥挤 (Header Bar)
**问题:**
小屏幕下三个按钮（工作区、语言、明暗主题）挤在一起，加上长名字的 Logo 容易导致 Header 溢出换行。
**方案:**
- 压缩 Logo 与文字的间距：把 AI tag 在移动端隐藏，只保留 DOCFLIX 文本和红标。
- 将 Header 按钮放大至 `w-10 h-10` 以增加点击区域，并在极其狭窄设备上缩减内边距。

## 3. 删除/操作按钮热区过小 (Touch Targets)
**问题:**
文件列表里的“X”删除键为 `w-3.5 h-3.5`（14px），下方上传队列区域关闭文件的删除键也是同样的极小尺寸，不符合前端 44x44px 最小触控设计原则。
**方案:**
- 将 `button` 的物理或透明包裹层增大，最小保持 `w-8 h-8`（32px）或者 `w-10 h-10`（40px），可以保持 SVG 图标较小，但响应区增大。

## 4. 底部输入栏键盘遮挡 (Virtual Keyboard)
**问题:**
当聚焦 input 时，底部的固定输入框由于弹出的虚拟键盘会被顶到不可见的位置（依赖原生浏览器表现，经常出现 bug）。
**方案:**
- 增加 `padding-bottom: env(safe-area-inset-bottom)`。
- 输入法状态判断（通过 focus 事件可以暂时缩小 header 以换取空间，不过简单的 100dvh 多数情况已解决问题）。

## 5. 左侧抽屉关闭机制 (Mobile Workspace Drawer)
**问题:**
在移动端，当 `workspaceOpen` 设为 `true` 时，左侧的文件操作区会作为 absolute 覆盖在页面上，底部的 "Back to Chat" 按钮虽然存在，但如果内容极长可能要滚动到底部才能关闭。
**方案:**
- 在打开的左侧工作区顶部补充一个清晰的移动端关闭/返回（Back / Close）头部按钮。
