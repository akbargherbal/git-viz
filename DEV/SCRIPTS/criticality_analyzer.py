#!/usr/bin/env python3

"""
Critical Path Analyzer

Identifies structurally critical files in a TypeScript/React codebase by analyzing:
1. Import Centrality (how many files depend on this file)
2. Test Coverage (current test coverage percentage)

Criticality = d^1.3 × (2 - c/100)
Where d = dependents, c = coverage%

Usage:
    python criticality_analyzer.py <src-directory> [--coverage coverage-summary.json]
"""

import csv
import json
import logging
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Set, List, Optional

import click

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class FileAnalysis:
    """Results of criticality analysis for a single file."""
    file: str
    import_centrality: int
    coverage: float
    criticality_score: float
    tier: str


class CriticalityAnalyzer:
    """Analyzes code criticality based on dependencies and coverage."""
    
    def __init__(self, src_dir: Path):
        self.src_dir = src_dir.resolve()
        self.import_graph: Dict[Path, Set[Path]] = defaultdict(set)
        self.coverage_data: Dict[Path, float] = {}
        
    def get_all_files(self) -> List[Path]:
        """Recursively get all TypeScript/JavaScript files (excluding tests)."""
        logger.info(f"Scanning directory: {self.src_dir}")
        
        extensions = {'.ts', '.tsx', '.js', '.jsx'}
        files = []
        
        try:
            for file_path in self.src_dir.rglob('*'):
                if file_path.is_file() and file_path.suffix in extensions:
                    # Skip node_modules, hidden directories, and test files
                    if ('node_modules' in file_path.parts or 
                        any(part.startswith('.') for part in file_path.parts) or
                        '__tests__' in file_path.parts or
                        file_path.name.endswith('.test.ts') or
                        file_path.name.endswith('.test.tsx') or
                        file_path.name.endswith('.spec.ts') or
                        file_path.name.endswith('.spec.tsx')):
                        continue
                    files.append(file_path)
        except PermissionError as e:
            logger.warning(f"Permission denied accessing some files: {e}")
        
        logger.info(f"Found {len(files)} files to analyze")
        return files
    
    def normalize_import_path(self, import_path: str, from_file: Path) -> Optional[Path]:
        """Resolve import path to absolute file path."""
        # Handle relative imports
        if import_path.startswith('.'):
            from_dir = from_file.parent
            resolved = (from_dir / import_path).resolve()
        # Handle absolute imports (from src/)
        elif import_path.startswith(('@/', '~/')):
            import_path = import_path[2:]  # Remove @/ or ~/
            resolved = self.src_dir / import_path
        else:
            # External dependency
            return None
        
        # Try adding common extensions
        extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']
        for ext in extensions:
            candidate = Path(str(resolved) + ext)
            if candidate.exists():
                return candidate.resolve()
        
        return None
    
    def analyze_imports(self, file_path: Path) -> List[Path]:
        """Extract import statements from a file."""
        try:
            content = file_path.read_text(encoding='utf-8')
        except (UnicodeDecodeError, PermissionError) as e:
            logger.warning(f"Could not read {file_path}: {e}")
            return []
        
        imports = []
        
        # Match ES6 imports
        import_pattern = r'import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?[\'"]([^\'"]+)[\'"]'
        
        for match in re.finditer(import_pattern, content):
            import_path = match.group(1)
            
            # Skip external packages
            if not any(import_path.startswith(prefix) for prefix in ('.', '@/', '~/')):
                continue
            
            resolved_path = self.normalize_import_path(import_path, file_path)
            if resolved_path and resolved_path.exists():
                imports.append(resolved_path)
        
        return imports
    
    def build_dependency_graph(self, files: List[Path]) -> None:
        """Build import dependency graph."""
        logger.info("Building dependency graph...")
        
        # Initialize graph with all files
        for file in files:
            if file not in self.import_graph:
                self.import_graph[file] = set()
        
        # Build graph
        for file in files:
            imports = self.analyze_imports(file)
            for imported_file in imports:
                if imported_file not in self.import_graph:
                    self.import_graph[imported_file] = set()
                # Track that 'file' depends on 'imported_file'
                self.import_graph[imported_file].add(file)
    
    def load_coverage_data(self, coverage_file: Optional[Path]) -> None:
        """Load test coverage data from coverage-summary.json."""
        if not coverage_file:
            logger.warning("No coverage file provided (use --coverage flag)")
            logger.warning("All files will be treated as 0% coverage")
            return
        
        if not coverage_file.exists():
            logger.warning(f"Coverage file not found: {coverage_file}")
            return
        
        logger.info(f"Loading test coverage from {coverage_file}...")
        
        try:
            with coverage_file.open('r', encoding='utf-8') as f:
                coverage = json.load(f)
            
            for file_path, data in coverage.items():
                if file_path != 'total' and 'lines' in data:
                    # Try both relative and absolute paths
                    try:
                        full_path = Path(file_path).resolve()
                    except Exception:
                        # If path is relative in coverage file
                        full_path = (coverage_file.parent.parent / file_path).resolve()
                    
                    if full_path.exists():
                        self.coverage_data[full_path] = data['lines']['pct']
            
            logger.info(f"Loaded coverage for {len(self.coverage_data)} files")
            
        except json.JSONDecodeError as e:
            logger.error(f"Could not parse coverage file: {e}")
        except KeyError as e:
            logger.error(f"Unexpected coverage file format: {e}")
    
    def calculate_tier(self, centrality: int, coverage: float) -> str:
        """Determine testing tier based on centrality and coverage."""
        # High centrality = needs high coverage
        if centrality >= 10:
            return 'Tier 1 (90%+ target)' if coverage < 90 else 'Tier 1 ✓'
        
        if centrality >= 5:
            return 'Tier 2 (85%+ target)' if coverage < 85 else 'Tier 2 ✓'
        
        if centrality >= 2:
            return 'Tier 3 (75%+ target)' if coverage < 75 else 'Tier 3 ✓'
        
        return 'Tier 4 (60%+ target)' if coverage < 60 else 'Tier 4 ✓'
    
    def calculate_criticality(self) -> List[FileAnalysis]:
        """Calculate criticality scores for all files."""
        logger.info("Calculating criticality scores...")
        
        results = []
        
        for file, dependents in self.import_graph.items():
            centrality = len(dependents)
            coverage = self.coverage_data.get(file, 0.0)
            
            # Criticality Formula: C = d^1.3 × (2 - c/100)
            # Impact: d^1.3 (super-linear growth for dependencies)
            # Exposure: 2 - c/100 (0% coverage = 2x, 100% coverage = 1x)
            impact = centrality ** 1.3
            exposure = 2 - (coverage / 100)
            criticality_score = impact * exposure
            
            tier = self.calculate_tier(centrality, coverage)
            
            # Make path relative to current working directory
            try:
                relative_path = file.relative_to(Path.cwd())
            except ValueError:
                relative_path = file
            
            results.append(FileAnalysis(
                file=str(relative_path),
                import_centrality=centrality,
                coverage=coverage,
                criticality_score=round(criticality_score, 2),
                tier=tier
            ))
        
        # Sort by criticality score (descending)
        results.sort(key=lambda x: x.criticality_score, reverse=True)
        
        return results


def display_results(results: List[FileAnalysis], top_n: int) -> None:
    """Display analysis results to console."""
    click.echo()
    click.echo('=' * 110)
    click.echo('CRITICAL PATH ANALYSIS RESULTS')
    click.echo('=' * 110)
    click.echo()
    
    # Summary
    click.echo('📌 Summary:')
    click.echo(f'   Total files analyzed: {len(results)}')
    click.echo(f'   Files with dependencies: {len([r for r in results if r.import_centrality > 0])}')
    
    if results:
        avg_centrality = sum(r.import_centrality for r in results) / len(results)
        avg_coverage = sum(r.coverage for r in results) / len(results)
        click.echo(f'   Average import centrality: {avg_centrality:.2f}')
        click.echo(f'   Average coverage: {avg_coverage:.1f}%')
    
    click.echo()
    click.echo('Formula: Criticality = dependents^1.3 × (2 - coverage/100)')
    click.echo()
    
    # Top N most critical files
    click.echo(f'🎯 Top {top_n} Most Critical Files:')
    click.echo()
    click.echo('Rank | Criticality | Dependents | Coverage | Tier                  | File')
    click.echo('-' * 110)
    
    for index, result in enumerate(results[:top_n], start=1):
        rank = str(index).rjust(4)
        score = f'{result.criticality_score:.1f}'.rjust(11)
        deps = str(result.import_centrality).rjust(10)
        coverage = f'{result.coverage:.1f}%'.rjust(8)
        tier = result.tier.ljust(21)
        
        click.echo(f'{rank} | {score} | {deps} | {coverage} | {tier} | {result.file}')
    
    click.echo()
    click.echo('=' * 110)
    click.echo()


def display_insights(results: List[FileAnalysis]) -> None:
    """Display actionable insights."""
    click.echo('💡 Actionable Insights:')
    click.echo()
    
    # High priority files
    tier1_files = [r for r in results if r.tier.startswith('Tier 1') and '✓' not in r.tier]
    
    if tier1_files:
        click.echo('🚨 HIGH PRIORITY: These Tier 1 files need immediate attention:')
        for result in tier1_files[:5]:
            click.echo(f'   • {result.file}')
            click.echo(f'     Current: {result.coverage:.1f}% coverage | '
                      f'{result.import_centrality} dependents | '
                      f'Criticality: {result.criticality_score:.1f}')
            click.echo(f'     Target: 90%+ coverage')
            click.echo()
    else:
        click.echo('✅ All Tier 1 files meet coverage targets!')
        click.echo()
    
    # Architectural hubs
    high_centrality = [r for r in results if r.import_centrality >= 10]
    if high_centrality:
        click.echo('⚡ ARCHITECTURAL HUBS: These files are imported by many others:')
        for result in high_centrality[:3]:
            click.echo(f'   • {result.file} ({result.import_centrality} dependents, {result.coverage:.1f}% coverage)')
        click.echo()
    
    # Under-tested critical files
    undertested = [r for r in results if r.import_centrality >= 5 and r.coverage < 70]
    if undertested:
        click.echo('⚠️  UNDER-TESTED CRITICAL FILES:')
        for result in undertested[:5]:
            click.echo(f'   • {result.file} ({result.import_centrality} dependents, {result.coverage:.1f}% coverage)')
        click.echo()


def export_csv(results: List[FileAnalysis], output_file: Path) -> None:
    """Export results to CSV file."""
    try:
        with output_file.open('w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'File',
                'Import Centrality',
                'Coverage %',
                'Criticality Score',
                'Tier'
            ])
            
            for result in results:
                writer.writerow([
                    result.file,
                    result.import_centrality,
                    f'{result.coverage:.1f}',
                    f'{result.criticality_score:.2f}',
                    result.tier
                ])
        
        click.echo(f'📄 Full results exported to: {output_file}')
        click.echo()
        
    except IOError as e:
        logger.error(f'Failed to export CSV: {e}')


@click.command()
@click.argument('src_dir', type=click.Path(exists=True, file_okay=False, path_type=Path))
@click.option(
    '--coverage',
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
    help='Path to coverage-summary.json file'
)
@click.option(
    '--top',
    default=20,
    show_default=True,
    help='Number of top results to show'
)
@click.option(
    '--output',
    default='criticality-analysis.csv',
    show_default=True,
    type=click.Path(path_type=Path),
    help='Output CSV file path'
)
@click.option(
    '--verbose',
    is_flag=True,
    help='Enable verbose logging'
)
def main(
    src_dir: Path,
    coverage: Optional[Path],
    top: int,
    output: Path,
    verbose: bool
) -> None:
    """
    Analyze critical paths in a TypeScript/React codebase.
    
    SRC_DIR is the source directory to analyze (e.g., 'src' or 'app').
    
    The analysis uses a simple formula:
    
    Criticality = dependents^1.3 × (2 - coverage/100)
    
    This identifies files that are both:
    1. Structurally important (many dependents)
    2. Poorly tested (low coverage)
    """
    if verbose:
        logger.setLevel(logging.DEBUG)
    
    click.echo('🔍 Analyzing critical paths...\n')
    
    try:
        # Initialize analyzer
        analyzer = CriticalityAnalyzer(src_dir)
        
        # Step 1: Get all files
        files = analyzer.get_all_files()
        if not files:
            logger.error('No TypeScript/JavaScript files found')
            sys.exit(1)
        
        # Step 2: Build dependency graph
        analyzer.build_dependency_graph(files)
        
        # Step 3: Load coverage data
        analyzer.load_coverage_data(coverage)
        
        # Step 4: Calculate criticality
        results = analyzer.calculate_criticality()
        
        # Step 5: Display results
        display_results(results, top)
        display_insights(results)
        
        # Step 6: Export to CSV
        export_csv(results, output)
        
    except KeyboardInterrupt:
        click.echo('\n\nAnalysis interrupted by user')
        sys.exit(130)
    except Exception as e:
        logger.error(f'Unexpected error: {e}', exc_info=verbose)
        sys.exit(1)


if __name__ == '__main__':
    main()