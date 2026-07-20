# SlackerVSCode

一个用 Electron + Vue 3 编写的、伪装成 VS Code 的小说阅读器。摸鱼专用。

![ disguise ](<https://img.shields.io/badge/disguise-VS%20Code%20Dark%2B-blue>)
![ stack ](https://img.shields.io/badge/stack-Electron%20%7C%20Vue%203%20%7C%20TS%20%7C%20Pinia-42b883)

## 功能特性

- **高度伪装成 VS Code**

  - 自定义标题栏 + 可点开的菜单栏（File / Edit / Selection / View / Go / Run / Terminal / Help）
  - 左侧 Activity Bar（Explorer / Search / Source Control / Run / Extensions）
  - 蓝色状态栏、标签页、面包屑、行号
  - 代码语法高亮配色（关键字蓝、字符串橙、注释绿、类型青）
  - 无边框窗口 + 自绘窗口控制按钮
  - 数据存储在程序目录的 `.userdata`，不在用户配置目录留痕
- **小说正文伪装成代码**

  - 章节标题以 `// === 标题 ===` 注释块形式展现
  - 正文每一段以 `//` 注释形式展现（绿色字体）
  - 段落之间插入随机代码段（带完整语法高亮）
  - 顶部有随机 import 语句
  - 同一章节每次打开生成的代码一致（基于哈希种子，确定性随机）
- **书架管理**

  - 加载本地 txt 小说，支持多选
  - 自动识别 UTF-8 / UTF-8 BOM / GBK 编码
  - 书架显示每本书及阅读进度百分比
  - 可移除、可刷新
- **章节目录伪装**

  - 章节显示为随机英文文件名（带数字序号）：`chapter01_handler.ts`
  - 根据扩展名显示不同文件图标（TS 蓝 / JS 黄 / Vue 绿 / Svelte 橙）
  - 每 20 章拆分为一个子目录，目录名为随机英文单词（`src` / `lib` / `core`...）
  - 悬浮显示真实章节名称
  - 子目录可折叠展开，自动展开当前阅读章节所在目录
- **章节跳转**

  - 点击章节列表跳转
  - `Ctrl+P` 快速搜索跳章（支持按真实标题或伪装文件名搜索）
  - `Alt+←` / `Alt+→` 上一章 / 下一章
- **阅读进度记忆**

  - 每本书每章独立记录滚动位置
  - 切换章节回到顶部，回到读过的章节恢复上次位置
  - 启动自动恢复上次阅读
  - 窗口关闭前同步保存，防止数据丢失
- **选中文字右键菜单**

  - 复制选中文字到剪贴板
  - "在 Web 中搜索" — 调用系统默认浏览器打开必应搜索
- **仅限当前小说的搜索面板**

  - `Ctrl+F` 打开搜索侧栏
  - 200ms 防抖 + token 取消，避免旧搜索结果抢占
  - 结果按章节分组，预览片段高亮关键字

## 快捷键

| 快捷键                  | 功能            |
| ----------------------- | --------------- |
| `Ctrl+O`              | 打开小说        |
| `Ctrl+P`              | 快速跳转章节    |
| `Ctrl+F`              | 打开搜索面板    |
| `Alt+←`              | 上一章          |
| `Alt+→`              | 下一章          |
| `Ctrl+B`              | 切换侧边栏      |
| `Ctrl+=` / `Ctrl+-` | 放大 / 缩小字体 |
| `Ctrl+0`              | 重置字号        |
| `Esc`                 | 关闭弹窗        |

## 安装与运行

```bash
# 安装依赖（Electron 二进制通过 npmmirror 下载）
npm install

# 首次安装后需批准三个包的安装脚本
npm approve-scripts electron esbuild vue-demi

# 开发模式（HMR + DevTools）
npm run dev

# 生产构建（输出到 out/）
npm run build

# 预览生产构建
npm start

# 类型检查
npm run typecheck
```

## 项目结构

```
SlackerVSCode/
├── electron/                  # 主进程层（TS）
│   ├── main/
│   │   ├── index.ts          # BrowserWindow 创建、app 生命周期
│   │   ├── ipc.ts            # IPC handler: store / dialog / book / window / shell
│   │   └── decode.ts         # iconv-lite GBK / UTF-8 / BOM 解码
│   └── preload/
│       └── index.ts          # contextBridge 安全桥
├── src/                       # 渲染层（Vue 3 SFC + TS）
│   ├── App.vue               # 根组件：boot、全局快捷键、sash 拖拽
│   ├── main.ts               # createApp + Pinia 入口
│   ├── env.d.ts              # vite/vue 类型声明
│   ├── index.html            # 应用容器
│   ├── components/           # Vue 组件
│   │   ├── TitleBar.vue      # 标题栏 + 菜单 + 窗口控制
│   │   ├── ActivityBar.vue   # 左侧活动栏
│   │   ├── Sidebar.vue       # 侧边栏容器
│   │   ├── EditorArea.vue    # 编辑器主区域
│   │   ├── TabsBar.vue       # 标签页栏
│   │   ├── Breadcrumbs.vue   # 面包屑路径
│   │   ├── StatusBar.vue     # 底部状态栏
│   │   ├── QuickOpen.vue     # Ctrl+P 快速跳转
│   │   ├── ContextMenu.vue   # 选中文字右键菜单
│   │   ├── Toast.vue         # 通知提示
│   │   └── panels/
│   │       ├── ExplorerPanel.vue  # 书架面板
│   │       ├── ChapterTree.vue    # 章节树
│   │       └── SearchPanel.vue    # 搜索面板
│   ├── composables/
│   │   └── useGlobalKeys.ts  # 全局快捷键 composable
│   ├── lib/                  # 工具库
│   │   ├── disguise.ts       # 伪装：文件名/目录名/工程名/代码段/语法高亮
│   │   ├── icons.ts          # codicon 风格 SVG 图标
│   │   └── chapter.ts        # 章节正则切分
│   ├── stores/               # Pinia 状态管理
│   │   ├── books.ts          # 书架 + 缓存 + 展开/折叠
│   │   ├── tabs.ts           # 标签页 + 当前活动章节
│   │   ├── search.ts         # 搜索（debounce + token 取消）
│   │   ├── ui.ts             # UI 状态：侧边栏/字号/阅读模式/Toast
│   │   └── persist.ts        # 持久化（异步 save + 同步 saveSync）
│   ├── styles/
│   │   └── main.css          # VS Code Dark+ 主题复刻
│   └── types/
│       └── index.ts          # 共享 TS 类型
├── electron.vite.config.ts    # electron-vite 三入口构建配置
├── tsconfig.json              # TS project references（node + web）
├── tsconfig.node.json         # 主进程 TS 配置
├── tsconfig.web.json          # 渲染层 TS 配置（@renderer 别名）
├── .npmrc                     # npmmirror 镜像配置
└── package.json
```

## 技术栈

- **Electron** — 跨平台桌面应用框架（`contextIsolation: true`、`nodeIntegration: false`）
- **electron-vite** — 统一构建 main / preload / renderer
- **Vue 3** — 渲染层 UI 框架（`<script setup lang="ts">` SFC）
- **Pinia** — 组合式状态管理
- **TypeScript** — 全量类型化（双 project references）
- **iconv-lite** — GBK / UTF-8 编码识别与转换

## 伪装示例

打开一章小说后，编辑器看起来是这样的：

![rendering](image/README/rendering.png)

## 许可证

MIT
