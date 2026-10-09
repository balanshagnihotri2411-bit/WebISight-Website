import { useRef } from 'react';

/**
 * Download the full audit report as a JSON file.
 */
export function DownloadButton({ report }) {
  function handleDownload() {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const hostname = (() => {
      try {
        return new URL(report.url).hostname;
      } catch {
        return 'report';
      }
    })();
    a.href = url;
    a.download = `webisight-${hostname}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      id="download-report-btn"
      className="btn btn-primary"
      onClick={handleDownload}
      aria-label="Download audit report as JSON file"
    >
      <span aria-hidden="true">⬇️</span>
      Download JSON
    </button>
  );
}

/**
 * Upload a previously saved audit report JSON and render it.
 */
export function LoadReportButton({ onLoad }) {
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        // Basic shape check
        if (!data.url || !data.overallScore === undefined || !data.findingsBySkill) {
          throw new Error('Invalid report format');
        }
        onLoad(data);
      } catch (err) {
        alert('Could not parse the uploaded file. Please upload a valid WebISight JSON report.');
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be loaded again
    e.target.value = '';
  }

  return (
    <>
      <input
        ref={fileInputRef}
        id="load-report-input"
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-label="Upload a saved audit report"
      />
      <button
        id="load-report-btn"
        className="btn btn-secondary"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Load a previously saved audit report"
      >
        <span aria-hidden="true">📂</span>
        Load Saved Report
      </button>
    </>
  );
}
