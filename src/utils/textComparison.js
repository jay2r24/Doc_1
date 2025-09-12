import { diffChars, diffWordsWithSpace, diffArrays, diffSentences, Diff } from "diff";
import { diff_match_patch } from 'diff-match-patch';

export const compareHtmlDocuments = (leftHtml, rightHtml) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        console.log('Starting enhanced document comparison with line indexing...');
        
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

        console.log('Documents differ, performing comprehensive comparison...');
        
        // Enhanced comparison with line indexing and comprehensive diff detection
        const comparisonResult = performEnhancedComparison(leftHtml, rightHtml);

        const result = {
          leftDiffs: [{ type: "modified", content: comparisonResult.leftContent }],
          rightDiffs: [{ type: "modified", content: comparisonResult.rightContent }],
          summary: comparisonResult.summary,
          detailed: comparisonResult.detailed
        };

        console.log('Enhanced comparison completed successfully');
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

// Enhanced comparison with comprehensive diff detection
const performEnhancedComparison = (leftHtml, rightHtml) => {
  const leftDiv = htmlToDiv(leftHtml);
  const rightDiv = htmlToDiv(rightHtml);
  
  // Step 1: Extract and index all elements with line numbers
  const leftElements = extractIndexedElements(leftDiv);
  const rightElements = extractIndexedElements(rightDiv);
  
  // Step 2: Compare images by position, size, and presence
  const imageComparison = compareImages(leftDiv, rightDiv);
  
  // Step 3: Compare tables with structure and content analysis
  const tableComparison = compareTables(leftDiv, rightDiv);
  
  // Step 4: Perform line-by-line text comparison with formatting detection
  const textComparison = compareTextWithFormatting(leftElements, rightElements);
  
  // Step 5: Apply all highlights and generate final content
  const finalContent = applyAllHighlights(
    leftDiv, 
    rightDiv, 
    textComparison, 
    imageComparison, 
    tableComparison
  );
  
  // Step 6: Generate comprehensive summary
  const summary = {
    additions: textComparison.additions + imageComparison.additions + tableComparison.additions,
    deletions: textComparison.deletions + imageComparison.deletions + tableComparison.deletions,
    changes: 0
  };
  summary.changes = summary.additions + summary.deletions;
  
  // Step 7: Generate detailed report
  const detailed = generateEnhancedDetailedReport(
    textComparison, 
    imageComparison, 
    tableComparison
  );
  
  return {
    leftContent: finalContent.left,
    rightContent: finalContent.right,
    summary,
    detailed
  };
};

// Extract all elements with line indexing
const extractIndexedElements = (container) => {
  const elements = [];
  let lineIndex = 1;
  
  // Get all meaningful elements in document order
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Accept text nodes with content and meaningful elements
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
        
        const tagName = node.tagName?.toLowerCase();
        const meaningfulTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'div', 'span', 'table', 'tr', 'td', 'th', 'img', 'br'];
        return meaningfulTags.includes(tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const lines = text.split('\n');
      
      lines.forEach((line, idx) => {
        if (line.trim() || idx < lines.length - 1) { // Include empty lines except the last one
          elements.push({
            type: 'text',
            content: line,
            lineIndex: lineIndex++,
            node: node,
            parentElement: node.parentElement,
            formatting: extractFormattingFromElement(node.parentElement),
            whitespace: analyzeWhitespace(line)
          });
        }
      });
    } else if (node.tagName) {
      const tagName = node.tagName.toLowerCase();
      
      if (tagName === 'br') {
        elements.push({
          type: 'break',
          content: '',
          lineIndex: lineIndex++,
          node: node,
          parentElement: node.parentElement,
          formatting: {},
          whitespace: { spaces: 0, tabs: 0, lineBreaks: 1 }
        });
      } else if (tagName === 'img') {
        elements.push({
          type: 'image',
          content: '',
          lineIndex: lineIndex++,
          node: node,
          parentElement: node.parentElement,
          formatting: {},
          imageData: extractImageData(node),
          whitespace: { spaces: 0, tabs: 0, lineBreaks: 0 }
        });
      } else if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'div'].includes(tagName)) {
        // Block elements get their own line index
        const textContent = getDirectTextContent(node);
        if (textContent.trim()) {
          elements.push({
            type: 'block',
            content: textContent,
            lineIndex: lineIndex++,
            node: node,
            parentElement: node,
            formatting: extractFormattingFromElement(node),
            whitespace: analyzeWhitespace(textContent),
            tagName: tagName
          });
        }
      }
    }
  }
  
  return elements;
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
    lineHeight: inlineStyle.lineHeight || computedStyle.lineHeight || '',
    isBold: (inlineStyle.fontWeight || computedStyle.fontWeight || '').includes('bold') || 
             !!element.querySelector('b, strong'),
    isItalic: (inlineStyle.fontStyle || computedStyle.fontStyle || '').includes('italic') || 
              !!element.querySelector('i, em'),
    isUnderline: (inlineStyle.textDecoration || computedStyle.textDecoration || '').includes('underline') || 
                 !!element.querySelector('u')
  };
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

// Get direct text content (not from child elements)
const getDirectTextContent = (element) => {
  let text = '';
  for (let child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent;
    }
  }
  return text;
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
      // Image removed
      leftImg.classList.add('git-image-removed');
      leftImg.setAttribute('data-change-type', 'removed');
      
      // Add placeholder in right document
      const placeholder = createImagePlaceholder(leftImg, 'removed');
      insertImagePlaceholder(rightDiv, placeholder, i);
      
      deletions++;
      imageChanges.push({
        position: i,
        type: 'removed',
        leftImage: extractImageData(leftImg),
        rightImage: null
      });
    } else if (!leftImg && rightImg) {
      // Image added
      rightImg.classList.add('git-image-added');
      rightImg.setAttribute('data-change-type', 'added');
      
      // Add placeholder in left document
      const placeholder = createImagePlaceholder(rightImg, 'added');
      insertImagePlaceholder(leftDiv, placeholder, i);
      
      additions++;
      imageChanges.push({
        position: i,
        type: 'added',
        leftImage: null,
        rightImage: extractImageData(rightImg)
      });
    } else if (leftImg && rightImg) {
      // Compare image properties
      const leftData = extractImageData(leftImg);
      const rightData = extractImageData(rightImg);
      
      const isModified = 
        leftData.src !== rightData.src ||
        leftData.width !== rightData.width ||
        leftData.height !== rightData.height ||
        leftData.alt !== rightData.alt;
      
      if (isModified) {
        leftImg.classList.add('git-image-modified');
        rightImg.classList.add('git-image-modified');
        leftImg.setAttribute('data-change-type', 'modified');
        rightImg.setAttribute('data-change-type', 'modified');
        
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

// Create image placeholder
const createImagePlaceholder = (originalImg, type) => {
  const placeholder = document.createElement('div');
  placeholder.className = `image-placeholder placeholder-${type}`;
  
  const imgData = extractImageData(originalImg);
  const width = imgData.width || '200px';
  const height = imgData.height || '150px';
  
  Object.assign(placeholder.style, {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    border: `2px dashed ${type === 'added' ? '#22c55e' : '#ef4444'}`,
    backgroundColor: type === 'added' ? '#f0fdf4' : '#fef2f2',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: originalImg.style.margin || '8px 0',
    padding: '16px',
    opacity: '0.8',
    boxSizing: 'border-box'
  });
  
  const iconSpan = document.createElement('span');
  iconSpan.style.cssText = `
    font-size: 24px; 
    margin-bottom: 8px;
    color: ${type === 'added' ? '#166534' : '#991b1b'};
  `;
  iconSpan.textContent = type === 'added' ? '🖼️' : '🚫';
  
  const textSpan = document.createElement('span');
  textSpan.style.cssText = `
    color: ${type === 'added' ? '#166534' : '#991b1b'};
    font-size: 12px;
    font-weight: 600;
    text-align: center;
  `;
  textSpan.textContent = type === 'added' ? 'Image Added' : 'Image Removed';
  
  if (imgData.alt) {
    const altSpan = document.createElement('span');
    altSpan.style.cssText = `
      color: ${type === 'added' ? '#166534' : '#991b1b'};
      font-size: 10px;
      margin-top: 4px;
      opacity: 0.8;
      text-align: center;
    `;
    altSpan.textContent = `Alt: ${imgData.alt}`;
    placeholder.appendChild(altSpan);
  }
  
  placeholder.appendChild(iconSpan);
  placeholder.appendChild(textSpan);
  
  return placeholder;
};

// Insert image placeholder at specific position
const insertImagePlaceholder = (container, placeholder, targetIndex) => {
  const allImages = Array.from(container.querySelectorAll('img, .image-placeholder'));
  
  if (targetIndex < allImages.length) {
    allImages[targetIndex].parentNode.insertBefore(placeholder, allImages[targetIndex]);
  } else if (allImages.length > 0) {
    const lastImage = allImages[allImages.length - 1];
    lastImage.parentNode.insertBefore(placeholder, lastImage.nextSibling);
  } else {
    container.appendChild(placeholder);
  }
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
      // Table removed
      leftTable.classList.add('git-table-removed');
      leftTable.setAttribute('data-change-type', 'removed');
      
      // Add placeholder in right document
      const placeholder = createTablePlaceholder(leftTable, 'removed');
      insertTablePlaceholder(rightDiv, placeholder, i);
      
      deletions++;
      tableChanges.push({
        position: i,
        type: 'removed',
        leftTable: getTableStructure(leftTable),
        rightTable: null
      });
    } else if (!leftTable && rightTable) {
      // Table added
      rightTable.classList.add('git-table-added');
      rightTable.setAttribute('data-change-type', 'added');
      
      // Add placeholder in left document
      const placeholder = createTablePlaceholder(rightTable, 'added');
      insertTablePlaceholder(leftDiv, placeholder, i);
      
      additions++;
      tableChanges.push({
        position: i,
        type: 'added',
        leftTable: null,
        rightTable: getTableStructure(rightTable)
      });
    } else if (leftTable && rightTable) {
      // Compare table structure and content
      const comparison = compareTableStructureAndContent(leftTable, rightTable);
      
      if (comparison.hasChanges) {
        additions += comparison.additions;
        deletions += comparison.deletions;
        tableChanges.push({
          position: i,
          type: 'modified',
          leftTable: getTableStructure(leftTable),
          rightTable: getTableStructure(rightTable),
          cellChanges: comparison.cellChanges
        });
      }
    }
  }
  
  return { additions, deletions, changes: tableChanges };
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

// Compare table structure and content
const compareTableStructureAndContent = (leftTable, rightTable) => {
  const leftRows = Array.from(leftTable.rows || []);
  const rightRows = Array.from(rightTable.rows || []);
  
  let additions = 0, deletions = 0;
  const cellChanges = [];
  let hasChanges = false;
  
  const maxRows = Math.max(leftRows.length, rightRows.length);
  
  for (let r = 0; r < maxRows; r++) {
    const leftRow = leftRows[r];
    const rightRow = rightRows[r];
    
    if (leftRow && !rightRow) {
      // Row removed
      leftRow.classList.add('git-row-removed');
      deletions++;
      hasChanges = true;
      cellChanges.push({ row: r, type: 'row-removed' });
    } else if (!leftRow && rightRow) {
      // Row added
      rightRow.classList.add('git-row-added');
      additions++;
      hasChanges = true;
      cellChanges.push({ row: r, type: 'row-added' });
    } else if (leftRow && rightRow) {
      const leftCells = Array.from(leftRow.cells || []);
      const rightCells = Array.from(rightRow.cells || []);
      const maxCells = Math.max(leftCells.length, rightCells.length);
      
      for (let c = 0; c < maxCells; c++) {
        const leftCell = leftCells[c];
        const rightCell = rightCells[c];
        
        if (leftCell && !rightCell) {
          leftCell.classList.add('git-cell-removed');
          deletions++;
          hasChanges = true;
          cellChanges.push({ row: r, col: c, type: 'cell-removed' });
        } else if (!leftCell && rightCell) {
          rightCell.classList.add('git-cell-added');
          additions++;
          hasChanges = true;
          cellChanges.push({ row: r, col: c, type: 'cell-added' });
        } else if (leftCell && rightCell) {
          const leftContent = leftCell.textContent?.trim() || '';
          const rightContent = rightCell.textContent?.trim() || '';
          const leftFormatting = extractFormattingFromElement(leftCell);
          const rightFormatting = extractFormattingFromElement(rightCell);
          
          const contentChanged = leftContent !== rightContent;
          const formattingChanged = !areFormattingsEqual(leftFormatting, rightFormatting);
          
          if (contentChanged || formattingChanged) {
            leftCell.classList.add('git-cell-modified');
            rightCell.classList.add('git-cell-modified');
            
            // Apply word-level highlighting within cells
            if (contentChanged) {
              applyWordLevelCellDiff(leftCell, leftContent, rightContent, 'left');
              applyWordLevelCellDiff(rightCell, leftContent, rightContent, 'right');
            }
            
            additions++;
            deletions++;
            hasChanges = true;
            cellChanges.push({
              row: r,
              col: c,
              type: 'cell-modified',
              contentChanged,
              formattingChanged,
              leftContent,
              rightContent,
              leftFormatting,
              rightFormatting
            });
          }
        }
      }
    }
  }
  
  return { hasChanges, additions, deletions, cellChanges };
};

// Check if two formatting objects are equal
const areFormattingsEqual = (fmt1, fmt2) => {
  const keys = new Set([...Object.keys(fmt1), ...Object.keys(fmt2)]);
  for (const key of keys) {
    if (fmt1[key] !== fmt2[key]) return false;
  }
  return true;
};

// Create table placeholder with same dimensions
const createTablePlaceholder = (originalTable, type) => {
  const placeholder = document.createElement('div');
  placeholder.className = `table-placeholder placeholder-${type}`;
  
  // Calculate table dimensions
  const tableRect = originalTable.getBoundingClientRect();
  const width = originalTable.style.width || `${Math.max(300, tableRect.width)}px`;
  const height = originalTable.style.height || `${Math.max(100, tableRect.height)}px`;
  
  Object.assign(placeholder.style, {
    width,
    height,
    border: `2px dashed ${type === 'added' ? '#22c55e' : '#ef4444'}`,
    backgroundColor: type === 'added' ? '#f0fdf4' : '#fef2f2',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: originalTable.style.margin || '16px 0',
    padding: '20px',
    opacity: '0.8',
    boxSizing: 'border-box'
  });
  
  const iconSpan = document.createElement('span');
  iconSpan.style.cssText = `
    font-size: 24px; 
    margin-bottom: 8px;
    color: ${type === 'added' ? '#166534' : '#991b1b'};
  `;
  iconSpan.textContent = type === 'added' ? '📋' : '🗑️';
  
  const textSpan = document.createElement('span');
  textSpan.style.cssText = `
    color: ${type === 'added' ? '#166534' : '#991b1b'};
    font-size: 14px;
    font-weight: 600;
    text-align: center;
  `;
  textSpan.textContent = type === 'added' ? 'Table Added' : 'Table Removed';
  
  const detailSpan = document.createElement('span');
  detailSpan.style.cssText = `
    color: ${type === 'added' ? '#166534' : '#991b1b'};
    font-size: 12px;
    margin-top: 4px;
    opacity: 0.8;
    text-align: center;
  `;
  
  const rows = originalTable.rows ? originalTable.rows.length : 0;
  const cols = originalTable.rows && originalTable.rows[0] ? originalTable.rows[0].cells.length : 0;
  detailSpan.textContent = `${rows} rows × ${cols} columns`;
  
  placeholder.appendChild(iconSpan);
  placeholder.appendChild(textSpan);
  placeholder.appendChild(detailSpan);
  
  return placeholder;
};

// Insert table placeholder at specific position
const insertTablePlaceholder = (container, placeholder, targetIndex) => {
  const allTables = Array.from(container.querySelectorAll('table, .table-placeholder'));
  
  if (targetIndex < allTables.length) {
    allTables[targetIndex].parentNode.insertBefore(placeholder, allTables[targetIndex]);
  } else if (allTables.length > 0) {
    const lastTable = allTables[allTables.length - 1];
    lastTable.parentNode.insertBefore(placeholder, lastTable.nextSibling);
  } else {
    container.appendChild(placeholder);
  }
};

// Compare text with formatting detection
const compareTextWithFormatting = (leftElements, rightElements) => {
  let additions = 0, deletions = 0;
  const textChanges = [];
  
  // Align elements for comparison
  const alignment = alignElementsForComparison(leftElements, rightElements);
  
  alignment.forEach(({ left, right, type }) => {
    if (type === 'added' && right) {
      additions++;
      textChanges.push({
        lineIndex: right.lineIndex,
        type: 'added',
        content: right.content,
        formatting: right.formatting,
        whitespace: right.whitespace
      });
    } else if (type === 'removed' && left) {
      deletions++;
      textChanges.push({
        lineIndex: left.lineIndex,
        type: 'removed',
        content: left.content,
        formatting: left.formatting,
        whitespace: left.whitespace
      });
    } else if (type === 'modified' && left && right) {
      const contentChanged = left.content !== right.content;
      const formattingChanged = !areFormattingsEqual(left.formatting, right.formatting);
      const whitespaceChanged = !areWhitespaceEqual(left.whitespace, right.whitespace);
      
      if (contentChanged || formattingChanged || whitespaceChanged) {
        additions++;
        deletions++;
        textChanges.push({
          leftLineIndex: left.lineIndex,
          rightLineIndex: right.lineIndex,
          type: 'modified',
          leftContent: left.content,
          rightContent: right.content,
          leftFormatting: left.formatting,
          rightFormatting: right.formatting,
          leftWhitespace: left.whitespace,
          rightWhitespace: right.whitespace,
          contentChanged,
          formattingChanged,
          whitespaceChanged
        });
      }
    }
  });
  
  return { additions, deletions, changes: textChanges };
};

// Align elements for comparison
const alignElementsForComparison = (leftElements, rightElements) => {
  const alignment = [];
  const leftUsed = new Set();
  const rightUsed = new Set();
  
  // First pass: exact matches
  leftElements.forEach((leftEl, leftIdx) => {
    rightElements.forEach((rightEl, rightIdx) => {
      if (leftUsed.has(leftIdx) || rightUsed.has(rightIdx)) return;
      
      if (leftEl.content === rightEl.content && 
          leftEl.type === rightEl.type &&
          areFormattingsEqual(leftEl.formatting, rightEl.formatting)) {
        alignment.push({ left: leftEl, right: rightEl, type: 'equal' });
        leftUsed.add(leftIdx);
        rightUsed.add(rightIdx);
      }
    });
  });
  
  // Second pass: similar content matches
  leftElements.forEach((leftEl, leftIdx) => {
    if (leftUsed.has(leftIdx)) return;
    
    let bestMatch = null;
    let bestSimilarity = 0;
    
    rightElements.forEach((rightEl, rightIdx) => {
      if (rightUsed.has(rightIdx)) return;
      
      if (leftEl.type === rightEl.type) {
        const similarity = getTextSimilarity(leftEl.content, rightEl.content);
        if (similarity > bestSimilarity && similarity > 0.5) {
          bestMatch = { element: rightEl, index: rightIdx, similarity };
          bestSimilarity = similarity;
        }
      }
    });
    
    if (bestMatch) {
      alignment.push({ left: leftEl, right: bestMatch.element, type: 'modified' });
      leftUsed.add(leftIdx);
      rightUsed.add(bestMatch.index);
    }
  });
  
  // Third pass: unmatched elements
  leftElements.forEach((leftEl, leftIdx) => {
    if (!leftUsed.has(leftIdx)) {
      alignment.push({ left: leftEl, right: null, type: 'removed' });
    }
  });
  
  rightElements.forEach((rightEl, rightIdx) => {
    if (!rightUsed.has(rightIdx)) {
      alignment.push({ left: null, right: rightEl, type: 'added' });
    }
  });
  
  return alignment;
};

// Check if whitespace objects are equal
const areWhitespaceEqual = (ws1, ws2) => {
  return ws1.spaces === ws2.spaces && 
         ws1.tabs === ws2.tabs && 
         ws1.lineBreaks === ws2.lineBreaks;
};

// Apply all highlights to generate final content
const applyAllHighlights = (leftDiv, rightDiv, textComparison, imageComparison, tableComparison) => {
  // Apply text highlighting
  applyTextHighlighting(leftDiv, rightDiv, textComparison);
  
  // Image and table highlighting is already applied during comparison
  
  return {
    left: leftDiv.innerHTML,
    right: rightDiv.innerHTML
  };
};

// Apply text highlighting with line indexing
const applyTextHighlighting = (leftDiv, rightDiv, textComparison) => {
  textComparison.changes.forEach(change => {
    if (change.type === 'modified') {
      // Find elements and apply word-level highlighting
      const leftElements = findElementsByLineIndex(leftDiv, change.leftLineIndex);
      const rightElements = findElementsByLineIndex(rightDiv, change.rightLineIndex);
      
      leftElements.forEach(el => {
        el.classList.add('git-line-modified');
        if (change.contentChanged) {
          applyWordLevelHighlighting(el, change.leftContent, change.rightContent, 'left');
        }
        if (change.formattingChanged) {
          el.setAttribute('data-formatting-changed', 'true');
        }
        if (change.whitespaceChanged) {
          el.setAttribute('data-whitespace-changed', 'true');
        }
      });
      
      rightElements.forEach(el => {
        el.classList.add('git-line-modified');
        if (change.contentChanged) {
          applyWordLevelHighlighting(el, change.leftContent, change.rightContent, 'right');
        }
        if (change.formattingChanged) {
          el.setAttribute('data-formatting-changed', 'true');
        }
        if (change.whitespaceChanged) {
          el.setAttribute('data-whitespace-changed', 'true');
        }
      });
    } else if (change.type === 'added') {
      const elements = findElementsByLineIndex(rightDiv, change.lineIndex);
      elements.forEach(el => {
        el.classList.add('git-line-added');
        el.setAttribute('data-line-index', change.lineIndex);
      });
    } else if (change.type === 'removed') {
      const elements = findElementsByLineIndex(leftDiv, change.lineIndex);
      elements.forEach(el => {
        el.classList.add('git-line-removed');
        el.setAttribute('data-line-index', change.lineIndex);
      });
    }
  });
};

// Find elements by line index
const findElementsByLineIndex = (container, lineIndex) => {
  const elements = [];
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    if (node.getAttribute && node.getAttribute('data-line-index') == lineIndex) {
      elements.push(node);
    }
  }
  
  return elements;
};

// Apply word-level highlighting with whitespace detection
const applyWordLevelHighlighting = (element, leftText, rightText, side) => {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(leftText || "", rightText || "");
  dmp.diff_cleanupSemantic(diffs);
  
  let html = '';
  
  diffs.forEach(diff => {
    const [operation, text] = diff;
    
    if (operation === 0) {
      // Unchanged text - show whitespace visually
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
    .replace(/ /g, '<span class="whitespace-space" style="background: rgba(0,0,0,0.1); border-radius: 2px;">·</span>')
    .replace(/\t/g, '<span class="whitespace-tab" style="background: rgba(0,0,0,0.1); border-radius: 2px;">→</span>')
    .replace(/\n/g, '<span class="whitespace-newline" style="background: rgba(0,0,0,0.1); border-radius: 2px;">↵</span><br>');
};

// Apply word-level highlighting to table cells
const applyWordLevelCellDiff = (cell, leftText, rightText, side) => {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(leftText || "", rightText || "");
  dmp.diff_cleanupSemantic(diffs);
  
  let html = '';
  
  diffs.forEach(diff => {
    const [operation, text] = diff;
    
    if (operation === 0) {
      html += highlightWhitespace(escapeHtml(text));
    } else if (operation === 1) {
      if (side === 'right') {
        html += `<span class="git-inline-added">${highlightWhitespace(escapeHtml(text))}</span>`;
      } else {
        html += `<span class="git-inline-placeholder" style="color: #22c55e; font-style: italic; opacity: 0.7; background: #f0fdf4; padding: 1px 3px; border-radius: 2px;">[+${highlightWhitespace(escapeHtml(text))}]</span>`;
      }
    } else if (operation === -1) {
      if (side === 'left') {
        html += `<span class="git-inline-removed">${highlightWhitespace(escapeHtml(text))}</span>`;
      } else {
        html += `<span class="git-inline-placeholder" style="color: #ef4444; font-style: italic; opacity: 0.7; background: #fef2f2; padding: 1px 3px; border-radius: 2px;">[-${highlightWhitespace(escapeHtml(text))}]</span>`;
      }
    }
  });
  
  cell.innerHTML = html;
};

// Generate enhanced detailed report
const generateEnhancedDetailedReport = (textComparison, imageComparison, tableComparison) => {
  const lines = [];
  const tables = [];
  const images = [];
  
  // Process text changes
  textComparison.changes.forEach(change => {
    if (change.type === 'modified') {
      lines.push({
        v1: change.leftLineIndex?.toString() || '',
        v2: change.rightLineIndex?.toString() || '',
        status: 'MODIFIED',
        diffHtml: createInlineDiff(change.leftContent, change.rightContent),
        formatChanges: generateFormatChangeDescription(change.leftFormatting, change.rightFormatting),
        whitespaceChanges: generateWhitespaceChangeDescription(change.leftWhitespace, change.rightWhitespace)
      });
    } else if (change.type === 'added') {
      lines.push({
        v1: '',
        v2: change.lineIndex?.toString() || '',
        status: 'ADDED',
        diffHtml: `<span class="git-inline-added">${highlightWhitespace(escapeHtml(change.content))}</span>`,
        formatChanges: ['Line added'],
        whitespaceChanges: []
      });
    } else if (change.type === 'removed') {
      lines.push({
        v1: change.lineIndex?.toString() || '',
        v2: '',
        status: 'REMOVED',
        diffHtml: `<span class="git-inline-removed">${highlightWhitespace(escapeHtml(change.content))}</span>`,
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
      cellChanges: change.cellChanges || []
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

// Generate format change description
const generateFormatChangeDescription = (leftFmt, rightFmt) => {
  const changes = [];
  
  if (!leftFmt || !rightFmt) return changes;
  
  if (leftFmt.isBold !== rightFmt.isBold) {
    changes.push(`Bold: ${leftFmt.isBold ? 'ON' : 'OFF'} → ${rightFmt.isBold ? 'ON' : 'OFF'}`);
  }
  
  if (leftFmt.isItalic !== rightFmt.isItalic) {
    changes.push(`Italic: ${leftFmt.isItalic ? 'ON' : 'OFF'} → ${rightFmt.isItalic ? 'ON' : 'OFF'}`);
  }
  
  if (leftFmt.isUnderline !== rightFmt.isUnderline) {
    changes.push(`Underline: ${leftFmt.isUnderline ? 'ON' : 'OFF'} → ${rightFmt.isUnderline ? 'ON' : 'OFF'}`);
  }
  
  if (leftFmt.fontSize !== rightFmt.fontSize) {
    changes.push(`Font Size: ${leftFmt.fontSize || 'default'} → ${rightFmt.fontSize || 'default'}`);
  }
  
  if (leftFmt.color !== rightFmt.color) {
    changes.push(`Color: ${leftFmt.color || 'default'} → ${rightFmt.color || 'default'}`);
  }
  
  if (leftFmt.fontFamily !== rightFmt.fontFamily) {
    changes.push(`Font: ${leftFmt.fontFamily || 'default'} → ${rightFmt.fontFamily || 'default'}`);
  }
  
  return changes;
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

// Utility functions (keeping existing ones that work well)
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
  return diffs.map((d) => d.content).join("");
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