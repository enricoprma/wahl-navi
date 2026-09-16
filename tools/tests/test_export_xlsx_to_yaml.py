"""Tests for the Wahl-Navi Excel-to-YAML importer."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest
import yaml

from tools.export_xlsx_to_yaml import (
    ImporterError,
    build_export_data,
    convert_markdown_links,
    load_workbook_data,
    main,
    write_yaml_files,
)


def make_valid_frames() -> dict[str, pd.DataFrame]:
    """Return a compact but complete fictional workbook dataset."""
    return {
        "Metadata": pd.DataFrame(
            [
                ("datasetId", "testville-2026-v1"),
                ("appTitle", "Wahl-Navi"),
                ("location", "Testville"),
                ("electionTitle", "Testville Council Election 2026"),
                (
                    "disclaimer",
                    "This demo uses fictional parties, statements, and positions.",
                ),
            ],
            columns=["key", "value"],
        ),
        "Statements": pd.DataFrame(
            [
                (
                    1,
                    "The town should add public hammocks.",
                    "See the [demo guide](https://example.com/guide).",
                    "Public hammocks",
                ),
                (2, "The library should stay open later.", None, "Library hours"),
            ],
            columns=["id", "text", "explanation", "keywords"],
        ),
        "Positions": pd.DataFrame(
            [
                (1, "sunrise-club", "agree", "Morning naps are efficient."),
                (1, "moonlight-group", "neutral", None),
                (2, "sunrise-club", "neutral", "Test demand first."),
                (2, "moonlight-group", "agree", "Evening readers need access."),
            ],
            columns=[
                "statement_id",
                "party_id",
                "opinion",
                "justification",
            ],
        ),
        "Parties": pd.DataFrame(
            [
                (
                    "sunrise-club",
                    "Sunrise Club",
                    "SC",
                    "#F59E0B",
                    "Prefers early and practical decisions.",
                ),
                (
                    "moonlight-group",
                    "Moonlight Group",
                    "MG",
                    "#4338CA",
                    "Keeps the town useful after sunset.",
                ),
            ],
            columns=["id", "name", "short_name", "color", "description"],
        ),
    }


def write_workbook(
    path: Path,
    frames: dict[str, pd.DataFrame],
    *,
    omit_sheet: str | None = None,
) -> None:
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        for sheet_name, frame in frames.items():
            if sheet_name != omit_sheet:
                frame.to_excel(writer, sheet_name=sheet_name, index=False)


@pytest.fixture
def logo_args(tmp_path: Path) -> list[str]:
    directory = tmp_path / "source-logos"
    directory.mkdir()
    for party_id in ("sunrise-club", "moonlight-group"):
        (directory / f"{party_id}.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg"><title>{party_id}</title></svg>',
            encoding="utf-8",
        )
    return [
        "--logos",
        str(directory),
        "--logos-output",
        str(tmp_path / "generated-logos"),
    ]


@pytest.mark.parametrize("verbose", [False, True])
def test_valid_workbook_exports_successfully(
    tmp_path: Path,
    logo_args: list[str],
    verbose: bool,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workbook_path = tmp_path / "valid.xlsx"
    output_directory = tmp_path / "yaml"
    write_workbook(workbook_path, make_valid_frames())

    result = main(
        [
            str(workbook_path), "--output", str(output_directory), *logo_args,
            *(["--verbose"] if verbose else []),
        ]
    )

    assert result == 0

    assert sorted(path.name for path in output_directory.iterdir()) == [
        "metadata.yaml",
        "parties.yaml",
        "positions.yaml",
        "statements.yaml",
    ]
    assert yaml.safe_load((output_directory / "metadata.yaml").read_text())[
        "appTitle"
    ] == "Wahl-Navi"
    logo_output = tmp_path / "generated-logos"
    assert sorted(path.name for path in logo_output.iterdir()) == [
        "moonlight-group.svg",
        "sunrise-club.svg",
    ]
    for path in logo_output.iterdir():
        assert path.read_bytes() == (
            tmp_path / "source-logos" / path.name
        ).read_bytes()
    output = capsys.readouterr().out
    assert output.count("Exported 4 YAML files and 2 party logos.") == 1
    if verbose:
        assert f"Workbook output directory: {output_directory}" in output
        assert f"Logo output directory: {logo_output}" in output
        assert "Logos: sunrise-club.svg, moonlight-group.svg" in output


def test_check_mode_validates_without_writing(
    tmp_path: Path,
    logo_args: list[str],
) -> None:
    workbook_path = tmp_path / "valid.xlsx"
    output_directory = tmp_path / "must-not-exist"
    write_workbook(workbook_path, make_valid_frames())

    result = main(
        [str(workbook_path), "--output", str(output_directory), "--check", *logo_args]
    )

    assert result == 0
    assert not output_directory.exists()
    assert not (tmp_path / "generated-logos").exists()


def test_verbose_check_reports_useful_details_once(
    tmp_path: Path,
    logo_args: list[str],
    capsys: pytest.CaptureFixture[str],
) -> None:
    workbook_path = tmp_path / "valid.xlsx"
    output_directory = tmp_path / "must-not-exist"
    write_workbook(workbook_path, make_valid_frames())

    result = main(
        [
            str(workbook_path),
            "--output",
            str(output_directory),
            "--check",
            "--verbose",
            *logo_args,
        ]
    )
    output = capsys.readouterr().out

    assert result == 0
    assert "Dataset ID: testville-2026-v1" in output
    assert "Records: metadata=5, statements=2, positions=4, parties=2" in output
    assert "Optional blanks: explanations=1, justifications=1" in output
    assert "Converted Markdown links: 1" in output
    assert "Mode: check only (no files written)" in output
    assert output.count("Validation succeeded.") == 1
    assert "Validated:" not in output
    assert not output_directory.exists()
    assert not (tmp_path / "generated-logos").exists()


def test_empty_optional_cells_never_become_nan(tmp_path: Path) -> None:
    workbook_path = tmp_path / "valid.xlsx"
    output_directory = tmp_path / "yaml"
    write_workbook(workbook_path, make_valid_frames())

    export_data = build_export_data(load_workbook_data(workbook_path))
    write_yaml_files(export_data, output_directory)
    generated = "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(output_directory.glob("*.yaml"))
    )

    assert ".nan" not in generated.lower()
    assert export_data["statements.yaml"][1]["explanation"] is None
    assert export_data["positions.yaml"][1]["justification"] is None


def test_invalid_opinion_fails(tmp_path: Path) -> None:
    frames = make_valid_frames()
    frames["Positions"].loc[0, "opinion"] = "mostly agree"
    workbook_path = tmp_path / "invalid-opinion.xlsx"
    write_workbook(workbook_path, frames)

    with pytest.raises(ImporterError, match="opinion 'mostly agree' is invalid"):
        build_export_data(load_workbook_data(workbook_path))


def test_duplicate_statement_id_fails(tmp_path: Path) -> None:
    frames = make_valid_frames()
    frames["Statements"].loc[1, "id"] = 1
    workbook_path = tmp_path / "duplicate-statement.xlsx"
    write_workbook(workbook_path, frames)

    with pytest.raises(ImporterError, match="duplicate statement ID 1"):
        build_export_data(load_workbook_data(workbook_path))


def test_duplicate_party_id_fails(tmp_path: Path) -> None:
    frames = make_valid_frames()
    frames["Parties"].loc[1, "id"] = "sunrise-club"
    workbook_path = tmp_path / "duplicate-party.xlsx"
    write_workbook(workbook_path, frames)

    with pytest.raises(ImporterError, match="duplicate party ID 'sunrise-club'"):
        build_export_data(load_workbook_data(workbook_path))


def test_unknown_statement_reference_fails(tmp_path: Path) -> None:
    frames = make_valid_frames()
    frames["Positions"].loc[0, "statement_id"] = 99
    workbook_path = tmp_path / "unknown-statement.xlsx"
    write_workbook(workbook_path, frames)

    with pytest.raises(ImporterError, match="unknown statement reference 99"):
        build_export_data(load_workbook_data(workbook_path))


def test_unknown_party_reference_fails(tmp_path: Path) -> None:
    frames = make_valid_frames()
    frames["Positions"].loc[0, "party_id"] = "missing-party"
    workbook_path = tmp_path / "unknown-party.xlsx"
    write_workbook(workbook_path, frames)

    with pytest.raises(ImporterError, match="unknown party reference 'missing-party'"):
        build_export_data(load_workbook_data(workbook_path))


def test_duplicate_party_statement_position_fails(tmp_path: Path) -> None:
    frames = make_valid_frames()
    duplicate = frames["Positions"].iloc[[0]].copy()
    frames["Positions"] = pd.concat(
        [frames["Positions"], duplicate], ignore_index=True
    )
    workbook_path = tmp_path / "duplicate-position.xlsx"
    write_workbook(workbook_path, frames)

    with pytest.raises(ImporterError, match="duplicate position for party"):
        build_export_data(load_workbook_data(workbook_path))


def test_incomplete_position_matrix_fails(tmp_path: Path) -> None:
    frames = make_valid_frames()
    frames["Positions"] = frames["Positions"].iloc[:-1].copy()
    workbook_path = tmp_path / "incomplete-matrix.xlsx"
    write_workbook(workbook_path, frames)

    with pytest.raises(ImporterError, match="incomplete position matrix"):
        build_export_data(load_workbook_data(workbook_path))


def test_missing_sheet_fails(tmp_path: Path) -> None:
    workbook_path = tmp_path / "missing-sheet.xlsx"
    write_workbook(workbook_path, make_valid_frames(), omit_sheet="Parties")

    with pytest.raises(ImporterError, match=r"missing required sheet\(s\): Parties"):
        load_workbook_data(workbook_path)


def test_missing_required_column_fails(tmp_path: Path) -> None:
    frames = make_valid_frames()
    frames["Statements"] = frames["Statements"].drop(columns="keywords")
    workbook_path = tmp_path / "missing-column.xlsx"
    write_workbook(workbook_path, frames)

    with pytest.raises(ImporterError, match="missing required column.*keywords"):
        build_export_data(load_workbook_data(workbook_path))


def test_invalid_color_fails(tmp_path: Path) -> None:
    frames = make_valid_frames()
    frames["Parties"].loc[0, "color"] = "amber"
    workbook_path = tmp_path / "invalid-color.xlsx"
    write_workbook(workbook_path, frames)

    with pytest.raises(ImporterError, match="must be a six-digit hex color"):
        build_export_data(load_workbook_data(workbook_path))


def test_empty_required_text_fails(tmp_path: Path) -> None:
    frames = make_valid_frames()
    frames["Statements"].loc[0, "text"] = "  "
    workbook_path = tmp_path / "empty-text.xlsx"
    write_workbook(workbook_path, frames)

    with pytest.raises(ImporterError, match="'text' must not be empty"):
        build_export_data(load_workbook_data(workbook_path))


def test_markdown_link_conversion_is_safe_and_correct() -> None:
    source = (
        "Read <strong>carefully</strong>: [guide](https://example.com/?a=1&b=2) "
        "or [local file](file:///tmp/demo)."
    )

    assert convert_markdown_links(source) == (
        "Read &lt;strong&gt;carefully&lt;/strong&gt;: "
        '<a href="https://example.com/?a=1&amp;b=2" target="_blank" '
        'rel="noopener noreferrer">guide</a> or '
        "[local file](file:///tmp/demo)."
    )


def test_missing_workbook_returns_nonzero_exit_code(
    tmp_path: Path,
    logo_args: list[str],
) -> None:
    assert main([str(tmp_path / "missing.xlsx"), "--check", *logo_args]) == 1


@pytest.mark.parametrize("check_only", [False, True])
@pytest.mark.parametrize("problem", ["missing", "wrong-case", "empty", "directory"])
def test_invalid_logo_preserves_existing_outputs(
    tmp_path: Path,
    logo_args: list[str],
    problem: str,
    check_only: bool,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workbook = tmp_path / "election.xlsx"
    write_workbook(workbook, make_valid_frames())
    source = tmp_path / "source-logos" / "sunrise-club.svg"
    content = source.read_bytes()
    source.unlink()
    if problem == "wrong-case":
        # Delete and recreate so this exercises exact case even on Windows.
        (source.parent / "Sunrise-club.svg").write_bytes(content)
    elif problem == "empty":
        source.write_bytes(b" \n\t")
    elif problem == "directory":
        source.mkdir()

    output = tmp_path / "yaml"
    output.mkdir()
    (output / "metadata.yaml").write_bytes(b"previous dataset")
    logo_output = tmp_path / "generated-logos"
    logo_output.mkdir()
    (logo_output / "previous-party.svg").write_bytes(b"previous logo")

    result = main(
        [
            str(workbook), "--output", str(output), *logo_args,
            *(["--check"] if check_only else []),
        ]
    )
    assert result == 1
    error = capsys.readouterr().err
    assert "Party 'sunrise-club'" in error
    assert str(source) in error
    assert {
        path.name: path.read_bytes() for path in output.iterdir()
    } == {"metadata.yaml": b"previous dataset"}
    assert {
        path.name: path.read_bytes() for path in logo_output.iterdir()
    } == {"previous-party.svg": b"previous logo"}


def test_missing_logo_directory_fails_without_creating_outputs(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workbook = tmp_path / "election.xlsx"
    write_workbook(workbook, make_valid_frames())
    output = tmp_path / "yaml"
    logo_output = tmp_path / "generated-logos"

    result = main(
        [
            str(workbook), "--output", str(output),
            "--logos", str(tmp_path / "missing-logos"),
            "--logos-output", str(logo_output),
        ]
    )
    assert result == 1
    assert "Logo directory does not exist" in capsys.readouterr().err
    assert not output.exists()
    assert not logo_output.exists()


def test_switching_datasets_replaces_logos_and_check_preserves_outputs(
    tmp_path: Path,
    logo_args: list[str],
) -> None:
    workbook = tmp_path / "election.xlsx"
    frames = make_valid_frames()
    write_workbook(workbook, frames)
    output = tmp_path / "yaml"
    logo_output = tmp_path / "generated-logos"
    arguments = [str(workbook), "--output", str(output), *logo_args]
    assert main(arguments) == 0
    (logo_output / "notes.txt").write_bytes(b"keep this file")
    previous = {
        path: path.read_bytes()
        for directory in (output, logo_output)
        for path in directory.iterdir()
    }

    frames["Metadata"].loc[0, "value"] = "another-election-v1"
    frames["Parties"].loc[0, "id"] = "new-party"
    frames["Positions"]["party_id"] = frames["Positions"]["party_id"].replace(
        {"sunrise-club": "new-party"}
    )
    write_workbook(workbook, frames)
    source = tmp_path / "source-logos"
    (source / "new-party.svg").write_bytes(
        b'<svg xmlns="http://www.w3.org/2000/svg"/>'
    )

    assert main([*arguments, "--check"]) == 0
    assert {
        path: path.read_bytes()
        for directory in (output, logo_output)
        for path in directory.iterdir()
    } == previous

    assert main(arguments) == 0
    assert sorted(path.name for path in logo_output.iterdir()) == [
        "moonlight-group.svg",
        "new-party.svg",
        "notes.txt",
    ]
    assert (logo_output / "notes.txt").read_bytes() == b"keep this file"
    for name in ("moonlight-group.svg", "new-party.svg"):
        assert (logo_output / name).read_bytes() == (source / name).read_bytes()
    assert (source / "sunrise-club.svg").is_file()
    assert yaml.safe_load((output / "metadata.yaml").read_text())["datasetId"] == (
        "another-election-v1"
    )
    assert [
        party["id"] for party in yaml.safe_load((output / "parties.yaml").read_text())
    ] == ["new-party", "moonlight-group"]


@pytest.mark.parametrize("output_flag", ["--output", "--logos-output"])
@pytest.mark.parametrize("relationship", ["same", "parent", "child"])
def test_overlapping_logo_source_and_output_is_rejected(
    tmp_path: Path,
    logo_args: list[str],
    output_flag: str,
    relationship: str,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workbook = tmp_path / "election.xlsx"
    write_workbook(workbook, make_valid_frames())
    source = tmp_path / "source-logos"
    destinations = {
        "same": source,
        "parent": source.parent,
        "child": source / "generated",
    }
    before = {
        path.relative_to(tmp_path): path.read_bytes()
        for path in tmp_path.rglob("*")
        if path.is_file()
    }
    result = main(
        [
            str(workbook), "--output", str(tmp_path / "yaml"), *logo_args,
            output_flag, str(destinations[relationship]),
        ]
    )
    assert result == 1
    assert "must be separate" in capsys.readouterr().err
    assert {
        path.relative_to(tmp_path): path.read_bytes()
        for path in tmp_path.rglob("*")
        if path.is_file()
    } == before
