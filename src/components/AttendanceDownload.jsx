import { useState, useEffect } from 'react';
import { getAccessToken } from '../utils/api';

const AttendanceDownload = () => {
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    branch: 'DS',
    standard: 'FE'
  });
  const [facultySubject, setFacultySubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const branches = ['DS', 'AIML', 'IT', 'COMPS'];
  const standards = ['FE', 'SE', 'TE', 'BE'];
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Generate years (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Get faculty subject on mount
  useEffect(() => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (user.subject) {
        setFacultySubject(user.subject);
      } else {
        setError('Subject not found. It appears you are not logged in as a faculty member.');
      }
    } catch (err) {
      setError('Error loading faculty information.');
      console.error(err);
    }
  }, []);

  const getMonthLabel = (monthNum) => {
    return months.find(m => m.value === monthNum)?.label || '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'month' || name === 'year' ? parseInt(value, 10) : value
    });
    setError('');
    setSuccess('');
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = getAccessToken();
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }

      if (!facultySubject) {
        setError('Subject not found. Please log in again as faculty.');
        setLoading(false);
        return;
      }

      const queryParams = new URLSearchParams({
        month: formData.month,
        year: formData.year,
        branch: formData.branch,
        standard: formData.standard
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attendance/download/monthly?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download attendance report');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `Attendance_${formData.standard}_${formData.branch}_${facultySubject}_${getMonthLabel(formData.month)}_${formData.year}.csv`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Downloaded: ${filename}`);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const monthLabel = getMonthLabel(formData.month);

  return (
    <div className="form-card" style={{ maxWidth: '500px' }}>
      <h2 className="section-title">Download Attendance</h2>

      {error && !facultySubject && (
        <div className="alert alert-danger" style={{ marginBottom: '15px' }}>
          {error}
        </div>
      )}

      {facultySubject && (
        <form onSubmit={handleDownload}>
          {/* Subject Display (Read-only) */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Your Subject</label>
            <div style={{
              padding: '12px 15px',
              backgroundColor: '#e8f5e9',
              borderRadius: '8px',
              border: '1px solid #c8e6c9',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2e8b57'
            }}>
              {facultySubject}
            </div>
            <p style={{
              fontSize: '12px',
              color: '#666',
              marginTop: '6px'
            }}>
              You can only download attendance for your subject
            </p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Month</label>
              <select
                name="month"
                value={formData.month}
                onChange={handleChange}
                disabled={loading}
                className="form-select"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                disabled={loading}
                className="form-select"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Branch</label>
              <select
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                disabled={loading}
                className="form-select"
              >
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Standard/Year</label>
              <select
                name="standard"
                value={formData.standard}
                onChange={handleChange}
                disabled={loading}
                className="form-select"
              >
                {standards.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Show selected summary */}
          <div style={{
            marginTop: '20px',
            padding: '12px 15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '3px',
            borderLeft: '3px solid #007bff',
            fontSize: '14px',
            fontWeight: '500',
            color: '#333'
          }}>
            Downloading: <strong>{formData.standard}</strong> - <strong>{formData.branch}</strong> | <strong>{facultySubject}</strong> | <strong>{monthLabel}</strong> <strong>{formData.year}</strong>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              marginTop: '20px',
              width: '100%'
            }}
          >
            {loading ? 'Generating...' : 'Download Report'}
          </button>

          {/* Legend for attendance status codes */}
          <div style={{
            marginTop: '20px',
            padding: '12px 15px',
            backgroundColor: '#f9f9f9',
            borderRadius: '3px',
            border: '1px solid #e0e0e0',
            fontSize: '13px',
            color: '#555',
            lineHeight: '1.6'
          }}>
            <strong>Legend:</strong><br/>
            P = Present | A = Absent | H = Holiday
          </div>
        </form>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '15px' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginTop: '15px' }}>
          {success}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default AttendanceDownload;
