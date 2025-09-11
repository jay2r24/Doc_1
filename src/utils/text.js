// Enhanced comparison function that creates Git-like diff
const compareHtmlDocuments = async (leftHtml, rightHtml) => {
  console.log("Starting detailed comparison...");
  
  // Convert HTML to plain text and split into lines
  const leftText = stripHtml(leftHtml);
  const rightText = stripHtml(rightHtml);
  
  const leftLines = leftText.split('\n').filter(line => line.trim() !== '');
  const rightLines = rightText.split('\n').filter(line => line.trim() !== '');
  
  console.log(`Left document: ${leftLines.length} lines`);
  console.log(`Right document: ${rightLines.length} lines`);
  
  // Create diff using a simple LCS-based algorithm
  const diff = createLineDiff(leftLines, rightLines);
  
  return {
    leftLines: diff.leftResult,
    rightLines: diff.rightResult,
    stats: {
      totalLines: Math.max(diff.leftResult.length, diff.rightResult.length),
      addedLines: diff.rightResult.filter(line => line.type === 'added').length,
      removedLines: diff.leftResult.filter(line => line.type === 'removed').length,
      unchangedLines: diff.leftResult.filter(line => line.type === 'unchanged').length
    }
  };
};

// Helper function to strip HTML tags
const stripHtml = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

// Create line-by-line diff with proper alignment
const createLineDiff = (leftLines, rightLines) => {
  const leftResult = [];
  const rightResult = [];
  
  let leftIndex = 0;
  let rightIndex = 0;
  
  while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
    const leftLine = leftLines[leftIndex];
    const rightLine = rightLines[rightIndex];
    
    if (leftIndex >= leftLines.length) {
      // Only right lines remaining - these are additions
      rightResult.push({
        content: rightLine,
        type: 'added',
        lineNumber: rightIndex + 1
      });
      leftResult.push({
        content: '',
        type: 'empty',
        lineNumber: null
      });
      rightIndex++;
    } else if (rightIndex >= rightLines.length) {
      // Only left lines remaining - these are deletions
      leftResult.push({
        content: leftLine,
        type: 'removed',
        lineNumber: leftIndex + 1
      });
      rightResult.push({
        content: '',
        type: 'empty',
        lineNumber: null
      });
      leftIndex++;
    } else if (leftLine === rightLine) {
      // Lines are identical
      leftResult.push({
        content: leftLine,
        type: 'unchanged',
        lineNumber: leftIndex + 1
      });
      rightResult.push({
        content: rightLine,
        type: 'unchanged',
        lineNumber: rightIndex + 1
      });
      leftIndex++;
      rightIndex++;
    } else {
      // Lines are different - need to determine if it's a modification, addition, or deletion
      const foundInRight = rightLines.slice(rightIndex + 1).indexOf(leftLine);
      const foundInLeft = leftLines.slice(leftIndex + 1).indexOf(rightLine);
      
      if (foundInRight !== -1 && (foundInLeft === -1 || foundInRight < foundInLeft)) {
        // Current left line exists later in right - treat current right as addition
        rightResult.push({
          content: rightLine,
          type: 'added',
          lineNumber: rightIndex + 1
        });
        leftResult.push({
          content: '',
          type: 'empty',
          lineNumber: null
        });
        rightIndex++;
      } else if (foundInLeft !== -1) {
        // Current right line exists later in left - treat current left as deletion
        leftResult.push({
          content: leftLine,
          type: 'removed',
          lineNumber: leftIndex + 1
        });
        rightResult.push({
          content: '',
          type: 'empty',
          lineNumber: null
        });
        leftIndex++;
      } else {
        // Lines are just different - treat as modification (remove + add)
        leftResult.push({
          content: leftLine,
          type: 'removed',
          lineNumber: leftIndex + 1
        });
        rightResult.push({
          content: rightLine,
          type: 'added',
          lineNumber: rightIndex + 1
        });
        leftIndex++;
        rightIndex++;
      }
    }
  }
  
  return { leftResult, rightResult };
};

// Updated handleCompareDocuments function
const handleCompareDocuments = useCallback(() => {
  console.log("Compare button clicked!");
  console.log("Left document:", leftDocument?.name);
  console.log("Right document:", rightDocument?.name);

  if (leftDocument && rightDocument) {
    console.log("Both documents exist, starting comparison...");
    setIsComparing(true);
    
    // Use async comparison to prevent browser blocking
    compareHtmlDocuments(
      leftDocument.originalHtmlContent,
      rightDocument.originalHtmlContent
    ).then(result => {
      console.log("Comparison result:", result);
      console.log(`Stats: +${result.stats.addedLines} -${result.stats.removedLines} unchanged: ${result.stats.unchangedLines}`);
      setComparison(result);
      setViewMode("comparison");
      console.log("Comparison completed, view mode set to comparison");
    }).catch(error => {
      console.error("Comparison failed:", error);
      alert("Failed to compare documents. Please try again with smaller files or contact support.");
    }).finally(() => {
      setIsComparing(false);
    });
  } else {
    console.log("Cannot compare - missing documents");
    alert("Please select both documents before comparing.");
  }
}, [leftDocument, rightDocument]);

// React component to render the comparison view
const ComparisonView = ({ comparison }) => {
  if (!comparison) return null;

  return (
    <div className="comparison-container">
      <div className="comparison-header">
        <h3>Document Comparison</h3>
        <div className="diff-stats">
          <span className="added">+{comparison.stats.addedLines}</span>
          <span className="removed">-{comparison.stats.removedLines}</span>
          <span className="unchanged">{comparison.stats.unchangedLines} unchanged</span>
        </div>
      </div>
      
      <div className="comparison-content">
        <div className="document-column">
          <h4>Left Document (Original)</h4>
          <div className="line-container">
            {comparison.leftLines.map((line, index) => (
              <div 
                key={index} 
                className={`line ${line.type}`}
                data-line-number={line.lineNumber}
              >
                <span className="line-number">{line.lineNumber || ''}</span>
                <span className="line-content">{line.content || '\u00A0'}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="document-column">
          <h4>Right Document (Modified)</h4>
          <div className="line-container">
            {comparison.rightLines.map((line, index) => (
              <div 
                key={index} 
                className={`line ${line.type}`}
                data-line-number={line.lineNumber}
              >
                <span className="line-number">{line.lineNumber || ''}</span>
                <span className="line-content">{line.content || '\u00A0'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// CSS styles for the comparison view
const comparisonStyles = `
.comparison-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.comparison-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9f9f9;
}

.diff-stats {
  display: flex;
  gap: 16px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
}

.diff-stats .added {
  color: #22c55e;
}

.diff-stats .removed {
  color: #ef4444;
}

.diff-stats .unchanged {
  color: #64748b;
}

.comparison-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.document-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e0e0e0;
}

.document-column:last-child {
  border-right: none;
}

.document-column h4 {
  padding: 12px 16px;
  margin: 0;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  font-size: 14px;
  font-weight: 600;
}

.line-container {
  flex: 1;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.line {
  display: flex;
  min-height: 20px;
  border-left: 3px solid transparent;
}

.line.added {
  background-color: #dcfce7;
  border-left-color: #22c55e;
}

.line.removed {
  background-color: #fee2e2;
  border-left-color: #ef4444;
}

.line.unchanged {
  background-color: transparent;
}

.line.empty {
  background-color: #f8f9fa;
  border-left-color: #e9ecef;
}

.line-number {
  display: inline-block;
  width: 50px;
  padding: 2px 8px;
  text-align: right;
  color: #64748b;
  background: rgba(0, 0, 0, 0.05);
  border-right: 1px solid #e0e0e0;
  user-select: none;
  flex-shrink: 0;
}

.line-content {
  padding: 2px 12px;
  white-space: pre-wrap;
  word-break: break-word;
  flex: 1;
}

.line.empty .line-content {
  color: #cbd5e1;
}
`;

export { handleCompareDocuments, ComparisonView, comparisonStyles };