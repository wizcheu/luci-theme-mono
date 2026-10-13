include $(TOPDIR)/rules.mk

PKG_NAME:=luci-theme-mono
PKG_VERSION:=1.0.2
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=wizcheu

LUCI_TITLE:=Mono — a quiet monochrome theme for LuCI
LUCI_DEPENDS:=+luci-base +rpcd-mod-luci
LUCI_PKGARCH:=all

define Package/luci-theme-mono/postrm
#!/bin/sh
[ "$$1" = upgrade ] && exit 0
[ -n "$${IPKG_INSTROOT}" ] || {
	if [ "$$(uci -q get luci.main.mediaurlbase)" = /luci-static/mono ]; then
		uci -q delete luci.main.mediaurlbase
	fi
	uci -q delete luci.themes.Mono
	uci commit luci
	rm -f /tmp/luci-indexcache.*
}
endef

include $(TOPDIR)/feeds/luci/luci.mk
