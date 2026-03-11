const Result = require('../models/Result');

// ─── GET results for a student ───────────────────────────────────────
// IDOR protection is handled by checkStudentOwnership middleware on routes.
exports.getByStudent = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    if (!studentId || !studentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.json([]);
    }

    const results = await Result.find({ studentId }).sort({ createdAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results.' });
  }
};

// ─── CREATE result ───────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { studentId, subject, marks, pdfFile, pdfFilename } = req.body;

    // ─── Input validation ────────────────────────────────────────
    if (!studentId || !String(studentId).match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }
    if (!subject || typeof subject !== 'string' || subject.length > 100) {
      return res.status(400).json({ error: 'Valid subject is required (max 100 chars).' });
    }
    const numericMarks = Number(marks);
    if (isNaN(numericMarks) || numericMarks < 0 || numericMarks > 100) {
      return res.status(400).json({ error: 'Marks must be a number between 0 and 100.' });
    }

    // ─── XSS prevention: validate pdfFile is actually a PDF data URI ─
    if (pdfFile) {
      if (typeof pdfFile !== 'string' || !pdfFile.startsWith('data:application/pdf;base64,')) {
        return res.status(400).json({ error: 'Invalid file format. Only base64-encoded PDF data URIs are allowed.' });
      }
      const sizeInBytes = (pdfFile.length * 3) / 4;
      const sizeInKB = sizeInBytes / 1024;
      if (sizeInKB > 500) {
        return res.status(400).json({ error: 'File size exceeds 500KB limit' });
      }
    }

    // Sanitize filename
    const safePdfFilename = pdfFilename
      ? pdfFilename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255)
      : null;

    const result = new Result({
      studentId,
      subject: subject.trim(),
      marks: numericMarks,
      pdfFile: pdfFile || null,
      pdfFilename: safePdfFilename,
      uploadedBy: req.user.id
    });
    await result.save();

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create result.' });
  }
};

// ─── DELETE result ───────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const resultId = req.params.id;
    if (!resultId || !resultId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid result ID.' });
    }

    const result = await Result.findById(resultId);
    if (!result) return res.status(404).json({ error: 'Result not found' });

    // Faculty can only delete results they uploaded; admin can delete any
    if (req.user.role === 'faculty' && String(result.uploadedBy) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You can only delete results you uploaded.' });
    }

    await Result.findByIdAndDelete(resultId);
    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete result.' });
  }
};
