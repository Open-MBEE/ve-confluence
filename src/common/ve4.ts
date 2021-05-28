import type { ConfluencePage } from "../class/confluence";
import type SparqlEndpoint from "../util/sparql-endpoint";

export interface Ve4ComponentContext {
	k_sparql: SparqlEndpoint,
	k_page: ConfluencePage
}
