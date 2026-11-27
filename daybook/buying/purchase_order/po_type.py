"""PO Type business rule (pure Python, no database access, so it is easy to unit test).

Each Purchase Order Item row carries a PO Type: CAPEX or OPEX.
The Purchase Order's PO Type is derived from the rows:

    only CAPEX items           -> CAPEX
    only OPEX items            -> OPEX
    both CAPEX and OPEX items  -> General
    neither CAPEX nor OPEX,
    but Turnkey items present  -> Turnkey
    no classified items        -> "" (blank)

Keep public/js/buying/purchase_order.js (get_po_type) in sync with this function.
"""

from collections.abc import Iterable

CAPEX = "CAPEX"
OPEX = "OPEX"
GENERAL = "General"
TURNKEY = "Turnkey"

ITEM_PO_TYPES = (CAPEX, OPEX)  # values allowed on Purchase Order Item
PO_TYPES = (CAPEX, OPEX, GENERAL, TURNKEY)  # values allowed on Purchase Order


def determine_po_type(item_types: Iterable[str | None]) -> str:
	types = {t for t in item_types if t}
	has_capex = CAPEX in types
	has_opex = OPEX in types

	if has_capex and has_opex:
		return GENERAL
	if has_capex:
		return CAPEX
	if has_opex:
		return OPEX
	if TURNKEY in types:
		return TURNKEY
	return ""
