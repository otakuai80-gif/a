#!/usr/bin/env python3
"""gBizINFO の REST API から法人情報を取得し、CSV/Excel に出力するツール。

使い方:
    export GBIZINFO_API_TOKEN=xxxxxxxxxxxxxxxx
    python gbizinfo_collector.py --output companies.csv

詳細は README.md を参照。
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import sys
import time
from dataclasses import dataclass, field
from typing import Iterable

import requests

API_BASE_URL = "https://info.gbiz.go.jp/hojin/v1/hojin"
TOKEN_HEADER = "X-hojinInfo-api-token"

# JIS X 0401 都道府県コード
PREFECTURE_CODES: dict[str, str] = {
    "01": "北海道", "02": "青森県", "03": "岩手県", "04": "宮城県", "05": "秋田県",
    "06": "山形県", "07": "福島県", "08": "茨城県", "09": "栃木県", "10": "群馬県",
    "11": "埼玉県", "12": "千葉県", "13": "東京都", "14": "神奈川県", "15": "新潟県",
    "16": "富山県", "17": "石川県", "18": "福井県", "19": "山梨県", "20": "長野県",
    "21": "岐阜県", "22": "静岡県", "23": "愛知県", "24": "三重県", "25": "滋賀県",
    "26": "京都府", "27": "大阪府", "28": "兵庫県", "29": "奈良県", "30": "和歌山県",
    "31": "鳥取県", "32": "島根県", "33": "岡山県", "34": "広島県", "35": "山口県",
    "36": "徳島県", "37": "香川県", "38": "愛媛県", "39": "高知県", "40": "福岡県",
    "41": "佐賀県", "42": "長崎県", "43": "熊本県", "44": "大分県", "45": "宮崎県",
    "46": "鹿児島県", "47": "沖縄県",
}
NAME_TO_PREF_CODE = {name: code for code, name in PREFECTURE_CODES.items()}
# 「埼玉」のように県/都/府/道を省略した入力も許可する
NAME_TO_PREF_CODE.update(
    {name.rstrip("県都府道"): code for code, name in PREFECTURE_CODES.items()}
)

CSV_COLUMNS = [
    "法人名",
    "都道府県",
    "市区町村",
    "住所",
    "従業員数",
    "事業概要",
    "企業URL",
    "電話番号",
]

# 市区町村の切り出し用（郡がある場合は郡名込みで市区町村欄に入れる）
CITY_PATTERN = re.compile(r"^(?P<county>.+?郡)?(?P<city>.+?[市区町村])")
WARD_PATTERN = re.compile(r"^(?P<ward>.+?区)")

# 行政区を持つ政令指定都市（「さいたま市大宮区」のように市の後に区が続く）
DESIGNATED_CITIES = {
    "札幌市", "仙台市", "さいたま市", "千葉市", "横浜市", "川崎市", "相模原市",
    "新潟市", "静岡市", "浜松市", "名古屋市", "京都市", "大阪市", "堺市",
    "神戸市", "岡山市", "広島市", "北九州市", "福岡市", "熊本市",
}

MAX_PAGE = 10  # gBizINFO API の仕様上のページ上限
DEFAULT_LIMIT = 1000
REQUEST_INTERVAL_SEC = 0.5
MAX_RETRIES = 3

USER_AGENT = "gbizinfo-collector/1.0 (company research tool; contact via repository owner)"
ENRICH_DEFAULT_DELAY_SEC = 1.0

# 電話番号抽出用（TEL: 03-1234-5678 のような表記から拾う。FAXは除外）
PHONE_PATTERN = re.compile(r"0\d{1,4}-\d{1,4}-\d{3,4}")
PHONE_PATTERN_NO_HYPHEN = re.compile(r"(?<!\d)0\d{9,10}(?!\d)")
PHONE_CONTEXT_KEYWORDS = ("tel", "電話")
PHONE_EXCLUDE_KEYWORDS = ("fax", "ファックス")

# 事業概要抽出用の見出しキーワード
SUMMARY_HEADING_KEYWORDS = ("事業内容", "事業概要", "事業紹介", "サービス内容")
SUMMARY_MIN_LEN = 10
SUMMARY_MAX_LEN = 200


@dataclass
class Company:
    name: str = ""
    prefecture: str = ""
    city: str = ""
    address: str = ""
    employee_number: str = ""
    business_summary: str = ""
    company_url: str = ""
    phone_number: str = ""  # gBizINFO APIには電話番号の項目がないため常に空欄

    def as_row(self) -> list[str]:
        return [
            self.name,
            self.prefecture,
            self.city,
            self.address,
            self.employee_number,
            self.business_summary,
            self.company_url,
            self.phone_number,
        ]


def resolve_prefecture_code(value: str) -> str:
    """都道府県名またはコードをJIS X 0401の2桁コードに変換する。"""
    value = value.strip()
    if value in PREFECTURE_CODES:
        return value
    if value in NAME_TO_PREF_CODE:
        return NAME_TO_PREF_CODE[value]
    raise ValueError(f"不明な都道府県指定です: {value}")


def split_address(location: str, prefecture_name: str) -> tuple[str, str, str]:
    """gBizINFOの location（本社所在地の文字列）を 都道府県/市区町村/住所 に分割する。"""
    location = (location or "").strip()
    if not location:
        return "", "", ""

    rest = location
    pref_found = prefecture_name
    if prefecture_name and location.startswith(prefecture_name):
        rest = location[len(prefecture_name):]
    else:
        # 想定外のprefecture名不一致に備えて全都道府県名で再試行
        for name in PREFECTURE_CODES.values():
            if location.startswith(name):
                pref_found = name
                rest = location[len(name):]
                break
        else:
            pref_found = ""

    match = CITY_PATTERN.match(rest)
    if match:
        city = (match.group("county") or "") + match.group("city")
        remainder = rest[match.end():]

        # 政令指定都市は「市」の後に「区」が続くため、区名まで含めて市区町村とする
        if match.group("city") in DESIGNATED_CITIES:
            ward_match = WARD_PATTERN.match(remainder)
            if ward_match:
                city += ward_match.group("ward")
                remainder = remainder[ward_match.end():]

        address = remainder
    else:
        city = ""
        address = rest

    return pref_found, city, address.strip()


def fetch_companies(
    token: str,
    prefecture_code: str,
    employee_min: int | None,
    employee_max: int | None,
    limit: int = DEFAULT_LIMIT,
    session: requests.Session | None = None,
) -> Iterable[dict]:
    """指定条件でgBizINFOを検索し、法人情報を1件ずつyieldする。"""
    session = session or requests.Session()
    headers = {TOKEN_HEADER: token, "Accept": "application/json"}

    params_base: dict[str, str] = {
        "prefecture": prefecture_code,
        "limit": str(limit),
    }
    if employee_min is not None:
        params_base["employee_number_from"] = str(employee_min)
    if employee_max is not None:
        params_base["employee_number_to"] = str(employee_max)

    for page in range(1, MAX_PAGE + 1):
        params = dict(params_base, page=str(page))
        data = _request_with_retry(session, headers, params)

        infos = data.get("hojin-infos") or []
        if not infos:
            break

        yield from infos

        if len(infos) < limit:
            break

        time.sleep(REQUEST_INTERVAL_SEC)


def _request_with_retry(session: requests.Session, headers: dict, params: dict) -> dict:
    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = session.get(API_BASE_URL, headers=headers, params=params, timeout=30)
        except requests.RequestException as exc:
            last_error = exc
            time.sleep(2 ** attempt)
            continue

        if resp.status_code == 200:
            return resp.json()
        if resp.status_code == 401:
            raise SystemExit(
                "認証エラー(401): APIトークンが無効です。GBIZINFO_API_TOKEN を確認してください。"
            )
        if resp.status_code in (429, 500, 502, 503, 504):
            last_error = RuntimeError(f"HTTP {resp.status_code}: {resp.text[:200]}")
            time.sleep(2 ** attempt)
            continue

        raise SystemExit(f"gBizINFO APIエラー (HTTP {resp.status_code}): {resp.text[:500]}")

    raise SystemExit(f"gBizINFO APIへのリクエストに失敗しました: {last_error}")


def to_company(info: dict) -> Company:
    prefecture, city, address = split_address(info.get("location", ""), "")
    employee_number = info.get("employee_number")
    if employee_number is None:
        # 従業員数(employee_number)が未登録でも、企業規模詳細(男/女)が
        # 登録されている法人があるため、その場合は合算値で代用する。
        male = info.get("company_size_male")
        female = info.get("company_size_female")
        if male is not None or female is not None:
            total = (male or 0) + (female or 0)
            if total > 0:
                employee_number = total
    return Company(
        name=info.get("name", ""),
        prefecture=prefecture,
        city=city,
        address=address,
        employee_number="" if employee_number is None else str(employee_number),
        business_summary=info.get("business_summary", ""),
        company_url=info.get("company_url", ""),
        phone_number="",
    )


def _extract_phone_number(text: str) -> str:
    """ページ本文から電話番号らしき文字列を抽出する（ベストエフォート）。"""
    for line in text.splitlines():
        lower = line.lower()
        if any(k in lower for k in PHONE_EXCLUDE_KEYWORDS):
            continue
        if any(k in lower for k in PHONE_CONTEXT_KEYWORDS):
            match = PHONE_PATTERN.search(line)
            if match:
                return match.group(0)

    # 「TEL」等の文脈が見つからない場合は、FAX行を除いた本文全体から探す
    candidate_lines = [
        line
        for line in text.splitlines()
        if not any(k in line.lower() for k in PHONE_EXCLUDE_KEYWORDS)
    ]
    remaining_text = "\n".join(candidate_lines)
    match = PHONE_PATTERN.search(remaining_text)
    if match:
        return match.group(0)
    match = PHONE_PATTERN_NO_HYPHEN.search(remaining_text)
    if match:
        return match.group(0)
    return ""


def _extract_business_summary(soup) -> str:
    """meta descriptionまたは「事業内容」等の見出し直後のテキストから事業概要を抽出する。"""
    meta = soup.find("meta", attrs={"name": "description"})
    if meta and meta.get("content"):
        content = " ".join(meta["content"].split())
        if len(content) >= SUMMARY_MIN_LEN:
            return content[:SUMMARY_MAX_LEN]

    lines = [line.strip() for line in soup.get_text("\n").splitlines() if line.strip()]
    for i, line in enumerate(lines):
        if len(line) <= 20 and any(k in line for k in SUMMARY_HEADING_KEYWORDS):
            for following in lines[i + 1 : i + 4]:
                if len(following) >= SUMMARY_MIN_LEN:
                    return following[:SUMMARY_MAX_LEN]
    return ""


def enrich_company_from_website(company: Company, timeout: float = 10.0) -> None:
    """company_url が分かっている法人について、公式サイトから
    事業概要・電話番号の補完をベストエフォートで試みる（既に値がある項目は上書きしない）。
    企業URLが無い法人は対象外（信頼できる自動取得手段が無いため）。
    """
    if not company.company_url:
        return
    if company.business_summary and company.phone_number:
        return

    url = company.company_url.strip()
    if not re.match(r"^https?://", url):
        url = "https://" + url

    try:
        from bs4 import BeautifulSoup
    except ImportError as exc:
        raise SystemExit(
            "--enrich-web には beautifulsoup4 が必要です。"
            "`pip install -r requirements.txt` を実行してください。"
        ) from exc

    try:
        resp = requests.get(url, timeout=timeout, headers={"User-Agent": USER_AGENT})
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"  [警告] {company.name}: サイト取得に失敗しました ({exc})", file=sys.stderr)
        return

    if resp.encoding is None or resp.encoding.lower() == "iso-8859-1":
        resp.encoding = resp.apparent_encoding

    soup = BeautifulSoup(resp.text, "html.parser")

    if not company.phone_number:
        company.phone_number = _extract_phone_number(soup.get_text("\n"))
    if not company.business_summary:
        company.business_summary = _extract_business_summary(soup)


def collect(
    token: str,
    prefectures: list[str],
    employee_min: int | None,
    employee_max: int | None,
    enrich_web: bool = False,
    enrich_delay: float = ENRICH_DEFAULT_DELAY_SEC,
) -> list[Company]:
    session = requests.Session()
    seen_corporate_numbers: set[str] = set()
    companies: list[Company] = []

    for pref_input in prefectures:
        code = resolve_prefecture_code(pref_input)
        pref_name = PREFECTURE_CODES[code]
        print(f"[取得中] {pref_name} (code={code}) ...", file=sys.stderr)

        count = 0
        for info in fetch_companies(token, code, employee_min, employee_max):
            corporate_number = info.get("corporate_number", "")
            if corporate_number and corporate_number in seen_corporate_numbers:
                continue
            if corporate_number:
                seen_corporate_numbers.add(corporate_number)

            company = to_company(info)
            if not company.prefecture:
                company.prefecture = pref_name
            companies.append(company)
            count += 1

        print(f"  -> {count}件取得", file=sys.stderr)

    if enrich_web:
        targets = [c for c in companies if c.company_url and (not c.business_summary or not c.phone_number)]
        print(
            f"[Web補完] 企業URLのある{len(targets)}件について、事業概要・電話番号の補完を試みます...",
            file=sys.stderr,
        )
        for i, company in enumerate(targets, 1):
            enrich_company_from_website(company)
            if i < len(targets):
                time.sleep(enrich_delay)

    return companies


def write_csv(companies: list[Company], output_path: str) -> None:
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(CSV_COLUMNS)
        for company in companies:
            writer.writerow(company.as_row())


def write_xlsx(companies: list[Company], output_path: str) -> None:
    try:
        from openpyxl import Workbook
    except ImportError as exc:
        raise SystemExit(
            "xlsx出力には openpyxl が必要です。`pip install openpyxl` を実行するか、"
            "拡張子を .csv にしてください。"
        ) from exc

    wb = Workbook()
    ws = wb.active
    ws.title = "companies"
    ws.append(CSV_COLUMNS)
    for company in companies:
        ws.append(company.as_row())
    wb.save(output_path)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="gBizINFO API から条件に合う法人情報を取得してCSV/Excelに出力します。"
    )
    parser.add_argument(
        "--prefectures",
        nargs="+",
        default=["埼玉県", "千葉県"],
        help="対象の都道府県名またはJIS X0401コード（複数指定可、デフォルト: 埼玉県 千葉県）",
    )
    parser.add_argument(
        "--employee-min", type=int, default=20, help="従業員数の下限（デフォルト: 20）"
    )
    parser.add_argument(
        "--employee-max", type=int, default=50, help="従業員数の上限（デフォルト: 50）"
    )
    parser.add_argument(
        "--output",
        default="gbizinfo_companies.csv",
        help="出力ファイルパス（.csv または .xlsx、デフォルト: gbizinfo_companies.csv）",
    )
    parser.add_argument(
        "--token",
        default=None,
        help="gBizINFO APIトークン（未指定の場合は環境変数 GBIZINFO_API_TOKEN を使用）",
    )
    parser.add_argument(
        "--enrich-web",
        action="store_true",
        help=(
            "企業URLが判明している法人について、公式サイトから事業概要・電話番号の補完を"
            "ベストエフォートで試みる（要 beautifulsoup4、1社ずつ追加でHTTPアクセスするため時間がかかります）"
        ),
    )
    parser.add_argument(
        "--enrich-delay",
        type=float,
        default=ENRICH_DEFAULT_DELAY_SEC,
        help=f"--enrich-web 使用時、1社あたりの待機秒数（デフォルト: {ENRICH_DEFAULT_DELAY_SEC}）",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)

    token = args.token or os.environ.get("GBIZINFO_API_TOKEN")
    if not token:
        raise SystemExit(
            "APIトークンが指定されていません。--token 引数か環境変数 GBIZINFO_API_TOKEN を"
            "設定してください（取得方法は README.md 参照）。"
        )

    companies = collect(
        token=token,
        prefectures=args.prefectures,
        employee_min=args.employee_min,
        employee_max=args.employee_max,
        enrich_web=args.enrich_web,
        enrich_delay=args.enrich_delay,
    )

    if args.output.lower().endswith(".xlsx"):
        write_xlsx(companies, args.output)
    else:
        write_csv(companies, args.output)

    print(f"合計 {len(companies)} 件を {args.output} に出力しました。", file=sys.stderr)


if __name__ == "__main__":
    main()
