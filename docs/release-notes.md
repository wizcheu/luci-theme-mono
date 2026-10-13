## Mono 1.0.0

基于 shadcn/ui Neutral 设计规范重新构建的原生 LuCI 主题。

- 黑白配色、浅色 / 深色外观、统一导航、表单、表格、选择器与弹窗。
- 可收起侧栏、菜单搜索、键盘快捷键及手机抽屉导航。
- 新增真实网络概览：每 5 秒更新接口状态、流量、内存和 IPv4 DHCP 租约；首次流量读数需要第二次采样。
- 保留原生 LuCI 的认证、权限、配置保存 / 应用和回滚流程。
- 预览包含从 Aeris 迁入的 50 个脱敏原生页面，使用与制品相同的主题资源；示例数据与模拟后端不进入 IPK。
- 安装后刷新菜单和模块缓存、重新载入概览只读权限；后续升级保留当前主题选择。

### 下载与安装

适用于采用 **ucode LuCI + opkg** 的 OpenWrt，依赖 `luci-base` 和 `rpcd-mod-luci`。下载 `luci-theme-mono_1.0.0-1_all.ipk`，核对 `SHA256SUMS` 后上传至路由器：

```sh
opkg install /tmp/luci-theme-mono_1.0.0-1_all.ipk
uci set luci.main.mediaurlbase='/luci-static/mono'
uci commit luci
```

刷新浏览器即可，无需重启设备。其他主题会保留，也可以通过 LuCI 的“语言和界面”切换。旧会话没有显示新概览菜单时，退出后重新登录。

附带 `manifest.json`（逐文件 SHA-256）和源码压缩包。此 Release 提供 IPK；使用 APK 的固件需通过对应 OpenWrt SDK 构建。

### 验证

发布工作流执行固定版本 ucode 模板渲染、版本与语法检查、安装包生命周期和可重复构建测试、流量计算测试，以及桌面 / 手机下全部预览页面和主要交互测试。
