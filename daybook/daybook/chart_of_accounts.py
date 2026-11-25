import frappe
from frappe import _
from frappe.utils.xlsxutils import build_xlsx_response

DETAIL_COLUMNS = [
	("account_number", "Account Number"),
	("root_type", "Root Type"),
	("account_type", "Account Type"),
	("is_group", "Is Group"),
	("account_currency", "Currency"),
	("freeze_account", "Frozen"),
]


def get_accounts_in_tree_order(company: str) -> list[dict]:
	"""Accounts of the company in depth-first tree order, each with its `level` (1 = root)."""
	accounts = frappe.get_list(
		"Account",
		filters={"company": company},
		fields=["name", "account_name", "parent_account", *[field for field, _label in DETAIL_COLUMNS]],
		order_by="lft asc",
	)

	level_by_name = {}
	for account in accounts:
		account.level = level_by_name.get(account.parent_account, 0) + 1
		level_by_name[account.name] = account.level

	return accounts


def get_chart_of_accounts_rows(company: str) -> list[list]:
	accounts = get_accounts_in_tree_order(company)
	depth = max((account.level for account in accounts), default=1)

	header = [_("Level {0}").format(level) for level in range(1, depth + 1)]
	header += [_(label) for _field, label in DETAIL_COLUMNS]
	rows = [header]

	for account in accounts:
		levels = [""] * depth
		levels[account.level - 1] = account.account_name
		account.is_group = _("Yes") if account.is_group else _("No")
		rows.append(levels + [account.get(field) for field, _label in DETAIL_COLUMNS])

	return rows


@frappe.whitelist()
def export_chart_of_accounts(company: str):
	if not frappe.db.exists("Company", company):
		frappe.throw(_("Company {0} does not exist").format(company), frappe.DoesNotExistError)

	build_xlsx_response(get_chart_of_accounts_rows(company), _("Chart of Accounts - {0}").format(company))
