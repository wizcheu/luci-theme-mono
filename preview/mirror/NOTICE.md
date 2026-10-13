# Native frontend snapshot — development use

This directory contains frontend assets captured from the user's installed OpenWrt 24.10.5 / LEDE LuCI, originally captured with Aeris 1.0.2. HTTP/RPC fixtures and rendered HTML have been anonymized or replaced with illustrative data. Mono copies the sanitized Aeris preview and replaces the theme namespace with Mono; upstream license headers are retained. These assets and fixtures are excluded from theme installation packages.

- LuCI and its bundled applications: [OpenWrt LuCI](https://github.com/openwrt/luci), Apache-2.0 unless otherwise noted in individual files. See [license](licenses/luci.txt). The installed LEDE frontend includes downstream changes; source headers remain in the snapshot.
- OpenClash 0.48.002: Copyright 2019–2026 vernesong, [OpenClash](https://github.com/vernesong/OpenClash), MIT. See [license](licenses/openclash.txt).
- Chart.js: [Chart.js](https://github.com/chartjs/Chart.js), MIT. Its embedded copyright header and [license](licenses/chartjs.md) are retained.
- CodeMirror 6 bundle: [CodeMirror](https://github.com/codemirror/dev), MIT. See [license](licenses/codemirror.txt).
- Twemoji Mozilla flag font: [Mozilla twemoji-colr](https://github.com/mozilla/twemoji-colr), Apache-2.0 for code and CC BY 4.0 for the Twemoji artwork, originally by Twitter and contributors. The installed OpenClash subset is retained without further alteration. See [attribution and licenses](licenses/twemoji-colr.md).
- MAC vendor database: original LICENSE, NOTICE and DISCLAIMER files remain under `www/luci-static/resources/oui/`.
- Aeris baseline: Apache-2.0, with the repository's LICENSE and NOTICE applying.

`manifest.json` records file checksums. This snapshot is for rendering compatibility and offline UI review; it is not a distribution of router configuration, executable firmware, or live network telemetry.

Mono uses these fixtures for native-page coverage. The isolated overview preview also reuses the illustrative traffic formula from Aeris preview/dashboard-demo.js; it is labeled as sample traffic and is never bundled into the IPK.
