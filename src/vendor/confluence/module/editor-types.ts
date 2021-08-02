
export interface ConfluenceUserResult {
	type: 'known';
	username: string;
	userKey: string;
	profilePicture: {
		path: string;
		width: number;
		height: number;
		isDefault: boolean;
	};
	displayName: string;
	_links: Record<string, string>;
	_expandable: Record<string, string>;
	supplier: string;
	timestamp: number;
}
