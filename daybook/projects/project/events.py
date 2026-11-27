"""Project doc_events (wired in hooks.py)."""

import frappe
from frappe import _


def validate(doc, method=None):
	validate_no_duplicates(doc, "project_sites", "site", _("Site"))
	validate_no_duplicates(doc, "project_plants", "plant", _("Plant"))


def validate_no_duplicates(doc, table, link_field, label):
	"""The same Site / Plant may be used in many projects, but only once per project."""
	seen = set()
	for row in doc.get(table):
		value = row.get(link_field)
		if value in seen:
			frappe.throw(
				_("Row #{0}: {1} {2} is already added to this project.").format(
					row.idx, label, frappe.bold(value)
				),
				title=_("Duplicate {0}").format(label),
			)
		seen.add(value)
