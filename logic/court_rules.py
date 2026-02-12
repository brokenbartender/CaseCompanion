"""Court rule constants and light validation for Michigan/Oakland filings."""

DEFAULT_VENUE_CAPTION = "STATE OF MICHIGAN, CIRCUIT COURT FOR THE COUNTY OF OAKLAND"
DEFAULT_DEFENDANT = "Jeffrey Snyder"
DEFAULT_PLAINTIFF = "Cody McKenzie"
DEFAULT_DISCLAIMER = "Informational draft support only. Not legal advice."

REQUIRED_FORMATTING = {
    "margins_inches": 1.0,
    "line_spacing": "double",
    "font_size": 12,
    "font_family": "Times New Roman",
}


def validate_caption(caption: str) -> bool:
    return (caption or "").strip().upper() == DEFAULT_VENUE_CAPTION


def sanitize_text(value: str) -> str:
    return (value or "").strip()
