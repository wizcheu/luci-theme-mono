/* Field labels and control types observed from LuCI; no live configuration values. */
window.MonoRouterSchema = {
 "lan": [
  {
   "fields": [
    {
     "help": "",
     "key": "proto",
     "label": "协议",
     "options": [
      {
       "label": "DHCP 客户端",
       "value": "dhcp"
      },
      {
       "label": "DHCPv6 客户端",
       "value": "dhcpv6"
      },
      {
       "label": "不配置协议",
       "value": "none"
      },
      {
       "label": "PPP",
       "value": "ppp"
      },
      {
       "label": "PPPoE",
       "value": "pppoe"
      },
      {
       "label": "静态地址",
       "value": "static"
      }
     ],
     "type": "select"
    },
    {
     "help": "",
     "key": "_net_device",
     "label": "设备",
     "options": [
      {
       "value": "br-lan",
       "label": "br-lan"
      },
      {
       "value": "wan",
       "label": "wan"
      },
      {
       "value": "eth0",
       "label": "eth0"
      },
      {
       "value": "lan2",
       "label": "lan2"
      },
      {
       "value": "lan3",
       "label": "lan3"
      },
      {
       "value": "lan4",
       "label": "lan4"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "",
     "key": "disabled",
     "label": "禁用该接口",
     "type": "checkbox"
    },
    {
     "help": "",
     "key": "auto",
     "label": "开机自动连接",
     "type": "checkbox"
    },
    {
     "help": "",
     "key": "ipaddr",
     "label": "IPv4 地址",
     "type": "text"
    },
    {
     "help": "",
     "key": "netmask",
     "label": "IPv4 子网掩码",
     "options": [
      {
       "label": "255.255.255.0",
       "value": "255.255.255.0"
      },
      {
       "label": "255.255.0.0",
       "value": "255.255.0.0"
      },
      {
       "label": "255.0.0.0",
       "value": "255.0.0.0"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "",
     "key": "gateway",
     "label": "IPv4 网关",
     "type": "text"
    },
    {
     "help": "",
     "key": "broadcast",
     "label": "IPv4 广播地址",
     "type": "text"
    },
    {
     "help": "",
     "key": "ip6addr",
     "label": "IPv6 地址",
     "type": "list"
    },
    {
     "help": "",
     "key": "ip6gw",
     "label": "IPv6 网关",
     "type": "text"
    },
    {
     "help": "路由至本设备用来分配给客户端的公共 IPv6 前缀。",
     "key": "ip6prefix",
     "label": "IPv6 路由前缀",
     "type": "text"
    }
   ],
   "key": "general",
   "parent": null,
   "title": "常规设置"
  },
  {
   "fields": [
    {
     "help": "无论接口的链路状态如何，强制接口处于连接状态（如果勾选，链路状态变化将不再触发接口热插拔事件处理）。",
     "key": "force_link",
     "label": "强制连接",
     "type": "checkbox"
    },
    {
     "help": "取消勾选则不创建到该接口网关的默认路由",
     "key": "defaultroute",
     "label": "使用该接口的网关作为默认网关",
     "type": "checkbox"
    },
    {
     "help": "",
     "key": "dns",
     "label": "使用自定义的 DNS 服务器",
     "type": "list"
    },
    {
     "help": "本地 resolv.conf 中的 DNS 服务器条目主要按此处指定的权重排序",
     "key": "dns_metric",
     "label": "DNS 权重",
     "type": "text"
    },
    {
     "help": "跃点是一个序数，例如值为 1 的网关作为首选，值为 2 的为次选，值为 3 的为第三选择，以此类推",
     "key": "metric",
     "label": "网关跃点",
     "type": "text"
    },
    {
     "help": "多路 TCP（MPTCP） RFC8684针对源自此设备的数据包，如 VPN。",
     "key": "multipath",
     "label": "多路 TCP（MPTCP）",
     "options": [
      {
       "label": "关",
       "value": "off"
      },
      {
       "label": "开",
       "value": "on"
      },
      {
       "label": "主",
       "value": "master"
      },
      {
       "label": "备份",
       "value": "backup"
      },
      {
       "label": "移交",
       "value": "handover"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "",
     "key": "ip4table",
     "label": "覆盖 IPv4 路由表",
     "options": [
      {
       "label": "prelocal (128)",
       "value": "prelocal"
      },
      {
       "label": "local (255)",
       "value": "local"
      },
      {
       "label": "main (254)",
       "value": "main"
      },
      {
       "label": "default (253)",
       "value": "default"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "",
     "key": "ip6table",
     "label": "覆盖 IPv6 路由表",
     "options": [
      {
       "label": "prelocal (128)",
       "value": "prelocal"
      },
      {
       "label": "local (255)",
       "value": "local"
      },
      {
       "label": "main (254)",
       "value": "main"
      },
      {
       "label": "default (253)",
       "value": "default"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "启用此接口上可用 IPv6 前缀的下游委派",
     "key": "delegate",
     "label": "委派 IPv6 前缀",
     "type": "checkbox"
    },
    {
     "help": "分配给此接口的公共 IPv6 前缀的长度",
     "key": "ip6assign",
     "label": "IPv6 前缀分配长度",
     "options": [
      {
       "label": "已禁用",
       "value": ""
      },
      {
       "label": "64",
       "value": "64"
      },
      {
       "label": "60",
       "value": "60"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "将使用此十六进制子前缀 ID 为此接口分配前缀。",
     "key": "ip6hint",
     "label": "IPv6 分配指示",
     "type": "text"
    },
    {
     "help": "如果设置此项，则仅将指定的 IPv6 前缀分配给下游子网。",
     "key": "ip6class",
     "label": "IPv6 前缀过滤器",
     "options": [
      {
       "value": "local",
       "label": "local · 本地 ULA"
      },
      {
       "value": "wan6",
       "label": "wan6"
      }
     ],
     "type": "list"
    },
    {
     "help": "可选。允许的值：“eui64”、“random” 和其他固定值（例如：“::1” 或 “::1:2” ）。当从授权服务器获取到 IPv6 前缀（如 “a:b:c:d::”），使用后缀（如 “::1”）合成 IPv6 地址（“a:b:c:d::1”）分配给此接口。",
     "key": "ip6ifaceid",
     "label": "IPv6 后缀",
     "type": "text"
    },
    {
     "help": "将前缀委派给多个下游时，在分配子网时，将首先考虑具有较高优先级值的接口。",
     "key": "ip6weight",
     "label": "IPv6 优先级",
     "type": "text"
    }
   ],
   "key": "advanced",
   "parent": null,
   "title": "高级设置"
  },
  {
   "fields": [],
   "key": "bridgevlan",
   "parent": null,
   "title": "网桥 VLAN 过滤"
  },
  {
   "fields": [
    {
     "help": "为此接口分配所属的防火墙区域，选择 未指定 可将该接口移出已关联的区域，或者填写 自定义 栏来创建一个新的区域，并将当前接口与之建立关联。",
     "key": "_zone",
     "label": "创建/分配防火墙区域",
     "options": [
      {
       "label": "未指定",
       "value": ""
      },
      {
       "label": "lan",
       "value": "lan"
      },
      {
       "label": "wan",
       "value": "wan"
      }
     ],
     "type": "dropdown"
    }
   ],
   "key": "firewall",
   "parent": null,
   "title": "防火墙设置"
  },
  {
   "fields": [],
   "key": "dhcp",
   "parent": null,
   "title": "DHCP 服务器"
  },
  {
   "fields": [
    {
     "help": "为此接口禁用 DHCP（仅限 dnsmasq）。",
     "key": "ignore",
     "label": "忽略此接口",
     "type": "checkbox"
    },
    {
     "help": "为所有客户端提供 DHCP 服务。如果禁用，将只对拥有静态租约的客户端提供服务。",
     "key": "dynamicdhcp",
     "label": "动态 DHCP",
     "type": "checkbox"
    },
    {
     "help": "租约地址的有效期， 最短 2 分钟 (2m)。",
     "key": "leasetime",
     "label": "租约时间",
     "type": "text"
    },
    {
     "help": "即使检测到其他服务器，仍在此网络强制启用 DHCP（仅限 dnsmasq）。",
     "key": "force",
     "label": "强制",
     "type": "checkbox"
    },
    {
     "help": "定义额外的 DHCP 选项，例如\"6,192.168.2.1,192.168.2.2\"，定义该选项会向客户端通告指定的 DNS 服务器（仅限 dnsmasq）。",
     "key": "dhcp_option",
     "label": "DHCP 选项",
     "type": "list"
    },
    {
     "help": "强制发送客户端未请求的 DHCP-Options （仅限 dnsmasq）。",
     "key": "dhcp_option_force",
     "label": "强制 DHCP-Options",
     "type": "list"
    }
   ],
   "key": "general",
   "parent": "dhcp",
   "title": "常规设置"
  },
  {
   "fields": [
    {
     "help": "启用或停用此接口的 DHCPv4 服务。",
     "key": "dhcpv4",
     "label": "DHCPv4 服务",
     "options": [
      {
       "label": "已禁用",
       "value": "disabled"
      },
      {
       "label": "已启用",
       "value": "server"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "网络地址的起始分配基址。",
     "key": "start",
     "label": "起始",
     "type": "text"
    },
    {
     "help": "最大地址分配数量。",
     "key": "limit",
     "label": "限制",
     "type": "text"
    },
    {
     "help": "重设发送给客户端的子网掩码。通常会根据所服务的子网自动计算得出（仅限 dnsmasq）。",
     "key": "netmask",
     "label": "IPv4 子网掩码",
     "type": "text"
    }
   ],
   "key": "ipv4",
   "parent": "dhcp",
   "title": "IPV4 设置"
  },
  {
   "fields": [
    {
     "help": "将此接口设为 RA 和 DHCPv6 中继及 NDP 代理的主接口。",
     "key": "master",
     "label": "指定的主接口",
     "type": "checkbox"
    },
    {
     "help": "配置此接口上 RA 服务的操作模式。",
     "key": "ra",
     "label": "RA 服务",
     "options": [
      {
       "label": "已禁用",
       "value": ""
      },
      {
       "label": "服务器模式",
       "value": "server"
      },
      {
       "label": "中继模式",
       "value": "relay"
      },
      {
       "label": "混合模式",
       "value": "hybrid"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "配置此接口上 DHCPv6 服务的操作模式。",
     "key": "dhcpv6",
     "label": "DHCPv6 服务",
     "options": [
      {
       "label": "已禁用",
       "value": ""
      },
      {
       "label": "服务器模式",
       "value": "server"
      },
      {
       "label": "中继模式",
       "value": "relay"
      },
      {
       "label": "混合模式",
       "value": "hybrid"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "指定通过 DHCPv6 通告的 DNS 服务器地址的固定列表。指定通过 RA 通告的 DNS 服务器地址。如未指定，设备会将自己通告为 DNS 服务器，除非禁用了 本地 IPv6 DNS 服务器选项。",
     "key": "dns",
     "label": "通告 IPv4/6 DNS 服务器",
     "type": "list"
    },
    {
     "help": "通告该设备为 IPv6 DNS 服务器。",
     "key": "dns_service",
     "label": "本地 IPV6 DNS 服务器",
     "type": "checkbox"
    },
    {
     "help": "指定通过 DHCPv6/RA 消息通告的加密 DNS 服务器（详见 RFC9463）。只有 odhcpd 同时处理 DHCPv4 时才支持 IPv4 地址。语法：<数字优先级> <域名> [IP 地址,...] [SVC 参数 ...]示例：100 dns.example.com 2001:db8::53,192.168.1.53 alpn=doq port=853注意：SVC 参数 _lifetime=<seconds> 设置通告的 DNS 服务器有效期（设置为 0 表示不再使用该服务器）。",
     "key": "dnr",
     "label": "通告加密 DNS 服务器",
     "type": "list"
    },
    {
     "help": "指定通过 DHCPv6 通告的 DNS 搜索域列表。",
     "key": "domain",
     "label": "通告的 DNS 域名",
     "type": "list"
    },
    {
     "help": "配置此接口上 NDP 代理服务的操作模式。",
     "key": "ndp",
     "label": "NDP 代理",
     "options": [
      {
       "label": "已禁用",
       "value": ""
      },
      {
       "label": "中继模式",
       "value": "relay"
      },
      {
       "label": "混合模式",
       "value": "hybrid"
      }
     ],
     "type": "dropdown"
    }
   ],
   "key": "ipv6",
   "parent": "dhcp",
   "title": "IPv6 设置"
  },
  {
   "fields": [
    {
     "help": "开/关 DHCPv6 IPv6 PD。",
     "key": "dhcpv6_pd",
     "label": "DHCPv6-PD",
     "type": "checkbox"
    },
    {
     "help": "DHCPv6 选项 56。RFC5908。",
     "key": "ntp",
     "label": "NTP 服务器",
     "type": "list"
    }
   ],
   "key": "dhcpv6",
   "parent": "dhcp",
   "title": "DHCPv6 设置"
  },
  {
   "fields": [
    {
     "help": "配置 RA 消息中的默认路由器通告。",
     "key": "ra_default",
     "label": "默认路由器",
     "options": [
      {
       "label": "自动",
       "value": ""
      },
      {
       "label": "存在可用前缀时",
       "value": "1"
      },
      {
       "label": "强制通告",
       "value": "2"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "设置已发送 RA 消息的前缀信息选项中的自治地址配置标志。启用后，客户端将执行无状态 IPv6 地址自动配置。",
     "key": "ra_slaac",
     "label": "启用 SLAAC",
     "type": "checkbox"
    },
    {
     "help": "同一网络中存在多个路由器时，客户端及其路由的 tie-breaker。",
     "key": "ra_preference",
     "label": "路由器优先级",
     "options": [
      {
       "label": "低",
       "value": "low"
      },
      {
       "label": "一般",
       "value": "medium"
      },
      {
       "label": "高",
       "value": "high"
      }
     ],
     "type": "select"
    },
    {
     "help": "指定 RA 消息中发送的标记，比如指示客户端通过有状态 DHCPv6 请求进一步的信息。",
     "key": "ra_flags",
     "label": "RA 标识",
     "options": [
      {
       "label": "管理配置 (M)",
       "value": "managed-config"
      },
      {
       "label": "其他配置 (O)",
       "value": "other-config"
      },
      {
       "label": "移动家乡代理 (H)",
       "value": "home-agent"
      }
     ],
     "type": "multi"
    },
    {
     "help": "允许在 RA 消息中发送 PIO 标记，此设置对所有前缀生效。",
     "key": "_ra_pio_flags",
     "label": "RA PIO 标记",
     "options": [
      {
       "label": "前缀委派首选 (P)",
       "value": "pd"
      }
     ],
     "type": "multi"
    },
    {
     "help": "在 RA 消息中通告 NAT64 前缀。 见 RFC6146 和 RFC8781。",
     "key": "ra_pref64",
     "label": "NAT64 前缀",
     "type": "text"
    },
    {
     "help": "连续发送主动 RA 消息时允许的最长时间间隔。默认为 600 秒。",
     "key": "ra_maxinterval",
     "label": "最长 RA 间隔",
     "type": "text"
    },
    {
     "help": "连续发送主动 RA 消息时允许的最短时间间隔。默认为 200 秒。",
     "key": "ra_mininterval",
     "label": "最短 RA 间隔",
     "type": "text"
    },
    {
     "help": "单位：毫秒。0 表示未指定。 规定节点在收到邻居节点可达性确认后，假定邻居节点保持可达状态的持续时间；该参数通过 RA 消息发布。",
     "key": "ra_reachabletime",
     "label": "RA 可达性定时器",
     "type": "text"
    },
    {
     "help": "单位：毫秒。0 表示未指定。 控制重传的邻居请求消息；在 RA 消息中发布。",
     "key": "ra_retranstime",
     "label": "RA 重传定时器",
     "type": "text"
    },
    {
     "help": "在 RA 消息中发布的路由器生存时间。最大值为 9000 秒。",
     "key": "ra_lifetime",
     "label": "RA 生存时间",
     "type": "text"
    },
    {
     "help": "将在 RA 消息中发布的 MTU。最小值为 1280 字节。",
     "key": "ra_mtu",
     "label": "RA MTU",
     "type": "text"
    },
    {
     "help": "将在 RA 消息中发布的最大跳数。最大值为 255 跳。",
     "key": "ra_hoplimit",
     "label": "RA 跳数限制",
     "type": "text"
    },
    {
     "help": "前缀的最大首选生命周期。",
     "key": "max_preferred_lifetime",
     "label": "IPv6 首选前缀生命周期",
     "options": [
      {
       "label": "5m（5 分钟）",
       "value": "5m"
      },
      {
       "label": "45m（45分钟 - 默认）",
       "value": "45m"
      },
      {
       "label": "3h（3 小时）",
       "value": "3h"
      },
      {
       "label": "12h （12 小时）",
       "value": "12h"
      },
      {
       "label": "7d（7 天）",
       "value": "7d"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "前缀的最大有效生命周期。",
     "key": "max_valid_lifetime",
     "label": "IPv6 有效前缀生命周期",
     "options": [
      {
       "label": "5m（5 分钟）",
       "value": "5m"
      },
      {
       "label": "90m（90分钟 - 默认）",
       "value": "90m"
      },
      {
       "label": "3h（3 小时）",
       "value": "3h"
      },
      {
       "label": "12h （12 小时）",
       "value": "12h"
      },
      {
       "label": "7d（7 天）",
       "value": "7d"
      }
     ],
     "type": "dropdown"
    }
   ],
   "key": "ipv6-ra",
   "parent": "dhcp",
   "title": "IPv6 RA 设置"
  }
 ],
 "wan": [
  {
   "fields": [
    {
     "help": "",
     "key": "proto",
     "label": "协议",
     "options": [
      {
       "label": "DHCP 客户端",
       "value": "dhcp"
      },
      {
       "label": "DHCPv6 客户端",
       "value": "dhcpv6"
      },
      {
       "label": "不配置协议",
       "value": "none"
      },
      {
       "label": "PPP",
       "value": "ppp"
      },
      {
       "label": "PPPoE",
       "value": "pppoe"
      },
      {
       "label": "静态地址",
       "value": "static"
      }
     ],
     "type": "select"
    },
    {
     "help": "",
     "key": "_net_device",
     "label": "设备",
     "options": [
      {
       "value": "br-lan",
       "label": "br-lan"
      },
      {
       "value": "wan",
       "label": "wan"
      },
      {
       "value": "eth0",
       "label": "eth0"
      },
      {
       "value": "lan2",
       "label": "lan2"
      },
      {
       "value": "lan3",
       "label": "lan3"
      },
      {
       "value": "lan4",
       "label": "lan4"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "",
     "key": "disabled",
     "label": "禁用该接口",
     "type": "checkbox"
    },
    {
     "help": "",
     "key": "auto",
     "label": "开机自动连接",
     "type": "checkbox"
    },
    {
     "help": "",
     "key": "username",
     "label": "PAP/CHAP 用户名",
     "type": "text"
    },
    {
     "help": "",
     "key": "password",
     "label": "PAP/CHAP 密码",
     "type": "password"
    },
    {
     "help": "留空则自动探测",
     "key": "ac",
     "label": "接入集中器",
     "type": "text"
    },
    {
     "help": "留空则自动探测",
     "key": "ac_mac",
     "label": "AC MAC 地址",
     "type": "text"
    },
    {
     "help": "留空则自动探测",
     "key": "service",
     "label": "服务名称",
     "type": "text"
    }
   ],
   "key": "general",
   "title": "常规设置"
  },
  {
   "fields": [
    {
     "help": "无论接口的链路状态如何，强制接口处于连接状态（如果勾选，链路状态变化将不再触发接口热插拔事件处理）。",
     "key": "force_link",
     "label": "强制连接",
     "type": "checkbox"
    },
    {
     "help": "在 PPP 链路上启用 IPv6 协商",
     "key": "ppp_ipv6",
     "label": "获取 IPv6 地址",
     "options": [
      {
       "label": "自动",
       "value": "auto"
      },
      {
       "label": "已禁用",
       "value": "0"
      },
      {
       "label": "手动",
       "value": "1"
      }
     ],
     "type": "select"
    },
    {
     "help": "可以只选择前缀长度（例如 56 ），此时将由运营商来选择分配的前缀，也可以指定想要获取的前缀（例如 2001:db8::/56 ）",
     "key": "reqprefix",
     "label": "请求 IPv6 前缀",
     "type": "text"
    },
    {
     "help": "启用以减少重启接口后从上游获取的前缀变更的几率",
     "key": "norelease",
     "label": "重启接口时不发送 Release 报文",
     "type": "checkbox"
    },
    {
     "help": "在指定数量的 LCP 响应故障后假定链路已断开，0 为忽略故障",
     "key": "_keepalive_failure",
     "label": "LCP 响应故障阈值",
     "type": "text"
    },
    {
     "help": "定时发送 LCP 回显请求（单位：秒），仅在结合了故障阈值时有效",
     "key": "_keepalive_interval",
     "label": "LCP 响应间隔",
     "type": "text"
    },
    {
     "help": "原始 16 进制编码的字节。除非运营商要求，否则请留空",
     "key": "host_uniq",
     "label": "Host-Uniq 标签内容",
     "type": "text"
    },
    {
     "help": "在给定时间（秒）后关闭非活动链接，0 为保持连接",
     "key": "demand",
     "label": "活动超时",
     "type": "text"
    },
    {
     "help": "",
     "key": "mtu",
     "label": "重设 MTU",
     "type": "text"
    },
    {
     "help": "取消勾选则不创建到该接口网关的默认路由",
     "key": "defaultroute",
     "label": "使用该接口的网关作为默认网关",
     "type": "checkbox"
    },
    {
     "help": "取消勾选则忽略上游通告的 DNS 服务器",
     "key": "peerdns",
     "label": "自动获取 DNS 服务器",
     "type": "checkbox"
    },
    {
     "help": "",
     "key": "dns",
     "label": "使用自定义的 DNS 服务器",
     "type": "list"
    },
    {
     "help": "本地 resolv.conf 中的 DNS 服务器条目主要按此处指定的权重排序",
     "key": "dns_metric",
     "label": "DNS 权重",
     "type": "text"
    },
    {
     "help": "跃点是一个序数，例如值为 1 的网关作为首选，值为 2 的为次选，值为 3 的为第三选择，以此类推",
     "key": "metric",
     "label": "网关跃点",
     "type": "text"
    },
    {
     "help": "多路 TCP（MPTCP） RFC8684针对源自此设备的数据包，如 VPN。",
     "key": "multipath",
     "label": "多路 TCP（MPTCP）",
     "options": [
      {
       "label": "关",
       "value": "off"
      },
      {
       "label": "开",
       "value": "on"
      },
      {
       "label": "主",
       "value": "master"
      },
      {
       "label": "备份",
       "value": "backup"
      },
      {
       "label": "移交",
       "value": "handover"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "",
     "key": "ip4table",
     "label": "覆盖 IPv4 路由表",
     "options": [
      {
       "label": "prelocal (128)",
       "value": "prelocal"
      },
      {
       "label": "local (255)",
       "value": "local"
      },
      {
       "label": "main (254)",
       "value": "main"
      },
      {
       "label": "default (253)",
       "value": "default"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "",
     "key": "ip6table",
     "label": "覆盖 IPv6 路由表",
     "options": [
      {
       "label": "prelocal (128)",
       "value": "prelocal"
      },
      {
       "label": "local (255)",
       "value": "local"
      },
      {
       "label": "main (254)",
       "value": "main"
      },
      {
       "label": "default (253)",
       "value": "default"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "使用基于源地址的策略路由自动处理多个上行链路接口。",
     "key": "sourcefilter",
     "label": "IPv6 源路由",
     "type": "checkbox"
    },
    {
     "help": "启用此接口上可用 IPv6 前缀的下游委派",
     "key": "delegate",
     "label": "委派 IPv6 前缀",
     "type": "checkbox"
    },
    {
     "help": "分配给此接口的公共 IPv6 前缀的长度",
     "key": "ip6assign",
     "label": "IPv6 前缀分配长度",
     "options": [
      {
       "label": "已禁用",
       "value": ""
      },
      {
       "label": "64",
       "value": "64"
      }
     ],
     "type": "dropdown"
    },
    {
     "help": "将使用此十六进制子前缀 ID 为此接口分配前缀。",
     "key": "ip6hint",
     "label": "IPv6 分配指示",
     "type": "text"
    },
    {
     "help": "如果设置此项，则仅将指定的 IPv6 前缀分配给下游子网。",
     "key": "ip6class",
     "label": "IPv6 前缀过滤器",
     "options": [
      {
       "value": "local",
       "label": "local · 本地 ULA"
      },
      {
       "value": "wan6",
       "label": "wan6"
      }
     ],
     "type": "list"
    },
    {
     "help": "可选。允许的值：“eui64”、“random” 和其他固定值（例如：“::1” 或 “::1:2” ）。当从授权服务器获取到 IPv6 前缀（如 “a:b:c:d::”），使用后缀（如 “::1”）合成 IPv6 地址（“a:b:c:d::1”）分配给此接口。",
     "key": "ip6ifaceid",
     "label": "IPv6 后缀",
     "type": "text"
    },
    {
     "help": "将前缀委派给多个下游时，在分配子网时，将首先考虑具有较高优先级值的接口。",
     "key": "ip6weight",
     "label": "IPv6 优先级",
     "type": "text"
    }
   ],
   "key": "advanced",
   "title": "高级设置"
  },
  {
   "fields": [],
   "key": "bridgevlan",
   "title": "网桥 VLAN 过滤"
  },
  {
   "fields": [
    {
     "help": "为此接口分配所属的防火墙区域，选择 未指定 可将该接口移出已关联的区域，或者填写 自定义 栏来创建一个新的区域，并将当前接口与之建立关联。",
     "key": "_zone",
     "label": "创建/分配防火墙区域",
     "options": [
      {
       "label": "未指定",
       "value": ""
      },
      {
       "label": "lan",
       "value": "lan"
      },
      {
       "label": "wan",
       "value": "wan"
      }
     ],
     "type": "dropdown"
    }
   ],
   "key": "firewall",
   "title": "防火墙设置"
  },
  {
   "fields": [],
   "key": "dhcp",
   "title": "DHCP 服务器"
  }
 ],
 "device": [
  {
   "fields": [
    {
     "help": "",
     "key": "type",
     "label": "设备类型",
     "options": [
      {
       "label": "网络设备",
       "value": ""
      },
      {
       "label": "网桥设备",
       "value": "bridge"
      },
      {
       "label": "VLAN (802.1q)",
       "value": "8021q"
      },
      {
       "label": "VLAN (802.1ad)",
       "value": "8021ad"
      },
      {
       "label": "MAC VLAN",
       "value": "macvlan"
      },
      {
       "label": "虚拟以太网",
       "value": "veth"
      }
     ],
     "type": "select"
    },
    {
     "help": "",
     "key": "name_complex",
     "label": "设备名称",
     "type": "text"
    },
    {
     "help": "指定关联到此网桥的有线接口。如需关联无线网络，请在无线设置中，将无线接口关联到对应的网络。",
     "key": "ifname_multi-bridge",
     "label": "网桥端口",
     "options": [
      {
       "value": "lan2",
       "label": "lan2"
      },
      {
       "value": "lan3",
       "label": "lan3"
      },
      {
       "value": "lan4",
       "label": "lan4"
      },
      {
       "value": "wan",
       "label": "wan"
      },
      {
       "value": "eth0",
       "label": "eth0"
      }
     ],
     "type": "multi"
    },
    {
     "help": "即使没有接口附加到网桥，也要启动该网桥",
     "key": "bridge_empty",
     "label": "允许启动空网桥",
     "type": "checkbox"
    },
    {
     "help": "",
     "key": "mtu",
     "label": "MTU",
     "type": "text"
    },
    {
     "help": "",
     "key": "macaddr",
     "label": "MAC 地址",
     "type": "text"
    },
    {
     "help": "",
     "key": "txqueuelen",
     "label": "TX 队列长度",
     "type": "text"
    },
    {
     "help": "",
     "key": "ipv6",
     "label": "启用 IPv6",
     "options": [
      {
       "label": "自动（已开启）",
       "value": "1"
      },
      {
       "label": "已禁用",
       "value": "0!"
      },
      {
       "label": "已启用",
       "value": "1!"
      }
     ],
     "type": "select"
    },
    {
     "help": "",
     "key": "mtu6",
     "label": "IPv6 MTU",
     "type": "text"
    },
    {
     "help": "要发送的重复地址检测探测包数量",
     "key": "dadtransmits",
     "label": "DAD 探测次数",
     "type": "text"
    }
   ],
   "key": "devgeneral",
   "title": "常规设备选项"
  },
  {
   "fields": [
    {
     "help": "",
     "key": "priority",
     "label": "优先级",
     "type": "text"
    },
    {
     "help": "网桥转发数据库中已学习 MAC 地址的超时时间（单位：秒）",
     "key": "ageing_time",
     "label": "MAC 地址老化时间",
     "type": "text"
    },
    {
     "help": "在此网桥上启用生成树协议",
     "key": "stp",
     "label": "启用 STP",
     "type": "checkbox"
    },
    {
     "help": "在此网桥上启用 IGMP 嗅探",
     "key": "igmp_snooping",
     "label": "启用 IGMP 嗅探",
     "type": "checkbox"
    },
    {
     "help": "",
     "key": "multicast_querier",
     "label": "启用组播查询器",
     "type": "checkbox"
    },
    {
     "help": "",
     "key": "promisc",
     "label": "启用混杂模式",
     "options": [
      {
       "label": "自动（已禁用）",
       "value": "0"
      },
      {
       "label": "已禁用",
       "value": "0!"
      },
      {
       "label": "已启用",
       "value": "1!"
      }
     ],
     "type": "select"
    },
    {
     "help": "",
     "key": "rpfilter",
     "label": "反转路径过滤器",
     "options": [
      {
       "label": "已禁用",
       "value": ""
      },
      {
       "label": "宽松过滤",
       "value": "loose"
      },
      {
       "label": "严格过滤",
       "value": "strict"
      }
     ],
     "type": "select"
    },
    {
     "help": "接受源地址为本地地址的数据包",
     "key": "acceptlocal",
     "label": "接受本地连接",
     "options": [
      {
       "label": "自动（已禁用）",
       "value": "0"
      },
      {
       "label": "已禁用",
       "value": "0!"
      },
      {
       "label": "已启用",
       "value": "1!"
      }
     ],
     "type": "select"
    },
    {
     "help": "",
     "key": "sendredirects",
     "label": "发送 ICMP 重定向",
     "options": [
      {
       "label": "自动（已开启）",
       "value": "1"
      },
      {
       "label": "已禁用",
       "value": "0!"
      },
      {
       "label": "已启用",
       "value": "1!"
      }
     ],
     "type": "select"
    },
    {
     "help": "启用后，从接收到的免费 ARP 请求或回复中添加新的 ARP 表项，否则仅更新已存在的表项，但不会学习新的主机。",
     "key": "arp_accept",
     "label": "接受免费 ARP",
     "options": [
      {
       "label": "自动（已禁用）",
       "value": "0"
      },
      {
       "label": "已禁用",
       "value": "0!"
      },
      {
       "label": "已启用",
       "value": "1!"
      }
     ],
     "type": "select"
    },
    {
     "help": "丢弃所有免费 ARP 帧。如果网络中存在已知可靠的 ARP 代理，则无需使用此类帧；在 802.11 无线网络中，则需要禁用此类帧以防止攻击。",
     "key": "drop_gratuitous_arp",
     "label": "丢弃免费 ARP",
     "options": [
      {
       "label": "自动（已禁用）",
       "value": "0"
      },
      {
       "label": "已禁用",
       "value": "0!"
      },
      {
       "label": "已启用",
       "value": "1!"
      }
     ],
     "type": "select"
    },
    {
     "help": "时间（单位：毫秒）",
     "key": "neighreachabletime",
     "label": "邻居缓存有效期",
     "type": "text"
    },
    {
     "help": "超时（单位：秒）",
     "key": "neighgcstaletime",
     "label": "过时邻居缓存超时",
     "type": "text"
    },
    {
     "help": "在 ARP 条目被替换前所需的最短等待时间（单位：秒）。用于防止 ARP 缓存抖动。",
     "key": "neighlocktime",
     "label": "最小 ARP 有效时间",
     "type": "text"
    },
    {
     "help": "",
     "key": "ip6segmentrouting",
     "label": "启用 IPv6 分段路由",
     "options": [
      {
       "label": "自动（已禁用）",
       "value": "0"
      },
      {
       "label": "已禁用",
       "value": "0!"
      },
      {
       "label": "已启用",
       "value": "1!"
      }
     ],
     "type": "select"
    },
    {
     "help": "丢弃所有非请求邻居通告。如果网络中存在已知可靠的 NA 代理，则无需使用此类帧；在 802.11 无线网络中，则需要禁用此类帧以防止攻击。",
     "key": "drop_unsolicited_na",
     "label": "丢弃非请求 NA",
     "options": [
      {
       "label": "自动（已禁用）",
       "value": "0"
      },
      {
       "label": "已禁用",
       "value": "0!"
      },
      {
       "label": "已启用",
       "value": "1!"
      }
     ],
     "type": "select"
    },
    {
     "help": "",
     "key": "multicast",
     "label": "启用组播支持",
     "options": [
      {
       "label": "自动（已开启）",
       "value": "1"
      },
      {
       "label": "已禁用",
       "value": "0!"
      },
      {
       "label": "已启用",
       "value": "1!"
      }
     ],
     "type": "select"
    },
    {
     "help": "",
     "key": "igmpversion",
     "label": "强制 IGMP 版本",
     "options": [
      {
       "label": "不强制",
       "value": ""
      },
      {
       "label": "强制 IGMPv1",
       "value": "1"
      },
      {
       "label": "强制 IGMPv2",
       "value": "2"
      },
      {
       "label": "强制 IGMPv3",
       "value": "3"
      }
     ],
     "type": "select"
    },
    {
     "help": "",
     "key": "mldversion",
     "label": "强制 MLD 版本",
     "options": [
      {
       "label": "不强制",
       "value": ""
      },
      {
       "label": "强制 MLD 版本 1",
       "value": "1"
      },
      {
       "label": "强制 MLD 版本 2",
       "value": "2"
      }
     ],
     "type": "select"
    }
   ],
   "key": "devadvanced",
   "title": "高级设备选项"
  },
  {
   "fields": [
    {
     "help": "",
     "key": "vlan_filtering",
     "label": "启用 VLAN 过滤",
     "type": "checkbox"
    }
   ],
   "key": "bridgevlan",
   "title": "网桥 VLAN 过滤"
  }
 ]
};
