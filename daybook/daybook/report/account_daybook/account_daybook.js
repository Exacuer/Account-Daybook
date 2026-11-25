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

const DAYBOOK_MIN_SEARCH_LENGTH = 2;

const DAYBOOK_CHILD_FIELD_SEPARATOR = ".";

// Child table fields use "<table fieldname>.<child fieldname>" as their value.
function daybook_get_field_options(doctype) {
    const docfields = frappe.meta.get_docfields(doctype);
    const parent_options = docfields
        .filter(frappe.model.is_value_type)
        .map((df) => ({ label: __(df.label, null, df.parent), value: df.fieldname }));

    const child_options = docfields
        .filter((df) => frappe.model.table_fields.includes(df.fieldtype))
        .flatMap((table_df) =>
            frappe.meta
                .get_docfields(table_df.options)
                .filter(frappe.model.is_value_type)
                .map((df) => ({
                    label: __(table_df.label, null, doctype) + " > " + __(df.label, null, df.parent),
                    value: table_df.fieldname + DAYBOOK_CHILD_FIELD_SEPARATOR + df.fieldname,
                }))
        );

    return parent_options
        .sort((a, b) => a.label.localeCompare(b.label))
        .concat(child_options.sort((a, b) => a.label.localeCompare(b.label)));
}

function daybook_get_column_source(selection) {
    const [table_fieldname, child_field] = selection.field.split(DAYBOOK_CHILD_FIELD_SEPARATOR);
    if (!child_field) {
        return { df: frappe.meta.get_docfield(selection.doctype, selection.field) };
    }
    const table_df = frappe.meta.get_docfield(selection.doctype, table_fieldname);
    return {
        df: frappe.meta.get_docfield(table_df.options, child_field),
        table_df,
        child_field,
    };
}

function daybook_get_column_values(selection, source, names) {
    if (!source.table_df) {
        return frappe.xcall("frappe.desk.query_report.get_data_for_custom_field", {
            field: selection.field,
            doctype: selection.doctype,
            names,
        });
    }
    return frappe.xcall(
        "daybook.daybook.report.account_daybook.custom_columns.get_child_field_values",
        {
            parent_doctype: selection.doctype,
            table_fieldname: source.table_df.fieldname,
            field: source.child_field,
            names,
        }
    );
}

function daybook_get_link_label(report, link) {
    const column = report.columns.find((col) => col.fieldname === link.fieldname);
    return __(link.doctype) + " (" + (column?.name || __(frappe.unscrub(link.fieldname))) + ")";
}

function daybook_get_selection_key(selection) {
    return [selection.doctype, selection.link_fieldname, selection.field].join("|");
}

function daybook_find_fields(report, text) {
    const search = text.trim().toLowerCase();
    if (search.length < DAYBOOK_MIN_SEARCH_LENGTH) {
        return [];
    }

    return (report.linked_doctypes || []).flatMap((link) =>
        daybook_get_field_options(link.doctype)
            .filter(
                (option) =>
                    option.label.toLowerCase().includes(search) ||
                    option.value.toLowerCase().includes(search)
            )
            .map((option) => ({
                doctype: link.doctype,
                link_fieldname: link.fieldname,
                field: option.value,
                field_label: option.label,
                link_label: daybook_get_link_label(report, link),
            }))
    );
}

function daybook_render_search_results(dialog, matches, checked) {
    const $wrapper = dialog.fields_dict.search_results.$wrapper;
    const text = dialog.get_value("search_field") || "";

    if (text.trim().length < DAYBOOK_MIN_SEARCH_LENGTH) {
        $wrapper.html("");
        return;
    }
    if (!matches.length) {
        $wrapper.html(`<p class="text-muted small">${__("No matching field found")}</p>`);
        return;
    }

    const rows = matches.map((match) => {
        const key = daybook_get_selection_key(match);
        return `<label class="d-flex align-items-center gap-2 mb-1" style="cursor: pointer">
            <input type="checkbox" data-key="${frappe.utils.escape_html(key)}"
                ${checked.has(key) ? "checked" : ""}>
            <span><b>${frappe.utils.escape_html(match.field_label)}</b>
                <span class="text-muted">${frappe.utils.escape_html(match.link_label)}</span></span>
        </label>`;
    });
    $wrapper.html(
        `<p class="text-muted small mb-2">${__("Found in")}:</p>
        <div style="max-height: 240px; overflow-y: auto">${rows.join("")}</div>`
    );
}

function daybook_get_manual_selections(values) {
    if (!values.doctype || !values.fields?.length) {
        return [];
    }
    const { doctype, fieldname } = JSON.parse(values.doctype);
    return values.fields.map((field) => ({ doctype, link_fieldname: fieldname, field }));
}

async function daybook_show_add_columns_dialog(report) {
    const linked_doctypes = report.linked_doctypes || [];
    await Promise.all(
        [...new Set(linked_doctypes.map((link) => link.doctype))].map((doctype) =>
            frappe.model.with_doctype(doctype)
        )
    );

    let field_options = [];
    let matches = [];
    const checked = new Map();

    const dialog = new frappe.ui.Dialog({
        title: __("Add Column"),
        fields: [
            {
                fieldtype: "Data",
                fieldname: "search_field",
                label: __("Search Field"),
                placeholder: __("Type a field name, for example Customer Name"),
            },
            { fieldtype: "HTML", fieldname: "search_results" },
            { fieldtype: "Section Break", label: __("Or pick manually") },
            {
                fieldtype: "Select",
                fieldname: "doctype",
                label: __("From Document Type"),
                options: linked_doctypes.map((link) => ({
                    label: daybook_get_link_label(report, link),
                    value: JSON.stringify({ doctype: link.doctype, fieldname: link.fieldname }),
                })),
                change: () => {
                    const value = dialog.get_value("doctype");
                    field_options = value ? daybook_get_field_options(JSON.parse(value).doctype) : [];
                    dialog.set_value("fields", []);
                },
            },
            {
                fieldtype: "MultiSelectList",
                fieldname: "fields",
                label: __("Fields"),
                get_data: (txt) => {
                    const search = (txt || "").toLowerCase();
                    return field_options.filter((option) =>
                        option.label.toLowerCase().includes(search)
                    );
                },
            },
            { fieldtype: "Section Break" },
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
        primary_action_label: __("Add"),
        primary_action: (values) => {
            const selections = new Map(checked);
            daybook_get_manual_selections(values).forEach((selection) =>
                selections.set(daybook_get_selection_key(selection), selection)
            );
            if (!selections.size) {
                frappe.throw(__("Select at least one field"));
            }

            dialog.disable_primary_action();
            daybook_add_columns(report, [...selections.values()], values.insert_after)
                .then(() => dialog.hide())
                .finally(() => dialog.enable_primary_action());
        },
    });

    dialog.fields_dict.search_field.$input.on(
        "input",
        frappe.utils.debounce(() => {
            matches = daybook_find_fields(report, dialog.get_value("search_field") || "");
            daybook_render_search_results(dialog, matches, checked);
        }, 300)
    );

    dialog.fields_dict.search_results.$wrapper.on("change", "input[type=checkbox]", (event) => {
        const key = event.target.dataset.key;
        const match = matches.find((item) => daybook_get_selection_key(item) === key);
        if (event.target.checked) {
            checked.set(key, match);
        } else {
            checked.delete(key);
        }
    });

    dialog.show();
}

async function daybook_add_columns(report, selections, insert_after) {
    const get_names = (selection) =>
        Array.from(report.doctype_field_map[selection.doctype][selection.link_fieldname].names);
    const sources = selections.map(daybook_get_column_source);

    const column_values = await Promise.all(
        selections.map((selection, index) =>
            daybook_get_column_values(selection, sources[index], get_names(selection))
        )
    );

    let insert_after_index = report.columns.findIndex(
        (column) => column.fieldname === insert_after
    );

    selections.forEach((selection, index) => {
        const { df, table_df } = sources[index];
        const fieldname = table_df
            ? df.fieldname + "-" + frappe.scrub(df.parent)
            : df.fieldname;
        const is_duplicate = report.columns.some((column) => column.fieldname === fieldname);
        const custom_column = {
            fieldname: is_duplicate ? fieldname + "-" + frappe.scrub(selection.doctype) : fieldname,
            fieldtype: table_df ? "Data" : df.fieldtype,
            label: table_df
                ? __(table_df.label, null, selection.doctype) + " > " + __(df.label, null, df.parent)
                : __(df.label, null, df.parent),
            insert_after_index,
            link_field: {
                fieldname: selection.link_fieldname,
                names: get_names(selection),
            },
            doctype: selection.doctype,
            options: table_df ? null : df.options,
            width: table_df ? 200 : 100,
        };

        // Saved reports reload custom columns with the parent-field endpoint only.
        if (!table_df) {
            report.custom_columns = report.custom_columns.concat([custom_column]);
        }

        const column = report.prepare_columns([custom_column])[0];
        report.columns.splice(insert_after_index + 1, 0, column);
        report.data.forEach((row) => {
            row[custom_column.fieldname] = column_values[index][row[selection.link_fieldname]];
        });
        insert_after_index += 1;
    });

    report.render_datatable();
    report.set_menu_items();
}
