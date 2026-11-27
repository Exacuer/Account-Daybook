"""Link-field search queries: only the Sites / Plants added to a Project.

Used by the Plant and Site fields on Purchase Order (public/js/buying/purchase_order.js):
    frm.set_query("site", () => ({query: "daybook.projects.project.queries.site_query", filters: {project}}))
"""

import frappe

# link doctype -> (child doctype, link field in child, location field in master)
PROJECT_LINKS = {
	"Sites": ("Project Site", "site", "site_location"),
	"Plant": ("Project Plant", "plant", "plant_location"),
}


def get_project_links(project, doctype):
	"""Names of the Sites / Plants added to a Project, in row order."""
	child_doctype, link_field, _location = PROJECT_LINKS[doctype]
	return frappe.get_all(
		child_doctype,
		filters={"parent": project, "parenttype": "Project", "parentfield": ["is", "set"]},
		pluck=link_field,
		order_by="idx asc",
	)


def _search(doctype, txt, start, page_len, filters):
	project = (filters or {}).get("project")
	if not project:
		return []
	names = get_project_links(project, doctype)
	if not names:
		return []
	_child, _link, location_field = PROJECT_LINKS[doctype]
	return frappe.get_all(
		doctype,
		filters={"name": ["in", names]},
		or_filters={"name": ["like", f"%{txt}%"], location_field: ["like", f"%{txt}%"]} if txt else None,
		fields=["name", location_field],
		start=start,
		page_length=page_len,
		order_by="name asc",
		as_list=True,
	)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def site_query(doctype, txt, searchfield, start, page_len, filters):
	return _search("Sites", txt, start, page_len, filters)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def plant_query(doctype, txt, searchfield, start, page_len, filters):
	return _search("Plant", txt, start, page_len, filters)
