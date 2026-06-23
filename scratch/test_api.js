const url = 'https://web-input-nilai.vercel.app/api/grademaster/student-accounts?mode=claim';
fetch(url).then(res => res.json()).then(console.log).catch(console.error);
