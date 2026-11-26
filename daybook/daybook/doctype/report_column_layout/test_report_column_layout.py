import frappe
from frappe.tests import IntegrationTestCase

from daybook.daybook.doctype.report_column_layout.report_column_layout import (
	DOCTYPE,
	get_column_layout,
	reset_column_layout,
	save_column_layout,
)

IGNORE_TEST_RECORD_DEPENDENCIES = ["Report", "User"]

REPORT = "General Ledger"
USER_LAYOUT = [{"fieldname": "debit", "hidden": False}, {"fieldname": "credit", "hidden": True}]
DEFAULT_LAYOUT = [{"fieldname": "credit", "hidden": False}, {"fieldname": "debit", "hidden": False}]


def make_user(email: str):
	return frappe.get_doc(
		{
			"doctype": "User",
			"email": email,
			"first_name": "Column Layout",
			"send_welcome_email": 0,
			"roles": [{"role": "Accounts User"}],
		}
	).insert(ignore_permissions=True)


class TestReportColumnLayout(IntegrationTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		cls.user = make_user("column-layout@example.com")

	def setUp(self):
		frappe.db.delete(DOCTYPE, {"report": REPORT})

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_user_layout_wins_over_default(self):
		save_column_layout(REPORT, DEFAULT_LAYOUT, for_everyone=True)
		frappe.set_user(self.user.name)
		self.assertEqual(get_column_layout(REPORT), DEFAULT_LAYOUT)

		save_column_layout(REPORT, USER_LAYOUT)
		self.assertEqual(get_column_layout(REPORT), USER_LAYOUT)

		reset_column_layout(REPORT)
		self.assertEqual(get_column_layout(REPORT), DEFAULT_LAYOUT)

	def test_save_twice_updates_one_layout(self):
		save_column_layout(REPORT, USER_LAYOUT)
		save_column_layout(REPORT, DEFAULT_LAYOUT)

		self.assertEqual(frappe.db.count(DOCTYPE, {"report": REPORT, "user": "Administrator"}), 1)
		self.assertEqual(get_column_layout(REPORT), DEFAULT_LAYOUT)

	def test_no_layout_returns_none(self):
		self.assertIsNone(get_column_layout(REPORT))

	def test_only_system_manager_changes_default(self):
		frappe.set_user(self.user.name)
		self.assertRaises(frappe.PermissionError, save_column_layout, REPORT, USER_LAYOUT, for_everyone=True)
		self.assertRaises(frappe.PermissionError, reset_column_layout, REPORT, for_everyone=True)

	def test_rejects_invalid_columns(self):
		for columns in ([{"hidden": True}], "not json", [{"fieldname": "debit", "hidden": True}]):
			self.assertRaises(frappe.ValidationError, save_column_layout, REPORT, columns)

	def test_deleting_user_deletes_layouts(self):
		user = make_user("column-layout-deleted@example.com")
		frappe.set_user(user.name)
		save_column_layout(REPORT, USER_LAYOUT)
		frappe.set_user("Administrator")

		frappe.delete_doc("User", user.name)
		self.assertFalse(frappe.db.exists(DOCTYPE, {"user": user.name}))
