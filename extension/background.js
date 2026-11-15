// Safari ignores modifyHeaders rules unless the manifest has declarativeNetRequestWithHostAccess.

const UA_RULE_ID = 1;
const BLOCK_SOLVER_RULE_ID = 2;

// Must not look like a browser: some sites also challenge platform strings such as "Mac OS X".
const FAKE_UA = `NoWastefulPoW/${chrome.runtime.getManifest().version}`;

const MAX_RETRIES = 2;
const FAILED_RETRY_MS = 24 * 60 * 60 * 1000;

async function loadState() {
	const { hosts = [], failed = {} } = await chrome.storage.local.get(['hosts', 'failed']);
	return { hosts, failed };
}

async function saveState(state) {
	await chrome.storage.local.set(state);
	await applyRules(state);
}

async function applyRules({ hosts, failed }) {
	const blockSolver = {
		id: BLOCK_SOLVER_RULE_ID,
		action: { type: 'block' },
		condition: {
			urlFilter: '/.within.website/x/cmd/anubis/static/js/',
			resourceTypes: ['script', 'other'],
		},
	};
	const failedHosts = Object.keys(failed);
	if (failedHosts.length) {
		blockSolver.condition.excludedRequestDomains = failedHosts;
	}

	const addRules = [blockSolver];
	if (hosts.length) {
		addRules.push({
			id: UA_RULE_ID,
			action: {
				type: 'modifyHeaders',
				requestHeaders: [{ header: 'User-Agent', operation: 'set', value: FAKE_UA }],
			},
			condition: {
				requestDomains: hosts,
				resourceTypes: [
					'main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font',
					'xmlhttprequest', 'ping', 'media', 'websocket', 'other',
				],
			},
		});
	}

	const removeRuleIds = (await chrome.declarativeNetRequest.getDynamicRules()).map(rule => rule.id);
	await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

// Keeps concurrent detections from overwriting each other's state
let queue = Promise.resolve();
function serialized(task) {
	const result = queue.then(task);
	queue = result.catch(() => {});
	return result;
}

// tabId -> { url, retries } for loads we started. Reloading isn't enough: Safari sends its real
// User-Agent after redirects, so the challenged URL is loaded directly instead.
const retries = new Map();

function navigate(tabId, url, retryCount) {
	retries.set(tabId, { url, retries: retryCount });
	chrome.tabs.update(tabId, { url });
}

async function handleDetection(host, url, tabId) {
	const state = await loadState();
	const retry = retries.get(tabId);
	retries.delete(tabId);

	if (Date.now() - (state.failed[host] ?? 0) < FAILED_RETRY_MS) {
		return 'gave up on this site earlier';
	}
	delete state.failed[host];

	if (!state.hosts.includes(host)) {
		state.hosts.push(host);
		await saveState(state);
		navigate(tabId, url, 0);
		return 'new site, reloading with the fake User-Agent';
	}

	if (retry?.url !== url) {
		navigate(tabId, url, 0);
		return 'probably reached through a redirect, loading directly';
	}

	if (retry.retries < MAX_RETRIES) {
		navigate(tabId, url, retry.retries + 1);
		return `challenged despite the fake User-Agent, retry ${retry.retries + 1}`;
	}

	state.hosts = state.hosts.filter(h => h !== host);
	state.failed[host] = Date.now();
	await saveState(state);
	navigate(tabId, url, 0);
	return 'site challenges everyone, giving up on it';
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message?.type === 'reset') {
		serialized(() => saveState({ hosts: [], failed: {} })).finally(() => sendResponse());
		return true;
	}

	if (message?.type !== 'anubis-detected' || !sender.url || !sender.tab) {
		return false;
	}

	const url = new URL(sender.url);
	url.hash = '';

	// requestDomains can't hold IPv6 literals
	if (url.hostname.startsWith('[')) {
		return false;
	}

	serialized(() => handleDetection(url.hostname, url.href, sender.tab.id)).then(
		(action) => sendResponse({ action }),
		(e) => sendResponse({ action: `error: ${e.message}` }),
	);
	return true;
});

chrome.runtime.onInstalled.addListener(() => {
	serialized(async () => applyRules(await loadState()));
});
