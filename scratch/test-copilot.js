// scratch/test-copilot.js
const fetch = require('node-fetch');

async function testCopilotAPI() {
  console.log("=== STARTING AI COPILOT ENDPOINT TEST ===");
  const API_ENDPOINT = 'http://localhost:3001/api/grademaster/copilot';

  const testPayloads = [
    {
      description: "Teacher trying to input class grades",
      payload: {
        message: "Saya ingin memasukkan nilai ujian siswa kelas 7A",
        history: [],
        role: "teacher",
        currentLayer: "home",
        studentClass: "7A"
      }
    },
    {
      description: "Student trying to start remedial test",
      payload: {
        message: "Di mana saya bisa memulai remedial saya?",
        history: [],
        role: "student",
        currentLayer: "dashboard"
      }
    },
    {
      description: "Guest asking about the system features",
      payload: {
        message: "Apa saja fitur utama di GradeMaster OS?",
        history: [],
        role: "guest",
        currentLayer: "student_login"
      }
    }
  ];

  for (const { description, payload } of testPayloads) {
    console.log(`\n-----------------------------------------`);
    console.log(`Testing Case: ${description}`);
    console.log(`Payload Sent:`, JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log(`Response Status: ${response.status}`);
      const data = await response.json();

      if (response.ok) {
        console.log("🟢 SUCCESS: Received correct response structure!");
        console.log("Reply:\n", data.reply);
        console.log("Suggested Actions:", data.suggestedActions);
        console.log("Suggested Questions:", data.suggestedQuestions);
      } else {
        console.log("🔴 FAILED: API returned error code.");
        console.log("Error details:", data);
      }
    } catch (err) {
      console.error("❌ EXCEPTION:", err.message);
    }
  }

  console.log(`\n=========================================`);
  console.log("=== AI COPILOT TEST RUN COMPLETED ===");
}

testCopilotAPI();
