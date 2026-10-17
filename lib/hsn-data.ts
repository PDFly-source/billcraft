/**
 * Offline HSN / SAC code finder — curated dataset.
 *
 * Source: Harmonized System nomenclature (WCO HS 2022) chapter and heading
 * titles, plus India's Service Accounting Code (SAC) sub-heads used in GST
 * returns. These nomenclatures are published for public use; this file is a
 * PARTIAL, curated extract of well-known entries — not a complete tariff.
 *
 * Coverage is deliberately labelled: this catalogue does NOT contain every
 * HSN code, and it intentionally does NOT carry GST rates (a code's rate
 * depends on notifications, exemptions and supplier conditions — check the
 * official CBIC portal / GST rate schedule before filing).
 *
 * Last verified: 2026-10-16 (descriptions against public HS/SAC listings).
 */

export interface HsnEntry {
  code: string;         // 2/4-digit HSN or 4/6-digit SAC
  description: string;
  kind: 'HSN' | 'SAC';
  chapter: string;      // chapter / group title used as the category filter
}

export const HSN_DATA_INFO = {
  source: 'WCO Harmonized System 2022 headings + India GST Service Accounting Codes (public nomenclature)',
  lastVerified: '2026-10-16',
  coverageNote:
    'Partial offline catalogue — common chapters and popular codes only. Always confirm against the official CBIC/GST portal before filing. GST rates are intentionally not included: they depend on current notifications and exemptions.',
};

export const HSN_CATEGORIES = [
  'All',
  'Live & Food',
  'Beverages & Tobacco',
  'Minerals & Fuels',
  'Chemicals & Pharma',
  'Plastics & Rubber',
  'Textiles & Apparel',
  'Wood & Paper',
  'Metals',
  'Machinery & Electrical',
  'Vehicles & Transport',
  'Instruments & Misc',
  'Services (SAC)',
] as const;

export const HSN_ENTRIES: HsnEntry[] = [
  // --- Live animals & food products (chapters 1–24) ---
  { code: '01', description: 'Live animals', kind: 'HSN', chapter: 'Live & Food' },
  { code: '02', description: 'Meat and edible meat offal', kind: 'HSN', chapter: 'Live & Food' },
  { code: '0203', description: 'Meat of swine, fresh, chilled or frozen', kind: 'HSN', chapter: 'Live & Food' },
  { code: '0207', description: 'Meat and edible offal of poultry', kind: 'HSN', chapter: 'Live & Food' },
  { code: '03', description: 'Fish and crustaceans, molluscs and other aquatic invertebrates', kind: 'HSN', chapter: 'Live & Food' },
  { code: '04', description: 'Dairy produce; birds’ eggs; natural honey', kind: 'HSN', chapter: 'Live & Food' },
  { code: '0401', description: 'Milk and cream, not concentrated or sweetened', kind: 'HSN', chapter: 'Live & Food' },
  { code: '0402', description: 'Milk and cream, concentrated or sweetened', kind: 'HSN', chapter: 'Live & Food' },
  { code: '06', description: 'Live trees and other plants; bulbs, roots and the like', kind: 'HSN', chapter: 'Live & Food' },
  { code: '07', description: 'Edible vegetables and certain roots and tubers', kind: 'HSN', chapter: 'Live & Food' },
  { code: '08', description: 'Edible fruit and nuts; peel of citrus fruit or melons', kind: 'HSN', chapter: 'Live & Food' },
  { code: '0802', description: 'Nuts, fresh or dried (almonds, walnuts, cashews and others)', kind: 'HSN', chapter: 'Live & Food' },
  { code: '09', description: 'Coffee, tea, maté and spices', kind: 'HSN', chapter: 'Live & Food' },
  { code: '0901', description: 'Coffee, coffee husks, tea and maté substitutes', kind: 'HSN', chapter: 'Live & Food' },
  { code: '0902', description: 'Tea, whether or not flavoured', kind: 'HSN', chapter: 'Live & Food' },
  { code: '0904', description: 'Pepper of the genus Piper; fruits of capsicum or pepper', kind: 'HSN', chapter: 'Live & Food' },
  { code: '10', description: 'Cereals', kind: 'HSN', chapter: 'Live & Food' },
  { code: '1006', description: 'Rice', kind: 'HSN', chapter: 'Live & Food' },
  { code: '1005', description: 'Maize (corn)', kind: 'HSN', chapter: 'Live & Food' },
  { code: '1001', description: 'Wheat and meslin', kind: 'HSN', chapter: 'Live & Food' },
  { code: '11', description: 'Products of the milling industry; malt, starches', kind: 'HSN', chapter: 'Live & Food' },
  { code: '1101', description: 'Wheat or meslin flour', kind: 'HSN', chapter: 'Live & Food' },
  { code: '12', description: 'Oil seeds and oleaginous fruit', kind: 'HSN', chapter: 'Live & Food' },
  { code: '15', description: 'Animal or vegetable fats and oils', kind: 'HSN', chapter: 'Live & Food' },
  { code: '1511', description: 'Palm oil and its fractions', kind: 'HSN', chapter: 'Live & Food' },
  { code: '1509', description: 'Olive oil and its fractions', kind: 'HSN', chapter: 'Live & Food' },
  { code: '16', description: 'Preparations of meat, fish or crustaceans', kind: 'HSN', chapter: 'Live & Food' },
  { code: '17', description: 'Sugars and sugar confectionery', kind: 'HSN', chapter: 'Live & Food' },
  { code: '1701', description: 'Cane or beet sugar and chemically pure sucrose', kind: 'HSN', chapter: 'Live & Food' },
  { code: '18', description: 'Cocoa and cocoa preparations', kind: 'HSN', chapter: 'Live & Food' },
  { code: '1801', description: 'Cocoa beans, whole or broken, raw or roasted', kind: 'HSN', chapter: 'Live & Food' },
  { code: '19', description: 'Preparations of cereals, flour, starch or milk; bakers’ wares', kind: 'HSN', chapter: 'Live & Food' },
  { code: '1905', description: 'Bread, pastry, cakes, biscuits and other bakers’ wares', kind: 'HSN', chapter: 'Live & Food' },
  { code: '20', description: 'Preparations of vegetables, fruit or other parts of plants', kind: 'HSN', chapter: 'Live & Food' },
  { code: '21', description: 'Miscellaneous edible preparations', kind: 'HSN', chapter: 'Live & Food' },
  { code: '2106', description: 'Food preparations not elsewhere specified or included', kind: 'HSN', chapter: 'Live & Food' },
  { code: '22', description: 'Beverages, spirits and vinegar', kind: 'HSN', chapter: 'Beverages & Tobacco' },
  { code: '2201', description: 'Waters, including natural or artificial mineral waters', kind: 'HSN', chapter: 'Beverages & Tobacco' },
  { code: '2202', description: 'Waters and other non-alcoholic beverages (soft drinks)', kind: 'HSN', chapter: 'Beverages & Tobacco' },
  { code: '2203', description: 'Beer made from malt', kind: 'HSN', chapter: 'Beverages & Tobacco' },
  { code: '2208', description: 'Undenatured ethyl alcohol, spirits, liqueurs', kind: 'HSN', chapter: 'Beverages & Tobacco' },
  { code: '24', description: 'Tobacco and manufactured tobacco substitutes', kind: 'HSN', chapter: 'Beverages & Tobacco' },

  // --- Minerals, fuels, chemicals, pharma (25–38) ---
  { code: '25', description: 'Salt; sulphur; earths and stones; plastering materials, lime and cement', kind: 'HSN', chapter: 'Minerals & Fuels' },
  { code: '2501', description: 'Salts (table salt and pure sodium chloride)', kind: 'HSN', chapter: 'Minerals & Fuels' },
  { code: '2505', description: 'Natural sands of all kinds (incl. silica and quartz sands)', kind: 'HSN', chapter: 'Minerals & Fuels' },
  { code: '26', description: 'Ores, slag and ash', kind: 'HSN', chapter: 'Minerals & Fuels' },
  { code: '27', description: 'Mineral fuels, mineral oils and products of their distillation', kind: 'HSN', chapter: 'Minerals & Fuels' },
  { code: '2710', description: 'Petroleum oils and oils from bituminous minerals', kind: 'HSN', chapter: 'Minerals & Fuels' },
  { code: '2711', description: 'Petroleum gases and other gaseous hydrocarbons (LPG)', kind: 'HSN', chapter: 'Minerals & Fuels' },
  { code: '2801', description: 'Fluorine, chlorine, bromine and iodine', kind: 'HSN', chapter: 'Chemicals & Pharma' },
  { code: '28', description: 'Inorganic chemicals; compounds of precious metals', kind: 'HSN', chapter: 'Chemicals & Pharma' },
  { code: '29', description: 'Organic chemicals', kind: 'HSN', chapter: 'Chemicals & Pharma' },
  { code: '30', description: 'Pharmaceutical products', kind: 'HSN', chapter: 'Chemicals & Pharma' },
  { code: '3004', description: 'Medicaments (packaged doses for retail sale)', kind: 'HSN', chapter: 'Chemicals & Pharma' },
  { code: '31', description: 'Fertilisers', kind: 'HSN', chapter: 'Chemicals & Pharma' },
  { code: '33', description: 'Essential oils and resinoids; perfumery, cosmetic or toilet preparations', kind: 'HSN', chapter: 'Chemicals & Pharma' },
  { code: '3304', description: 'Beauty or make-up preparations; skin-care preparations', kind: 'HSN', chapter: 'Chemicals & Pharma' },
  { code: '3305', description: 'Preparations for use on the hair (shampoos, oils)', kind: 'HSN', chapter: 'Chemicals & Pharma' },
  { code: '34', description: 'Soap, organic surface-active agents, washing preparations', kind: 'HSN', chapter: 'Chemicals & Pharma' },
  { code: '3401', description: 'Soap and organic surface-active products (bars, powders)', kind: 'HSN', chapter: 'Chemicals & Pharma' },
  { code: '38', description: 'Miscellaneous chemical products', kind: 'HSN', chapter: 'Chemicals & Pharma' },

  // --- Plastics & rubber (39–40) ---
  { code: '39', description: 'Plastics and articles thereof', kind: 'HSN', chapter: 'Plastics & Rubber' },
  { code: '3923', description: 'Articles for the conveyance or packing of goods (plastic bags, boxes)', kind: 'HSN', chapter: 'Plastics & Rubber' },
  { code: '3926', description: 'Other articles of plastics (stationery, household items)', kind: 'HSN', chapter: 'Plastics & Rubber' },
  { code: '40', description: 'Rubber and articles thereof', kind: 'HSN', chapter: 'Plastics & Rubber' },
  { code: '4011', description: 'New pneumatic tyres of rubber (of cars, buses, trucks)', kind: 'HSN', chapter: 'Plastics & Rubber' },

  // --- Textiles & apparel (50–65) ---
  { code: '50', description: 'Silk, including yarns and woven fabrics', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '51', description: 'Wool, fine/coarse animal hair; yarn and fabric', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '52', description: 'Cotton', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '5208', description: 'Woven fabrics of cotton, 85% or more cotton', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '5209', description: 'Woven fabrics of cotton, 85%+ cotton, over 200 g/m²', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '54', description: 'Man-made filaments', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '55', description: 'Man-made staple fibres', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '61', description: 'Articles of apparel, knitted or crocheted', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '6109', description: 'T-shirts, singlets and other vests, knitted', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '6105', description: 'Men’s or boys’ shirts, knitted or crocheted', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '6106', description: 'Women’s or girls’ blouses and shirts, knitted', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '62', description: 'Articles of apparel, not knitted or crocheted', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '6205', description: 'Men’s or boys’ shirts (woven)', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '6302', description: 'Bed linen, table linen, toilet and kitchen linen', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '63', description: 'Other made-up textile articles; sets; worn clothing', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '64', description: 'Footwear, gaiters and parts thereof', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '6403', description: 'Footwear with outer soles of rubber/plastic and uppers of leather', kind: 'HSN', chapter: 'Textiles & Apparel' },
  { code: '6404', description: 'Footwear with outer soles of rubber/plastic and textile uppers', kind: 'HSN', chapter: 'Textiles & Apparel' },

  // --- Wood & paper (44–49) ---
  { code: '44', description: 'Wood and articles of wood; wood charcoal', kind: 'HSN', chapter: 'Wood & Paper' },
  { code: '4407', description: 'Wood sawn or chipped lengthwise (sawn timber)', kind: 'HSN', chapter: 'Wood & Paper' },
  { code: '4412', description: 'Plywood, veneered panels and similar laminated wood', kind: 'HSN', chapter: 'Wood & Paper' },
  { code: '47', description: 'Pulp of wood or of other fibrous cellulosic material', kind: 'HSN', chapter: 'Wood & Paper' },
  { code: '48', description: 'Paper and paperboard; articles of paper pulp', kind: 'HSN', chapter: 'Wood & Paper' },
  { code: '4819', description: 'Cartons, boxes, cases of paper or paperboard (packing)', kind: 'HSN', chapter: 'Wood & Paper' },
  { code: '4820', description: 'Registers, notebooks, albums, book-binding materials', kind: 'HSN', chapter: 'Wood & Paper' },
  { code: '49', description: 'Printed books, newspapers, pictures and other printed matter', kind: 'HSN', chapter: 'Wood & Paper' },
  { code: '4901', description: 'Printed books, brochures and similar printed matter', kind: 'HSN', chapter: 'Wood & Paper' },

  // --- Metals (68–83) ---
  { code: '68', description: 'Articles of stone, plaster, cement, mica or ceramics', kind: 'HSN', chapter: 'Metals' },
  { code: '69', description: 'Ceramic products', kind: 'HSN', chapter: 'Metals' },
  { code: '6907', description: 'Unglazed ceramic flags/tiles, cubes and similar items', kind: 'HSN', chapter: 'Metals' },
  { code: '70', description: 'Glass and glassware', kind: 'HSN', chapter: 'Metals' },
  { code: '71', description: 'Natural or cultured pearls, precious stones and metals', kind: 'HSN', chapter: 'Metals' },
  { code: '7117', description: 'Imitation jewellery', kind: 'HSN', chapter: 'Metals' },
  { code: '72', description: 'Iron and steel', kind: 'HSN', chapter: 'Metals' },
  { code: '7214', description: 'Bars and rods of iron/steel, not further worked', kind: 'HSN', chapter: 'Metals' },
  { code: '73', description: 'Articles of iron or steel', kind: 'HSN', chapter: 'Metals' },
  { code: '7308', description: 'Structures and parts of structures, of iron or steel (bridges, towers)', kind: 'HSN', chapter: 'Metals' },
  { code: '7318', description: 'Screws, bolts, nuts, coach screws and similar threaded products', kind: 'HSN', chapter: 'Metals' },
  { code: '7326', description: 'Other articles of iron or steel', kind: 'HSN', chapter: 'Metals' },
  { code: '74', description: 'Copper and articles thereof', kind: 'HSN', chapter: 'Metals' },
  { code: '76', description: 'Aluminium and articles thereof', kind: 'HSN', chapter: 'Metals' },
  { code: '7604', description: 'Aluminium bars, rods and profiles', kind: 'HSN', chapter: 'Metals' },
  { code: '82', description: 'Tools, implements, cutlery, spoons and forks, of base metal', kind: 'HSN', chapter: 'Metals' },
  { code: '8201', description: 'Hand tools: spades, shovels, axes, hoes (agricultural hand tools)', kind: 'HSN', chapter: 'Metals' },
  { code: '83', description: 'Miscellaneous articles of base metal', kind: 'HSN', chapter: 'Metals' },

  // --- Machinery & electrical (84–85) ---
  { code: '84', description: 'Machinery and mechanical appliances; parts thereof', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8413', description: 'Pumps for liquids; liquid elevators', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8421', description: 'Centrifuges; filtering or purifying machinery', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8422', description: 'Dishwashing machines; machinery for cleaning/drying bottles', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8431', description: 'Parts of machinery of heading 8426–8430 (cranes, excavators)', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8450', description: 'Washing machines (household-type laundry machines)', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8471', description: 'Automatic data-processing machines and units (computers)', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8473', description: 'Parts and accessories of data-processing machines (computer parts)', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8481', description: 'Taps, cocks, valves and similar appliances for pipes', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '85', description: 'Electrical machinery and equipment; sound/TV recorders', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8501', description: 'Electric motors and generators', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8504', description: 'Electrical transformers, converters (and their power-supply units)', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8516', description: 'Electric water heaters, immersion heaters, domestic appliances', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8517', description: 'Telephone sets and other apparatus for telephony (mobile phones)', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8523', description: 'Discs, tapes, solid-state storage for recorded information', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8528', description: 'Monitors and projectors; television reception apparatus (TVs)', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8536', description: 'Electrical apparatus for switching electrical circuits (switches, plugs)', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8537', description: 'Boards, panels and consoles equipped with switches (control panels)', kind: 'HSN', chapter: 'Machinery & Electrical' },
  { code: '8544', description: 'Insulated wire, cable and other insulated conductors', kind: 'HSN', chapter: 'Machinery & Electrical' },

  // --- Vehicles & transport (86–89) ---
  { code: '86', description: 'Railway locomotives and rolling stock; track fixtures', kind: 'HSN', chapter: 'Vehicles & Transport' },
  { code: '87', description: 'Vehicles other than railway rolling stock', kind: 'HSN', chapter: 'Vehicles & Transport' },
  { code: '8703', description: 'Motor cars and other motor vehicles for transporting persons', kind: 'HSN', chapter: 'Vehicles & Transport' },
  { code: '8704', description: 'Motor vehicles for the transport of goods (trucks, lorries)', kind: 'HSN', chapter: 'Vehicles & Transport' },
  { code: '8708', description: 'Parts and accessories of motor vehicles (bodies, bumpers, brakes)', kind: 'HSN', chapter: 'Vehicles & Transport' },
  { code: '8711', description: 'Motorcycles (including mopeds) and cycles with auxiliary motor', kind: 'HSN', chapter: 'Vehicles & Transport' },
  { code: '8712', description: 'Bicycles and other cycles, not motorised', kind: 'HSN', chapter: 'Vehicles & Transport' },
  { code: '8714', description: 'Parts and accessories of vehicles of headings 8711–8712', kind: 'HSN', chapter: 'Vehicles & Transport' },
  { code: '88', description: 'Aircraft, spacecraft, and parts thereof', kind: 'HSN', chapter: 'Vehicles & Transport' },
  { code: '89', description: 'Ships, boats and floating structures', kind: 'HSN', chapter: 'Vehicles & Transport' },

  // --- Instruments & misc (90–96) ---
  { code: '90', description: 'Optical, photographic, measuring, medical instruments and apparatus', kind: 'HSN', chapter: 'Instruments & Misc' },
  { code: '9004', description: 'Spectacles, goggles and corrective/protective eyewear', kind: 'HSN', chapter: 'Instruments & Misc' },
  { code: '9018', description: 'Instruments and appliances used in medical sciences (medical devices)', kind: 'HSN', chapter: 'Instruments & Misc' },
  { code: '91', description: 'Clocks and watches and parts thereof', kind: 'HSN', chapter: 'Instruments & Misc' },
  { code: '92', description: 'Musical instruments; parts and accessories', kind: 'HSN', chapter: 'Instruments & Misc' },
  { code: '94', description: 'Furniture; bedding, mattresses, lamps and lighting fittings', kind: 'HSN', chapter: 'Instruments & Misc' },
  { code: '9401', description: 'Seats (other than saddlery), and parts thereof (chairs, sofas)', kind: 'HSN', chapter: 'Instruments & Misc' },
  { code: '9403', description: 'Furniture and parts thereof (other metal/wooden furniture)', kind: 'HSN', chapter: 'Instruments & Misc' },
  { code: '9405', description: 'Lamps and lighting fittings (lamps, ceiling lights)', kind: 'HSN', chapter: 'Instruments & Misc' },
  { code: '95', description: 'Toys, games and sports requisites', kind: 'HSN', chapter: 'Instruments & Misc' },
  { code: '9503', description: 'Tricycles, scooters, pedal cars; dolls; toys (for children)', kind: 'HSN', chapter: 'Instruments & Misc' },
  { code: '96', description: 'Miscellaneous manufactured articles', kind: 'HSN', chapter: 'Instruments & Misc' },

  // --- Services (SAC, 99xx) ---
  { code: '9953', description: 'Construction services (residential and non-residential buildings)', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '995461', description: 'Works contract services — general building/civil construction', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '997212', description: 'Legal documentation, certification and attestation services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '997311', description: 'Accounting, bookkeeping and auditing services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '997321', description: 'Advisory and consultancy services — business and management', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '997332', description: 'Market research and public opinion polling services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '997337', description: 'Engineering services (design of buildings and structures)', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '997338', description: 'Architectural services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998313', description: 'IT design and development services (software development)', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998314', description: 'IT consulting and IT support services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998315', description: 'IT infrastructure and network management', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998319', description: 'Hosting and IT infrastructure provisioning services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998360', description: 'Support services — human resources and recruitment', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '9984', description: 'Telecommunication services (transmission, satellite, internet)', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998511', description: 'Freight transport services of goods by road', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998512', description: 'Freight transport services of goods by rail', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998517', description: 'Freight transport services of goods by air', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998521', description: 'Storage and warehousing services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998531', description: 'Cargo handling services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998533', description: 'Courier services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998540', description: 'Postal and courier-related logistics support services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '998599', description: 'Other transport support services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '9986', description: 'Support services to other businesses (travel, security, cleaning)', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '9987', description: 'Installation, assembly and repair services (of machinery)', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '9988', description: 'Business support services (collection agencies, call centres)', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '999211', description: 'Renting of residential dwelling properties', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '999293', description: 'Renting of commercial properties', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '999311', description: 'Guest-house, hotel and inn accommodation services (short stay)', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '999322', description: 'Function hall and banquet services (event venues)', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '9995', description: 'Education, training and related support services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '99952', description: 'Coaching class / private tuition services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '99954', description: 'Sports and recreation services (by academies, clubs)', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '999723', description: 'Medical, dental and paramedical services', kind: 'SAC', chapter: 'Services (SAC)' },
  { code: '999731', description: 'Goods transport agency (GTA) services', kind: 'SAC', chapter: 'Services (SAC)' },
];

// ---- search -----------------------------------------------------------

export interface HsnSearchResult {
  entries: HsnEntry[];
  exactMatch: HsnEntry | null;
}

/**
 * Search by code and/or description.
 * - A query that is all digits first performs exact-code matching, then
 *   code-prefix matching, then description matching.
 * - A text query searches descriptions (all words must appear).
 * - Category filters by chapter when not 'All'.
 */
export function searchHsn(query: string, category: string = 'All'): HsnSearchResult {
  const q = (query || '').trim().toLowerCase();
  let pool = HSN_ENTRIES;
  if (category && category !== 'All') {
    pool = pool.filter((e) => e.chapter === category);
  }
  if (!q) return { entries: pool.slice(0, 60), exactMatch: null };

  const exactMatch = pool.find((e) => e.code.toLowerCase() === q) || null;

  if (/^\d+$/.test(q)) {
    // digits: exact match first, then prefix code matches, then description words
    const byCode = pool.filter((e) => e.code.startsWith(q) && e.code.toLowerCase() !== q);
    const byDesc = pool.filter((e) => !e.code.startsWith(q) && wordsIn(e.description, q));
    const entries = exactMatch ? [exactMatch, ...byCode, ...byDesc] : [...byCode, ...byDesc];
    return { entries: entries.slice(0, 60), exactMatch };
  }

  const byDesc = pool.filter((e) => wordsIn(e.description, q) || e.code.toLowerCase().includes(q));
  return { entries: byDesc.slice(0, 60), exactMatch };
}

function wordsIn(description: string, q: string): boolean {
  const words = q.split(/\s+/).filter(Boolean);
  const d = description.toLowerCase();
  return words.every((w) => d.includes(w));
}
