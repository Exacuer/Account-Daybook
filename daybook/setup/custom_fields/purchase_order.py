"""Custom fields on Purchase Order and Purchase Order Item.

- Purchase Order.po_type       (below "Required By"): filled in from the item rows, but editable.
- Purchase Order Item.po_type  ("Item Type"): selected by the user on each row.
- Purchase Order.plant / site  (Accounting Dimensions section, below Cost Center / Project):
  only the Plants / Sites added to the selected Project can be chosen.

Values are set on the server in daybook.buying.purchase_order.events and refreshed live
in the form by public/js/buying/purchase_order.js.
"""

from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

from daybook.buying.purchase_order.po_type import ITEM_PO_TYPES, PO_TYPES

CUSTOM_FIELDS = {
	"Purchase Order": [
		{
			"fieldname": "po_type",
			"label": "PO Type",
			"fieldtype": "Select",
			"options": "\n" + "\n".join(PO_TYPES),
			"insert_after": "schedule_date",  # "Required By"
			"read_only": 0,
			"in_list_view": 1,
			"in_standard_filter": 1,
			"module": "Daybook",
		},
		{
			"fieldname": "plant",
			"label": "Plant",
			"fieldtype": "Link",
			"options": "Plant",
			"insert_after": "cost_center",  # left column, below Cost Center
			"module": "Daybook",
		},
		{
			"fieldname": "site",
			"label": "Site",
			"fieldtype": "Link",
			"options": "Sites",
			"insert_after": "project",  # right column, below Project
			"module": "Daybook",
		},
	],
	"Purchase Order Item": [
		{
			"fieldname": "po_type",
			"label": "Item Type",
			"fieldtype": "Select",
			"options": "\n" + "\n".join(ITEM_PO_TYPES),
			"insert_after": "item_name",
			"fetch_from": "",  # explicit: user-selected, not fetched from Item
			"read_only": 0,
			"in_list_view": 1,
			"columns": 1,
			"module": "Daybook",
		}
	],
}


def setup():
	create_custom_fields(CUSTOM_FIELDS, update=True)
