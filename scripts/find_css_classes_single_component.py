#!/usr/bin/env python3
"""
Encuentra clases CSS definidas en un archivo (por defecto src/index.css)
que son usadas en pocos componentes (por defecto 1).

Objetivo: detectar clases candidatas para mover a CSS por componente.

Uso:
  python scripts/find_css_classes_single_component.py
  python scripts/find_css_classes_single_component.py --max-components 2
  python scripts/find_css_classes_single_component.py --json
"""

from __future__ import annotations

import argparse
import json
import os
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set


CLASS_NAME_RE = re.compile(r"^[A-Za-z_-][A-Za-z0-9_-]*$")


def remove_css_comments(content: str) -> str:
    return re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)


def extract_css_classes(css_content: str) -> Set[str]:
    """Extrae nombres de clases CSS (ej: .hero-panel -> hero-panel)."""
    content = remove_css_comments(css_content)
    class_names = set(re.findall(r"\.([A-Za-z_-][A-Za-z0-9_-]*)", content))
    return class_names


def find_component_files(root: Path) -> List[Path]:
    files: List[Path] = []
    for pattern in ("src/**/*.tsx", "src/**/*.jsx"):
        files.extend(root.glob(pattern))
    return sorted(set(files))


def tokenize_class_candidates(value: str) -> List[str]:
    tokens = []
    for token in value.split():
        normalized = token.strip().strip("'\"`{},()")
        if CLASS_NAME_RE.match(normalized):
            tokens.append(normalized)
    return tokens


def extract_classnames_from_component(content: str) -> Set[str]:
    """
    Extrae clases desde className:
    - className="a b"
    - className='a b'
    - className={`a ${cond ? 'b' : 'c'}`}
    - className={cond ? 'a' : 'b'}
    """
    found: Set[str] = set()

    # 1) className="..." / className='...'
    direct_pattern = re.compile(r'className\s*=\s*("([^"]*)"|\'([^\']*)\')', re.DOTALL)
    for m in direct_pattern.finditer(content):
        value = m.group(2) if m.group(2) is not None else m.group(3) or ""
        found.update(tokenize_class_candidates(value))

    # 2) className={...} (simple/non-greedy por bloque)
    expr_pattern = re.compile(r'className\s*=\s*\{(.*?)\}', re.DOTALL)
    for m in expr_pattern.finditer(content):
        expr = m.group(1)

        # string literals dentro de la expresión
        string_literals = re.findall(r'"([^"]*)"|\'([^\']*)\'|`([^`]*)`', expr, flags=re.DOTALL)
        for triple in string_literals:
            literal = next((part for part in triple if part), "")
            # Quitar placeholders de template literals: ${...}
            literal = re.sub(r"\$\{.*?\}", " ", literal, flags=re.DOTALL)
            found.update(tokenize_class_candidates(literal))

    return found


def analyze(
    root: Path,
    css_file: Path,
    min_components: int,
    max_components: int,
    verbose: bool,
) -> Dict[str, Dict]:
    if not css_file.exists():
        raise FileNotFoundError(f"No existe el archivo CSS: {css_file}")

    css_content = css_file.read_text(encoding="utf-8", errors="ignore")
    css_classes = extract_css_classes(css_content)

    component_files = find_component_files(root)
    class_to_components: Dict[str, Set[Path]] = defaultdict(set)

    for component_file in component_files:
        content = component_file.read_text(encoding="utf-8", errors="ignore")
        used_in_file = extract_classnames_from_component(content)

        # Solo interesan clases que existen en CSS global
        for class_name in used_in_file:
            if class_name in css_classes:
                class_to_components[class_name].add(component_file)

    result: Dict[str, Dict] = {}
    for class_name, components in class_to_components.items():
        usage_count = len(components)
        if min_components <= usage_count <= max_components:
            result[class_name] = {
                "usage_count": usage_count,
                "components": sorted(str(p.relative_to(root)) for p in components),
            }

    if verbose:
        print(f"[INFO] Clases detectadas en CSS: {len(css_classes)}")
        print(f"[INFO] Componentes escaneados: {len(component_files)}")
        print(f"[INFO] Clases con uso entre {min_components} y {max_components}: {len(result)}")

    return result


def print_report(data: Dict[str, Dict], min_components: int, max_components: int) -> None:
    if not data:
        print(
            f"\n✓ No se encontraron clases CSS usadas entre {min_components} y {max_components} componente(s)."
        )
        return

    by_component: Dict[str, List[str]] = defaultdict(list)
    for class_name, info in data.items():
        for component in info["components"]:
            by_component[component].append(class_name)

    print("\n" + "=" * 88)
    print(f"CLASES CSS USADAS ENTRE {min_components} Y {max_components} COMPONENTE(S)")
    print("=" * 88 + "\n")
    print(f"Total clases: {len(data)}")
    print(f"Total componentes afectados: {len(by_component)}\n")

    for component, class_names in sorted(by_component.items(), key=lambda item: len(item[1]), reverse=True):
        print(f"📄 {component}")
        print(f"   Clases candidatas: {len(class_names)}")
        for class_name in sorted(class_names):
            print(f"      • {class_name}")
        print()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Encuentra clases CSS usadas en pocos componentes"
    )
    parser.add_argument(
        "--root",
        default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        help="Directorio raíz del proyecto",
    )
    parser.add_argument(
        "--css",
        default="src/index.css",
        help="Ruta del CSS global relativa a --root (default: src/index.css)",
    )
    parser.add_argument(
        "--min-components",
        type=int,
        default=1,
        help="Mínimo de componentes donde puede aparecer la clase (default: 1)",
    )
    parser.add_argument(
        "--max-components",
        type=int,
        default=1,
        help="Máximo de componentes donde puede aparecer la clase (default: 1)",
    )
    parser.add_argument("--json", action="store_true", help="Salida JSON")
    parser.add_argument("--verbose", "-v", action="store_true", help="Salida detallada")

    args = parser.parse_args()

    if args.min_components < 1:
        parser.error("--min-components debe ser >= 1")
    if args.max_components < 1:
        parser.error("--max-components debe ser >= 1")
    if args.min_components > args.max_components:
        parser.error("--min-components no puede ser mayor que --max-components")

    root = Path(args.root).resolve()
    css_file = (root / args.css).resolve()

    data = analyze(
        root=root,
        css_file=css_file,
        min_components=args.min_components,
        max_components=args.max_components,
        verbose=args.verbose,
    )

    if args.json:
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print_report(data, args.min_components, args.max_components)


if __name__ == "__main__":
    main()
