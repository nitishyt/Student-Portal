import { useState, useEffect } from 'react';
import { getAccessToken } from '../utils/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dailyAnalysis, setDailyAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [expandedDates, setExpandedDates] = useState({});

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

  const getDayOfWeekName = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const toggleExpandDate = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const renderStudentList = (students, date, listType) => {
    const maxDisplay = 5;
    const isExpanded = expandedDates[`${date}-${listType}`];
    const shouldShowMore = students.length > maxDisplay;
    const displayedStudents = isExpanded ? students : students.slice(0, maxDisplay);

    return (
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0
      }}>
        {displayedStudents.map((student, sidx) => (
          <li key={sidx} style={{
            padding: '6px 0',
            fontSize: '13px',
            color: listType === 'present' ? '#27ae60' : '#e74c3c',
            borderBottom: `1px solid ${listType === 'present' ? '#e8f5e9' : '#fadbd8'}`
          }}>
            <strong>{student.name}</strong> ({student.rollNo})
          </li>
        ))}
        {shouldShowMore && (
          <li style={{
            padding: '8px 0',
            textAlign: 'center'
          }}>
            <button
              type="button"
              onClick={() => toggleExpandDate(`${date}-${listType}`)}
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              {isExpanded ? '▼ Show Less' : `▶ Show All (${students.length})`}
            </button>
          </li>
        )}
      </ul>
    );
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

  const handleDailyAnalysis = async (e) => {
    e.preventDefault();
    setAnalysisLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate date range
      if (!startDate || !endDate) {
        setError('Please select both start and end dates.');
        setAnalysisLoading(false);
        return;
      }

      if (startDate > endDate) {
        setError('Start date must be before end date.');
        setAnalysisLoading(false);
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setAnalysisLoading(false);
        return;
      }

      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        branch: formData.branch,
        standard: formData.standard
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attendance/daily-analysis?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch daily analysis');
      }

      const data = await response.json();
      setDailyAnalysis(data);
      setSuccess('Daily analysis loaded successfully!');
    } catch (err) {
      setError(`Error: ${err.message}`);
      setDailyAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const monthLabel = getMonthLabel(formData.month);

  // Colors for charts
  const COLORS = {
    present: '#10b981',
    absent: '#ef4444'
  };

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h1 className="section-title" style={{ marginBottom: '30px', textAlign: 'center' }}>
        Attendance Management
      </h1>

      {/* Top error message for global issues */}
      {error && !facultySubject && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {facultySubject && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px',
          '@media (max-width: 968px)': {
            gridTemplateColumns: '1fr'
          }
        }}>
          {/* ─── LEFT COLUMN: Download Monthly Attendance ─── */}
          <div className="form-card" style={{ height: 'fit-content' }}>
            <h2 className="section-title" style={{ marginTop: '0' }}>Monthly Download</h2>

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
                {loading ? 'Generating...' : '📥 Download Report (CSV)'}
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

            {/* Error message for download */}
            {error && facultySubject && (
              <div className="alert alert-danger" style={{ marginTop: '15px' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success" style={{ marginTop: '15px' }}>
                {success}
              </div>
            )}
          </div>

          {/* ─── RIGHT COLUMN: Daily Analysis ─── */}
          <div className="form-card" style={{ height: 'fit-content' }}>
            <h2 className="section-title" style={{ marginTop: '0' }}>Daily Analysis</h2>

            <form onSubmit={handleDailyAnalysis} style={{ marginBottom: '20px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={analysisLoading}
                    className="form-control"
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={analysisLoading}
                    className="form-control"
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    disabled={analysisLoading}
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
                    disabled={analysisLoading}
                    className="form-select"
                  >
                    {standards.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={analysisLoading}
                style={{
                  marginTop: '15px',
                  width: '100%'
                }}
              >
                {analysisLoading ? '⏳ Loading...' : '📊 View Daily Analysis'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Daily Analysis Results (Full Width) ─── */}
      {dailyAnalysis && facultySubject && (
        <div style={{ marginTop: '40px' }}>
          {/* Analysis Header */}
          <div style={{
            padding: '20px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            border: '2px solid #0ea5e9',
            marginBottom: '30px'
          }}>
            <h2 style={{ margin: '0 0 15px 0', color: '#0369a1' }}>
              📊 Daily Attendance Analysis
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto auto auto auto',
              gap: '30px',
              fontSize: '14px'
            }}>
              <div><strong>Class:</strong> {formData.standard} - {formData.branch}</div>
              <div><strong>Subject:</strong> {facultySubject}</div>
              <div><strong>Total Students:</strong> {dailyAnalysis.totalStudentsInClass}</div>
              <div><strong>Date Range:</strong> {dailyAnalysis.summary.dateRange.start} to {dailyAnalysis.summary.dateRange.end}</div>
            </div>
          </div>

          {/* Daily Breakdown */}
          {dailyAnalysis.dailyBreakdown && dailyAnalysis.dailyBreakdown.length > 0 ? (
            <div>
              {dailyAnalysis.dailyBreakdown.map((day, idx) => {
                const chartData = [
                  { name: 'Present', value: day.presentCount, color: COLORS.present },
                  { name: 'Absent', value: day.absentCount, color: COLORS.absent }
                ];
                const totalMarked = day.presentCount + day.absentCount;
                const presentPercentage = totalMarked > 0 ? ((day.presentCount / totalMarked) * 100).toFixed(1) : 0;

                return (
                  <div
                    key={idx}
                    style={{
                      marginBottom: '30px',
                      padding: '25px',
                      backgroundColor: day.isWeekend ? '#fff3cd' : '#ffffff',
                      borderRadius: '12px',
                      border: `2px solid ${day.isWeekend ? '#ffc107' : '#ddd'}`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      transition: 'box-shadow 0.3s ease'
                    }}
                  >
                    {/* Date Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '18px',
                      paddingBottom: '12px',
                      borderBottom: '2px solid #e5e7eb'
                    }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                          📅 {day.date} - <span style={{ color: '#6b7280' }}>{day.dayOfWeek}</span>
                        </h3>
                      </div>
                      {day.isWeekend && (
                        <span style={{
                          padding: '6px 12px',
                          backgroundColor: '#ffc107',
                          color: '#000',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}>
                          🏖️ WEEKEND
                        </span>
                      )}
                    </div>

                    {/* Chart and Stats Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '200px 1fr',
                      gap: '30px',
                      marginBottom: '20px',
                      '@media (max-width: 768px)': {
                        gridTemplateColumns: '1fr'
                      }
                    }}>
                      {/* Donut Chart */}
                      {totalMarked > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <ResponsiveContainer width={200} height={200}>
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={90}
                                dataKey="value"
                                startAngle={90}
                                endAngle={450}
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{
                            marginTop: '10px',
                            textAlign: 'center',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#6b7280'
                          }}>
                            <div style={{ fontSize: '16px', color: '#1f2937', margin: '5px 0' }}>
                              {day.presentCount}/{totalMarked}
                            </div>
                            <div>{presentPercentage}% Present</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '150px',
                          color: '#9ca3af',
                          fontSize: '14px'
                        }}>
                          No data marked
                        </div>
                      )}

                      {/* Student Lists */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '20px'
                      }}>
                        {/* Present Students */}
                        <div style={{
                          padding: '15px',
                          backgroundColor: '#f0fdf4',
                          borderRadius: '8px',
                          border: '1px solid #bbf7d0'
                        }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#10b981',
                            marginBottom: '12px',
                            paddingBottom: '8px',
                            borderBottom: '2px solid #10b981'
                          }}>
                            ✓ Present ({day.presentCount})
                          </div>
                          {day.present && day.present.length > 0 ? (
                            renderStudentList(day.present, day.date, 'present')
                          ) : (
                            <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>No students marked present</p>
                          )}
                        </div>

                        {/* Absent Students */}
                        <div style={{
                          padding: '15px',
                          backgroundColor: '#fef2f2',
                          borderRadius: '8px',
                          border: '1px solid #fecaca'
                        }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#ef4444',
                            marginBottom: '12px',
                            paddingBottom: '8px',
                            borderBottom: '2px solid #ef4444'
                          }}>
                            ✗ Absent ({day.absentCount})
                          </div>
                          {day.absent && day.absent.length > 0 ? (
                            renderStudentList(day.absent, day.date, 'absent')
                          ) : (
                            <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>No students marked absent</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div style={{
                      marginTop: '15px',
                      paddingTop: '15px',
                      borderTop: '1px solid #e5e7eb',
                      fontSize: '13px',
                      color: '#6b7280',
                      fontWeight: '600'
                    }}>
                      Total Students Marked: <strong style={{ color: '#1f2937' }}>{totalMarked} / {dailyAnalysis.totalStudentsInClass}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              padding: '40px 20px',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              border: '2px solid #fcd34d',
              textAlign: 'center',
              color: '#92400e'
            }}>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                📭 No attendance data found for the selected date range
              </p>
            </div>
          )}

          {/* Summary Statistics Card */}
          {dailyAnalysis.summary && (
            <div style={{
              marginTop: '40px',
              padding: '25px',
              backgroundColor: '#f3f4f6',
              borderRadius: '12px',
              border: '2px solid #d1d5db'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '18px', fontWeight: '700' }}>
                📈 Overall Summary
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                <div style={{
                  padding: '15px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '5px' }}>Date Range</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2937' }}>
                    {dailyAnalysis.summary.dateRange.start} to {dailyAnalysis.summary.dateRange.end}
                  </div>
                </div>

                <div style={{
                  padding: '15px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '5px' }}>Total Students</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2937' }}>
                    {dailyAnalysis.summary.totalStudents}
                  </div>
                </div>

                <div style={{
                  padding: '15px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '5px' }}>Days Analyzed</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2937' }}>
                    {dailyAnalysis.summary.totalDays}
                  </div>
                </div>

                <div style={{
                  padding: '15px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ fontSize: '13px', color: '#059669', marginBottom: '5px' }}>Avg Present</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#10b981' }}>
                    {dailyAnalysis.summary.averagePresent} ({dailyAnalysis.summary.averagePercentage}%)
                  </div>
                </div>

                <div style={{
                  padding: '15px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #fecaca'
                }}>
                  <div style={{ fontSize: '13px', color: '#dc2626', marginBottom: '5px' }}>Avg Absent</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#ef4444' }}>
                    {dailyAnalysis.summary.averageAbsent}
                  </div>
                </div>

                <div style={{
                  padding: '15px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe'
                }}>
                  <div style={{ fontSize: '13px', color: '#0369a1', marginBottom: '5px' }}>Overall Rate</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#0ea5e9' }}>
                    {dailyAnalysis.summary.averagePercentage}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 968px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
        
        .form-control {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-control:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

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
