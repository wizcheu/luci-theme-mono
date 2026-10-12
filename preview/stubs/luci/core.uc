// Only used by the local preview renderer. Never included in the IPK.
export function getuid() { return 1000; }
export function getspnam() { return { pwdp: 'preview-only' }; }
