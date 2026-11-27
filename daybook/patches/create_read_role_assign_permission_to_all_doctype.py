
import frappe

role = "Read Role"

def create_read_role():
    

    if frappe.db.exists("Role", role):
        print(f"Role '{role}' already exists.")
        return

    try:
        frappe.get_doc({
            "doctype": "Role",
            "role_name": role
        }).insert(ignore_permissions=True)

        print(f"Role '{role}' created successfully.")

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            f"Create {role} Patch Failed"
        )
        raise


def assign_read_permissions():
    role = "Read Role"

    if not frappe.db.exists("Role", role):
        frappe.throw(f"Role '{role}' does not exist.")

    doctypes = frappe.get_all(
        "DocType",
        filters={"istable": 0},
        pluck="name"
    )

    updated = 0
    skipped = 0
    failed = 0

    skip_details = []
    failed_details = []

    for doctype in doctypes:
        try:
            meta = frappe.get_meta(doctype)

            # Skip Single DocTypes
            if meta.issingle:
                skipped += 1
                skip_details.append({
                    "doctype": doctype,
                    "reason": "Single DocType"
                })
                continue

            # Check existing permission
            existing = frappe.db.exists(
                "Custom DocPerm",
                {
                    "parent": doctype,
                    "role": role
                }
            )

            if existing:
                skipped += 1
                skip_details.append({
                    "doctype": doctype,
                    "reason": "Permission already exists",
                    "permission": existing
                })
                continue

            frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype,
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": role,
                "read": 1
            }).insert(ignore_permissions=True)

            updated += 1

        except Exception:
            failed += 1
            failed_details.append({
                "doctype": doctype,
                "error": frappe.get_traceback()
            })

    frappe.clear_cache()

    # Log skipped and failed DocTypes
    if skip_details or failed_details:
        frappe.log_error(
            title="Read Role Permission Execution Details",
            message=frappe.as_json({
                "skipped": skip_details,
                "failed": failed_details
            }, indent=2)
        )

    print(f"Total DocTypes: {len(doctypes)}")
    print(f"Permissions added: {updated}")
    print(f"Skipped: {skipped}")
    print(f"Failed: {failed}")

    print("Detailed information logged in Error Log.")
    
    return {
        "total": len(doctypes),
        "updated": updated,
        "skipped": skipped,
        "failed": failed
    }



def execute():
    create_read_role()
    assign_read_permissions()
