const isAnubisChallenge =
	document.getElementById('anubis_version') !== null && (
		document.getElementById('anubis_challenge') !== null ||
		document.querySelector('script[src*="/cmd/anubis/"]') !== null
	);

if (isAnubisChallenge) {
	chrome.runtime.sendMessage({ type: 'anubis-detected' }, (response) => {
		console.info('No Wasteful PoW:', chrome.runtime.lastError?.message ?? response?.action);
	});
}
