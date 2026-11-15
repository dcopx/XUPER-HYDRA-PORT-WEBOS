#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MAGIS_PATH = path.join(ROOT_DIR, 'webos/services/com.webosflux.xuptertv.fidelity.service/magis.js');
const ROOT_OUTPUT_PATH = path.join(ROOT_DIR, 'portal_config.json');
const FLUTTER_ASSET_PATH = path.join(ROOT_DIR, 'uecesar_xuper/assets/portal_config.json');

function extractValue(content, regex, fallback = null) {
  const match = content.match(regex);
  return match && match[1] ? match[1].trim() : fallback;
}

function extractArray(content, regex) {
  const match = content.match(regex);
  if (!match || !match[1]) return [];
  const items = [];
  const itemRegex = /["']([^"']+)["']/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(match[1])) !== null) {
    const val = itemMatch[1].trim();
    if (val) items.push(val);
  }
  return items;
}

function main() {
  if (!fs.existsSync(MAGIS_PATH)) {
    console.error(`[generate_portal_config] Error: magis.js not found at ${MAGIS_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(MAGIS_PATH, 'utf8');

  const keyHex = extractValue(content, /KEY_HEX\s*=\s*["']([a-f0-9]+)["']/i);
  const hosts = extractArray(content, /(?:DEFAULT_)?HOSTS\s*=\s*\[([\s\S]*?)\]/);
  const appId = extractValue(content, /APP_ID\s*=\s*["']([^"']+)["']/, 'com.android.msandroid');
  const apkVer = extractValue(content, /APK_VERSION\s*=\s*["']([^"']+)["']/, '49902');
  const apkVerHeader = extractValue(content, /APK_VER_HEADER\s*=\s*["']([^"']+)["']/, '43404');
  const spkgVer = extractValue(content, /SPKG_VER\s*=\s*["']([^"']+)["']/);
  const userAgent = extractValue(content, /USER_AGENT\s*=\s*["']([^"']+)["']/, 'okhttp/3.12.12');
  const sntokenSalt = extractValue(content, /SNTOKEN_SALT\s*=\s*["']([^"']+)["']/, 'ntFT65w6itH!lHCPw7D=@qnsFC5adD28');
  const reserve1 = extractValue(content, /FIXED_RESERVE1\s*=\s*["']([^"']+)["']/, '583442714b345572434a4d5769637461545a735936413d3d');
  const drmId = extractValue(content, /FIXED_DRM_ID\s*=\s*["']([^"']+)["']/, '0iSGEyv2EqiS/nqI/I3hqdu12irw5Q3/uqrWvRFx9bM=');
  const macAddr = extractValue(content, /FIXED_MAC\s*=\s*["']([^"']+)["']/, '02:00:00:00:00:00');

  // Validaciones críticas
  if (!keyHex) {
    console.error('[generate_portal_config] Error: KEY_HEX could not be extracted from magis.js');
    process.exit(1);
  }
  if (!hosts || hosts.length === 0) {
    console.error('[generate_portal_config] Error: DEFAULT_HOSTS is empty or not found in magis.js');
    process.exit(1);
  }
  if (!spkgVer) {
    console.error('[generate_portal_config] Error: SPKG_VER could not be extracted from magis.js');
    process.exit(1);
  }

  // Si existe mptec.dhkrxuzcy.com en hosts preferentes, asegurar que esté en la lista
  const orderedHosts = [...hosts];
  if (!orderedHosts.includes('mptec.dhkrxuzcy.com')) {
    orderedHosts.unshift('mptec.dhkrxuzcy.com');
  }

  const config = {
    hosts: orderedHosts,
    keyHex,
    appId,
    apkVer,
    apkVerHeader,
    spkgVer,
    userAgent,
    sntokenSalt,
    loginType: '2',
    hardwareInfo: 'ranchu',
    model: 'sdk_gphone64_arm64',
    product: 'sdk_gphone64_arm64',
    cpu: 'arm64-v8a',
    reserve1,
    drmId,
    sdkVer: 33,
    appLanguage: 'en',
    defaultVodFallbackHost: 'http://buec.kyalbhxgw.com',
    defaultLiveFallbackHost: 'buec.kyalbhxgw.com',
    defaultMacAddr: macAddr,
    timeoutSeconds: 8,
    searchDebounceSeconds: 2,
  };

  const jsonStr = JSON.stringify(config, null, 2) + '\n';

  // 1. Guardar en la raíz del fork para consumo HTTP público
  fs.writeFileSync(ROOT_OUTPUT_PATH, jsonStr, 'utf8');
  console.log(`[generate_portal_config] Successfully generated: ${ROOT_OUTPUT_PATH}`);

  // 2. Si existe uecesar_xuper localmente, sincronizar su asset de fallback
  if (fs.existsSync(path.dirname(FLUTTER_ASSET_PATH))) {
    fs.writeFileSync(FLUTTER_ASSET_PATH, jsonStr, 'utf8');
    console.log(`[generate_portal_config] Synced Flutter asset: ${FLUTTER_ASSET_PATH}`);
  }
}

main();
