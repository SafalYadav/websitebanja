// src/lib/constants/indianLanguages.ts

export interface IndianLanguage {
  code: string;
  name: string;
  nativeName: string;
  greeting: string;
}

export const SUPPORTED_INDIAN_LANGUAGES: IndianLanguage[] = [
  {
    code: "en-IN",
    name: "English (India)",
    nativeName: "English / Hinglish",
    greeting: "Hey there! I'm Mitra, your AI Website Architect. What kind of business or website are you building today? Tell me your vision, or tap the mic and let's chat!",
  },
  {
    code: "hi-IN",
    name: "Hindi",
    nativeName: "हिन्दी",
    greeting: "नमस्ते! मैं मित्रा हूँ, आपकी AI वेबसाइट आर्किटेक्ट। आज आप किस तरह का बिजनेस या वेबसाइट बनाना चाहते हैं?",
  },
  {
    code: "bn-IN",
    name: "Bengali",
    nativeName: "বাংলা",
    greeting: "নমস্কার! আমি মিত্রা, আপনার AI ওয়েবসাইট আর্কিটেক্ট। আপনি কোন ধরনের ব্যবসার জন্য ওয়েবসাইট তৈরি করতে চান?",
  },
  {
    code: "ta-IN",
    name: "Tamil",
    nativeName: "தமிழ்",
    greeting: "வணக்கம்! நான் மித்ரா, உங்கள் AI வலைத்தள வடிவமைப்பாளர். இன்று நீங்கள் எந்த வகையான வணிக வலைத்தளத்தை உருவாக்க விரும்புகிறீர்கள்?",
  },
  {
    code: "te-IN",
    name: "Telugu",
    nativeName: "తెలుగు",
    greeting: "నమస్కారం! నేను మిత్ర, మీ AI వెబ్‌సైట్ ఆర్కిటెక్ట్. ఈరోజు మీరు ఏ వ్యాపారం కోసం వెబ్‌సైట్ నిర్మించాలనుకుంటున్నారు?",
  },
  {
    code: "mr-IN",
    name: "Marathi",
    nativeName: "मराठी",
    greeting: "नमस्कार! मी मित्रा, तुमची AI वेबसाइट आर्किटेक्ट. आज तुम्ही कोणत्या व्यवसायासाठी वेबसाइट तयार करू इच्छिता?",
  },
  {
    code: "gu-IN",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    greeting: "નમસ્તે! હું મિત્રા છું, તમારી AI વેબસાઇટ આર્કિટેક્ટ. આજે તમે કયા વ્યવસાય માટે વેબસાઇટ બનાવવા માંગો છો?",
  },
  {
    code: "kn-IN",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    greeting: "ನಮಸ್ಕಾರ! ನಾನು ಮಿತ್ರ, ನಿಮ್ಮ AI ವೆಬ್‌ಸೈಟ್ ಆರ್ಕಿಟೆಕ್ಟ್. ಇಂದು ನೀವು ಯಾವ ವ್ಯವಹಾರಕ್ಕಾಗಿ ವೆಬ್‌ಸೈಟ್ ರಚಿಸಲು ಬಯસುತ್ತೀರಿ?",
  },
  {
    code: "ml-IN",
    name: "Malayalam",
    nativeName: "മലയാളം",
    greeting: "നമസ്കാരം! ഞാൻ മിത്ര, നിങ്ങളുടെ AI വെബ്‌സൈറ്റ് ആർക്കിടെക്റ്റ്. ഇന്ന് നിങ്ങൾ ഏത് തരത്തിലുള്ള ബിസിനസ്സ് വെബ്‌സൈറ്റാണ് നിർമ്മിക്കാൻ ആഗ്രഹിക്കുന്നത്?",
  },
  {
    code: "pa-IN",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    greeting: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਮਿੱਤਰਾ ਹਾਂ, ਤੁਹਾਡਾ AI ਵੈੱਬਸਾਈਟ ਆਰਕੀਟੈਕਟ। ਅੱਜ ਤੁਸੀਂ ਕਿਸ ਤਰ੍ਹਾਂ ਦੇ ਕਾਰੋਬਾਰ ਲਈ ਵੈੱਬਸਾਈਟ ਬਣਾਉਣੀ ਚਾਹੁੰਦੇ ਹੋ?",
  },
];

export const DEFAULT_LANGUAGE = SUPPORTED_INDIAN_LANGUAGES[0];
