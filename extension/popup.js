const siteEl = document.getElementById('site');
const countsEl = document.getElementById('counts');
const resetButton = document.getElementById('reset');

async function render() {
	const { hosts = [], failed = {} } = await chrome.storage.local.get(['hosts', 'failed']);
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	const host = tab?.url ? new URL(tab.url).hostname : '';

	if (!host) {
		siteEl.textContent = "No access to this site. Allow the extension on all websites in Safari's settings.";
	} else if (hosts.includes(host)) {
		siteEl.textContent = `Skipping Anubis challenges on ${host}.`;
	} else if (host in failed) {
		siteEl.textContent = `${host} challenges every browser, so it's left alone for now.`;
	} else {
		siteEl.textContent = `No Anubis challenge seen on ${host}.`;
	}

	const failedCount = Object.keys(failed).length;
	countsEl.textContent = `Skipping challenges on ${hosts.length} site(s)` +
		(failedCount ? `, gave up on ${failedCount}.` : '.');
}

resetButton.addEventListener('click', () => {
	chrome.runtime.sendMessage({ type: 'reset' }, render);
});

render();
