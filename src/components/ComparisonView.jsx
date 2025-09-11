import React, { useMemo } from 'react';

// Component to render Word document content with visual differences
const ComparisonView = ({ comparison, leftDocument, rightDocument }) => {
  // Parse and create visual diff from HTML content
  const visualDiff = useMemo(() => {
    if (!leftDocument || !rightDocument) return null;

    return createVisualDiff(
      leftDocument.originalHtmlContent,
      rightDocument.originalHtmlContent
    );
  }, [leftDocument, rightDocument]);

  if (!visualDiff) {
    return (
      <div className="text-center py-8 text-gray-500">
        No comparison data available
      </div>
    );
  }

  return (
    <div className="comparison-container bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="comparison-header bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Document Comparison - Side by Side</h3>
          <div className="diff-stats flex gap-4 text-sm">
            <span className="added text-green-600 font-semibold">
              +{visualDiff.stats.additions} additions
            </span>
            <span className="removed text-red-600 font-semibold">
              -{visualDiff.stats.deletions} deletions
            </span>
            <span className="modified text-yellow-600 font-semibold">
              {visualDiff.stats.modifications} modifications
            </span>
          </div>
        </div>
      </div>
      
      <div className="comparison-content flex">
        {/* Left Document - Original */}
        <div className="document-column flex-1 border-r border-gray-200">
          <div className="column-header bg-gray-100 px-4 py-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700">
              Original Document ({leftDocument.name})
            </h4>
          </div>
          <div className="document-content max-h-[600px] overflow-y-auto p-4">
            <div 
              className="formatted-content"
              dangerouslySetInnerHTML={{ __html: visualDiff.leftContent }}
            />
          </div>
        </div>
        
        {/* Right Document - Modified */}
        <div className="document-column flex-1">
          <div className="column-header bg-gray-100 px-4 py-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700">
              Modified Document ({rightDocument.name})
            </h4>
          </div>
          <div className="document-content max-h-[600px] overflow-y-auto p-4">
            <div 
              className="formatted-content"
              dangerouslySetInnerHTML={{ __html: visualDiff.rightContent }}
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="comparison-legend bg-gray-50 border-t border-gray-200 px-4 py-3">
        <h5 className="text-sm font-semibold text-gray-700 mb-2">Legend:</h5>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-green-200 border border-green-400 rounded"></span>
            <span className="text-gray-700">Added content</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-red-200 border border-red-400 rounded line-through-box"></span>
            <span className="text-gray-700">Removed content</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></span>
            <span className="text-gray-700">Modified content</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-gray-100 border border-gray-300 rounded opacity-50"></span>
            <span className="text-gray-700">Placeholder (alignment)</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Styling for diff highlighting */
        .formatted-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          line-height: 1.6;
        }

        /* Added content styling */
        .diff-added {
          background-color: #dcfce7 !important;
          border-left: 4px solid #22c55e !important;
          padding: 2px 4px !important;
          margin: 1px 0 !important;
          border-radius: 2px !important;
        }

        /* Removed content styling */
        .diff-removed {
          background-color: #fee2e2 !important;
          border-left: 4px solid #ef4444 !important;
          padding: 2px 4px !important;
          margin: 1px 0 !important;
          text-decoration: line-through !important;
          border-radius: 2px !important;
          opacity: 0.7 !important;
        }

        /* Modified content styling */
        .diff-modified {
          background-color: #fef3c7 !important;
          border-left: 4px solid #f59e0b !important;
          padding: 2px 4px !important;
          margin: 1px 0 !important;
          border-radius: 2px !important;
        }

        /* Placeholder for alignment */
        .diff-placeholder {
          background-color: #f8f9fa !important;
          min-height: 20px !important;
          border-left: 4px solid #e9ecef !important;
          opacity: 0.3 !important;
          border-radius: 2px !important;
          position: relative !important;
        }

        .diff-placeholder::after {
          content: '--- content removed/added here ---';
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          font-size: 11px;
          color: #6b7280;
          font-style: italic;
        }

        /* Preserve Word formatting */
        .formatted-content p {
          margin: 0.5em 0;
        }

        .formatted-content h1, .formatted-content h2, .formatted-content h3,
        .formatted-content h4, .formatted-content h5, .formatted-content h6 {
          margin: 1em 0 0.5em 0;
          font-weight: bold;
        }

        .formatted-content ul, .formatted-content ol {
          margin: 0.5em 0;
          padding-left: 2em;
        }

        .formatted-content li {
          margin: 0.25em 0;
        }

        .formatted-content table {
          border-collapse: collapse;
          margin: 1em 0;
        }

        .formatted-content td, .formatted-content th {
          border: 1px solid #ddd;
          padding: 0.5em;
        }

        .line-through-box {
          position: relative;
        }

        .line-through-box::after {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          width: 100%;
          height: 1px;
          background: #ef4444;
        }
      `}</style>
    </div>
  );
};

// Function to create visual diff from HTML content
function createVisualDiff(leftHtml, rightHtml) {
  // Parse HTML content into comparable segments
  const leftSegments = parseHtmlIntoSegments(leftHtml);
  const rightSegments = parseHtmlIntoSegments(rightHtml);
  
  // Create diff by comparing segments
  const diff = createSegmentDiff(leftSegments, rightSegments);
  
  // Generate HTML with diff highlighting
  const leftContent = generateDiffHtml(diff.left);
  const rightContent = generateDiffHtml(diff.right);
  
  return {
    leftContent,
    rightContent,
    stats: {
      additions: diff.stats.additions,
      deletions: diff.stats.deletions,
      modifications: diff.stats.modifications
    }
  };
}

// Parse HTML into meaningful segments (paragraphs, headings, etc.)
function parseHtmlIntoSegments(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const segments = [];
  
  // Get all meaningful elements
  const elements = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, div');
  
  elements.forEach((element, index) => {
    const text = element.textContent.trim();
    if (text) {
      segments.push({
        id: index,
        element: element.tagName.toLowerCase(),
        text: text,
        html: element.outerHTML,
        styles: element.getAttribute('style') || ''
      });
    }
  });
  
  return segments;
}

// Create segment-based diff
function createSegmentDiff(leftSegments, rightSegments) {
  const leftResult = [];
  const rightResult = [];
  let stats = { additions: 0, deletions: 0, modifications: 0 };
  
  let leftIndex = 0;
  let rightIndex = 0;
  
  while (leftIndex < leftSegments.length || rightIndex < rightSegments.length) {
    const leftSegment = leftSegments[leftIndex];
    const rightSegment = rightSegments[rightIndex];
    
    if (!leftSegment) {
      // Only right segments remaining - additions
      rightResult.push({
        ...rightSegment,
        type: 'added'
      });
      leftResult.push({
        type: 'placeholder',
        text: '',
        html: '<div class="diff-placeholder"></div>'
      });
      stats.additions++;
      rightIndex++;
    } else if (!rightSegment) {
      // Only left segments remaining - deletions
      leftResult.push({
        ...leftSegment,
        type: 'removed'
      });
      rightResult.push({
        type: 'placeholder',
        text: '',
        html: '<div class="diff-placeholder"></div>'
      });
      stats.deletions++;
      leftIndex++;
    } else if (leftSegment.text === rightSegment.text) {
      // Same content
      leftResult.push({
        ...leftSegment,
        type: 'unchanged'
      });
      rightResult.push({
        ...rightSegment,
        type: 'unchanged'
      });
      leftIndex++;
      rightIndex++;
    } else {
      // Check if content exists elsewhere
      const rightMatch = rightSegments.slice(rightIndex + 1).findIndex(
        seg => seg.text === leftSegment.text
      );
      const leftMatch = leftSegments.slice(leftIndex + 1).findIndex(
        seg => seg.text === rightSegment.text
      );
      
      if (rightMatch !== -1 && (leftMatch === -1 || rightMatch < leftMatch)) {
        // Left segment appears later in right - current right is addition
        rightResult.push({
          ...rightSegment,
          type: 'added'
        });
        leftResult.push({
          type: 'placeholder',
          text: '',
          html: '<div class="diff-placeholder"></div>'
        });
        stats.additions++;
        rightIndex++;
      } else if (leftMatch !== -1) {
        // Right segment appears later in left - current left is deletion
        leftResult.push({
          ...leftSegment,
          type: 'removed'
        });
        rightResult.push({
          type: 'placeholder',
          text: '',
          html: '<div class="diff-placeholder"></div>'
        });
        stats.deletions++;
        leftIndex++;
      } else {
        // Content modified
        leftResult.push({
          ...leftSegment,
          type: 'modified'
        });
        rightResult.push({
          ...rightSegment,
          type: 'modified'
        });
        stats.modifications++;
        leftIndex++;
        rightIndex++;
      }
    }
  }
  
  return {
    left: leftResult,
    right: rightResult,
    stats
  };
}

// Generate HTML with diff highlighting
function generateDiffHtml(segments) {
  return segments.map(segment => {
    if (segment.type === 'placeholder') {
      return segment.html;
    }
    
    let html = segment.html;
    
    // Add diff classes based on type
    switch (segment.type) {
      case 'added':
        html = html.replace(/^<(\w+)/, '<$1 class="diff-added"');
        break;
      case 'removed':
        html = html.replace(/^<(\w+)/, '<$1 class="diff-removed"');
        break;
      case 'modified':
        html = html.replace(/^<(\w+)/, '<$1 class="diff-modified"');
        break;
      default:
        // unchanged - no special styling
        break;
    }
    
    return html;
  }).join('\n');
}

export default ComparisonView;