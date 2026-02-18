export const ZODIAC_MAPS = {
  "Hebrew": {"Rat":292, "Ox":506, "Tiger":142, "Rabbit":653, "Dragon":510, "Snake":358, "Horse":126, "Goat":77, "Monkey":186, "Rooster":336, "Dog": 52, "Pig":225},
  "Ancient Greek": {"Rat":640, "Ox":672, "Tiger":623, "Rabbit":470, "Dragon":975, "Snake":780, "Horse":440, "Goat":71, "Monkey":397, "Rooster":1256, "Dog": 1270, "Pig":800}
};

export const ZODIAC_NAMES = {
  "Hebrew": {"Rat": "עַכְבָּר", "Ox":"שׁוֹר", "Tiger":"חִדֶּקֶל", "Rabbit":"אַרְנֶבֶת", "Dragon":"תַנִּין", "Snake":"נָחָשׁ", "Horse":"סוס", "Goat":"עֵז", "Monkey":"קוף", "Rooster":"שֶׂכְוִי", "Dog":"כֶּלֶב", "Pig":"חזיר"},
  "Ancient Greek": {"Rat": "μῦς", "Ox":"βοῦς", "Tiger":"Τίγρις", "Rabbit":"κόνικλος", "Dragon":"δράκων", "Snake":"ὄφις", "Horse":"ἵππος", "Goat":"αἴξ", "Monkey":"πίθηκος", "Rooster":"ἀλέκτωρ", "Dog":"Κύων", "Pig":"σῦς"}
};

export const EQUATION_SETS = [
  { id: "reduced_planck", equation: "ℏ=ℎ/2π", members: ["ℎ", "ℏ", "2π"]},
  { id: "mass_energy_equivalence", equation: "ℏ*(1/c)^2=ℏ/c^2", members: ["(1/c)^2", "ℏ", "ℏ/c^2"]},
  { id: "einsteinian_gravity", equation: "G_μν = κT_μν", members: ["G", "κ", "c^2"]},
  /*
  { id: "fine_structure", members: ["α", "1/α", "μ0", "ε0", "c"] },
  { id: "quantum_gravity", members: ["G", "ℏ", "c"] }*/
];

export const CONSTANTS = {
  PLANCK: {
    "ℏ": { sign:"", val: "1.054571817", mult: "10", mag: "-", exp: "34", unit: " kg·m²/s" },
    "ℎ": { sign:"", val: "6.62607015", mult: "10", mag: "-", exp: "34", unit: " kg·m²/s" },
    "ℏ/c^2": { sign:"", val: "1.173369", mult: "10", mag: "-", exp: "51", unit: " kg·m/s" },
    "ℎ/c^2": { sign:"", val: "7.3724192313", mult: "10", mag: "-", exp: "51", unit: " kg·m/s" },
    "2π": {sign:"", val: "2*3.1415926535", multi: "", mag: "", exp: "", unit: ""}
  },
  LIGHT: {
    "c^2": { sign:"", val: "8.9875517873681764", mult: "10", mag: "", exp: "16", unit: " m²/s²" },
    "c": { sign:"", val: "299792458", mult: "", mag: "", exp: "", unit: " m/s" },
    "1/c": { sign:"", val: "3.3335640951", mult: "10", mag: "-", exp: "9", unit: " s/m" },
    "(1/c)^2": { sign:"", val: "1.11265005", mult: "10", mag: "-", exp: "17", unit: " s²/m²" },
    "(1/c)^4": { sign:"", val: "1.2379901472", mult: "10", mag: "-", exp: "34", unit: " s²/m²" }
  },
  GRAVITY: {
    "G": { sign:"", val: "6.67430", mult: "10", mag: "-", exp: "11", unit: " m³/kg·s²" },
    /*"F": { sign:"", val: "6.6743", mult: "10", mag: "-", exp: "11", unit: " m³/kg·s²" },*/
    "κ": { sign:"", val: "2.076647", mult: "10", mag: "-", exp: "43", unit: " s²/m·kg" },
    "G^2": { sign:"", val: "4.454628049", mult: "10", mag: "-", exp: "21", unit: " m⁶/kg²·s⁴" }
  },
  FINE_STRUCTURE: {
    "1/α": { sign:"", val: "137.035999", mult: "", mag: "", exp: "", unit: "" },
    "α": { sign:"", val: "7.297352", mult: "10", mag: "-", exp: "3", unit: "" },
    "√α": { sign:"", val: "8.542453", mult: "10", mag: "-", exp: "2", unit: "" },
    "√(1/α)": { sign:"", val: "11.706237", mult: "", mag: "", exp: "", unit: "" }
  },
  MAGNETIC: {
    "μ0": { sign:"", val: "1.25663706", mult: "10", mag: "-", exp: "6", unit: " N/A²" }
  },
  ELECTRIC: {
    "ε0": { sign:"", val: "8.85418782", mult: "10", mag: "-", exp: "12", unit: " F/m" }
  },
  BOLTZMANN: {
    "kB": { sign:"", val: "1.380649", mult: "10", mag: "-", exp: "23", unit: " J/K" }
  },
  TEMPERATURE: {
    "T": { sign:"-", val: "273.15", mult: "", mag: "", exp: "", unit: " °C" }
  }
};

export const SYMBOLS = ["=", "×", "-", "+", "row:", "col:", "⬡", "Layer", " "];

export const PALETTE = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];