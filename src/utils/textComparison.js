import { diffChars, diffWordsWithSpace, diffArrays, diffSentences, Diff } from "diff";
import { diff_match_patch } from 'diff-match-patch';

export const compareHtmlDocuments = (leftHtml, rightHtml) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        console.log('Starting line-by-line document comparison...');
        
        // Quick text comparison first
        const leftText = extractPlainText(leftHtml);
        const rightText = extractPlainText(rightHtml);

        if (leftText.trim() === rightText.trim()) {
          console.log('Documents are identical');
          resolve({
            leftDiffs: [{ type: "equal", content: leftHtml }],
            rightDiffs: [{ type: "equal", content: rightHtml }],
            summary: { additions: 0, deletions: 0, changes: 0 },
            detailed: { lines: [], tables: [], images: [] }
          });
          return;
        }

        console.log('Documents differ, performing line-by-line comparison...');
        
        // Enhanced line-by-line comparison
        const comparisonResult = performLineByLineComparison(leftHtml, rightHtml);

        const result = {
          leftDiffs: [{ type: "modified", content: comparisonResult.leftContent }],
          rightDiffs: [{ type: "modified", content: comparisonResult.rightContent }],
          summary: comparisonResult.summary,
          detailed: comparisonResult.detailed
        };

        console.log('Line-by-line comparison completed successfully');
        resolve(result);
        
      } catch (error) {
        console.error("Error during document comparison:", error);
        resolve({
          leftDiffs: [{ type: "equal", content: leftHtml }],
          rightDiffs: [{ type: "equal", content: rightHtml }],
          summary: { additions: 0, deletions: 0, changes: 0 },
          detailed: { lines: [], tables: [], images: [] },
        });
      }
    }, 10);
  });
};

// Enhanced line-by-line comparison with proper indexing
const performLineByLineComparison = (leftHtml, rightHtml) => {
  const leftDiv = htmlToDiv(leftHtml);
  const rightDiv = htmlToDiv(rightHtml);
  
  // Step 1: Extract lines with proper indexing
  const leftLines = extractLinesWithIndex(leftDiv);
  const rightLines = extractLinesWithIndex(rightDiv);
  
  console.log(`Left document: ${leftLines.length} lines`);
  console.log(`Right document: ${rightLines.length} lines`);
  
  // Step 2: Compare lines and create alignment
  const alignment = createLineAlignment(leftLines, rightLines);
  
  // Step 3: Apply highlighting to both documents
  const highlightedContent = applyLineHighlighting(leftDiv, rightDiv, alignment);
  
  // Step 4: Compare images and tables
  const imageComparison = compareImages(leftDiv, rightDiv);
  const tableComparison = compareTables(leftDiv, rightDiv);
  
  // Step 5: Generate summary
  const summary = {
    additions: alignment.filter(a => a.type === 'added').length + imageComparison.additions + tableComparison.additions,
    deletions: alignment.filter(a => a.type === 'removed').length + imageComparison.deletions + tableComparison.deletions,
    changes: 0
  };
  summary.changes = summary.additions + summary.deletions;
  
  // Step 6: Generate detailed report
  const detailed = generateDetailedReport(alignment, imageComparison, tableComparison);
  
  return {
    leftContent: highlightedContent.left,
    rightContent: highlightedContent.right,
    summary,
    detailed
  };
};

// Extract lines with proper indexing
const extractLinesWithIndex = (container) => {
  const lines = [];
  let lineIndex = 1;
  
  // Get all text content and split by lines
  const textContent = container.textContent || '';
  const textLines = textContent.split('\n');
  
  // Also get all meaningful elements for structure
  const elements = Array.from(container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div, span, br'));
  
  // Process text lines
  textLines.forEach((line, idx) => {
    const trimmedLine = line.trim();
    if (trimmedLine || idx < textLines.length - 1) { // Include empty lines except the last one
      lines.push({
        index: lineIndex++,
        content: line,
        trimmedContent: trimmedLine,
        type: 'text',
        element: null,
        formatting: {},
        whitespace: analyzeWhitespace(line)
      });
    }
  });
  
  // Add structural elements (images, tables, etc.)
  const images = Array.from(container.querySelectorAll('img'));
  images.forEach(img => {
    lines.push({
      index: lineIndex++,
      content: '',
      trimmedContent: '',
      type: 'image',
      element: img,
      formatting: {},
      imageData: extractImageData(img),
      whitespace: { spaces: 0, tabs: 0, lineBreaks: 0 }
    });
  });
  
  const tables = Array.from(container.querySelectorAll('table'));
  tables.forEach(table => {
    lines.push({
      index: lineIndex++,
      content: '',
      trimmedContent: '',
      type: 'table',
      element: table,
      formatting: {},
      tableData: getTableStructure(table),
      whitespace: { spaces: 0, tabs: 0, lineBreaks: 0 }
    });
  });
  
  return lines;
};

// Create line alignment between left and right documents
const createLineAlignment = (leftLines, rightLines) => {
  const alignment = [];
  const leftUsed = new Set();
  const rightUsed = new Set();
  
  // First pass: exact matches
  leftLines.forEach((leftLine, leftIdx) => {
    rightLines.forEach((rightLine, rightIdx) => {
      if (leftUsed.has(leftIdx) || rightUsed.has(rightIdx)) return;
      
      if (leftLine.trimmedContent === rightLine.trimmedContent && 
          leftLine.type === rightLine.type) {
        alignment.push({
          type: 'equal',
          leftLine,
          rightLine,
          leftIndex: leftIdx,
          rightIndex: rightIdx
        });
        leftUsed.add(leftIdx);
        rightUsed.add(rightIdx);
      }
    });
  });
  
  // Second pass: similar content matches (for modifications)
  leftLines.forEach((leftLine, leftIdx) => {
    if (leftUsed.has(leftIdx)) return;
    
    let bestMatch = null;
    let bestSimilarity = 0;
    
    rightLines.forEach((rightLine, rightIdx) => {
      if (rightUsed.has(rightIdx)) return;
      
      if (leftLine.type === rightLine.type) {
        const similarity = getTextSimilarity(leftLine.trimmedContent, rightLine.trimmedContent);
        if (similarity > bestSimilarity && similarity > 0.3) {
          bestMatch = { line: rightLine, index: rightIdx, similarity };
          bestSimilarity = similarity;
        }
      }
    });
    
    if (bestMatch) {
      alignment.push({
        type: 'modified',
        leftLine,
        rightLine: bestMatch.line,
        leftIndex: leftIdx,
        rightIndex: bestMatch.index
      });
      leftUsed.add(leftIdx);
      rightUsed.add(bestMatch.index);
    }
  });
  
  // Third pass: unmatched elements (additions and deletions)
  leftLines.forEach((leftLine, leftIdx) => {
    if (!leftUsed.has(leftIdx)) {
      alignment.push({
        type: 'removed',
        leftLine,
        rightLine: null,
        leftIndex: leftIdx,
        rightIndex: null
      });
    }
  });
  
  rightLines.forEach((rightLine, rightIdx) => {
    if (!rightUsed.has(rightIdx)) {
      alignment.push({
        type: 'added',
        leftLine: null,
        rightLine,
        leftIndex: null,
        rightIndex: rightIdx
      });
    }
  });
  
  // Sort alignment by line indices
  alignment.sort((a, b) => {
    const aIndex = a.leftIndex !== null ? a.leftIndex : (a.rightIndex || 0);
    const bIndex = b.leftIndex !== null ? b.leftIndex : (b.rightIndex || 0);
    return aIndex - bIndex;
  });
  
  return alignment;
};

// Apply line highlighting based on alignment
const applyLineHighlighting = (leftDiv, rightDiv, alignment) => {
  // Create new containers for highlighted content
  const leftHighlighted = document.createElement('div');
  const rightHighlighted = document.createElement('div');
  
  leftHighlighted.className = 'word-document-preview';
  rightHighlighted.className = 'word-document-preview';
  
  alignment.forEach((align, idx) => {
    const { type, leftLine, rightLine } = align;
    
    if (type === 'equal') {
      // Lines are identical
      const leftElement = createLineElement(leftLine, 'unchanged', idx + 1);
      const rightElement = createLineElement(rightLine, 'unchanged', idx + 1);
      leftHighlighted.appendChild(leftElement);
      rightHighlighted.appendChild(rightElement);
      
    } else if (type === 'modified') {
      // Lines are different - show word-level differences
      const leftElement = createLineElement(leftLine, 'modified', leftLine.index);
      const rightElement = createLineElement(rightLine, 'modified', rightLine.index);
      
      // Apply word-level highlighting
      if (leftLine.type === 'text' && rightLine.type === 'text') {
        applyWordLevelDiff(leftElement, leftLine.content, rightLine.content, 'left');
        applyWordLevelDiff(rightElement, leftLine.content, rightLine.content, 'right');
      }
      
      leftHighlighted.appendChild(leftElement);
      rightHighlighted.appendChild(rightElement);
      
    } else if (type === 'removed') {
      // Line removed from left document
      const leftElement = createLineElement(leftLine, 'removed', leftLine.index);
      const rightPlaceholder = createPlaceholderElement('removed', leftLine.index);
      leftHighlighted.appendChild(leftElement);
      rightHighlighted.appendChild(rightPlaceholder);
      
    } else if (type === 'added') {
      // Line added to right document
      const leftPlaceholder = createPlaceholderElement('added', rightLine.index);
      const rightElement = createLineElement(rightLine, 'added', rightLine.index);
      leftHighlighted.appendChild(leftPlaceholder);
      rightHighlighted.appendChild(rightElement);
    }
  });
  
  return {
    left: leftHighlighted.innerHTML,
    right: rightHighlighted.innerHTML
  };
};

// Create line element with proper styling
const createLineElement = (line, changeType, lineIndex) => {
  const element = document.createElement('div');
  element.className = `git-line-${changeType}`;
  element.setAttribute('data-line-index', lineIndex);
  
  if (line.type === 'text') {
    element.innerHTML = highlightWhitespace(escapeHtml(line.content));
  } else if (line.type === 'image') {
    const img = line.element.cloneNode(true);
    img.classList.add(`git-image-${changeType}`);
    element.appendChild(img);
  } else if (line.type === 'table') {
    const table = line.element.cloneNode(true);
    table.classList.add(`git-table-${changeType}`);
    element.appendChild(table);
  }
  
  return element;
};

// Create placeholder element for missing lines
const createPlaceholderElement = (type, lineIndex) => {
  const element = document.createElement('div');
  element.className = `git-line-placeholder placeholder-${type}`;
  element.setAttribute('data-line-index', lineIndex);
  
  const text = type === 'added' ? 'Line added in modified document' : 'Line removed from original document';
  element.innerHTML = `<span style="font-style: italic; opacity: 0.7;">[${text}]</span>`;
  
  return element;
};

// Apply word-level differences within a line
const applyWordLevelDiff = (element, leftText, rightText, side) => {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(leftText || "", rightText || "");
  dmp.diff_cleanupSemantic(diffs);
  
  let html = '';
  
  diffs.forEach(diff => {
    const [operation, text] = diff;
    
    if (operation === 0) {
      // Unchanged text
      html += highlightWhitespace(escapeHtml(text));
    } else if (operation === 1) {
      // Added text
      if (side === 'right') {
        html += `<span class="git-inline-added">${highlightWhitespace(escapeHtml(text))}</span>`;
      } else {
        html += `<span class="git-inline-placeholder" style="color: #22c55e; font-style: italic; opacity: 0.7; background: #f0fdf4; padding: 1px 3px; border-radius: 2px;">[+${highlightWhitespace(escapeHtml(text))}]</span>`;
      }
    } else if (operation === -1) {
      // Removed text
      if (side === 'left') {
        html += `<span class="git-inline-removed">${highlightWhitespace(escapeHtml(text))}</span>`;
      } else {
        html += `<span class="git-inline-placeholder" style="color: #ef4444; font-style: italic; opacity: 0.7; background: #fef2f2; padding: 1px 3px; border-radius: 2px;">[-${highlightWhitespace(escapeHtml(text))}]</span>`;
      }
    }
  });
  
  element.innerHTML = html;
};

// Highlight whitespace characters visually
const highlightWhitespace = (text) => {
  return text
    .replace(/ /g, '<span class="whitespace-space" style="background: rgba(34, 197, 94, 0.2); color: #166534; padding: 0 1px; border-radius: 2px; font-weight: bold;">·</span>')
    .replace(/\t/g, '<span class="whitespace-tab" style="background: rgba(245, 158, 11, 0.2); color: #92400e; padding: 0 2px; border-radius: 2px; font-weight: bold;">→</span>')
    .replace(/\n/g, '<span class="whitespace-newline" style="background: rgba(99, 102, 241, 0.2); color: #3730a3; padding: 0 1px; border-radius: 2px; font-weight: bold;">↵</span><br>');
};

// Analyze whitespace in text
const analyzeWhitespace = (text) => {
  if (!text) return { spaces: 0, tabs: 0, lineBreaks: 0 };
  
  const spaces = (text.match(/ /g) || []).length;
  const tabs = (text.match(/\t/g) || []).length;
  const lineBreaks = (text.match(/\n/g) || []).length;
  
  return { spaces, tabs, lineBreaks };
};

// Extract image data for comparison
const extractImageData = (imgElement) => {
  return {
    src: imgElement.src || '',
    alt: imgElement.alt || '',
    width: imgElement.width || imgElement.style.width || '',
    height: imgElement.height || imgElement.style.height || '',
    title: imgElement.title || '',
    className: imgElement.className || '',
    style: imgElement.style.cssText || ''
  };
};

// Get table structure information
const getTableStructure = (table) => {
  const rows = Array.from(table.rows || []);
  return {
    rowCount: rows.length,
    columnCount: rows.length > 0 ? rows[0].cells.length : 0,
    cells: rows.map(row => 
      Array.from(row.cells || []).map(cell => ({
        content: cell.textContent?.trim() || '',
        formatting: extractFormattingFromElement(cell),
        colspan: cell.colSpan || 1,
        rowspan: cell.rowSpan || 1
      }))
    )
  };
};

// Extract formatting information from element
const extractFormattingFromElement = (element) => {
  if (!element || !element.style) return {};
  
  const computedStyle = window.getComputedStyle ? window.getComputedStyle(element) : {};
  const inlineStyle = element.style;
  
  return {
    fontWeight: inlineStyle.fontWeight || computedStyle.fontWeight || 'normal',
    fontStyle: inlineStyle.fontStyle || computedStyle.fontStyle || 'normal',
    textDecoration: inlineStyle.textDecoration || computedStyle.textDecoration || 'none',
    fontSize: inlineStyle.fontSize || computedStyle.fontSize || '',
    color: inlineStyle.color || computedStyle.color || '',
    backgroundColor: inlineStyle.backgroundColor || computedStyle.backgroundColor || '',
    textAlign: inlineStyle.textAlign || computedStyle.textAlign || '',
    fontFamily: inlineStyle.fontFamily || computedStyle.fontFamily || '',
    lineHeight: inlineStyle.lineHeight || computedStyle.lineHeight || ''
  };
};

// Compare images by position, size, and presence
const compareImages = (leftDiv, rightDiv) => {
  const leftImages = Array.from(leftDiv.querySelectorAll('img'));
  const rightImages = Array.from(rightDiv.querySelectorAll('img'));
  
  let additions = 0, deletions = 0;
  const imageChanges = [];
  
  const maxImages = Math.max(leftImages.length, rightImages.length);
  
  for (let i = 0; i < maxImages; i++) {
    const leftImg = leftImages[i];
    const rightImg = rightImages[i];
    
    if (leftImg && !rightImg) {
      deletions++;
      imageChanges.push({
        position: i,
        type: 'removed',
        leftImage: extractImageData(leftImg),
        rightImage: null
      });
    } else if (!leftImg && rightImg) {
      additions++;
      imageChanges.push({
        position: i,
        type: 'added',
        leftImage: null,
        rightImage: extractImageData(rightImg)
      });
    } else if (leftImg && rightImg) {
      const leftData = extractImageData(leftImg);
      const rightData = extractImageData(rightImg);
      
      const isModified = 
        leftData.src !== rightData.src ||
        leftData.width !== rightData.width ||
        leftData.height !== rightData.height ||
        leftData.alt !== rightData.alt;
      
      if (isModified) {
        additions++;
        deletions++;
        imageChanges.push({
          position: i,
          type: 'modified',
          leftImage: leftData,
          rightImage: rightData
        });
      }
    }
  }
  
  return { additions, deletions, changes: imageChanges };
};

// Compare tables with structure and content analysis
const compareTables = (leftDiv, rightDiv) => {
  const leftTables = Array.from(leftDiv.querySelectorAll('table'));
  const rightTables = Array.from(rightDiv.querySelectorAll('table'));
  
  let additions = 0, deletions = 0;
  const tableChanges = [];
  
  const maxTables = Math.max(leftTables.length, rightTables.length);
  
  for (let i = 0; i < maxTables; i++) {
    const leftTable = leftTables[i];
    const rightTable = rightTables[i];
    
    if (leftTable && !rightTable) {
      deletions++;
      tableChanges.push({
        position: i,
        type: 'removed',
        leftTable: getTableStructure(leftTable),
        rightTable: null
      });
    } else if (!leftTable && rightTable) {
      additions++;
      tableChanges.push({
        position: i,
        type: 'added',
        leftTable: null,
        rightTable: getTableStructure(rightTable)
      });
    } else if (leftTable && rightTable) {
      const leftStructure = getTableStructure(leftTable);
      const rightStructure = getTableStructure(rightTable);
      
      const isModified = 
        leftStructure.rowCount !== rightStructure.rowCount ||
        leftStructure.columnCount !== rightStructure.columnCount ||
        JSON.stringify(leftStructure.cells) !== JSON.stringify(rightStructure.cells);
      
      if (isModified) {
        additions++;
        deletions++;
        tableChanges.push({
          position: i,
          type: 'modified',
          leftTable: leftStructure,
          rightTable: rightStructure
        });
      }
    }
  }
  
  return { additions, deletions, changes: tableChanges };
};

// Generate detailed report
const generateDetailedReport = (alignment, imageComparison, tableComparison) => {
  const lines = [];
  const tables = [];
  const images = [];
  
  // Process line changes
  alignment.forEach(align => {
    if (align.type === 'modified') {
      lines.push({
        v1: align.leftLine.index.toString(),
        v2: align.rightLine.index.toString(),
        status: 'MODIFIED',
        diffHtml: createInlineDiff(align.leftLine.content, align.rightLine.content),
        formatChanges: ['Content modified'],
        whitespaceChanges: generateWhitespaceChangeDescription(align.leftLine.whitespace, align.rightLine.whitespace)
      });
    } else if (align.type === 'added') {
      lines.push({
        v1: '',
        v2: align.rightLine.index.toString(),
        status: 'ADDED',
        diffHtml: `<span class="git-inline-added">${highlightWhitespace(escapeHtml(align.rightLine.content))}</span>`,
        formatChanges: ['Line added'],
        whitespaceChanges: []
      });
    } else if (align.type === 'removed') {
      lines.push({
        v1: align.leftLine.index.toString(),
        v2: '',
        status: 'REMOVED',
        diffHtml: `<span class="git-inline-removed">${highlightWhitespace(escapeHtml(align.leftLine.content))}</span>`,
        formatChanges: ['Line removed'],
        whitespaceChanges: []
      });
    }
  });
  
  // Process table changes
  tableComparison.changes.forEach(change => {
    tables.push({
      table: change.position + 1,
      status: change.type.toUpperCase(),
      cellChanges: []
    });
  });
  
  // Process image changes
  imageComparison.changes.forEach(change => {
    images.push({
      index: change.position + 1,
      status: change.type.toUpperCase(),
      leftImage: change.leftImage,
      rightImage: change.rightImage
    });
  });
  
  return { lines, tables, images };
};

// Generate whitespace change description
const generateWhitespaceChangeDescription = (leftWs, rightWs) => {
  const changes = [];
  
  if (!leftWs || !rightWs) return changes;
  
  if (leftWs.spaces !== rightWs.spaces) {
    changes.push(`Spaces: ${leftWs.spaces} → ${rightWs.spaces}`);
  }
  
  if (leftWs.tabs !== rightWs.tabs) {
    changes.push(`Tabs: ${leftWs.tabs} → ${rightWs.tabs}`);
  }
  
  if (leftWs.lineBreaks !== rightWs.lineBreaks) {
    changes.push(`Line breaks: ${leftWs.lineBreaks} → ${rightWs.lineBreaks}`);
  }
  
  return changes;
};

// Utility functions
const htmlToDiv = (html) => {
  if (!html) return document.createElement("div");
  
  const d = document.createElement("div");
  try {
    d.innerHTML = html;
  } catch (error) {
    console.warn('Error parsing HTML:', error);
  }
  return d;
};

const extractPlainText = (html) => {
  if (!html) return "";
  
  const tempDiv = document.createElement("div");
  try {
    tempDiv.innerHTML = html;
  } catch (error) {
    console.warn('Error extracting plain text:', error);
    return "";
  }
  return tempDiv.textContent || "";
};

const getTextSimilarity = (text1, text2) => {
  if (!text1 && !text2) return 1;
  if (!text1 || !text2) return 0;
  
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(text1, text2);
  
  let totalLength = Math.max(text1.length, text2.length);
  let unchangedLength = 0;
  
  diffs.forEach(diff => {
    if (diff[0] === 0) {
      unchangedLength += diff[1].length;
    }
  });
  
  return totalLength > 0 ? unchangedLength / totalLength : 0;
};

const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

const createInlineDiff = (leftText, rightText) => {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(leftText || "", rightText || "");
  dmp.diff_cleanupSemantic(diffs);
  
  return diffs.map(diff => {
    const [operation, text] = diff;
    const highlighted = highlightWhitespace(escapeHtml(text));
    
    if (operation === 1) return `<span class="git-inline-added">${highlighted}</span>`;
    if (operation === -1) return `<span class="git-inline-removed">${highlighted}</span>`;
    return highlighted;
  }).join("");
};

// Export functions for rendering
export const renderHtmlDifferences = (diffs) => {
  if (!diffs || !Array.isArray(diffs)) {
    return '';
  }
  
  // Handle both old and new diff formats
  return diffs.map((d) => {
    if (typeof d === 'string') {
      return d;
    }
    return d.content || d.html || '';
  }).join("");
};

export const highlightDifferences = (diffs) => {
  return diffs
    .map((diff) => {
      switch (diff.type) {
        case "insert":
          return `<span class=\"diff-insert\">${escapeHtml(
            diff.content
          )}</span>`;
        case "delete":
          return `<span class=\"diff-delete\">${escapeHtml(
            diff.content
          )}</span>`;
        default:
          return escapeHtml(diff.content);
      }
    })
    .join("");
};