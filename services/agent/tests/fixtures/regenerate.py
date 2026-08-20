"""Regenerates the committed JSON fixtures under tests/fixtures/generated/
from tests/fixtures/generator.py's scenario definitions. Run this whenever
a ScenarioParams value changes; it's not run automatically, and the app
never imports the generator — only these committed files, via
app/data_provider/fixture_provider.py.

    python -m tests.fixtures.regenerate
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.fixtures.generator import FIXTURE_STORES, generate_store

OUTPUT_DIR = Path(__file__).parent / "generated"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict[str, str]] = {}

    for store_id, (scenario, seed, display_name) in FIXTURE_STORES.items():
        snapshot = generate_store(scenario, seed, store_id, display_name)
        filename = f"{scenario.value}.json"
        (OUTPUT_DIR / filename).write_text(snapshot.model_dump_json(indent=2) + "\n")
        manifest[store_id] = {
            "file": filename,
            "scenario": scenario.value,
            "seed": seed,
            "display_name": display_name,
        }
        print(f"wrote {filename}: {store_id} ({len(snapshot.orders)} orders)")

    manifest_path = OUTPUT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(f"wrote {manifest_path}")


if __name__ == "__main__":
    main()
