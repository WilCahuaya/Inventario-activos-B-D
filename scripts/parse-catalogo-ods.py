#!/usr/bin/env python3
"""Parsea docs/Catalogo nacional de activos.ods y emite JSON por stdout."""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ODS = ROOT / "docs/Catalogo nacional de activos.ods"


def parse_conta(raw: str):
    t = raw.strip()
    if not t:
        return None, None
    m = re.match(r"^(\d{4,5})\s*(.*)$", t)
    if m:
        return m.group(1), t
    return None, t


def main() -> None:
    with zipfile.ZipFile(ODS) as z:
        root = ET.fromstring(z.read("content.xml"))

    ns = {
        "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
        "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    }
    rows = []
    for row in root.findall(".//table:table-row", ns)[1:]:
        cells = []
        for cell in row.findall("table:table-cell", ns):
            reps = int(
                cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-repeated")
                or 1
            )
            ps = cell.findall(".//text:p", ns)
            val = (ps[0].text or "").strip() if ps else ""
            cells.extend([val] * reps)
        cells = (cells + [""] * 8)[:8]
        codigo = cells[0].strip()
        if not codigo:
            continue
        cuenta_codigo, contabilidad = parse_conta(cells[4])
        rows.append(
            {
                "codigo": codigo,
                "denominacion": cells[1].strip(),
                "grupo": cells[2].strip() or None,
                "clase": cells[3].strip() or None,
                "cuenta_codigo": cuenta_codigo,
                "contabilidad": contabilidad,
                "depreciacion": cells[5].strip() or None,
                "resolucion": cells[6].strip() or None,
                "estado": cells[7].strip() or None,
            }
        )

    json.dump(rows, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
