import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bs4 import BeautifulSoup

from gbizinfo_collector import (
    _extract_business_summary,
    _extract_phone_number,
    resolve_prefecture_code,
    split_address,
    to_company,
)


class ResolvePrefectureCodeTest(unittest.TestCase):
    def test_full_name(self):
        self.assertEqual(resolve_prefecture_code("埼玉県"), "11")
        self.assertEqual(resolve_prefecture_code("千葉県"), "12")

    def test_short_name(self):
        self.assertEqual(resolve_prefecture_code("埼玉"), "11")
        self.assertEqual(resolve_prefecture_code("千葉"), "12")

    def test_code_passthrough(self):
        self.assertEqual(resolve_prefecture_code("11"), "11")

    def test_unknown_raises(self):
        with self.assertRaises(ValueError):
            resolve_prefecture_code("存在しない県")


class SplitAddressTest(unittest.TestCase):
    def test_city_with_shi(self):
        pref, city, addr = split_address("埼玉県さいたま市大宮区桜木町1-1-1", "埼玉県")
        self.assertEqual(pref, "埼玉県")
        self.assertEqual(city, "さいたま市大宮区")
        self.assertEqual(addr, "桜木町1-1-1")

    def test_city_with_gun_and_machi(self):
        pref, city, addr = split_address("埼玉県秩父郡皆野町大字皆野100番地", "埼玉県")
        self.assertEqual(pref, "埼玉県")
        self.assertEqual(city, "秩父郡皆野町")
        self.assertEqual(addr, "大字皆野100番地")

    def test_chiba_city(self):
        pref, city, addr = split_address("千葉県千葉市中央区中央1-1-1", "千葉県")
        self.assertEqual(pref, "千葉県")
        self.assertEqual(city, "千葉市中央区")
        self.assertEqual(addr, "中央1-1-1")

    def test_empty_location(self):
        self.assertEqual(split_address("", "埼玉県"), ("", "", ""))

    def test_prefecture_autodetected_when_hint_missing(self):
        pref, city, addr = split_address("千葉県柏市旭町1-1-1", "")
        self.assertEqual(pref, "千葉県")
        self.assertEqual(city, "柏市")
        self.assertEqual(addr, "旭町1-1-1")


class ToCompanyTest(unittest.TestCase):
    def test_maps_fields_and_fills_prefecture_fallback(self):
        info = {
            "corporate_number": "1234567890123",
            "name": "株式会社サンプル",
            "location": "埼玉県川口市本町1-1-1",
            "employee_number": 35,
            "business_summary": "ソフトウェア開発",
            "company_url": "https://example.com",
        }
        company = to_company(info)
        self.assertEqual(company.name, "株式会社サンプル")
        self.assertEqual(company.prefecture, "埼玉県")
        self.assertEqual(company.city, "川口市")
        self.assertEqual(company.address, "本町1-1-1")
        self.assertEqual(company.employee_number, "35")
        self.assertEqual(company.business_summary, "ソフトウェア開発")
        self.assertEqual(company.company_url, "https://example.com")
        self.assertEqual(company.phone_number, "")

    def test_missing_employee_number(self):
        info = {"corporate_number": "1234567890123", "name": "無名株式会社", "location": ""}
        company = to_company(info)
        self.assertEqual(company.employee_number, "")

    def test_employee_number_falls_back_to_company_size_breakdown(self):
        info = {
            "corporate_number": "1234567890123",
            "name": "無名株式会社",
            "location": "",
            "employee_number": None,
            "company_size_male": 18,
            "company_size_female": 12,
        }
        company = to_company(info)
        self.assertEqual(company.employee_number, "30")

    def test_employee_number_prefers_explicit_value(self):
        info = {
            "corporate_number": "1234567890123",
            "name": "無名株式会社",
            "location": "",
            "employee_number": 40,
            "company_size_male": 18,
            "company_size_female": 12,
        }
        company = to_company(info)
        self.assertEqual(company.employee_number, "40")


class ExtractPhoneNumberTest(unittest.TestCase):
    def test_prefers_tel_labeled_line(self):
        text = "会社概要\nFAX：03-9999-9999\nTEL：03-1234-5678\nアクセス"
        self.assertEqual(_extract_phone_number(text), "03-1234-5678")

    def test_japanese_label(self):
        text = "お問い合わせ\n電話番号: 042-123-4567\n"
        self.assertEqual(_extract_phone_number(text), "042-123-4567")

    def test_falls_back_to_any_phone_pattern_excluding_fax_lines(self):
        text = "アクセス\nFAX：03-9999-9999\n本社：03-1234-5678\n"
        self.assertEqual(_extract_phone_number(text), "03-1234-5678")

    def test_no_phone_found(self):
        text = "会社概要\n私たちについて\n"
        self.assertEqual(_extract_phone_number(text), "")


class ExtractBusinessSummaryTest(unittest.TestCase):
    def test_meta_description_preferred(self):
        html = """
        <html><head>
        <meta name="description" content="当社はソフトウェア開発を中心に事業を展開しています。">
        </head><body><h2>事業内容</h2><p>詳細はこちら</p></body></html>
        """
        soup = BeautifulSoup(html, "html.parser")
        self.assertEqual(
            _extract_business_summary(soup),
            "当社はソフトウェア開発を中心に事業を展開しています。",
        )

    def test_falls_back_to_heading_keyword(self):
        html = """
        <html><head></head><body>
        <h2>事業内容</h2>
        <p>製造業向けの受託ソフトウェア開発およびコンサルティングを行っています。</p>
        </body></html>
        """
        soup = BeautifulSoup(html, "html.parser")
        self.assertEqual(
            _extract_business_summary(soup),
            "製造業向けの受託ソフトウェア開発およびコンサルティングを行っています。",
        )

    def test_no_summary_found(self):
        html = "<html><head></head><body><p>会社概要ページ</p></body></html>"
        soup = BeautifulSoup(html, "html.parser")
        self.assertEqual(_extract_business_summary(soup), "")


if __name__ == "__main__":
    unittest.main()
