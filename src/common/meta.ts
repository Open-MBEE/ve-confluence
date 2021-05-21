import type jQuery from 'jquery';

interface MetaMap {
	access_mode: 'READ_WRITE' | 'READ_ONLY';
	action_locale: string;
	atl_token: string;
	attachment_source_content_id: string;
	auto_start: `${boolean}`;
	base_url: string;
	browse_page_tree_mode: string;  // "view";
	build_number: `${number}`;
	can_attach_files: `${boolean}`;
	can_remove_page: `${boolean}`;
	can_remove_page_hierarchy: `${boolean}`;
	can_send_email: `${boolean}`;
	can_view_profile: `${boolean}`;
	collaborative_content: `${boolean}`;
	collaborative_editor_status: string;
	conf_revision: string; // "confluence$content$468007073.8";
	confluence_flavour: string;
	confluence_prefs_editor_disable_autocomplete: `${boolean}`;
	confluence_prefs_editor_disable_autoformat: `${boolean}`;
	connection_timeout: `${number}`;
	content_id: string;
	content_type: string;  // "page";
	context_path: string;
	create_issue_metadata_show_discovery: `${boolean}`;
	current_user_avatar_uri_reference: string;
	current_user_avatar_url: string;
	current_user_fullname: string;
	date_format: string;
	discovered_plugin_features: `{${string}}`;
	draft_id: string;
	draft_save_interval: `${number}`;
	draft_share_id: string;
	draft_type: string;  // "page";
	edit_mode: string;  // "collaborative";
	editor_mode: string;  // "richtext";
	editor_plugin_resource_prefix: string;
	enabled_dark_features: string;
	existing_draft_id: string;
	form_name: string;  // "inlinecommentform";
	from_page_title: string;
	global_settings_attachment_max_size: `${number}`;
	global_settings_quick_search_enabled: `${boolean}`;
	heartbeat: `${boolean}`;
	heartbeat_interval: `${number}`;
	is_admin: `${boolean}`;
	is_confluence_admin: `${boolean}`;
	is_dev_mode: `${boolean}`;
	keyboardshortcut_hash: string;
	latest_page_id: string;
	latest_published_page_title: string;
	macro_placeholder_timeout: `${number}`;
	max_number_editors: `${number}`;
	max_thumb_height: `${number}`;
	max_thumb_width: `${number}`;
	min_editor_height: `${number}`;
	new_page: `${boolean}`;
	page_id: string;
	page_title: string;
	page_version: `${number}`;
	parent_page_id: string;
	parent_page_title: string;
	remote_user: string;
	remote_user_has_browse_users_permission: `${boolean}`;
	remote_user_has_licensed_access: `${boolean}`;
	remote_user_key: string;
	render_mode: 'READ_WRITE' | 'READ_ONLY';
	shared_drafts: `${boolean}`;
	show_draft_message: `${boolean}`;
	show_hidden_user_macros: `${boolean}`;
	show_space_welcome_dialog: `${boolean}`;
	site_title: string;
	space_key: string;
	space_name: string;
	static_resource_url_prefix: string;
	sync_revision_source: string;
	synchrony_app_id: string;
	synchrony_base_url: string;
	synchrony_connection_order: string;  // "primary";
	synchrony_connection_type: string;  // "synchrony-direct";
	synchrony_expiry: `${number}`;
	synchrony_token: string;
	team_calendars_display_time_format: string;  // "displayTimeFormat12";
	use_inline_tasks: `${boolean}`;
	use_keyboard_shortcuts: `${boolean}`;
	use_watch: `${boolean}`;
	use_xhr_fallback: `${boolean}`;
	user_date_pattern: string;
	user_display_name: string;
	user_locale: string;
	user_watching_own_content: `${boolean}`;
	version_comment: string;
	version_number: `${number}.${number}.${number}`;
}

declare global {
	const AJS: {
		Meta: {
			getAllAsMap(): Record<string, string>;
		}
	}
	
    interface Window {
		jQuery: typeof jQuery;
		$: typeof jQuery;
	}

	interface JQuery {
		tipsy(): any;
	}
};

/**
* Confluence-provided 'Meta' object
*/
export const G_META: MetaMap = Object.entries(AJS.Meta.getAllAsMap())
	.reduce((h_out, [si_key, s_value]) => ({
		...h_out,
		[si_key]: s_value,
		[si_key.replace(/-/g, '_')]: s_value,
	}), {}) as MetaMap;

export default G_META;

