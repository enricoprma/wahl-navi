import re
import sys
from pathlib import Path

import pandas as pd
import yaml


def markdown_links_to_html(text):
    """Convert Markdown links while leaving other spreadsheet text unchanged."""
    if not isinstance(text, str):
        return text
    return re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        r'<a target="_blank" href="\2">\1</a>',
        text,
    )


if len(sys.argv) != 2:
    print("Usage: export_xlsx_to_yaml.py <xlsx file>")
    raise SystemExit(1)

excel_path = Path(sys.argv[1])

metadata_frame = pd.read_excel(excel_path, sheet_name="Metadata")
statements_frame = pd.read_excel(excel_path, sheet_name="Statements")
positions_frame = pd.read_excel(excel_path, sheet_name="Positions")
parties_frame = pd.read_excel(excel_path, sheet_name="Parties")

opinion_map = {
    "agree": 1,
    "neutral": 0,
    "disagree": -1,
}

metadata = dict(
    zip(metadata_frame["key"], metadata_frame["value"], strict=False),
)

statements = statements_frame[
    ["id", "text", "explanation", "keywords"]
].to_dict(orient="records")
for statement in statements:
    statement["explanation"] = markdown_links_to_html(statement["explanation"])

positions = positions_frame.rename(
    columns={"statement_id": "statementId", "party_id": "partyId"},
)[["statementId", "partyId", "opinion", "justification"]].to_dict(
    orient="records",
)
for position in positions:
    position["justification"] = markdown_links_to_html(position["justification"])
    position["opinion"] = opinion_map.get(position["opinion"])

parties = parties_frame.rename(columns={"short_name": "shortName"})[
    ["id", "name", "shortName", "color", "description"]
].to_dict(orient="records")

output_dir = Path(__file__).resolve().parents[1] / "public" / "data"
output_dir.mkdir(parents=True, exist_ok=True)

exports = {
    "metadata.yaml": metadata,
    "statements.yaml": statements,
    "positions.yaml": positions,
    "parties.yaml": parties,
}

for file_name, data in exports.items():
    with (output_dir / file_name).open("w", encoding="utf-8") as output_file:
        yaml.dump(data, output_file, allow_unicode=True, sort_keys=False)

print("The workbook was exported to YAML successfully.")
