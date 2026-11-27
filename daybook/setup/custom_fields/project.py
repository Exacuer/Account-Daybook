"""Custom fields on Project (Details tab, after "Timeline").

- project_sites  : Table -> Project Site  (a project can have many sites)
- project_plants : Table -> Project Plant (a project can have many plants)

The same Site / Plant can belong to many projects; duplicates within one project are
blocked in daybook.projects.project.events.
"""

from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

CUSTOM_FIELDS = {
	"Project": [
		{
			"fieldname": "sites_section",
			"label": "Sites",
			"fieldtype": "Section Break",
			"insert_after": "actual_time",
			"module": "Daybook",
		},
		{
			"fieldname": "project_sites",
			"label": "Sites",
			"fieldtype": "Table",
			"options": "Project Site",
			"insert_after": "sites_section",
			"module": "Daybook",
		},
		{
			"fieldname": "plants_section",
			"label": "Plants",
			"fieldtype": "Section Break",
			"insert_after": "project_sites",
			"module": "Daybook",
		},
		{
			"fieldname": "project_plants",
			"label": "Plants",
			"fieldtype": "Table",
			"options": "Project Plant",
			"insert_after": "plants_section",
			"module": "Daybook",
		},
	],
}


def setup():
	create_custom_fields(CUSTOM_FIELDS, update=True)
