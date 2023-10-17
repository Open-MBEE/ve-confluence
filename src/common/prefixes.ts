/**
 * Application-specific prefix map
 */
export const H_PREFIXES: Record<string, string> = {
	// Common Linked Data vocabs
	rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
	rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
	owl: 'http://www.w3.org/2002/07/owl#',
	xsd: 'http://www.w3.org/2001/XMLSchema#',
	skos: 'http://www.w3.org/2004/02/skos/core#',
	foaf: 'http://xmlns.com/foaf/0.1/',
	dc: 'http://purl.org/dc/elements/1.1/',
	dct: 'http://purl.org/dc/terms/',

	// MMS RDF
/*	mms: 'https://opencae.jpl.nasa.gov/mms/rdf/ontology/',
	'mms-ontology': 'https://opencae.jpl.nasa.gov/mms/rdf/ontology/',
	'mms-graph': 'https://opencae.jpl.nasa.gov/mms/rdf/graph/',
	'mms-property': 'https://opencae.jpl.nasa.gov/mms/rdf/property/',
	'mms-derived-property': 'https://opencae.jpl.nasa.gov/mms/rdf/derived-property/',
	'mms-class': 'https://opencae.jpl.nasa.gov/mms/rdf/class/',
	'mms-element': 'https://opencae.jpl.nasa.gov/mms/rdf/element/',
	'mms-artifact': 'https://opencae.jpl.nasa.gov/mms/rdf/artifact/',
	'mms-index': 'https://opencae.jpl.nasa.gov/mms/rdf/index/',
	'mms-shape': 'https://opencae.jpl.nasa.gov/mms/rdf/shape/',
	'uml-model': 'https://www.omg.org/spec/UML/20161101/UML.xmi#',
	'uml-model-dt': 'https://www.omg.org/spec/UML/20161101/UML.xmi#datatype/',
	'uml-primitives': 'https://www.omg.org/spec/UML/20161101/PrimitiveTypes.xmi#',
	'uml-class': 'https://opencae.jpl.nasa.gov/mms/rdf/uml-class/',
	'uml-property': 'https://opencae.jpl.nasa.gov/mms/rdf/uml-property/',*/

	// Neptune
	hint: 'http://aws.amazon.com/neptune/vocab/v01/QueryHints#',

	// Jama
	'': 'https://cae-jama.jpl.nasa.gov/rest/v1#',
	def: 'https://cae-jama.jpl.nasa.gov/rest/v1#/definitions/',
};

export const S_EDGE_SUFFIX = '$200';

export const SI_PROJECT = '194';

export default H_PREFIXES;
