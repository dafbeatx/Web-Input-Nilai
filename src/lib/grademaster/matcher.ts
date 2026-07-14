import { findBestMatch } from 'string-similarity';

export function cleanText(text: string): string {
  if (!text) return '';
  // Remove punctuation, extra spaces, titles, and lower case
  return text
    .toLowerCase()
    .replace(/[.,]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchStudentName(rawExtractedName: string, studentList: string[]): string | null {
  if (!studentList || studentList.length === 0 || !rawExtractedName) return null;
  
  const cleanedExtract = cleanText(rawExtractedName);
  const cleanedList = studentList.map(name => cleanText(name));

  const match = findBestMatch(cleanedExtract, cleanedList);
  
  // A threshold of 0.4 balances safety against abbreviations like "MHD BUDI S" vs "Muhammad Budi Santoso"
  if (match.bestMatch.rating > 0.4) {
      return studentList[match.bestMatchIndex];
  }
  
  return null;
}

export function extractEntities(rawText: string, studentList: string[] = []) {
  const lines = rawText.split(/\r?\n/);
  
  let nameStr = '';
  let kelasStr = '';
  let tahunAjaranStr = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lLower = line.toLowerCase();
    
    // Process Name
    if (lLower.includes('nama')) {
       const parts = line.split(/[:=]/);
       if (parts.length > 1 && parts[1].trim().length > 0) {
           nameStr = parts[1].trim();
       } else {
           nameStr = line.replace(/nama/i, '').trim();
       }
    }
    
    // Process Kelas
    if (lLower.includes('kelas') && !kelasStr) {
       const parts = line.split(/[:=]/);
       if (parts.length > 1 && parts[1].trim().length > 0) {
           kelasStr = parts[1].trim();
       } else {
           kelasStr = line.replace(/kelas/i, '').trim();
       }
    }
    
    // Process Tahun Ajaran
    if (lLower.includes('tahun') || lLower.includes('ajaran')) {
       const parts = line.split(/[:=]/);
       if (parts.length > 1 && parts[1].trim().length > 0) {
           tahunAjaranStr = parts[1].trim();
       } else {
           const match = line.match(/\d{4}\/\d{4}/);
           if (match) tahunAjaranStr = match[0];
       }
    }
  }

  const matchedName = matchStudentName(nameStr, studentList) || nameStr;

  return {
    studentName: matchedName,
    studentClass: kelasStr,
    academicYear: tahunAjaranStr
  };
}
