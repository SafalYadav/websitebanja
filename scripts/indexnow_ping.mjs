#!/usr/bin/env node

/**
 * IndexNow Ping Utility for WebsiteBanja
 * Submits production URLs to Microsoft Bing and IndexNow-compatible search engines.
 */

const HOST = "websitebanja.com";
const KEY = "54c0e643e26f4f269a844da04791336d";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const URL_LIST = [
  `https://${HOST}/`,
  `https://${HOST}/agent`,
];

async function pingIndexNow() {
  console.log(`[IndexNow] Submitting ${URL_LIST.length} URLs to IndexNow...`);
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: URL_LIST,
  };

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 200 || response.status === 202) {
      console.log(`[IndexNow] Successfully submitted URLs (HTTP ${response.status})`);
    } else {
      const errorText = await response.text();
      console.warn(`[IndexNow] Warning: Received HTTP ${response.status}: ${errorText}`);
    }
  } catch (err) {
    console.warn(`[IndexNow] Network call skipped or failed (offline/sandbox): ${err.message}`);
  }
}

pingIndexNow();
