const https = require('https');
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai"); // เรียกใช้ Gemini
const app = express();

// ==========================================
// ⚙️ ส่วนตั้งค่า (แก้ไขตรงนี้)
// ==========================================
const PORT = process.env.PORT || 3000;
const LINE_CHANNEL_ACCESS_TOKEN = '0EMq56jluzhgD6gnb+mwa2o2FONLkAIe2Dn6md1bWifdZSS1KL2lQnxBjKmH+IOq4Z1P5gBlesDXmXomQNCu/cQxmY06szlmA1nJO8AZmH5GpdR8EYg3zrixLDiA6RxWkEwe0R8y4BT4eo4CMYe3CwdB04t89/1O/w1cDnyilFU='; 
const GEMINI_API_KEY = 'AIzaSyAUyJNLbcUrLe1MU4SzXBmUJMCJkveyEHA'; // <--- ใส่ Key ตรงนี้
const BOT_NAME = 'Waterru';     // ชื่อบอท
// ==========================================

// ตั้งค่า Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// ใช้รุ่น gemini-1.5-flash (เร็วและฟรี)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendStatus(200);
});

app.post('/webhook', async function(req, res) {
    res.send('HTTP POST request sent to the webhook URL!');

    if (req.body.events && req.body.events.length > 0) {
        const event = req.body.events[0];

        if (event.type === 'message' && event.message.type === 'text') {
            const userMessage = event.message.text.trim();
            
            // 🔍 เช็คคำเรียกชื่อ (Case Insensitive)
            if (userMessage.toLowerCase().startsWith(BOT_NAME.toLowerCase())) {
                
                // ตัดชื่อบอทออก
                const msgForAI = userMessage.substring(BOT_NAME.length).trim();
                if (msgForAI === "") return;

                console.log(`ถาม Gemini: ${msgForAI}`);

                try {
                    // --- เรียก Gemini ---
                    // สั่ง Prompt กำกับภาษา
                    const prompt = "ตอบเป็นภาษาไทย สั้นกระชับ เป็นกันเอง: " + msgForAI;
                    
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const replyText = response.text();

                    console.log(`Gemini ตอบ: ${replyText}`);

                    // --- ส่งกลับ LINE ---
                    await replyToLine(event.replyToken, replyText);

                } catch (error) {
                    console.error("Gemini Error:", error);
                    // await replyToLine(event.replyToken, "ขอโทษครับ ระบบ Gemini ขัดข้องชั่วคราว");
                }
            }
        }
    }
});

// ฟังก์ชันส่งกลับ LINE (เหมือนเดิม)
async function replyToLine(replyToken, text) {
    const dataString = JSON.stringify({
        replyToken: replyToken,
        messages: [{ "type": "text", "text": text }]
    });

    const headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN
    };

    const webhookOptions = {
        hostname: "api.line.me",
        path: "/v2/bot/message/reply",
        method: "POST",
        headers: headers
    };

    return new Promise((resolve, reject) => {
        const request = https.request(webhookOptions, (res) => {
            res.on('data', () => {}); // ไม่ต้องปริ้นท์ log ขากลับของ LINE ก็ได้จะได้ไม่รก
            resolve();
        });
        request.on('error', (e) => reject(e));
        request.write(dataString);
        request.end();
    });
}

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`💎 Connected to Google Gemini`);
    console.log(`🤖 Waiting for call: "${BOT_NAME} ..."`);
});