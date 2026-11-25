// Copyright (c) 2025, sanket and contributors
// For license information, please see license.txt

frappe.query_reports["Account Daybook"] = {
	filters: [
        {
            fieldname: "company",
            label: __("Company"),
            fieldtype: "MultiSelectList",
            options: "Company",
            reqd: 1,
            default: frappe.defaults.get_default("company") ? [frappe.defaults.get_default("company")] : [],
            get_data: function (txt) {
                return frappe.db.get_link_options("Company", txt);
            },
        },
        {
            fieldname: "from_date",
            label: "From Date",
            fieldtype: "Date",
            default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
            reqd: 1
        },
        {
            fieldname: "to_date",
            label: "To Date",
            fieldtype: "Date",
            default: frappe.datetime.get_today(),
            reqd: 1
        },
        {
            fieldname: "doctype_filter",
            label: "Doctypes",
            fieldtype: "MultiSelect",
            options: [
              "Sales Invoice",
              "Purchase Invoice",
              "Journal Entry",
              "Purchase Receipt",
              "Delivery Note",
              "Sales Order",
              "Purchase Order",
              "Expense Claim",
            ].join("\n"),
            default: ""
          },
    ],

    onload: function (report) {
        daybook_use_multi_field_add_column(report);
    },
};

const DAYBOOK_REPORT_NAME = "Account Daybook";

// frappe.query_report is shared by all reports, so the override checks the report name.
function daybook_use_multi_field_add_column(report) {
    if (!report.daybook_original_get_menu_items) {
        report.daybook_original_get_menu_items = report.get_menu_items;
        report.get_menu_items = function () {
            const items = this.daybook_original_get_menu_items();
            if (this.report_name !== DAYBOOK_REPORT_NAME) {
                return items;
            }
            const add_column = items.find((item) => item.label === __("Add Column"));
            if (add_column) {
                add_column.action = () => daybook_show_add_columns_dialog(this);
            }
            return items;
        };
    }

    report.page.clear_menu();
    report.menu_items = report.get_menu_items();
    report.set_menu_items();
}

function daybook_get_field_options(doctype) {
    return frappe.meta
        .get_docfields(doctype)
        .filter(frappe.model.is_value_type)
        .map((df) => ({ label: __(df.label, null, df.parent), value: df.fieldname }))
        .sort((a, b) => a.label.localeCompare(b.label));
}

function daybook_show_add_columns_dialog(report) {
    let field_options = [];

    const dialog = new frappe.ui.Dialog({
        title: __("Add Column"),
        fields: [
            {
                fieldtype: "Select",
                fieldname: "doctype",
                label: __("From Document Type"),
                reqd: 1,
                options: report.linked_doctypes?.map((df) => ({
                    label:
                        __(df.doctype) +
                        " (" +
                        (report.columns.find((col) => col.fieldname === df.fieldname)?.name ||
                            __(frappe.unscrub(df.fieldname))) +
                        ")",
                    value: JSON.stringify({ doctype: df.doctype, fieldname: df.fieldname }),
                })),
                change: () => {
                    const { doctype } = JSON.parse(dialog.get_value("doctype"));
                    frappe.model.with_doctype(doctype, () => {
                        field_options = daybook_get_field_options(doctype);
                        dialog.set_value("fields", []);
                    });
                },
            },
            {
                fieldtype: "MultiSelectList",
                fieldname: "fields",
                label: __("Fields"),
                reqd: 1,
                get_data: (txt) => {
                    const search = (txt || "").toLowerCase();
                    return field_options.filter((option) =>
                        option.label.toLowerCase().includes(search)
                    );
                },
            },
            {
                fieldtype: "Autocomplete",
                fieldname: "insert_after",
                label: __("Insert After"),
                options: report.columns.map((col) => ({
                    label: col.name || col.label,
                    value: col.fieldname,
                })),
            },
        ],
        primary_action: (values) => {
            if (!values.fields?.length) {
                frappe.throw(__("Select at least one field"));
            }
            dialog.disable_primary_action();
            daybook_add_columns(report, values)
                .then(() => dialog.hide())
                .finally(() => dialog.enable_primary_action());
        },
        primary_action_label: __("Add"),
    });

    dialog.show();
}

async function daybook_add_columns(report, values) {
    const { doctype, fieldname } = JSON.parse(values.doctype);
    const names = Array.from(report.doctype_field_map[doctype][fieldname].names);

    const field_data = await Promise.all(
        values.fields.map((field) =>
            frappe.xcall("frappe.desk.query_report.get_data_for_custom_field", {
                field,
                doctype,
                names,
            })
        )
    );

    let insert_after_index = report.columns.findIndex(
        (column) => column.fieldname === values.insert_after
    );

    values.fields.forEach((field, index) => {
        const df = frappe.meta.get_docfield(doctype, field);
        const is_duplicate = report.columns.some((column) => column.fieldname === df.fieldname);
        const custom_column = {
            fieldname: is_duplicate ? df.fieldname + "-" + frappe.scrub(doctype) : df.fieldname,
            fieldtype: df.fieldtype,
            label: __(df.label, null, df.parent),
            insert_after_index,
            link_field: { fieldname, names },
            doctype,
            options: df.options,
            width: 100,
        };

        report.custom_columns = report.custom_columns.concat([custom_column]);
        report.add_custom_column(
            [custom_column],
            field_data[index],
            { doctype, fieldname, field },
            insert_after_index
        );
        insert_after_index += 1;
    });

    report.set_menu_items();
}
