"""Set PO Type on existing Purchase Orders (including submitted ones) from their item rows' PO Type.

Re-run with:
    bench --site <site> execute daybook.patches.v0_0.backfill_po_type.execute
"""

import frappe

from daybook.buying.purchase_order.events import set_po_type
from daybook.setup.install import run as setup_customisations


def execute():
	# Patches run before after_migrate, so make sure the custom fields exist first.
	setup_customisations()

	for name in frappe.get_all("Purchase Order", filters={"docstatus": ["<", 2]}, pluck="name"):
		doc = frappe.get_doc("Purchase Order", name)
		set_po_type(doc)
		doc.db_set("po_type", doc.po_type, update_modified=False)
