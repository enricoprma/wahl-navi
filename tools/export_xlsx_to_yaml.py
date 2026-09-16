"""Validate an election workbook and export its data to deterministic YAML."""

from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path
from typing import Any, Sequence
from urllib.parse import urlsplit

import pandas as pd
import yaml


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIRECTORY = REPOSITORY_ROOT / "public" / "data"
DEFAULT_LOGO_OUTPUT_DIRECTORY = REPOSITORY_ROOT / "public" / "logos" / "parties"

REQUIRED_SHEETS = ("Metadata", "Statements", "Positions", "Parties")
REQUIRED_METADATA_KEYS = (
    "datasetId",
    "appTitle",
    "location",
    "electionTitle",
    "disclaimer",
)

METADATA_COLUMNS = ("key", "value")
STATEMENT_COLUMNS = ("id", "text", "explanation", "keywords")
POSITION_COLUMNS = ("statement_id", "party_id", "opinion", "justification")
PARTY_COLUMNS = ("id", "name", "short_name", "color", "description")

OPINION_VALUES = {"agree": 1, "neutral": 0, "disagree": -1}
PARTY_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")
MARKDOWN_LINK_PATTERN = re.compile(r"\[([^\]\r\n]+)\]\(([^)\s]+)\)")


class ImporterError(Exception):
    """Raised when the workbook cannot be read, validated, or exported."""


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments for the importer."""
    parser = argparse.ArgumentParser(
        description="Validate a Wahl-Navi Excel workbook and export it to YAML.",
    )
    parser.add_argument("workbook", type=Path, help="Path to the source .xlsx workbook.")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_DIRECTORY,
        help=(
            "Directory for generated YAML files. Defaults to public/data in "
            "the repository."
        ),
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate the workbook and logos without writing files.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print workbook and export details.",
    )
    parser.add_argument(
        "--logos",
        type=Path,
        required=True,
        help="Directory containing one <party-id>.svg file per party.",
    )
    parser.add_argument(
        "--logos-output",
        type=Path,
        default=DEFAULT_LOGO_OUTPUT_DIRECTORY,
        help="Directory for generated party logos.",
    )

    return parser.parse_args(argv)


def load_workbook_data(workbook_path: Path) -> dict[str, pd.DataFrame]:
    """Load the required workbook sheets without performing validation."""
    workbook_path = workbook_path.expanduser().resolve()
    if not workbook_path.exists():
        raise ImporterError(f"Workbook does not exist: {workbook_path}")
    if not workbook_path.is_file():
        raise ImporterError(f"Workbook path is not a file: {workbook_path}")

    try:
        with pd.ExcelFile(workbook_path, engine="openpyxl") as workbook:
            missing_sheets = [
                sheet for sheet in REQUIRED_SHEETS if sheet not in workbook.sheet_names
            ]
            if missing_sheets:
                names = ", ".join(missing_sheets)
                raise ImporterError(f"Workbook is missing required sheet(s): {names}.")

            return {
                sheet: pd.read_excel(workbook, sheet_name=sheet)
                for sheet in REQUIRED_SHEETS
            }
    except ImporterError:
        raise
    except Exception as error:
        raise ImporterError(
            f"Could not read workbook '{workbook_path}': {error}"
        ) from error


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def normalize_optional_text(value: Any) -> str | None:
    """Normalize a missing or whitespace-only spreadsheet cell to ``None``."""
    if _is_missing(value):
        return None
    text = str(value).strip()
    return text or None


def _required_text(value: Any, location: str, field_name: str) -> str:
    text = normalize_optional_text(value)
    if text is None:
        raise ImporterError(f"{location}: '{field_name}' must not be empty.")
    return text


def _require_columns(
    frame: pd.DataFrame,
    sheet_name: str,
    required_columns: Sequence[str],
) -> None:
    missing_columns = [
        column for column in required_columns if column not in frame.columns
    ]
    if missing_columns:
        names = ", ".join(missing_columns)
        raise ImporterError(
            f"{sheet_name}: missing required column(s): {names}."
        )


def _nonempty_rows(
    frame: pd.DataFrame,
    required_columns: Sequence[str],
):
    for index, row in frame.iterrows():
        if all(_is_missing(row[column]) for column in required_columns):
            continue
        yield index + 2, row


def _statement_id(value: Any, location: str) -> int:
    if _is_missing(value):
        raise ImporterError(f"{location}: statement ID must not be empty.")
    if isinstance(value, bool):
        raise ImporterError(f"{location}: statement ID must be a whole number.")

    try:
        numeric_value = float(value)
    except (TypeError, ValueError) as error:
        raise ImporterError(
            f"{location}: statement ID '{value}' must be a whole number."
        ) from error

    if not numeric_value.is_integer():
        raise ImporterError(
            f"{location}: statement ID '{value}' must be a whole number."
        )
    return int(numeric_value)


def _party_id(value: Any, location: str) -> str:
    party_id = _required_text(value, location, "id")
    if not PARTY_ID_PATTERN.fullmatch(party_id):
        raise ImporterError(
            f"{location}: party ID '{party_id}' must use lowercase letters, "
            "numbers, and single hyphens."
        )
    return party_id


def validate_metadata(frame: pd.DataFrame) -> dict[str, str]:
    """Validate and normalize the Metadata sheet."""
    _require_columns(frame, "Metadata", METADATA_COLUMNS)
    values: dict[str, str] = {}
    key_rows: dict[str, int] = {}

    for row_number, row in _nonempty_rows(frame, METADATA_COLUMNS):
        location = f"Metadata row {row_number}"
        key = _required_text(row["key"], location, "key")
        value = _required_text(row["value"], location, "value")
        if key in values:
            raise ImporterError(
                f"{location}: duplicate metadata key '{key}'; first seen on "
                f"row {key_rows[key]}."
            )
        values[key] = value
        key_rows[key] = row_number

    missing_keys = [key for key in REQUIRED_METADATA_KEYS if key not in values]
    if missing_keys:
        names = ", ".join(missing_keys)
        raise ImporterError(f"Metadata: missing required key(s): {names}.")

    return {key: values[key] for key in REQUIRED_METADATA_KEYS}


def validate_statements(frame: pd.DataFrame) -> list[dict[str, Any]]:
    """Validate and normalize the Statements sheet."""
    _require_columns(frame, "Statements", STATEMENT_COLUMNS)
    statements: list[dict[str, Any]] = []
    id_rows: dict[int, int] = {}

    for row_number, row in _nonempty_rows(frame, STATEMENT_COLUMNS):
        location = f"Statements row {row_number}"
        statement_id = _statement_id(row["id"], location)
        if statement_id in id_rows:
            raise ImporterError(
                f"{location}: duplicate statement ID {statement_id}; first seen "
                f"on row {id_rows[statement_id]}."
            )
        id_rows[statement_id] = row_number
        statements.append(
            {
                "id": statement_id,
                "text": _required_text(row["text"], location, "text"),
                "explanation": normalize_optional_text(row["explanation"]),
                "keywords": _required_text(row["keywords"], location, "keywords"),
            }
        )

    if not statements:
        raise ImporterError("Statements: at least one statement is required.")

    return sorted(statements, key=lambda statement: statement["id"])


def validate_parties(frame: pd.DataFrame) -> list[dict[str, str]]:
    """Validate and normalize the Parties sheet."""
    _require_columns(frame, "Parties", PARTY_COLUMNS)
    parties: list[dict[str, str]] = []
    id_rows: dict[str, int] = {}

    for row_number, row in _nonempty_rows(frame, PARTY_COLUMNS):
        location = f"Parties row {row_number}"
        party_id = _party_id(row["id"], location)
        if party_id in id_rows:
            raise ImporterError(
                f"{location}: duplicate party ID '{party_id}'; first seen on "
                f"row {id_rows[party_id]}."
            )

        color = _required_text(row["color"], location, "color")
        if not HEX_COLOR_PATTERN.fullmatch(color):
            raise ImporterError(
                f"{location}: color '{color}' must be a six-digit hex color "
                "such as #1A2B3C."
            )

        id_rows[party_id] = row_number
        parties.append(
            {
                "id": party_id,
                "name": _required_text(row["name"], location, "name"),
                "shortName": _required_text(
                    row["short_name"], location, "short_name"
                ),
                "color": color.upper(),
                "description": _required_text(
                    row["description"], location, "description"
                ),
            }
        )

    if not parties:
        raise ImporterError("Parties: at least one party is required.")
    return parties


def validate_positions(
    frame: pd.DataFrame,
    statements: Sequence[dict[str, Any]],
    parties: Sequence[dict[str, str]],
) -> list[dict[str, Any]]:
    """Validate references and the complete party-position matrix."""
    _require_columns(frame, "Positions", POSITION_COLUMNS)
    statement_ids = {statement["id"] for statement in statements}
    party_ids = {party["id"] for party in parties}
    party_order = {party["id"]: index for index, party in enumerate(parties)}
    positions: list[dict[str, Any]] = []
    pair_rows: dict[tuple[str, int], int] = {}

    for row_number, row in _nonempty_rows(frame, POSITION_COLUMNS):
        location = f"Positions row {row_number}"
        statement_id = _statement_id(row["statement_id"], location)
        party_id = _required_text(row["party_id"], location, "party_id")
        opinion = _required_text(row["opinion"], location, "opinion")

        if statement_id not in statement_ids:
            raise ImporterError(
                f"{location}: unknown statement reference {statement_id}."
            )
        if party_id not in party_ids:
            raise ImporterError(
                f"{location}: unknown party reference '{party_id}'."
            )
        if opinion not in OPINION_VALUES:
            allowed = ", ".join(OPINION_VALUES)
            raise ImporterError(
                f"{location}: opinion '{opinion}' is invalid; expected one of: "
                f"{allowed}."
            )

        pair = (party_id, statement_id)
        if pair in pair_rows:
            raise ImporterError(
                f"{location}: duplicate position for party '{party_id}' and "
                f"statement {statement_id}; first seen on row {pair_rows[pair]}."
            )
        pair_rows[pair] = row_number

        positions.append(
            {
                "statementId": statement_id,
                "partyId": party_id,
                "opinion": OPINION_VALUES[opinion],
                "justification": normalize_optional_text(row["justification"]),
            }
        )

    expected_pairs = {
        (party_id, statement_id)
        for statement_id in statement_ids
        for party_id in party_ids
    }
    missing_pairs = expected_pairs - set(pair_rows)
    if missing_pairs:
        ordered_pairs = sorted(
            missing_pairs,
            key=lambda pair: (pair[1], party_order[pair[0]]),
        )
        preview = ", ".join(
            f"{party_id}/statement-{statement_id}"
            for party_id, statement_id in ordered_pairs[:8]
        )
        if len(ordered_pairs) > 8:
            preview += f", and {len(ordered_pairs) - 8} more"
        raise ImporterError(
            "Positions: incomplete position matrix; missing pair(s): "
            f"{preview}."
        )

    return sorted(
        positions,
        key=lambda position: (
            position["statementId"],
            party_order[position["partyId"]],
        ),
    )


def _is_safe_web_url(url: str) -> bool:
    parsed = urlsplit(url)
    return parsed.scheme.lower() in {"http", "https"} and bool(parsed.netloc)


def convert_markdown_links(text: str | None) -> str | None:
    """Escape text and convert only safe HTTP(S) Markdown links to anchors."""
    if text is None:
        return None

    converted: list[str] = []
    cursor = 0
    for match in MARKDOWN_LINK_PATTERN.finditer(text):
        converted.append(html.escape(text[cursor : match.start()], quote=False))
        label, url = match.groups()
        if _is_safe_web_url(url):
            converted.append(
                '<a href="{}" target="_blank" rel="noopener noreferrer">{}</a>'.format(
                    html.escape(url, quote=True),
                    html.escape(label, quote=False),
                )
            )
        else:
            converted.append(html.escape(match.group(0), quote=False))
        cursor = match.end()
    converted.append(html.escape(text[cursor:], quote=False))
    return "".join(converted)


def build_export_data(
    workbook_data: dict[str, pd.DataFrame],
) -> dict[str, Any]:
    """Validate workbook data and build the generated YAML document values."""
    metadata = validate_metadata(workbook_data["Metadata"])
    statements = validate_statements(workbook_data["Statements"])
    parties = validate_parties(workbook_data["Parties"])
    positions = validate_positions(
        workbook_data["Positions"], statements, parties
    )

    for statement in statements:
        statement["explanation"] = convert_markdown_links(
            statement["explanation"]
        )
    for position in positions:
        position["justification"] = convert_markdown_links(
            position["justification"]
        )

    return {
        "metadata.yaml": metadata,
        "statements.yaml": statements,
        "positions.yaml": positions,
        "parties.yaml": parties,
    }


def _serialize_yaml(data: Any) -> str:
    yaml_text = yaml.safe_dump(
        data,
        allow_unicode=True,
        sort_keys=False,
        default_flow_style=False,
        width=1000,
    )
    if ".nan" in yaml_text.lower():
        raise ImporterError("Generated YAML contains a forbidden .nan value.")
    return yaml_text


def write_yaml_files(export_data: dict[str, Any], output_directory: Path) -> None:
    """Write generated YAML files with stable names, order, and formatting."""
    output_directory = output_directory.expanduser().resolve()
    try:
        output_directory.mkdir(parents=True, exist_ok=True)
        for file_name, data in export_data.items():
            destination = output_directory / file_name
            temporary = destination.with_suffix(destination.suffix + ".tmp")
            temporary.write_text(_serialize_yaml(data), encoding="utf-8", newline="\n")
            temporary.replace(destination)
    except OSError as error:
        raise ImporterError(
            f"Could not write YAML files to '{output_directory}': {error}"
        ) from error


def _record_count(export_data: dict[str, Any], file_name: str) -> int:
    value = export_data[file_name]
    return len(value)


def _print_verbose_summary(
    workbook_path: Path,
    output_directory: Path,
    logo_output_directory: Path,
    export_data: dict[str, Any],
    logos: dict[str, bytes],
    *,
    check_only: bool,
) -> None:
    metadata = export_data["metadata.yaml"]
    statements = export_data["statements.yaml"]
    positions = export_data["positions.yaml"]
    parties = export_data["parties.yaml"]
    blank_explanations = sum(
        statement["explanation"] is None for statement in statements
    )
    blank_justifications = sum(
        position["justification"] is None for position in positions
    )
    converted_links = sum(
        (statement["explanation"] or "").count('<a href="')
        for statement in statements
    ) + sum(
        (position["justification"] or "").count('<a href="')
        for position in positions
    )

    print(f"Workbook: {workbook_path}")
    print(f"Dataset ID: {metadata['datasetId']}")
    print("Sheets: Metadata, Statements, Positions, Parties")
    print(
        "Records: "
        f"metadata={len(metadata)}, "
        f"statements={len(statements)}, "
        f"positions={len(positions)}, "
        f"parties={len(parties)}"
    )
    print(
        "Optional blanks: "
        f"explanations={blank_explanations}, "
        f"justifications={blank_justifications}"
    )
    print(f"Converted Markdown links: {converted_links}")
    if check_only:
        print("Mode: check only (no files written)")
    else:
        print("Mode: export")
        print(f"Workbook output directory: {output_directory}")
        print(f"Workbook output files: {', '.join(export_data)}")
        print(f"Logo output directory: {logo_output_directory}")
        print(f"Logos: {', '.join(logos)}")

def load_party_logos(
    parties: list[dict[str, Any]],
    source_directory: Path,
) -> dict[str, bytes]:
    """Validate exact filenames and read all required logos before export."""
    try:
        if not source_directory.is_dir():
            raise ImporterError(
                f"Logo directory does not exist: {source_directory}"
            )

        # Enumerating names makes this case-sensitive even on Windows.
        available = {
            path.name: path
            for path in source_directory.iterdir()
            if path.is_file()
        }

        logos: dict[str, bytes] = {}
        for party in parties:
            file_name = f"{party['id']}.svg"
            source = available.get(file_name)

            if source is None:
                raise ImporterError(
                    f"Party '{party['id']}': missing logo "
                    f"'{source_directory / file_name}'. "
                    "The filename must match the party ID exactly, "
                    "including case."
                )

            content = source.read_bytes()
            if not content.strip():
                raise ImporterError(
                    f"Party '{party['id']}': logo is empty: {source}"
                )

            logos[file_name] = content

        return logos
    except OSError as error:
        raise ImporterError(
            f"Could not read party logos: {error}"
        ) from error


def write_party_logos(
    logos: dict[str, bytes],
    output_directory: Path,
) -> None:
    """Write required SVGs and remove obsolete generated SVGs."""
    try:
        output_directory.mkdir(parents=True, exist_ok=True)

        for file_name, content in logos.items():
            destination = output_directory / file_name
            temporary = destination.with_suffix(".svg.tmp")
            temporary.write_bytes(content)
            temporary.replace(destination)

        for existing in output_directory.iterdir():
            if (
                existing.is_file()
                and existing.suffix.lower() == ".svg"
                and existing.name not in logos
            ):
                existing.unlink()
    except OSError as error:
        raise ImporterError(
            f"Could not write party logos to '{output_directory}': {error}"
        ) from error


def main(argv: Sequence[str] | None = None) -> int:
    """Run the importer CLI and return a process exit code."""
    args = parse_args(argv)

    workbook_path = args.workbook.expanduser().resolve()
    output_directory = args.output.expanduser().resolve()

    logo_directory = args.logos.expanduser().resolve()
    logo_output_directory = args.logos_output.expanduser().resolve()

    try:
        for destination in (output_directory, logo_output_directory):
            if (
                logo_directory == destination
                or logo_directory in destination.parents
                or destination in logo_directory.parents
            ):
                raise ImporterError(
                    "The source logo directory and generated output directories "
                    "must be separate and must not contain each other."
                )
    
        workbook_data = load_workbook_data(workbook_path)
        export_data = build_export_data(workbook_data)
        logos = load_party_logos(export_data["parties.yaml"], logo_directory)
        counts = (
            f"{_record_count(export_data, 'statements.yaml')} statements, "
            f"{_record_count(export_data, 'parties.yaml')} parties, "
            f"{_record_count(export_data, 'positions.yaml')} positions, "
            f"{len(logos)} logos"
        )

        if args.check:
            if args.verbose:
                _print_verbose_summary(
                    workbook_path,
                    output_directory,
                    logo_output_directory,
                    export_data,
                    logos,
                    check_only=True,
                )
                print("Validation succeeded.")
            else:
                print(f"Validation succeeded: {counts}.")
        else:
            write_yaml_files(export_data, output_directory)
            write_party_logos(logos, logo_output_directory)
            if args.verbose:
                _print_verbose_summary(
                    workbook_path,
                    output_directory,
                    logo_output_directory,
                    export_data,
                    logos,
                    check_only=False,
                )
                print(f"Exported 4 YAML files and {len(logos)} party logos.")
            else:
                print(f"Exported 4 YAML files and {len(logos)} party logos.")
        return 0
    except ImporterError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
