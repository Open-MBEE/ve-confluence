export function format(
	s_msg: string,
	h_replace: Record<string, string | number | boolean>,
) {
	return s_msg.replace(/\{(\w+)\}/g, (_, si_key: string): string => {
		return h_replace[si_key] + '';
	});
}
