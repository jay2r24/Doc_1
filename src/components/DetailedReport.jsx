import React from 'react';

const DetailedReport = ({ report }) => {
  if (!report) return null;
  const { lines, tables, images } = report;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-8">
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Line-by-line</h4>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="px-2 py-2 w-16">v1</th>
                <th className="px-2 py-2 w-16">v2</th>
                <th className="px-2 py-2 w-40">Status</th>
                <th className="px-2 py-2">Inline diff (spaces visible)</th>
                <th className="px-2 py-2 w-60">Formatting changes</th>
                <th className="px-2 py-2 w-60">Whitespace changes</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((ln, idx) => (
                <tr key={idx} className="border-t border-gray-100 align-top">
                  <td className="px-2 py-2 text-gray-500">{ln.v1}</td>
                  <td className="px-2 py-2 text-gray-500">{ln.v2}</td>
                  <td className="px-2 py-2">
                    <span className={statusClass(ln.status)}>{ln.status}</span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="word-document-preview" dangerouslySetInnerHTML={{ __html: ln.diffHtml }} />
                  </td>
                  <td className="px-2 py-2 text-gray-600">
                    {ln.formatChanges && ln.formatChanges.length > 0 ? (
                      <ul className="list-disc pl-5">
                        {ln.formatChanges.map((c, i) => (<li key={i}>{c}</li>))}
                      </ul>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-gray-600">
                    {ln.whitespaceChanges && ln.whitespaceChanges.length > 0 ? (
                      <ul className="list-disc pl-5">
                        {ln.whitespaceChanges.map((c, i) => (<li key={i}>{c}</li>))}
                      </ul>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Tables</h4>
        {tables.length === 0 ? (
          <p className="text-sm text-gray-500">No table changes</p>
        ) : (
          <ul className="text-sm text-gray-700 space-y-1">
            {tables.map((t, i) => (
              <li key={i}>
                <span className={statusClass(t.status)}>{t.status}</span>
                {` table ${t.table}`}
                {t.cellChanges && t.cellChanges.length > 0 && (
                  <div className="ml-4 mt-2">
                    <strong>Cell changes:</strong>
                    <ul className="list-disc pl-5">
                      {t.cellChanges.map((change, idx) => (
                        <li key={idx}>
                          {change.type === 'row-added' && `Row ${change.row + 1} added`}
                          {change.type === 'row-removed' && `Row ${change.row + 1} removed`}
                          {change.type === 'cell-added' && `Cell [${change.row + 1}, ${change.col + 1}] added`}
                          {change.type === 'cell-removed' && `Cell [${change.row + 1}, ${change.col + 1}] removed`}
                          {change.type === 'cell-modified' && (
                            <div>
                              Cell [{change.row + 1}, {change.col + 1}] modified
                              {change.contentChanged && <div className="text-xs text-gray-500">Content changed</div>}
                              {change.formattingChanged && <div className="text-xs text-gray-500">Formatting changed</div>}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Images</h4>
        {images.length === 0 ? (
          <p className="text-sm text-gray-500">No image changes</p>
        ) : (
          <ul className="text-sm text-gray-700 space-y-1">
            {images.map((img, i) => (
              <li key={i}>
                <span className={statusClass(img.status)}>{img.status}</span>
                {` image #${img.index}`}
                {img.leftImage && (
                  <div className="ml-4 mt-1 text-xs text-gray-500">
                    Original: {img.leftImage.alt || 'No alt text'} 
                    {img.leftImage.width && ` (${img.leftImage.width}×${img.leftImage.height})`}
                  </div>
                )}
                {img.rightImage && (
                  <div className="ml-4 mt-1 text-xs text-gray-500">
                    Modified: {img.rightImage.alt || 'No alt text'} 
                    {img.rightImage.width && ` (${img.rightImage.width}×${img.rightImage.height})`}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const statusClass = (status) => {
  switch (status) {
    case 'UNCHANGED': return 'inline-block px-2 py-1 rounded bg-gray-100 text-gray-700';
    case 'ADDED': return 'inline-block px-2 py-1 rounded bg-green-100 text-green-700';
    case 'REMOVED': return 'inline-block px-2 py-1 rounded bg-red-100 text-red-700';
    case 'MODIFIED': return 'inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-700';
    case 'FORMATTING-ONLY': return 'inline-block px-2 py-1 rounded bg-blue-100 text-blue-700';
    default: return 'inline-block px-2 py-1 rounded bg-gray-100 text-gray-700';
  }
};

export default DetailedReport;


