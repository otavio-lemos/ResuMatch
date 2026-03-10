#!/usr/bin/env python3
"""
SEO Checker - Search Engine Optimization Audit
"""

import sys
import json
import re
from pathlib import Path
from datetime import datetime

# Debug: print version info immediately
print(f"[DEBUG] SEO checker starting - Python {sys.version}", file=sys.stderr)
print(f"[DEBUG] Args: {sys.argv}", file=sys.stderr)

# Fix Windows console encoding
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except:
    pass


# Directories to skip
SKIP_DIRS = {
    "node_modules",
    ".next",
    "dist",
    "build",
    ".git",
    ".github",
    "__pycache__",
    ".vscode",
    ".idea",
    "coverage",
    "test",
    "tests",
    "__tests__",
    "spec",
    "docs",
    "documentation",
    "examples",
}

# Files to skip (not pages)
SKIP_PATTERNS = [
    "config",
    "setup",
    "util",
    "helper",
    "hook",
    "context",
    "store",
    "service",
    "api",
    "lib",
    "constant",
    "type",
    "interface",
    "mock",
    ".test.",
    ".spec.",
    "_test.",
    "_spec.",
]


def is_page_file(file_path: Path) -> bool:
    """Check if this file is likely a public-facing page."""
    name = file_path.name.lower()
    stem = file_path.stem.lower()

    # Skip utility/config files
    if any(skip in name for skip in SKIP_PATTERNS):
        return False

    # Skip common component filenames
    component_patterns = [
        "navbar",
        "footer",
        "sidebar",
        "modal",
        "button",
        "input",
        "card",
        "dropdown",
    ]
    if any(pattern in stem for pattern in component_patterns):
        return False

    # Check path - pages in specific directories are likely pages
    parts = [p.lower() for p in file_path.parts]
    page_dirs = ["pages", "app", "routes", "views", "screens"]

    if any(d in parts for d in page_dirs):
        # For files in app directory, only consider files named page.tsx or layout.tsx
        if "app" in parts:
            if name == "page.tsx" or name == "layout.tsx" or name == "not-found.tsx":
                return True
            return False
        return True

    # Filename indicators for pages
    page_names = [
        "page",
        "index",
        "home",
        "about",
        "contact",
        "blog",
        "post",
        "article",
        "product",
        "landing",
        "layout",
    ]

    if any(p in stem for p in page_names):
        return True

    # HTML files are usually pages
    if file_path.suffix.lower() in [".html", ".htm"]:
        return True

    return False


def find_pages(project_path: Path) -> list:
    """Find page files to check."""
    patterns = ["**/*.html", "**/*.htm", "**/*.jsx", "**/*.tsx"]

    files = []
    for pattern in patterns:
        try:
            print(f"[DEBUG] Searching for {pattern}...", file=sys.stderr)
            for f in project_path.glob(pattern):
                # Skip excluded directories
                if any(skip in f.parts for skip in SKIP_DIRS):
                    continue

                # Check if it's likely a page
                if is_page_file(f):
                    print(f"[DEBUG] Found page file: {f}", file=sys.stderr)
                    files.append(f)
        except Exception as e:
            print(f"[DEBUG] Error searching for {pattern}: {e}", file=sys.stderr)

    return files[:50]  # Limit to 50 files


def check_page(file_path: Path) -> dict:
    """Check a single page for SEO issues."""
    issues = []

    # Skip app/page.tsx specifically because it relies on the root layout.tsx metadata
    if file_path.name == "page.tsx" and "app" in file_path.parts:
        return {"file": str(file_path.name), "issues": issues}

    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        return {"file": str(file_path.name), "issues": [f"Error: {e}"]}

    # Pass NextJS 13+ metadata exports automatically
    if (
        "export const metadata" in content
        or "export async function generateMetadata" in content
    ):
        return {"file": str(file_path.name), "issues": issues}

    # Detect if this is a layout/template file (has Head component)
    is_layout = "Head>" in content or "<head" in content.lower()

    # 1. Title tag
    has_title = (
        "<title" in content.lower()
        or "title=" in content
        or "Head>" in content
        or "title:" in content
    )
    if not has_title and is_layout:
        issues.append("Missing <title> tag")

    # 2. Meta description
    has_description = (
        'name="description"' in content.lower()
        or "name='description'" in content.lower()
        or "description:" in content
        or "description : " in content
    )
    if not has_description and is_layout:
        issues.append("Missing meta description")

    # 3. Open Graph tags
    has_og = (
        "og:" in content
        or 'property="og:' in content.lower()
        or "openGraph:" in content
        or "openGraph :" in content
    )
    if not has_og and is_layout:
        issues.append("Missing Open Graph tags")

    # 4. Heading hierarchy - multiple H1s
    h1_matches = re.findall(r"<h1[^>]*>", content, re.I)
    if len(h1_matches) > 1:
        issues.append(f"Multiple H1 tags ({len(h1_matches)})")

    # 5. Images without alt
    img_pattern = r"<img[^>]+>"
    imgs = re.findall(img_pattern, content, re.I)
    for img in imgs:
        if "alt=" not in img.lower():
            issues.append("Image missing alt attribute")
            break
        if 'alt=""' in img or "alt=''" in img:
            issues.append("Image has empty alt attribute")
            break

    # 6. Check for canonical link (nice to have)
    # has_canonical = 'rel="canonical"' in content.lower()

    return {"file": str(file_path.name), "issues": issues}


def main():
    project_path = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()

    print(f"[DEBUG] project_path: {project_path}", file=sys.stderr)
    print(f"[DEBUG] project_path exists: {project_path.exists()}", file=sys.stderr)

    print(f"\n{'=' * 60}")
    print(f"  SEO CHECKER - Search Engine Optimization Audit")
    print(f"{'=' * 60}")
    print(f"Project: {project_path}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)

    # Find pages
    print(f"[DEBUG] Calling find_pages...", file=sys.stderr)
    pages = find_pages(project_path)
    print(f"[DEBUG] find_pages returned: {len(pages)} pages", file=sys.stderr)

    if not pages:
        print("\n[!] No page files found.")
        print("    Looking for: HTML, JSX, TSX in pages/app/routes directories")
        output = {"script": "seo_checker", "files_checked": 0, "passed": True}
        print("\n" + json.dumps(output, indent=2))
        sys.exit(0)

    print(f"Found {len(pages)} page files to analyze\n")

    # Check each page
    all_issues = []
    for f in pages:
        result = check_page(f)
        if result["issues"]:
            all_issues.append(result)

    # Summary
    print("=" * 60)
    print("SEO ANALYSIS RESULTS")
    print("=" * 60)

    if all_issues:
        # Group by issue type
        issue_counts = {}
        for item in all_issues:
            for issue in item["issues"]:
                issue_counts[issue] = issue_counts.get(issue, 0) + 1

        print("\nIssue Summary:")
        for issue, count in sorted(issue_counts.items(), key=lambda x: -x[1]):
            print(f"  [{count}] {issue}")

        print(f"\nAffected files ({len(all_issues)}):")
        for item in all_issues[:5]:
            print(f"  - {item['file']}")
        if len(all_issues) > 5:
            print(f"  ... and {len(all_issues) - 5} more")
    else:
        print("\n[OK] No SEO issues found!")

    total_issues = sum(len(item["issues"]) for item in all_issues)
    passed = total_issues == 0

    print(f"\n[DEBUG] Total issues: {total_issues}", file=sys.stderr)
    if all_issues:
        print(f"[DEBUG] Files with issues: {len(all_issues)}", file=sys.stderr)
        for item in all_issues:
            print(f"[DEBUG] {item['file']}: {item['issues']}", file=sys.stderr)
    else:
        print(f"[DEBUG] No issues found in {len(pages)} pages", file=sys.stderr)

    output = {
        "script": "seo_checker",
        "project": str(project_path),
        "files_checked": len(pages),
        "files_with_issues": len(all_issues),
        "issues_found": total_issues,
        "passed": passed,
    }

    print("\n" + json.dumps(output, indent=2))

    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
