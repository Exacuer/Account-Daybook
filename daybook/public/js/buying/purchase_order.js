// Purchase Order form:
// - live PO Type: the user selects Item Type on each item row; this recalculates the header.
// - Plant / Site: only the ones added to the selected Project can be chosen.
// The server (daybook.buying.purchase_order.events) is the final authority on save.

// Keep in sync with daybook/buying/purchase_order/po_type.py -> determine_po_type
function get_po_type(items) {
	const types = new Set((items || []).map((row) => row.po_type).filter(Boolean));
	const has_capex = types.has("CAPEX");
	const has_opex = types.has("OPEX");

	if (has_capex && has_opex) return "General";
	if (has_capex) return "CAPEX";
	if (has_opex) return "OPEX";
	if (types.has("Turnkey")) return "Turnkey";
	return "";
}

function refresh_po_type(frm) {
	if (frm.doc.docstatus !== 0) return;
	const po_type = get_po_type(frm.doc.items);
	if ((frm.doc.po_type || "") !== po_type) {
		frm.set_value("po_type", po_type);
	}
}

frappe.ui.form.on("Purchase Order Item", {
	po_type: refresh_po_type,
	items_remove: refresh_po_type,
});

// Plant / Site: limited to the selected Project's Plants / Sites tables
// (search: daybook.projects.project.queries).
const PROJECT_LINK_FIELDS = {
	plant: "daybook.projects.project.queries.plant_query",
	site: "daybook.projects.project.queries.site_query",
};

frappe.ui.form.on("Purchase Order", {
	setup(frm) {
		for (const [fieldname, query] of Object.entries(PROJECT_LINK_FIELDS)) {
			frm.set_query(fieldname, () => {
				if (!frm.doc.project) {
					frappe.throw(__("Please select a Project first."));
				}
				return { query, filters: { project: frm.doc.project } };
			});
		}
	},

	project(frm) {
		// Plant / Site chosen for the previous project may not belong to the new one.
		for (const fieldname of Object.keys(PROJECT_LINK_FIELDS)) {
			if (frm.doc[fieldname]) frm.set_value(fieldname, null);
		}
	},
});
