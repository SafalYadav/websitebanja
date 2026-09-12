// src/lib/constants/mitraLanguages.ts

export type MitraLanguageId =
  | "English"
  | "Hindi"
  | "Hinglish"
  | "Bengali"
  | "Gujarati"
  | "Marathi"
  | "Tamil"
  | "Telugu"
  | "Kannada"
  | "Malayalam"
  | "Punjabi"
  | "Odia"
  | "Assamese"
  | "Urdu";

export interface MitraLanguageConfig {
  id: MitraLanguageId;
  code: string;
  name: string;
  nativeName: string;
  displayName: string;
  greeting: string;
  suggestedReplies: string[];
  systemDirective: string;
}

export const MITRA_LANGUAGES: Record<MitraLanguageId, MitraLanguageConfig> = {
  English: {
    id: "English",
    code: "en-IN",
    name: "English",
    nativeName: "English",
    displayName: "English",
    greeting:
      "Hey there! I'm Mitra, your AI Website Architect. What kind of business or website are you building today? Tell me your vision, or tap the mic and let's chat!",
    suggestedReplies: [
      "Specialty Coffee Cafe & Roastery",
      "Modern Fitness & CrossFit Gym",
      "Digital Marketing & Creative Agency",
      "Luxury Hair & Beauty Salon",
      "Doctor / Dental Healthcare Clinic",
    ],
    systemDirective:
      'Reply in natural, friendly, fluent English. Keep tone energetic and supportive.',
  },
  Hindi: {
    id: "Hindi",
    code: "hi-IN",
    name: "Hindi",
    nativeName: "हिन्दी",
    displayName: "हिन्दी (Hindi)",
    greeting:
      "नमस्ते! मैं मित्रा हूँ, आपकी AI Website Architect। आज आप किस तरह की वेबसाइट या बिज़नेस बना रहे हैं? अपनी सोच मुझे बताइए, या माइक दबाकर मुझसे बात कीजिए!",
    suggestedReplies: [
      "स्पेशलिटी कॉफी कैफ़े व रोस्टरी",
      "मॉडर्न फिटनेस व जिम",
      "डिजिटल मार्केटिंग एजेंसी",
      "लक्ज़री हेयर व ब्यूटी सैलून",
      "डेंटल व हेल्थकेयर क्लिनिक",
    ],
    systemDirective:
      'Reply in natural, polite conversational Hindi using Devanagari script. Keep tone warm and encouraging.',
  },
  Hinglish: {
    id: "Hinglish",
    code: "en-IN",
    name: "Hinglish",
    nativeName: "Hinglish",
    displayName: "Hinglish (Hindi in Roman script)",
    greeting:
      "Hey! Main Mitra hoon, aapki AI Website Architect. Aaj aap kis type ki website ya business bana rahe hain? Apna idea mujhe bataiye, ya mic tap karke mujhse baat kijiye!",
    suggestedReplies: [
      "Specialty Coffee Cafe & Roastery",
      "Modern Fitness & Gym",
      "Digital Marketing Agency",
      "Luxury Hair & Beauty Salon",
      "Dental & Healthcare Clinic",
    ],
    systemDirective:
      'Reply in friendly, modern conversational Hinglish using standard Roman/English script. Blend Hindi words naturally with English.',
  },
  Bengali: {
    id: "Bengali",
    code: "bn-IN",
    name: "Bengali",
    nativeName: "বাংলা",
    displayName: "বাংলা (Bengali)",
    greeting:
      "নমস্কার! আমি মিত্রা, আপনার AI Website Architect। আজ আপনি কোন ধরনের ব্যবসা বা ওয়েবসাইটের পরিকল্পনা করছেন? আমাকে জানান, অথবা মাইকে ট্যাপ করে কথা বলুন!",
    suggestedReplies: [
      "স্পেশালিটি কফি ক্যাফে",
      "মডার্ন ফিটনেস ও জিম",
      "ডিজিটাল মার্কেটিং এজেন্সি",
      "বিউটি পার্লার ও সেলুন",
      "ডেন্টাল ও হেলথকেয়ার ক্লিনিক",
    ],
    systemDirective:
      'Reply in natural, polite conversational Bengali using Bengali script. Keep tone professional and encouraging.',
  },
  Gujarati: {
    id: "Gujarati",
    code: "gu-IN",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    displayName: "ગુજરાતી (Gujarati)",
    greeting:
      "નમસ્તે! હું મિત્રા છું, તમારી AI Website Architect. આજે તમે કેવા પ્રકારની વેબસાઇટ અથવા બિઝનેસ બનાવી રહ્યા છો? તમારો વિચાર મને જણાવો, અથવા માઇક દબાવીને મારી સાથે વાત કરો!",
    suggestedReplies: [
      "સ્પેશિયાલિટી કોફી કાફે",
      "મોડર્ન ફિટનેસ અને જિમ",
      "ડિજિટલ માર્કેટિંગ એજન્સી",
      "લક્ઝરી હેર અને બ્યુટી સલૂન",
      "ડેન્ટલ અને હેલ્થકેર ક્લિનિક",
    ],
    systemDirective:
      'Reply in polite, natural conversational Gujarati using Gujarati script.',
  },
  Marathi: {
    id: "Marathi",
    code: "mr-IN",
    name: "Marathi",
    nativeName: "मराठी",
    displayName: "मराठी (Marathi)",
    greeting:
      "नमस्कार! मी मित्रा, तुमची AI Website Architect. आज तुम्ही कोणत्या व्यवसायासाठी किंवा प्रोजेक्टसाठी वेबसाइट बनवू इच्छिता? मला सांगा, किंवा माइकवर टॅप करून माझ्याशी बोला!",
    suggestedReplies: [
      "कॉफी कॅफे आणि रेस्टॉरंट",
      "आधुनिक फिटनेस व जिम",
      "डिजिटल मार्केटिंग एजन्सी",
      "हेअर व ब्युटी सलून",
      "डेंटल व हेल्थकेअर क्लिनिक",
    ],
    systemDirective:
      'Reply in polite, natural conversational Marathi using Devanagari script.',
  },
  Tamil: {
    id: "Tamil",
    code: "ta-IN",
    name: "Tamil",
    nativeName: "தமிழ்",
    displayName: "தமிழ் (Tamil)",
    greeting:
      "வணக்கம்! நான் மித்ரா, உங்கள் AI Website Architect. இன்று நீங்கள் எந்த வகையான வணிக வலைத்தளத்தை உருவாக்க விரும்புகிறீர்கள்? என்னிடம் கூறுங்கள், அல்லது மைக்கை அழுத்திப் பேசுங்கள்!",
    suggestedReplies: [
      "காபி கஃபே & உணவகம்",
      "ஃபிட்னஸ் ஜிம் & யோகா",
      "டிஜிட்டல் மார்க்கெட்டிங்",
      "பியூட்டி சலூன் & ஸ்பா",
      "மருத்துவமனை & பல் மருத்துவமனை",
    ],
    systemDirective:
      'Reply in polite, natural conversational Tamil using Tamil script.',
  },
  Telugu: {
    id: "Telugu",
    code: "te-IN",
    name: "Telugu",
    nativeName: "తెలుగు",
    displayName: "తెలుగు (Telugu)",
    greeting:
      "నమస్కారం! నేను మిత్ర, మీ AI Website Architect. ఈరోజు మీరు ఏ వ్యాపారం లేదా ప్రాజెక్ట్ కోసం వెబ్‌సైట్ నిర్మించాలనుకుంటున్నారు? నాతో చెప్పండి, లేదా మైక్ నొక్కి మాట్లాడండి!",
    suggestedReplies: [
      "కాఫీ కేఫ్ & రెస్టారెంట్",
      "ఫిట్‌నెస్ జిమ్ & వెల్‌నెస్",
      "డిజిటల్ మార్కెటింగ్ ఏజెన్సీ",
      "బ్యూటీ సెలూన్ & స్పా",
      "డెంటల్ & హెల్త్‌కేర్ క్లినిక్",
    ],
    systemDirective:
      'Reply in polite, natural conversational Telugu using Telugu script.',
  },
  Kannada: {
    id: "Kannada",
    code: "kn-IN",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    displayName: "ಕನ್ನಡ (Kannada)",
    greeting:
      "ನಮಸ್ಕಾರ! ನಾನು ಮಿತ್ರ, ನಿಮ್ಮ AI Website Architect. ಇಂದು ನೀವು ಯಾವ ವ್ಯಾಪಾರ ಅಥವಾ ವೆಬ್‌ಸೈಟ್ ರಚಿಸಲು ಬಯಸುತ್ತೀರಿ? ನಿಮ್ಮ ಕಲ್ಪನೆಯನ್ನು ತಿಳಿಸಿ, ಅಥವಾ ಮೈಕ್ ಒತ್ತಿ ನನ್ನೊಂದಿಗೆ ಮಾತನಾಡಿ!",
    suggestedReplies: [
      "ಕಾಫಿ ಕೆಫೆ & ಬೇಕರಿ",
      "ಫಿಟ್ನೆಸ್ ಜಿಮ್ & ಕ್ಲಬ್",
      "ಡಿಜಿಟಲ್ ಮಾರ್ಕೆಟಿಂಗ್ ಸಂಸ್ಥೆ",
      "ಬ್ಯೂಟಿ ಸಲೂನ್ & ಸ್ಪಾ",
      "ಡೆಂಟಲ್ & ಹೆಲ್ತ್‌ಕೇರ್ ಕ್ಲಿನಿಕ್",
    ],
    systemDirective:
      'Reply in polite, natural conversational Kannada using Kannada script.',
  },
  Malayalam: {
    id: "Malayalam",
    code: "ml-IN",
    name: "Malayalam",
    nativeName: "മലയാളം",
    displayName: "മലയാളം (Malayalam)",
    greeting:
      "നമസ്കാരം! ഞാൻ മിത്ര, നിങ്ങളുടെ AI Website Architect. ഇന്ന് നിങ്ങൾ ഏത് തരത്തിലുള്ള ബിസിനസ്സ് വെബ്‌സൈറ്റാണ് നിർമ്മിക്കാൻ ആഗ്രഹിക്കുന്നത്? എന്നോട് പറയൂ, അല്ലെങ്കിൽ മൈക്ക് ടാപ്പ് ചെയ്ത് സംസാരിക്കൂ!",
    suggestedReplies: [
      "കോഫി കഫേ & റെസ്റ്റോറന്റ്",
      "ഫിറ്റ്നസ് ജിം & യോഗ",
      "ഡിജിറ്റൽ മാർക്കറ്റിംഗ് ഏജൻസി",
      "ബ്യൂട്ടി സലൂൺ & സ്പാ",
      "ഡെന്റൽ & ഹെൽത്ത് കെയർ ക്ലിനിക്ക്",
    ],
    systemDirective:
      'Reply in polite, natural conversational Malayalam using Malayalam script.',
  },
  Punjabi: {
    id: "Punjabi",
    code: "pa-IN",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    displayName: "ਪੰਜਾਬੀ (Punjabi)",
    greeting:
      "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਮਿੱਤਰਾ ਹਾਂ, ਤੁਹਾਡਾ AI Website Architect। ਅੱਜ ਤੁਸੀਂ ਕਿਸ ਤਰ੍ਹਾਂ ਦੇ ਕਾਰੋਬਾਰ ਜਾਂ ਵੈੱਬਸਾਈਟ ਬਣਾਉਣੀ ਚਾਹੁੰਦੇ ਹੋ? ਆਪਣੀ ਸੋਚ ਦੱਸੋ, ਜਾਂ ਮਾਈਕ ਦਬਾ ਕੇ ਗੱਲ ਕਰੋ!",
    suggestedReplies: [
      "ਕੌਫੀ ਕੈਫੇ ਤੇ ਬੇਕਰੀ",
      "ਮਾਡਰਨ ਫਿਟਨੈਸ ਤੇ ਜਿੰਮ",
      "ਡਿਜੀਟਲ ਮਾਰਕੀਟਿੰਗ ਏਜੰਸੀ",
      "ਬਿਊਟੀ ਸੈਲੂਨ ਤੇ ਸਪਾ",
      "ਡੈਂਟਲ ਤੇ ਹੈਲਥਕੇਅਰ ਕਲੀਨਿਕ",
    ],
    systemDirective:
      'Reply in polite, natural conversational Punjabi using Gurmukhi script.',
  },
  Odia: {
    id: "Odia",
    code: "or-IN",
    name: "Odia",
    nativeName: "ଓଡ଼ିଆ",
    displayName: "ଓଡ଼ିଆ (Odia)",
    greeting:
      "ନମସ୍କାର! ମୁଁ ମିତ୍ରା, ଆପଣଙ୍କ AI Website Architect। ଆଜି ଆପଣ କେଉଁ ପ୍ରକାରର ବ୍ୟବସାୟ ବା ୱେବସାଇଟ୍ ତିଆରି କରିବାକୁ ଚାହୁଁଛନ୍ତି? ମୋତେ ଜଣାନ୍ତୁ, କିମ୍ବା ମାଇକ୍ ଟ୍ୟାପ୍ କରି କଥା ହୁଅନ୍ତୁ!",
    suggestedReplies: [
      "କଫି କାଫେ ଓ ବେକେରୀ",
      "ମଡର୍ଣ୍ଣ ଫିଟନେସ୍ ଓ ଜିମ୍",
      "ଡିଜିଟାଲ୍ ମାର୍କେଟିଂ ଏଜେନ୍ସି",
      "ବ୍ୟୁଟି ସେଲୁନ୍ ଓ ସ୍ପା",
      "ଡେଣ୍ଟାଲ୍ ଓ ହେଲଥକେୟାର କ୍ଲିନିକ୍",
    ],
    systemDirective:
      'Reply in polite, natural conversational Odia using Odia script.',
  },
  Assamese: {
    id: "Assamese",
    code: "as-IN",
    name: "Assamese",
    nativeName: "অসমীয়া",
    displayName: "অসমীয়া (Assamese)",
    greeting:
      "নমস্কাৰ! মই মিত্ৰা, আপোনাৰ AI Website Architect। আজি আপুনি কি ধৰণৰ ব্যৱসায় বা ৱেবছাইট তৈয়াৰ কৰিব বিচাৰিছে? মোক কওক, বা মাইকত টিপি কথা পাতক!",
    suggestedReplies: [
      "কফি কাফে আৰু বেকাৰী",
      "মডাৰ্ণ ফিটনেছ আৰু জিম",
      "ডিজিটেল মাৰ্কেটিং এজেন্সি",
      "বিউটি চেলুন আৰু স্পা",
      "ডেণ্টেল আৰু হেল্থকেয়াৰ ক্লিনিক",
    ],
    systemDirective:
      'Reply in polite, natural conversational Assamese using Assamese script.',
  },
  Urdu: {
    id: "Urdu",
    code: "ur-IN",
    name: "Urdu",
    nativeName: "اردو",
    displayName: "اردو (Urdu)",
    greeting:
      "ہیلو! میں مترا ہوں، آپ کا AI Website Architect۔ آج آپ کس قسم کے کاروبار یا ویب سائٹ کی تیاری کر رہے ہیں؟ مجھے بتائیں، یا مائیک دباکر بات کریں!",
    suggestedReplies: [
      "کافی کیفے اور ریسٹورنٹ",
      "ماڈرن فٹنس اور جم",
      "ڈیجیٹل مارکیٹنگ ایجنسی",
      "بیوٹی سیلون اور سپا",
      "ڈینٹل اور ہیلتھ کیئر کلینک",
    ],
    systemDirective:
      'Reply in polite, natural conversational Urdu using Urdu script.',
  },
};

export const MITRA_LANGUAGE_LIST: MitraLanguageConfig[] = Object.values(MITRA_LANGUAGES);

export const DEFAULT_MITRA_LANGUAGE: MitraLanguageConfig = MITRA_LANGUAGES.English;

export function getMitraLanguageConfig(id?: string): MitraLanguageConfig {
  if (id && id in MITRA_LANGUAGES) {
    return MITRA_LANGUAGES[id as MitraLanguageId];
  }
  return DEFAULT_MITRA_LANGUAGE;
}
