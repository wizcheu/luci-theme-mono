# Mono 预览开发说明

## 体验入口

`npm run preview` 启动 <http://127.0.0.1:8101>。端口可通过 `python3 scripts/mirror.py --port 端口号` 调整。

默认是网络概览。左侧菜单覆盖 Aeris 中的 50 个已脱敏原生页面，额外提供组件规范页、登录与登录错误页。`⌘K` / `Ctrl+K` 可展开侧栏并聚焦搜索；右上角切换深浅色；底部「重置示例」恢复内存中的样本配置。

网络概览的设备、内存、接口和租约来自脱敏快照。流量图沿用 Aeris 的演示公式，以便立即体验时间范围、图例筛选和悬停提示，页面标记为示例流量。它不是实时网络监控。

原生 LuCI 表单的编辑、校验、保存、应用、复位和弹窗保留。写操作由 `scripts/mirror.py` 在内存中模拟；重启服务也会恢复样本。安装软件、固件升级、真实认证、远程代理面板与终端命令不连接设备或外部服务。

## 设计与生产代码

- `htdocs/luci-static/mono/shadcn.css`：主要修改入口。shadcn/ui Neutral 语义变量与 LuCI / OpenClash 适配规则，最后加载。
- `mono.css`：页面结构与通用 LuCI 样式；`compat.css` 保留 LuCI Bootstrap 基础行为。
- `controls.js`、`ui.js`、`native.js`：原生控件适配、选择器与组件交互。保留 LuCI 节点、事件与数据绑定。
- `htdocs/luci-static/resources/mono/dashboard.js`：预览及生产共用的概览结构。
- `htdocs/luci-static/resources/view/mono/overview.js`：生产概览读取真实 RPC；`preview/overview.js` 只在本地预览提供演示流量。
- `ucode/template/themes/mono/`：IPK 使用的导航、页头、页尾与登录模板。
- `preview/ui-library.js`：组件规范示例。

设计参考：<https://ui.shadcn.com/docs/theming> 与 <https://ui.shadcn.com/docs/components/sidebar>。采用语义颜色、36px 常规控件、32px 小号 / 40px 大号按钮、6px 控件 / 10px 卡片圆角、细边框、键盘焦点和中性标签页。通过原生 CSS/JS 实现，不依赖 React、Tailwind 或 CDN。

## 数据来源与制品边界

`preview/mirror/` 是同目录 `luci-theme-aeris` 中公开脱敏副本的独立拷贝，主题命名空间替换为 Mono；不会读取 Aeris 的 `preview/live/`。上游许可和归属保留在 `preview/mirror/NOTICE.md`。此目录不依赖 Aeris 继续存在。

IPK 只包含 `htdocs/`、`ucode/`、`root/` 和许可文件；不包含预览、模拟后端、采集快照或 npm 依赖。新增的概览使用独立只读 ACL，需要 `rpcd-mod-luci`。

## 验证与迭代

```sh
npm run test:unit
node --test tests/*.test.cjs
npm test
```

浏览器测试使用独立端口 8103，避免重置用户正在体验的 8101 数据。模板更新后需运行 `ucode -L "$PWD/preview/stubs" scripts/render-preview.uc`；预览读取样式和脚本时不缓存，刷新页面即可看见改动，修改 Python 后端需要重启服务。

本轮已在 1440px 与 390px 下遍历 50 个原生页面以及组件、登录、登录错误页；确认无页面级横向溢出。检查了深色系统表单、原生接口编辑弹窗、保存并应用和示例重置。包结构、可重复构建、安装钩子、内存隔离和脱敏测试通过。此记录是本地预览验证，不代表路由器安装验证。
