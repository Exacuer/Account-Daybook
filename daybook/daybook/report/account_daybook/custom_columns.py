import frappe
from frappe import _
from frappe.utils import cstr
from frappe.utils.formatters import format_value


@frappe.whitelist()
def get_child_field_values(parent_doctype: str, table_fieldname: str, field: str, names: str | list) -> dict:
	"""Distinct values of a child table field per parent document, joined with commas."""
	names = frappe.parse_json(names) if isinstance(names, str) else names
	table_df = frappe.get_meta(parent_doctype).get_field(table_fieldname)
	if not table_df or table_df.fieldtype not in frappe.model.table_fields:
		frappe.throw(_("{0} is not a table in {1}").format(table_fieldname, parent_doctype))

	child_doctype = table_df.options
	field_df = frappe.get_meta(child_doctype).get_field(field)
	if not field_df:
		frappe.throw(_("Field {0} does not exist in {1}").format(field, child_doctype))

	rows = frappe.get_list(
		child_doctype,
		filters={"parent": ["in", names], "parenttype": parent_doctype, "parentfield": table_fieldname},
		fields=["parent", field],
		parent_doctype=parent_doctype,
		order_by="idx asc",
	)

	values_by_parent = {}
	for row in rows:
		value = cstr(format_value(row.get(field), field_df)).strip()
		values = values_by_parent.setdefault(row.parent, [])
		if value and value not in values:
			values.append(value)

	return {parent: ", ".join(values) for parent, values in values_by_parent.items()}
