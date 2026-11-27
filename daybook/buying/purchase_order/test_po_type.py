"""Run: bench --site <site> run-tests --module daybook.buying.purchase_order.test_po_type"""

import unittest

from daybook.buying.purchase_order.po_type import CAPEX, GENERAL, OPEX, TURNKEY, determine_po_type


class TestDeterminePOType(unittest.TestCase):
	def test_only_capex(self):
		self.assertEqual(determine_po_type([CAPEX, CAPEX]), CAPEX)

	def test_only_opex(self):
		self.assertEqual(determine_po_type([OPEX]), OPEX)

	def test_capex_and_opex_is_general(self):
		self.assertEqual(determine_po_type([CAPEX, OPEX]), GENERAL)
		self.assertEqual(determine_po_type([CAPEX, OPEX, TURNKEY]), GENERAL)

	def test_only_turnkey(self):
		self.assertEqual(determine_po_type([TURNKEY, TURNKEY]), TURNKEY)

	def test_unclassified_items_are_ignored(self):
		self.assertEqual(determine_po_type([None, "", CAPEX]), CAPEX)

	def test_no_classified_items_is_blank(self):
		self.assertEqual(determine_po_type([]), "")
		self.assertEqual(determine_po_type([None, ""]), "")
