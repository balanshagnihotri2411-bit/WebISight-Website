import { useState } from 'react';

export default function UrlForm({ onSubmit, loading }) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState('');

  function validate(value) {
    if (!value.trim()) return 'Please enter a URL.';
    try {
      const u = new URL(value);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return 'URL must start with http:// or https://';
      }
    } catch {
      return 'Please enter a valid URL (e.g. https://example.com)';
    }
    return '';
  }

  function handleSubmit(e) {
    e.preventDefault();
    const error = validate(url);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');
    onSubmit(url.trim());
  }

  function handleChange(e) {
    setUrl(e.target.value);
    if (validationError) setValidationError('');
  }

  return (
    <section className="url-form-section">
      <form
        className="url-form"
        onSubmit={handleSubmit}
        role="search"
        aria-label="Analyze a website"
      >
        <div className="input-row">
          <label htmlFor="url-input" className="sr-only">
            Website URL
          </label>
          <input
            id="url-input"
            type="url"
            className="url-input"
            placeholder="https://your-website.com"
            value={url}
            onChange={handleChange}
            disabled={loading}
            autoComplete="url"
            spellCheck={false}
            aria-label="Website URL to audit"
            aria-describedby={validationError ? 'url-error' : undefined}
            aria-invalid={!!validationError}
          />
          <button
            type="submit"
            id="analyze-btn"
            className="analyze-btn"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Analyzing…
              </>
            ) : (
              <>
                <span aria-hidden="true">🔍</span>
                Analyze Site
              </>
            )}
          </button>
        </div>

        {validationError && (
          <p id="url-error" className="form-error" role="alert">
            <span aria-hidden="true">⚠️</span> {validationError}
          </p>
        )}
      </form>
    </section>
  );
}
