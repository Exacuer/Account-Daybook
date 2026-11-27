"""Install / migrate entry point (wired in hooks.py as after_install and after_migrate).

Every setup function here must be idempotent: it runs on every `bench migrate`.
To add customisations for a new doctype, create setup/custom_fields/<doctype>.py with a
setup() function and list it in SETUP_STEPS.

Manual run:
    bench --site <site> execute daybook.setup.install.run
"""

import frappe

from daybook.setup.custom_fields import project, purchase_order

SETUP_STEPS = (
	purchase_order.setup,
	project.setup,
)


def run():
	for step in SETUP_STEPS:
		step()
	frappe.clear_cache()
