"""
HTML Generator for Code Taxonomy

Takes a FileTaxonomy object and generates a static HTML page with
Tailwind CSS styling and syntax highlighting.
"""

import html
from pathlib import Path
from typing import Dict
from taxonomy_parser import FileTaxonomy


def escape_html(text: str) -> str:
    """Escape HTML special characters."""
    return html.escape(text)


def generate_complexity_badge(complexity: str) -> str:
    """Generate HTML for complexity badge with appropriate color."""
    colors = {
        'beginner': 'bg-green-100 text-green-800',
        'intermediate': 'bg-yellow-100 text-yellow-800',
        'advanced': 'bg-red-100 text-red-800'
    }
    color_class = colors.get(complexity.lower(), 'bg-gray-100 text-gray-800')
    return f'<span class="{color_class} px-3 py-1 rounded-full text-xs font-semibold">{complexity.capitalize()}</span>'


def calculate_complexity_percentages(indicators: Dict[str, int]) -> Dict[str, int]:
    """Calculate percentage distribution of complexity levels."""
    total = sum(indicators.values())
    if total == 0:
        return {'beginner': 0, 'intermediate': 0, 'advanced': 0}
    
    return {
        level: int((count / total) * 100)
        for level, count in indicators.items()
    }


def generate_category_counts_html(taxonomy: FileTaxonomy) -> str:
    """Generate HTML for category counts section."""
    html_parts = []
    
    for cat in taxonomy.summary.category_counts[:10]:  # Show top 10
        html_parts.append(f'''
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">{escape_html(cat.name)}</span>
                            <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">{cat.count}</span>
                        </div>''')
    
    return '\n'.join(html_parts)


def generate_complexity_bars_html(indicators: Dict[str, int]) -> str:
    """Generate HTML for complexity distribution bars."""
    percentages = calculate_complexity_percentages(indicators)
    
    levels = [
        ('beginner', 'green', 'Beginner'),
        ('intermediate', 'yellow', 'Intermediate'),
        ('advanced', 'red', 'Advanced')
    ]
    
    html_parts = []
    for level, color, label in levels:
        count = indicators.get(level, 0)
        percentage = percentages.get(level, 0)
        
        html_parts.append(f'''
                        <div>
                            <div class="flex justify-between mb-1">
                                <span class="text-sm font-medium text-{color}-700">{label}</span>
                                <span class="text-sm font-semibold text-{color}-700">{count} concepts</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-{color}-500 h-2 rounded-full" style="width: {percentage}%"></div>
                            </div>
                        </div>''')
    
    return '\n'.join(html_parts)


def generate_tags_html(tags: list) -> str:
    """Generate HTML for tag cloud."""
    html_parts = []
    
    for tag in tags[:30]:  # Show top 30 tags
        html_parts.append(f'<span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{escape_html(tag)}</span>')
    
    return '\n                    '.join(html_parts)


def generate_concept_tags_html(tags: list) -> str:
    """Generate HTML for concept tags."""
    html_parts = []
    
    for tag in tags:
        html_parts.append(f'<span class="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{escape_html(tag)}</span>')
    
    return '\n                                '.join(html_parts)


def generate_concept_html(concept) -> str:
    """Generate HTML for a single concept."""
    return f'''
                <!-- {escape_html(concept.id)} -->
                <div class="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                    <!-- Concept Header -->
                    <div class="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="text-xs font-mono text-gray-500 mb-1">{escape_html(concept.id)}</div>
                                <h3 class="text-xl font-bold text-gray-900">{escape_html(concept.name)}</h3>
                                <div class="text-sm text-blue-600 font-medium mt-1">{escape_html(concept.category)}</div>
                            </div>
                            {generate_complexity_badge(concept.complexity)}
                        </div>
                    </div>

                    <!-- Code Snippet with Syntax Highlighting -->
                    <div class="px-6 py-4 bg-gray-900">
                        <pre><code class="language-typescript">{escape_html(concept.code)}</code></pre>
                    </div>

                    <!-- Concept Details -->
                    <div class="px-6 py-5 space-y-4">
                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">What</h4>
                            <p class="text-gray-600 leading-relaxed">{escape_html(concept.what)}</p>
                        </div>

                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Why</h4>
                            <p class="text-gray-600 leading-relaxed">{escape_html(concept.why)}</p>
                        </div>

                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">How</h4>
                            <p class="text-gray-600 leading-relaxed">{escape_html(concept.how)}</p>
                        </div>

                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Context</h4>
                            <p class="text-gray-600 leading-relaxed">{escape_html(concept.context)}</p>
                        </div>

                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Alternatives</h4>
                            <p class="text-gray-600 leading-relaxed">{escape_html(concept.alternatives)}</p>
                        </div>

                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Tags</h4>
                            <div class="flex flex-wrap gap-2 mt-2">
                                {generate_concept_tags_html(concept.tags)}
                            </div>
                        </div>
                    </div>
                </div>'''


def generate_html(taxonomy: FileTaxonomy) -> str:
    """
    Generate complete HTML page from a FileTaxonomy object.
    
    Args:
        taxonomy: FileTaxonomy object containing parsed taxonomy data
        
    Returns:
        Complete HTML string
    """
    
    # Extract path components
    path_parts = Path(taxonomy.metadata.path).parts
    directory = str(Path(*path_parts[:-1])) if len(path_parts) > 1 else ""
    filename = path_parts[-1] if path_parts else taxonomy.metadata.path
    
    # Calculate stats
    total_concepts = len(taxonomy.concepts)
    total_categories = len(taxonomy.summary.category_counts)
    complexity_indicators = taxonomy.summary.complexity_indicators
    
    # Generate concepts HTML
    concepts_html = '\n'.join(generate_concept_html(concept) for concept in taxonomy.concepts)
    
    # Build the complete HTML
    html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{escape_html(filename)} - Code Taxonomy</title>
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Highlight.js for syntax highlighting -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/javascript.min.js"></script>
</head>
<body class="bg-gray-50 text-gray-900">
    
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-8 px-6 shadow-lg">
        <div class="max-w-7xl mx-auto">
            <div class="text-sm text-blue-100 mb-2">{escape_html(directory)}</div>
            <h1 class="text-4xl font-bold mb-2">{escape_html(filename)}</h1>
            <p class="text-blue-100">{escape_html(taxonomy.metadata.purpose)}</p>
        </div>
    </div>

    <!-- Metadata & Stats Bar -->
    <div class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto py-6 px-6">
            <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div>
                    <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</div>
                    <div class="text-lg font-bold text-gray-900">{escape_html(taxonomy.metadata.type.capitalize())}</div>
                </div>
                <div>
                    <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Priority</div>
                    <div class="text-lg font-bold text-gray-900">{escape_html(taxonomy.metadata.file_order_priority.capitalize())}</div>
                </div>
                <div>
                    <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Concepts</div>
                    <div class="text-lg font-bold text-blue-600">{total_concepts}</div>
                </div>
                <div>
                    <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Categories</div>
                    <div class="text-lg font-bold text-blue-600">{total_categories}</div>
                </div>
                <div>
                    <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Complexity</div>
                    <div class="text-sm font-mono text-gray-700">
                        <span class="text-green-600">{complexity_indicators.get('beginner', 0)}</span> / 
                        <span class="text-yellow-600">{complexity_indicators.get('intermediate', 0)}</span> / 
                        <span class="text-red-600">{complexity_indicators.get('advanced', 0)}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto py-8 px-6">
        
        <!-- Summary Section -->
        <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4">📊 Summary</h2>
            
            <div class="grid md:grid-cols-2 gap-6 mb-6">
                <!-- Category Counts -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold mb-4 text-gray-700">Concepts by Category</h3>
                    <div class="space-y-3">
{generate_category_counts_html(taxonomy)}
                    </div>
                </div>

                <!-- Complexity Breakdown -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold mb-4 text-gray-700">Complexity Distribution</h3>
                    <div class="space-y-4">
{generate_complexity_bars_html(complexity_indicators)}
                    </div>
                </div>
            </div>

            <!-- Tag Cloud -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold mb-4 text-gray-700">🏷️ Tags</h3>
                <div class="flex flex-wrap gap-2">
                    {generate_tags_html(taxonomy.summary.tag_cloud)}
                </div>
            </div>
        </div>

        <!-- Concepts Section -->
        <div>
            <h2 class="text-2xl font-bold mb-4">💡 Concepts</h2>
            
            <div class="space-y-6">
{concepts_html}
            </div>
        </div>

    </div>

    <!-- Footer -->
    <div class="bg-gray-800 text-gray-300 py-6 px-6 mt-12">
        <div class="max-w-7xl mx-auto text-center text-sm">
            Generated from Code Taxonomy Analysis • {total_concepts} concepts extracted
        </div>
    </div>

    <!-- Initialize Syntax Highlighting -->
    <script>
        hljs.highlightAll();
    </script>

</body>
</html>'''
    
    return html_content


def save_html(taxonomy: FileTaxonomy, output_path: str) -> None:
    """
    Generate HTML and save to file.
    
    Args:
        taxonomy: FileTaxonomy object
        output_path: Path where HTML file should be saved
    """
    html_content = generate_html(taxonomy)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"HTML file generated: {output_path}")


# Example usage
if __name__ == "__main__":
    from taxonomy_parser import parse_taxonomy_xml
    
    # Example: Parse an XML file and generate HTML
    with open("example_taxonomy.xml", "r", encoding="utf-8") as f:
        xml_content = f.read()
    
    taxonomy = parse_taxonomy_xml(xml_content)
    
    # Generate and save HTML
    output_filename = taxonomy.metadata.path.replace("/", "_").replace(".", "_") + ".html"
    save_html(taxonomy, output_filename)
    
    # Or just get the HTML string
    html_string = generate_html(taxonomy)
    print(f"Generated HTML with {len(html_string)} characters")
