export const ZODIAC_MAPS = {
  "Hebrew": {"Rat":292, "Ox":506, "Tiger":142, "Rabbit":653, "Dragon":510, "Snake":358, "Horse":126, "Goat":77, "Monkey":186, "Rooster":336, "Dog": 52, "Pig":225},
  "Ancient Greek": {"Rat":640, "Ox":672, "Tiger":623, "Rabbit":470, "Dragon":975, "Snake":780, "Horse":440, "Goat":71, "Monkey":397, "Rooster":1256, "Dog": 1270, "Pig":800},
  "Arabic": {"Rat":281, "Ox": 706, "Tiger": 290, "Rabbit": 253, "Dragon": 510, "Snake": 23, "Horse": 149, "Goat": 117, "Monkey": 304, "Rooster": 34, "Dog": 52, "Pig": 867}, 
  "Sanskrit": {"Rat": 165, "Ox": 424, "Tiger": 414, "Rabbit": 155, "Dragon": 30, "Snake": 127, "Horse": 45, "Goat": 8, "Monkey": 11, "Rooster": 111, "Dog": 27, "Pig": 824}
};

export const ZODIAC_NAMES = {
  "Hebrew": {"Rat": "עַכְבָּר", "Ox":"שׁוֹר", "Tiger":"חִדֶּקֶל", "Rabbit":"אַרְנֶבֶת", "Dragon":"תַנִּין", "Snake":"נָחָשׁ", "Horse":"סוס", "Goat":"עֵז", "Monkey":"קוף", "Rooster":"שֶׂכְוִי", "Dog":"כֶּלֶב", "Pig":"חזיר"},
  "Ancient Greek": {"Rat": "μῦς", "Ox":"βοῦς", "Tiger":"Τίγρις", "Rabbit":"κόνικλος", "Dragon":"δράκων", "Snake":"ὄφις", "Horse":"ἵππος", "Goat":"αἴξ", "Monkey":"πίθηκος", "Rooster":"ἀλέκτωρ", "Dog":"Κύων", "Pig":"σῦς"},
  "Arabic": {"Rat": "فَأْر", "Ox": "ثَوْر", "Tiger": "نَمِر", "Rabbit": "أَرْنَب", "Dragon": "تِنِّين", "Snake": "حَيَّة", "Horse": "حِصَان", "Goat": "مَاعِز", "Monkey": "قِرْد", "Rooster": "دِيك", "Dog": "كَلْب", "Pig": "خِنْزِير"},
  "Sanskrit": {"Rat": "मूषकम्", "Ox": "वृषभम्", "Tiger": "व्याघ्रम्", "Rabbit": "शशकम्", "Dragon": "नागम्", "Snake": "सर्पम्", "Horse": "अश्वम्", "Goat": "अजम्", "Monkey": "कपिम्", "Rooster": "कुक्कुटम्", "Dog": "सरम्", "Pig": "वराहम्"}
};
// Rat seems to be correct for Hebrew, Ancient Greek, Arabic, Sanskrit
// Arabic: دِجْلَة= 437 (Tigris River)
// For Ox (Arabic)-> 1 remainder 6th value 90.9% (gold); if 8 is separate for κ = 8πG/c⁴ (68: 1 sigma)
// Sanskrit: "Rooster,कृकवाकुम्": 14121,

export const EQUATION_SETS = [
  { id: "reduced planck", equation: "ℏ=ℎ/2π", members: ["ℎ", "ℏ", "2π"]},
  { id: "mass energy equivalence", equation: "ℏ*1/c²=ℏ/c²", members: ["1/c²", "ℏ", "ℏ/c²"]},
  { id: "space-time curvature", equation: "κ = 8πG/c⁴", members: ["κ", "8π", "G", "1/c⁴"]},
  { id: "fine structure", equation: "α*(1/α) = √α*√(1/α)", members: ["α", "1/α", "√α", "√(1/α)"]},
  /*
  { id: "einsteinian_gravity", equation: "G_μν = κT_μν", members: ["G", "κ", "c^2"]},
  { id: "quantum_gravity", members: ["G", "ℏ", "c"] }*/
];

export const CONSTANTS = {
  PLANCK: {
    "ℏ": { sign:"", val: "1.054571817", mult: "10", mag: "-", exp: "34", unit: "kg¹·m²/s¹", dim: "121"},
    "ℎ": { sign:"", val: "6.62607015", mult: "10", mag: "-", exp: "34", unit: " kg¹·m²/s¹", dim: "121"},
    "ℏ/c²": { sign:"", val: "1.17336939", mult: "10", mag: "-", exp: "51", unit: " kg¹·m¹/s¹", dim: "111"},
    "ℎ/c²": { sign:"", val: "7.3724192313", mult: "10", mag: "-", exp: "51", unit: " kg¹·m¹/s¹", dim: "111"},
    "2π": {sign:"", val: "2*3.1415926535", multi: "", mag: "", exp: "", unit: "", dim: ""},
  },
  LIGHT: {
    "c²": { sign:"", val: "8.9875517873681764", mult: "10", mag: "", exp: "16", unit: " m²/s²", dim: "22"},
    "c": { sign:"", val: "299792458", mult: "", mag: "", exp: "", unit: " m¹/s¹", dim: "11"},
    "1/c": { sign:"", val: "3.3335640951", mult: "10", mag: "-", exp: "9", unit: " s¹/m¹", dim: "11"},
    "1/c²": { sign:"", val: "1.1126500560", mult: "10", mag: "-", exp: "17", unit: " s²/m²", dim: "22"},
  },
  GRAVITY: {
    "κ": { sign:"", val: "2.076647", mult: "10", mag: "-", exp: "43", unit: " s²/m¹·kg¹", dim: "211"},
    "8π": {sign:"", val: "8*3.1415926535", multi: "", mag: "", exp: "", unit: "", dim: ""},
    "G": { sign:"", val: "6.67430", mult: "10", mag: "-", exp: "11", unit: " m³/kg¹·s²", dim: "312"},
    "1/c⁴": { sign:"", val: "1.2379901472", mult: "10", mag: "-", exp: "34", unit: " s²/m²", dim: "22"},
    "G²": { sign:"", val: "4.454628049", mult: "10", mag: "-", exp: "21", unit: " m⁶/kg²·s⁴", dim: "624"},
  },
  FINE_STRUCTURE: {
    "1/α": { sign:"", val: "137.035999176", mult: "", mag: "", exp: "", unit: "", dim: ""},
    "α": { sign:"", val: "7.297352564", mult: "10", mag: "-", exp: "3", unit: "", dim: ""},
    "√α": { sign:"", val: "8.542454310", mult: "10", mag: "-", exp: "2", unit: "", dim: ""},
    "√(1/α)": { sign:"", val: "11.706237618", mult: "", mag: "", exp: "", unit: "", dim: ""},
  },
  MAGNETIC: {
    "μ0": { sign:"", val: "1.25663706", mult: "10", mag: "-", exp: "6", unit: " kg¹·m¹/s²·A²", dim: "1122"},
  },
  ELECTRIC: {
    "ε0": { sign:"", val: "8.85418782", mult: "10", mag: "-", exp: "12", unit: " s⁴·A²/kg¹·m³", dim: "4213"},
  },
  BOLTZMANN: {
    "kB": { sign:"", val: "1.380649", mult: "10", mag: "-", exp: "23", unit: " kg¹·m²/s²·K¹", dim: "1221"},
  },
  TEMPERATURE: {
    "T": { sign:"-", val: "-273.15", mult: "", mag: "", exp: "", unit: " °C¹", dim: "1"},
  }
};

export const SYMBOLS = ["=", "×", "-", "+", "row:", "col:", "⬡", "Layer", " "];

export const PALETTE = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];