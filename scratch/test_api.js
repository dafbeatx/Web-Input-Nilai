async function test() {
  try {
    // Just fetch some name, maybe it works, maybe it doesn't. 
    // We can fetch from API endpoint that returns students.
    const res = await fetch(`http://localhost:3000/api/grademaster/students/summary?name=Jane%20Doe&year=2025/2026`);
    const data = await res.json();
    console.log("Summary Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
