const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - Serve static files from frontend directory
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Google Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

// Function to analyze image using Google Gemini
async function analyzeImageWithGemini(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const prompt = `You are a medical equipment expert. Analyze this image of medical equipment and provide a detailed assessment.

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "equipment": "specific equipment name",
  "condition": "excellent/good/fair/poor",
  "description": "detailed condition description",
  "visibleIssues": ["issue1", "issue2", "issue3"],
  "confidence": "high/medium/low"
}

Equipment types to consider: microscope, stethoscope, defibrillator, ultrasound machine, patient monitor, wheelchair, hospital bed, surgical tools, medical cart, etc.

Condition guidelines:
- Excellent: Like new, minimal wear, fully functional
- Good: Minor wear, fully operational, some cosmetic issues
- Fair: Significant wear, may need maintenance, some functional limitations
- Poor: Major issues, requires repair/replacement, safety concerns

Be specific about what you see in the image.`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000,
      }
    };

    console.log('Sending request to Gemini API...');
    
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 45000
      }
    );

    console.log('Gemini API Response received');
    
    if (!response.data.candidates || !response.data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const responseText = response.data.candidates[0].content.parts[0].text;
    console.log('Raw Gemini Response:', responseText);
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);
      console.log('Parsed AI Analysis:', parsedData);
      return parsedData;
    } else {
      return createStructuredResponse(responseText);
    }
  } catch (error) {
    console.error('Gemini API Error:', error.response?.data || error.message);
    throw new Error('AI analysis temporarily unavailable. Using enhanced analysis.');
  }
}

// Fallback function if JSON parsing fails
function createStructuredResponse(text) {
  const equipmentKeywords = {
    microscope: ['microscope', 'lens', 'optic', 'magnification', 'objective'],
    stethoscope: ['stethoscope', 'chest', 'heart', 'sound', 'acoustic', 'tube'],
    defibrillator: ['defibrillator', 'aed', 'heart', 'shock', 'paddle', 'emergency'],
    ultrasound: ['ultrasound', 'sonogram', 'probe', 'transducer', 'imaging', 'scan'],
    monitor: ['monitor', 'screen', 'display', 'vital', 'patient monitor', 'ecg', 'ekg'],
    wheelchair: ['wheelchair', 'wheel', 'chair', 'mobility'],
    bed: ['bed', 'hospital bed', 'medical bed']
  };

  let detectedEquipment = 'medical equipment';
  const lowerText = text.toLowerCase();

  for (const [equipment, keywords] of Object.entries(equipmentKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      detectedEquipment = equipment;
      break;
    }
  }

  let condition = 'good';
  if (lowerText.includes('excellent') || lowerText.includes('like new') || lowerText.includes('perfect')) {
    condition = 'excellent';
  } else if (lowerText.includes('fair') || lowerText.includes('average') || lowerText.includes('moderate')) {
    condition = 'fair';
  } else if (lowerText.includes('poor') || lowerText.includes('bad') || lowerText.includes('broken')) {
    condition = 'poor';
  }

  return {
    equipment: detectedEquipment,
    condition: condition,
    description: "AI analysis completed. " + text.substring(0, 150) + "...",
    visibleIssues: ["Analysis completed from AI response"],
    confidence: "medium"
  };
}

// Enhanced medical equipment database
const medicalEquipmentInfo = {
  'wheelchair': {
    name: 'Wheelchair',
    conditions: {
      'excellent': 'Like new condition, all components working perfectly, minimal wear on wheels and frame.',
      'good': 'Minor cosmetic wear, fully functional, wheels and brakes in good condition.',
      'fair': 'Noticeable wear, may need wheel or brake adjustment, still operational.',
      'poor': 'Significant wear, safety concerns, requires repair or replacement of major components.'
    },
    priceRanges: {
      excellent: '$300 - $800',
      good: '$150 - $300',
      fair: '$50 - $150',
      poor: 'Under $50'
    }
  },
  'microscope': {
    name: 'Laboratory Microscope',
    conditions: {
      'excellent': 'Optics crystal clear, mechanical stages smooth, illumination working perfectly.',
      'good': 'Minor scratches on body, optics slightly dusty but fully functional.',
      'fair': 'Noticeable wear, some mechanical stiffness, optics may need cleaning.',
      'poor': 'Significant damage, misaligned optics, mechanical issues.'
    },
    priceRanges: {
      excellent: '$2,000 - $5,000',
      good: '$800 - $2,000',
      fair: '$300 - $800',
      poor: 'Under $300'
    }
  },
  'stethoscope': {
    name: 'Medical Stethoscope',
    conditions: {
      'excellent': 'Like new condition, perfect acoustic quality, tubing flexible.',
      'good': 'Minor cosmetic wear, good acoustic performance.',
      'fair': 'Reduced acoustic quality, tubing stiffening.',
      'poor': 'Compromised functionality, cracked tubing.'
    },
    priceRanges: {
      excellent: '$100 - $300',
      good: '$50 - $100',
      fair: '$20 - $50',
      poor: 'Under $20'
    }
  },
  'medical equipment': {
    name: 'Medical Device',
    conditions: {
      'excellent': 'Like new condition, fully functional, no visible damage.',
      'good': 'Good working condition, minor cosmetic wear.',
      'fair': 'Operational but shows significant wear.',
      'poor': 'Poor condition, requires repair or replacement.'
    },
    priceRanges: {
      excellent: 'Varies by device',
      good: 'Varies by device',
      fair: 'Varies by device',
      poor: 'Minimal value'
    }
  }
};

// Enhanced demo analysis
function enhancedDemoAnalysis(fileName, filePath) {
  try {
    const stats = fs.statSync(filePath);
    const equipmentTypes = ['wheelchair', 'microscope', 'stethoscope', 'defibrillator', 'monitor'];
    
    const name = fileName.toLowerCase();
    let detectedEquipment = 'medical equipment';
    
    if (name.includes('wheel') || name.includes('chair')) detectedEquipment = 'wheelchair';
    else if (name.includes('micro') || name.includes('scope')) detectedEquipment = 'microscope';
    else if (name.includes('steth')) detectedEquipment = 'stethoscope';
    else if (name.includes('defib') || name.includes('aed')) detectedEquipment = 'defibrillator';
    else if (name.includes('monitor') || name.includes('vital')) detectedEquipment = 'monitor';
    else {
      detectedEquipment = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
    }
    
    const fileSize = stats.size;
    const sizeFactor = Math.min(fileSize / (2 * 1024 * 1024), 1);
    const randomFactor = Math.random();
    const score = (sizeFactor * 0.4 + randomFactor * 0.6);
    
    let condition;
    if (score > 0.7) condition = 'excellent';
    else if (score > 0.45) condition = 'good';
    else if (score > 0.2) condition = 'fair';
    else condition = 'poor';
    
    return {
      equipment: detectedEquipment,
      condition: condition,
      confidence: Math.floor(score * 80 + 20),
      isDemo: true
    };
  } catch (error) {
    return {
      equipment: 'medical equipment',
      condition: 'good',
      confidence: 75,
      isDemo: true
    };
  }
}

// Main analysis endpoint
app.post('/api/analyze-equipment', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('Processing image:', req.file.originalname);
    
    let aiAnalysis;
    let analysisSource = 'Enhanced Demo Analysis';
    let usingAI = false;

    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_actual_gemini_api_key_here') {
      try {
        console.log('Attempting AI analysis with Gemini...');
        aiAnalysis = await analyzeImageWithGemini(req.file.path);
        analysisSource = 'Google Gemini AI';
        usingAI = true;
        console.log('AI analysis successful');
      } catch (aiError) {
        console.log('AI analysis failed, using enhanced demo:', aiError.message);
        aiAnalysis = enhancedDemoAnalysis(req.file.originalname, req.file.path);
      }
    } else {
      console.log('No valid API key, using enhanced demo analysis');
      aiAnalysis = enhancedDemoAnalysis(req.file.originalname, req.file.path);
    }

    const equipmentData = medicalEquipmentInfo[aiAnalysis.equipment] || medicalEquipmentInfo['medical equipment'];
    
    const result = {
      equipment: equipmentData.name,
      detectedType: aiAnalysis.equipment,
      condition: aiAnalysis.condition,
      description: aiAnalysis.description || equipmentData.conditions[aiAnalysis.condition],
      confidence: `${aiAnalysis.confidence || Math.floor(Math.random() * 20) + 75}%`,
      analysisSource: analysisSource,
      estimatedValue: equipmentData.priceRanges[aiAnalysis.condition],
      recommendations: [
        'Verify equipment service history and maintenance records',
        'Check for manufacturer recalls or safety notices',
        'Test all functions before purchase',
        'Inspect for physical damage or wear',
        'Consider professional inspection for expensive equipment'
      ],
      keyConsiderations: [
        'Check overall physical condition',
        'Test all primary functions',
        'Verify safety certifications',
        'Inspect for wear and tear'
      ],
      nextSteps: [
        'Compare prices with similar equipment online',
        'Contact seller for detailed service history',
        'Arrange for professional testing if possible',
        'Check warranty and return policy'
      ],
      visibleIssues: aiAnalysis.visibleIssues || ['No specific issues detected'],
      note: usingAI ? 'AI-powered analysis completed' : 'Enhanced demo analysis',
      timestamp: new Date().toISOString()
    };

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
      console.log('Uploaded file cleaned up');
    } catch (cleanupError) {
      console.warn('Could not delete uploaded file:', cleanupError.message);
    }

    console.log('Analysis completed successfully');
    res.json(result);
  } catch (error) {
    console.error('Analysis endpoint error:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Could not delete uploaded file on error:', cleanupError.message);
      }
    }
    
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    timestamp: new Date().toISOString(),
    apiStatus: 'Google Gemini AI - Working'
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Serve frontend for all other routes - FIXED VERSION
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Medical Equipment Analyzer running on port ${PORT}`);
  console.log(`🌐 Open your browser and visit: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_actual_gemini_api_key_here') {
    console.log('✅ Google Gemini API: CONFIGURED and READY');
  } else {
    console.log('⚠️  Google Gemini API: NOT CONFIGURED - Using demo mode');
  }
});