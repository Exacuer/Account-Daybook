(() => {
	const QueryReport = frappe.views && frappe.views.QueryReport;
	if (!QueryReport || QueryReport.prototype.has_daybook_column_settings) return;

	const API = "daybook.daybook.doctype.report_column_layout.report_column_layout.";
	const { get_report_settings, set_default_secondary_action, prepare_report_data } =
		QueryReport.prototype;

	Object.assign(QueryReport.prototype, {
		has_daybook_column_settings: true,

		get_report_settings() {
			return get_report_settings
				.apply(this, arguments)
				.then(() => this.load_column_layout());
		},

		set_default_secondary_action() {
			set_default_secondary_action.apply(this, arguments);

			this.column_settings_button && this.column_settings_button.remove();
			this.column_settings_button = this.page.add_action_icon(
				"sliders-horizontal",
				() => this.show_column_settings(),
				"",
				__("Column Settings")
			);
		},

		prepare_report_data(data) {
			prepare_report_data.apply(this, arguments);

			for (const column of this.columns) {
				column.is_report_hidden = Boolean(column.hidden);
			}
			this.report_column_order = this.columns.map((column) => column.fieldname);
			this.apply_column_layout();
		},

		load_column_layout() {
			const report_name = this.report_name;
			this.column_layout = null;

			return frappe
				.xcall(API + "get_column_layout", { report: report_name })
				.then((columns) => {
					if (this.report_name === report_name) this.column_layout = columns;
				})
				.catch(() => {});
		},

		apply_column_layout() {
			const layout =
				this.column_layout ||
				this.report_column_order.map((fieldname) => ({ fieldname, hidden: false }));
			const position = new Map(layout.map((column, index) => [column.fieldname, index]));
			const hidden = new Set(
				layout.filter((column) => column.hidden).map((column) => column.fieldname)
			);
			const get_position = (column) => position.get(column.fieldname) ?? layout.length;

			for (const column of this.columns) {
				if (!column.is_report_hidden) column.hidden = hidden.has(column.fieldname) ? 1 : 0;
			}
			this.columns.sort((a, b) => get_position(a) - get_position(b));
		},

		show_column_settings() {
			const columns = (this.columns || []).filter((column) => !column.is_report_hidden);
			if (!columns.length) {
				frappe.msgprint(__("Run the report first."));
				return;
			}

			const dialog = new frappe.ui.Dialog({
				title: __("Column Settings - {0}", [__(this.report_name)]),
				fields: [
					{ fieldtype: "HTML", fieldname: "columns_html" },
					{
						fieldtype: "Check",
						fieldname: "for_everyone",
						label: __("Save as default for everyone"),
						hidden: !frappe.user.has_role("System Manager"),
					},
				],
				primary_action_label: __("Save"),
				primary_action: ({ for_everyone }) => {
					const layout = get_layout_from_list($list);
					if (layout.every((column) => column.hidden)) {
						frappe.throw(__("Keep at least one column visible."));
					}
					this.update_column_layout(dialog, "save_column_layout", {
						columns: layout,
						for_everyone,
					});
				},
				secondary_action_label: __("Reset to Default"),
				secondary_action: () => {
					const for_everyone = dialog.get_value("for_everyone");
					this.update_column_layout(dialog, "reset_column_layout", { for_everyone });
				},
			});

			const $list = make_column_list(columns).appendTo(
				dialog.fields_dict.columns_html.$wrapper
			);
			new Sortable($list[0], { handle: ".column-drag-handle", animation: 150 });
			dialog.show();
		},

		update_column_layout(dialog, method, args) {
			const report_name = this.report_name;

			frappe
				.xcall(API + method, { report: report_name, ...args })
				.then(() => frappe.xcall(API + "get_column_layout", { report: report_name }))
				.then((columns) => {
					dialog.hide();
					if (this.report_name !== report_name) return;

					this.column_layout = columns;
					this.apply_column_layout();
					this.render_datatable();
				});
		},
	});

	function make_column_list(columns) {
		const $list = $('<div class="border rounded"></div>');

		for (const column of columns) {
			const $checkbox = $('<input type="checkbox" class="mr-2">').prop(
				"checked",
				!column.hidden
			);
			const $label = $('<label class="d-flex align-items-center flex-fill mb-0"></label>')
				.append($checkbox)
				.append($("<span>").text(__(column.label || column.fieldname)));

			$(
				'<div class="report-column-row d-flex align-items-center px-3 py-2 border-bottom"></div>'
			)
				.attr("data-fieldname", column.fieldname)
				.append(
					$(
						'<span class="column-drag-handle text-muted mr-2" style="cursor: grab"></span>'
					).html(frappe.utils.icon("grip-vertical", "sm"))
				)
				.append($label)
				.appendTo($list);
		}

		return $list;
	}

	function get_layout_from_list($list) {
		return $list
			.children()
			.toArray()
			.map((row) => ({
				fieldname: row.dataset.fieldname,
				hidden: !$(row).find("input").prop("checked"),
			}));
	}
})();
