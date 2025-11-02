// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// IMPORTANT: correct OpenAI client init (object with apiKey)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

// Cache for the interpreter content
let interpreterCode = '';

// Read and cache the interpreter code on startup
async function loadInterpreterCode() {
  try {
    interpreterCode = await fs.readFile(
      path.join(__dirname, 'jcScriptInterpreter.js'),
      'utf8'
    );
    console.log('[interpreter] loaded');
  } catch (error) {
    console.error('Error loading interpreter code:', error.message);
    interpreterCode = '// (interpreter not loaded)';
  }
}

loadInterpreterCode();

// Watch for changes in the interpreter file (same function, just debounced)
const watchPath = path.join(__dirname, 'jcScriptInterpreter.js');
let _watchTimer = null;
require('fs').watch(watchPath, (eventType) => {
  if (eventType !== 'change') return;
  clearTimeout(_watchTimer);
  _watchTimer = setTimeout(loadInterpreterCode, 150);
});

app.post('/api/fix-code', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing "code" string in body.' });
    }

    const systemPrompt = `You are a code fixing assistant for JcScript. You will be given code and need to fix any errors in it.

Here is the current interpreter implementation for reference:

${interpreterCode}

Rules:
- Only return the fixed code, nothing else
- Preserve the user's logic and intent
- Make minimal changes needed to fix the code
- Follow JcScript syntax and features
- If the code is already correct, return it unchanged`;

    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: code }
      ]
    });

    const fixedCode = response.choices?.[0]?.message?.content ?? code;
    res.json({ fixedCode });
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to fix code' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Missing "message" string in body.' });
    }

    const systemPrompt = `You are a helpful assistant for the JcScript programming language.

Here is the current interpreter implementation:

${interpreterCode}

Rules:
1. Only respond with JcScript code snippets that directly address the user's request and if they say something else reply differently.
2. If you do not know how to help with JcScript, respond with "I am sorry, but I do not have the information you need."`;

    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano', // use nano; no temperature override
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    });

    res.json({ response: response.choices?.[0]?.message?.content ?? '' });
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


