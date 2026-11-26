import json

import frappe
from frappe import _
from frappe.model.document import Document

DOCTYPE = "Report Column Layout"


class ReportColumnLayout(Document):
	"""Column order and visibility of a query report, for one user or as the default for everyone."""

	def autoname(self):
		self.name = get_layout_name(self.report, self.user)

	def validate(self):
		self.columns = json.dumps(get_validated_columns(self.columns))


def get_layout_name(report: str, user: str | None = None) -> str:
	return f"{report}::{user or 'Default'}"


def get_validated_columns(columns: str | list) -> list[dict]:
	try:
		columns = json.loads(columns) if isinstance(columns, str) else columns
	except ValueError:
		columns = None

	if not isinstance(columns, list) or not all(
		isinstance(column, dict) and isinstance(column.get("fieldname"), str) and column["fieldname"]
		for column in columns
	):
		frappe.throw(_("Columns must be a list of objects with a fieldname"), frappe.ValidationError)

	columns = [{"fieldname": column["fieldname"], "hidden": bool(column.get("hidden"))} for column in columns]
	if all(column["hidden"] for column in columns):
		frappe.throw(_("Keep at least one column visible"), frappe.ValidationError)

	return columns


def get_layout_user(for_everyone: bool) -> str | None:
	if frappe.parse_json(for_everyone):
		frappe.only_for("System Manager")
		return None

	return frappe.session.user


def check_report_access(report: str):
	if not frappe.get_doc("Report", report).is_permitted():
		frappe.throw(_("You are not allowed to access report {0}").format(report), frappe.PermissionError)


@frappe.whitelist()
def get_column_layout(report: str) -> list[dict] | None:
	"""The user's own layout, else the default for everyone, else None."""
	check_report_access(report)

	for name in (get_layout_name(report, frappe.session.user), get_layout_name(report)):
		columns = frappe.db.get_value(DOCTYPE, name, "columns")
		if columns:
			return frappe.parse_json(columns)

	return None


@frappe.whitelist(methods=["POST"])
def save_column_layout(report: str, columns: str | list, for_everyone: bool = False):
	check_report_access(report)
	user = get_layout_user(for_everyone)
	name = get_layout_name(report, user)

	if frappe.db.exists(DOCTYPE, name):
		layout = frappe.get_doc(DOCTYPE, name, for_update=True)
		layout.columns = columns
		layout.save(ignore_permissions=True)
	else:
		frappe.get_doc({"doctype": DOCTYPE, "report": report, "user": user, "columns": columns}).insert(
			ignore_permissions=True
		)


@frappe.whitelist(methods=["POST"])
def reset_column_layout(report: str, for_everyone: bool = False):
	check_report_access(report)
	name = get_layout_name(report, get_layout_user(for_everyone))
	if frappe.db.exists(DOCTYPE, name):
		frappe.delete_doc(DOCTYPE, name, ignore_permissions=True)


def delete_layouts_of_report(doc, method=None):
	frappe.db.delete(DOCTYPE, {"report": doc.name})


def delete_layouts_of_user(doc, method=None):
	frappe.db.delete(DOCTYPE, {"user": doc.name})
