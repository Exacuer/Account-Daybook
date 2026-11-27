"""Purchase Order doc_events (wired in hooks.py)."""

import frappe
from frappe import _

from daybook.buying.purchase_order.po_type import determine_po_type
from daybook.projects.project.queries import get_project_links


def validate(doc, method=None):
	set_po_type(doc)
	validate_project_plant_and_site(doc)


def set_po_type(doc):
	"""Fill the PO header's PO Type from the Item Type selected on each item row.

	The header field is editable, so a value the user chose is kept; it is only derived
	when blank (covers data import, the REST API and mapped documents). In the form,
	public/js/buying/purchase_order.js re-derives it whenever an Item Type changes.
	"""
	if doc.po_type:
		return
	doc.po_type = determine_po_type(row.po_type for row in doc.items)


def validate_project_plant_and_site(doc):
	"""Plant and Site must be ones added to the selected Project (Project -> Plants / Sites tables)."""
	for fieldname, doctype, label, table_label in (
		("plant", "Plant", _("Plant"), _("Plants")),
		("site", "Sites", _("Site"), _("Sites")),
	):
		value = doc.get(fieldname)
		if not value:
			continue
		if not doc.project:
			frappe.throw(
				_("Select a Project before setting {0}.").format(label), title=_("Project Required")
			)
		if value not in get_project_links(doc.project, doctype):
			frappe.throw(
				_("{0} {1} is not linked to Project {2}. Add it in the Project's {3} table first.").format(
					label, frappe.bold(value), frappe.bold(doc.project), table_label
				),
				title=_("Invalid {0}").format(label),
			)
