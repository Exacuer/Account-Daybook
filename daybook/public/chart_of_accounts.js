const daybook_account_tree = frappe.treeview_settings["Account"];
const daybook_export_label = __("Export to Excel");

daybook_account_tree.menu_items = daybook_account_tree.menu_items || [];

if (!daybook_account_tree.menu_items.some((item) => item.label === daybook_export_label)) {
	daybook_account_tree.menu_items.push({
		label: daybook_export_label,
		action: function () {
			const company = daybook_account_tree.treeview.page.fields_dict.company.get_value();
			if (!company) {
				frappe.throw(__("Select a Company first"));
			}

			const query = $.param({ company });
			window.open(
				frappe.urllib.get_full_url(
					"/api/method/daybook.daybook.chart_of_accounts.export_chart_of_accounts?" + query
				)
			);
		},
	});
}
