import { studentAPI, attendanceAPI, resultAPI, facultyAPI } from './api';

export const studentData = {
  getStudents: async () => {
    const { data } = await studentAPI.getAll();
    return data;
  },

  addStudent: async (studentInfo) => {
    const { data } = await studentAPI.create(studentInfo);
    return data;
  },

  deleteStudent: async (studentId) => {
    await studentAPI.delete(studentId);
  },

  getStudentById: async (id) => {
    const { data } = await studentAPI.getById(id);
    return data;
  },

  getAttendance: async (studentId) => {
    try {
      if (!studentId) return [];
      const { data } = await attendanceAPI.getByStudent(studentId);
      const flatAttendance = [];
      data.forEach(record => {
        record.lectures?.forEach(lecture => {
          flatAttendance.push({
            date: record.date,
            time: lecture.time,
            subject: lecture.subject,
            status: lecture.status
          });
        });
      });
      return flatAttendance;
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }
  },

  setAttendance: async (studentId, date, status, time, subject) => {
    await attendanceAPI.mark({ studentId, date, status, time, subject });
  },

  getResults: async (studentId) => {
    try {
      if (!studentId) return [];
      const { data } = await resultAPI.getByStudent(studentId);
      return data || [];
    } catch (error) {
      console.error('Error fetching results:', error);
      return [];
    }
  },

  addResult: async (studentId, resultData) => {
    await resultAPI.create({ studentId, ...resultData });
  },

  deleteResult: async (studentId, resultId) => {
    await resultAPI.delete(studentId, resultId);
  },

  deleteAttendance: async (studentId, attendanceId) => {
    await attendanceAPI.delete(studentId, attendanceId);
  },

  getFaculties: async () => {
    try {
      const { data } = await facultyAPI.getAll();
      return data || [];
    } catch (error) {
      console.error('Error fetching faculties:', error);
      return [];
    }
  },

  addFaculty: async (facultyInfo) => {
    const { data } = await facultyAPI.create(facultyInfo);
    return data;
  },

  deleteFaculty: async (facultyId) => {
    await facultyAPI.delete(facultyId);
  }
};
