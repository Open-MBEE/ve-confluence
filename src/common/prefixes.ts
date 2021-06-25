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

	// UML / SysML
	xml: 'http://www.w3.org/XML/1998/namespace/',
	xmi: 'http://www.omg.org/spec/XMI/20131001#',
	uml: 'http://www.omg.org/spec/UML/20161101#',

	// SHACL / ShEx
	shacl: 'http://www.w3.org/ns/shacl#',

	// OSLC
	oslc: 'http://open-services.net/ns/core#',
	oslc_rm: 'http://open-services.net/ns/rm#',
	oslc_rm_1: 'http://open-services.net/xmlns/rm/1.0/',
	oslc_auto: 'http://open-services.net/ns/auto#',
	oslc_config: 'http://open-services.net/ns/config#',
	oslc_xml_rm: 'http://open-services.net/xmlns/rm/1.0/',
	oslc_acc: 'http://open-services.net/ns/core/acc#',
	oslc_trs: 'http://open-services.net/ns/core/trs#',
	oslc_qm: 'http://open-services.net/ns/qm#',
	oslc_cm: 'http://open-services.net/ns/cm#',
	oslc_cmx: 'http://open-services.net/ns/cm-x#',

	// IBM
	ibm_rm: 'http://www.ibm.com/xmlns/rdm/rdf/',
	ibm_nav: 'http://com.ibm.rdm/navigation#',
	ibm_type: 'http://www.ibm.com/xmlns/rdm/types/',
	ibm_public: 'http://www.ibm.com/xmlns/rm/public/1.0/',
	ibm_workflow: 'http://www.ibm.com/xmlns/rdm/workflow/',
	ibm_req_workflow: 'http://www.ibm.com/xmlns/rdm/workflow/Requirement_Workflow#',

	// JAZZ
	jazz_acc: 'http://jazz.net/ns/clm/acc#',
	jazz_task: 'http://jazz.net/ns/rm/dng/task#',
	jazz_acp: 'http://jazz.net/ns/acp#',
	jazz_calm: 'http://jazz.net/xmlns/prod/jazz/calm/1.0/',
	jazz_rm: 'http://jazz.net/ns/rm#',
	jazz_proc: 'http://jazz.net/ns/process#',
	jazz_nav: 'http://jazz.net/ns/rm/navigation#',
	jazz_discovery: 'http://jazz.net/xmlns/prod/jazz/discovery/1.0/',
	jazz_jtp: 'http://jazz.net/xmlns/prod/jazz/jtp/0.6/',
	jazz_proc1: 'http://jazz.net/xmlns/prod/jazz/process/1.0/',
	jazz_proc06: 'http://jazz.net/xmlns/prod/jazz/process/0.6/',
	jazz_jfs: 'http://jazz.net/xmlns/prod/jazz/jfs/1.0/',
	jazz_dash: 'http://jazz.net/xmlns/prod/jazz/dashboard/1.0/',
	jazz_ui: 'http://jazz.net/ns/ui#',
	jazz_linktype: 'http://jazz.net/ns/dm/linktypes#',
	jazz_shape: 'http://jazz.net/ns/process/shapes/',
	jazz_config: 'http://jazz.net/ns/rm/dng/config#',

	// DNG
	dng_rm: 'https://cae-jazz.jpl.nasa.gov/rm/',
	dng_type: 'https://cae-jazz.jpl.nasa.gov/rm/types/',
	dng_resource: 'https://cae-jazz.jpl.nasa.gov/rm/resources/',
	dng_pa: 'https://cae-jazz.jpl.nasa.gov/rm/process-authoring/',
	dng_ppa: 'https://cae-jazz.jpl.nasa.gov/rm/process/project-areas/',
	dng_team_area: 'https://cae-jazz.jpl.nasa.gov/rm/process/team-areas/',
	dng_oslc: 'https://cae-jazz.jpl.nasa.gov/rm/oslc_rm/',
	dng_process: 'https://cae-jazz.jpl.nasa.gov/rm/process/',
	dng_folder: 'https://cae-jazz.jpl.nasa.gov/rm/folders/',
	dng_service: 'https://cae-jazz.jpl.nasa.gov/rm/service/',
	dng_acclist: 'https://cae-jazz.jpl.nasa.gov/rm/acclist#',
	dng_acccntrl: 'https://cae-jazz.jpl.nasa.gov/rm/accessControl/',
	dng_component: 'https://cae-jazz.jpl.nasa.gov/rm/cm/component/',
	dng_baseline: 'https://cae-jazz.jpl.nasa.gov/rm/cm/baseline/',
	dng_jts: 'https://cae-jazz.jpl.nasa.gov/jts/',
	dng_user: 'https://cae-jazz.jpl.nasa.gov/jts/users/',

	// MMS RDF
	'mms': 'https://opencae.jpl.nasa.gov/mms/rdf/ontology/',
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
	'uml-property': 'https://opencae.jpl.nasa.gov/mms/rdf/uml-property/',
};

export default H_PREFIXES;
