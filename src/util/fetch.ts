import {
	gretch,
	GretchResponse,
} from 'gretchen';

type Hash = Record<string, string>;

export interface FetchConfig {
	headers?: Hash;
    search?: Hash;
    body?: string,
    json?: JSONValue,
}

type HttpError = {
	code: number;
	errors: string[];
}

export interface JSONObject {
	[k: string]: JSONValue;
}

export type JSONValue = string | number | boolean | null | JSONValue[] | JSONObject;

export type Response<Data> = GretchResponse<Data, HttpError>;

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'HEAD' | 'DELETE';

async function request_json<Data extends JSONObject>(s_method: RequestMethod, pr_uri: string, gc_fetch: FetchConfig|null=null): Promise<Response<Data>> {
	// append search params
	if(gc_fetch?.search) {
        // uri already has query string
        if(pr_uri.includes('?')) throw new Error(`Cannot specify 'search' option in fetch config when URI already contains search params: "${pr_uri}"`);

        // append search params
        pr_uri += '?'+(new URLSearchParams(gc_fetch.search));

        delete gc_fetch.search;
    }

	// attempt fetch request
	try {
		return await gretch<Data, HttpError>(pr_uri, {
            ...gc_fetch as any,
			method: s_method,
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				...(gc_fetch || {}).headers || {},
			},
		}).json();
	}
	// network error
	catch(e_fetch) {
		// TODO: handle network error
		throw e_fetch;
	}
}

export async function get_json<Data extends JSONObject>(pr_uri: string, gc_fetch: FetchConfig|null=null): Promise<Response<Data>> {
    return request_json<Data>('GET', pr_uri, gc_fetch);
}

export async function post_json<Data extends JSONObject>(pr_uri: string, gc_fetch: FetchConfig|null=null): Promise<Response<Data>> {
    return request_json<Data>('POST', pr_uri, gc_fetch);
}
