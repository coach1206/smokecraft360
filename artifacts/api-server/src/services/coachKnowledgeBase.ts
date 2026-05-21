export interface KnowledgeChunk {
  id: string;
  domain: string;
  subdomain: string;
  title: string;
  content: string;
  keywords: string[];
  roleRelevance: string[];
}

export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  // ─── CIGAR EDUCATION ────────────────────────────────────────────────────────
  {
    id: "cigar-wrappers-001",
    domain: "cigar_education",
    subdomain: "wrappers",
    title: "Cigar Wrapper Varieties",
    content: `The wrapper leaf accounts for up to 60% of a cigar's overall flavor profile. Key varieties:
- Connecticut Shade: Grown under shade cloth, delivering a silky, creamy, mild smoke with notes of cedar and cream.
- Maduro: Fermented longer at higher temperatures, producing rich notes of dark chocolate, espresso, and dried fruit. Full-bodied.
- Habano: Cuban-seed tobacco grown outside Cuba. Spicy, complex, medium-to-full body with cedar and red pepper.
- Corojo: Originally from Cuba's Vuelta Abajo region. Spicy, earthy, oily texture.
- Cameroon: Grown in West Africa, toothy texture, unique sweetness with earthy undertones.
- Oscuro: Darkest wrapper, longest fermentation, intensely complex and bold.`,
    keywords: ["wrapper", "Connecticut", "Maduro", "Habano", "Corojo", "leaf", "flavor"],
    roleRelevance: ["tobacconist", "concierge", "brand_ambassador", "server"],
  },
  {
    id: "cigar-fillers-001",
    domain: "cigar_education",
    subdomain: "fillers",
    title: "Filler Leaf Architecture",
    content: `Three leaf types construct the filler blend:
- Seco (middle priming): Provides combustion and balance. Medium strength, contributes to burn quality.
- Viso (upper priming): The most flavorful and oily leaf. Adds complexity and body.
- Ligero (top priming): Slowest burning, highest nicotine, most intense. Used sparingly in full-bodied blends.
Master blenders balance these ratios to achieve target strength and flavor trajectory. A typical medium blend: 40% Seco, 40% Viso, 20% Ligero. A full blend may use 30% Ligero.`,
    keywords: ["filler", "seco", "viso", "ligero", "blend", "strength", "combustion"],
    roleRelevance: ["tobacconist", "brand_ambassador", "server"],
  },
  {
    id: "cigar-binders-001",
    domain: "cigar_education",
    subdomain: "binders",
    title: "Binder Selection Science",
    content: `The binder leaf holds the filler in place and contributes to structural integrity and burn evenness.
- Nicaraguan binder: Adds spice and complexity.
- Dominican binder: Lighter, smoother, helps with even burn.
- Broadleaf binder: Thick, oily, contributes sweetness — common in Maduros.
- Honduran binder: Hearty, adds earthiness and strength.
Binder selection significantly affects the mid-palette experience — often described as the "transition zone" between the initial draw and the finish.`,
    keywords: ["binder", "burn", "draw", "structure", "Nicaraguan", "Broadleaf"],
    roleRelevance: ["tobacconist", "brand_ambassador"],
  },
  {
    id: "cigar-regions-001",
    domain: "cigar_education",
    subdomain: "tobacco_regions",
    title: "Premium Tobacco Growing Regions",
    content: `World-class tobacco originates from distinct terroir regions:
- Vuelta Abajo, Cuba: Considered the world's finest tobacco land. Rich red soil, perfect humidity. Protected designation.
- Jalapa Valley, Nicaragua: Rich volcanic soil, produces complex, full-bodied tobacco. Rising star of premium cigars.
- Santiago, Dominican Republic: Lighter, more refined tobaccos. Known for smooth, elegant blends.
- Danlí, Honduras: Hearty, earthy tobaccos. Contributes body and rustic complexity.
- Connecticut River Valley: World standard for shade-grown wrapper leaf.
- Cameroon, West Africa: Unique microclimate producing toothy, sweet wrappers unavailable elsewhere.`,
    keywords: ["terroir", "Cuba", "Nicaragua", "Dominican", "Honduras", "region", "origin"],
    roleRelevance: ["tobacconist", "concierge", "brand_ambassador", "server"],
  },
  {
    id: "cigar-humidity-001",
    domain: "cigar_education",
    subdomain: "humidity_science",
    title: "Humidor Management & Humidity Science",
    content: `Proper cigar preservation requires precise environmental control:
- Target humidity: 65–72% RH (relative humidity). Below 60%: cigars dry out, crack, burn hot and harsh. Above 75%: mold risk, slow burn, swelling.
- Target temperature: 65–70°F (18–21°C). Higher temperatures accelerate tobacco beetle egg hatching — catastrophic for inventory.
- Seasoning a new humidor: Wipe interior with distilled water, place calibrated hygrometer, use Boveda 65–69% packs. Allow 2 weeks before stocking.
- Monitoring: Digital hygrometers preferred. Calibrate against a saturated salt solution (75.5% RH at 75°F).
- Recovery procedure: If humidity drops below 60%, add Boveda packs and leave undisturbed for 72 hours. Do not spray cigars directly.`,
    keywords: ["humidity", "humidor", "RH", "temperature", "preservation", "Boveda", "mold", "seasoning"],
    roleRelevance: ["tobacconist", "manager", "bartender"],
  },
  {
    id: "cigar-cutting-001",
    domain: "cigar_education",
    subdomain: "cutting_methods",
    title: "Cutting Techniques & Tools",
    content: `The cut determines draw resistance and smoke concentration:
- Guillotine (straight cut): Most common. Cut 1–2mm above the cap shoulder. Too deep unravels the wrapper.
- V-cut (wedge cut): Creates a notch. Concentrates smoke on the palate center. Good for ring gauges 50+.
- Punch cut: Circular punch removes a small disc. Best for Churchill and larger vitolas. Prevents loose tobacco.
- Torpedo/Figurado: Pinch and cut the pointed tip at the natural taper. Aim for a 30–40° opening.
Staff script: "May I prepare your cigar?" — always offer, never assume. Use a fresh, sharp cutter for each guest.`,
    keywords: ["cut", "guillotine", "v-cut", "punch", "cutter", "cap", "draw", "torpedo"],
    roleRelevance: ["tobacconist", "server", "concierge", "vip_host"],
  },
  {
    id: "cigar-relighting-001",
    domain: "cigar_education",
    subdomain: "relighting_etiquette",
    title: "Relighting Etiquette & Protocol",
    content: `Proper relighting preserves flavor integrity:
1. Gently blow through the cigar to clear stale smoke residue before reigniting.
2. Use a butane torch or cedar spill — never a petroleum lighter or matches (sulfur contamination).
3. Toast the foot first: hold flame 1 inch away, rotate the cigar slowly for 5–10 seconds until the foot glows evenly.
4. Draw slowly while continuing to rotate. Avoid direct flame contact with the wrapper.
5. A well-rested cigar (under 2 hours) relight cleanly. Beyond 4 hours, flavor degradation is significant.
Staff note: Never rush a guest relighting. Offer a fresh cigar at house expense if the previous one was poorly managed.`,
    keywords: ["relight", "torch", "butane", "cedar", "foot", "toast", "flame", "stale"],
    roleRelevance: ["tobacconist", "server", "vip_host", "concierge"],
  },

  // ─── SPIRITS EDUCATION ──────────────────────────────────────────────────────
  {
    id: "spirits-bourbon-pairing-001",
    domain: "spirits_education",
    subdomain: "bourbon_pairing",
    title: "Bourbon & Cigar Pairing Intelligence",
    content: `Bourbon pairs exceptionally well with premium cigars. Key pairing logic:
- Connecticut + Wheated Bourbon (Pappy, W.L. Weller): Caramel and vanilla notes complement the mild creaminess without overpowering.
- Maduro + High-Rye Bourbon (Booker's, Four Roses Single Barrel): Spice and fruit esters mirror the chocolate-espresso profile.
- Habano + Single Barrel Bourbon (Blanton's, Eagle Rare): Rich oak and spice match the complexity.
- Corojo + Rye Whiskey: Pepper-on-pepper amplification creates bold, cohesive pairing.
The bridge principle: match intensity. A full-bodied cigar needs a spirit with sufficient proof and complexity to hold its own.`,
    keywords: ["bourbon", "pairing", "wheated", "rye", "Pappy", "Blanton's", "oak", "caramel", "match"],
    roleRelevance: ["bartender", "server", "vip_host", "concierge"],
  },
  {
    id: "spirits-whiskey-001",
    domain: "spirits_education",
    subdomain: "whiskey_science",
    title: "Whiskey Science & Tasting Framework",
    content: `Professional whiskey evaluation uses a structured four-point framework:
1. Appearance: Color depth indicates age and barrel influence. Deep amber = longer maturation. Pale gold = younger or ex-bourbon.
2. Nose: Swirl gently, bring to 2 inches from nose. Water down 1–2 drops to open esters. Common notes: vanilla, caramel, oak, dried fruit, floral, smoke.
3. Palate: Roll across entire tongue. Front = sweetness, mid = spice/complexity, back = heat/length.
4. Finish: Duration and evolution. Short finish (<10s): simple. Long finish (>30s): premium indicator.
Serving temperature: 60–65°F optimal. Room temperature ice melts too quickly — use whiskey stones or a single large cube for dilution control.`,
    keywords: ["whiskey", "tasting", "nose", "palate", "finish", "barrel", "oak", "evaluation"],
    roleRelevance: ["bartender", "server", "vip_host", "concierge", "brand_ambassador"],
  },
  {
    id: "spirits-proof-001",
    domain: "spirits_education",
    subdomain: "proof_education",
    title: "Proof, ABV & Service Intelligence",
    content: `Understanding proof and ABV guides responsible service:
- Proof = 2x ABV. 100 proof = 50% ABV.
- Cask strength / barrel proof: typically 55–67% ABV. Guest should add water to taste. Do not serve ice by default.
- Standard pour for premium spirits: 1.5 oz (44ml) neat. 2 oz for cocktails.
- Cut-off indicators: Slurred speech, loss of coordination, excessive ordering pace, behavioral changes.
- Responsible upsell: When a guest is approaching limit, redirect to a premium non-alcoholic pairing (estate water, high-end coffee) framed as a palate cleanse — never as a refusal. "Let me bring you our Acqua Panna to let this finish breathe."`,
    keywords: ["proof", "ABV", "cask strength", "responsible service", "pour", "cut-off"],
    roleRelevance: ["bartender", "server", "manager", "vip_host"],
  },

  // ─── WINE EDUCATION ─────────────────────────────────────────────────────────
  {
    id: "wine-regions-001",
    domain: "wine_education",
    subdomain: "wine_regions",
    title: "Premier Wine Regions & House Selections",
    content: `Key wine regions and their signature profiles:
- Bordeaux, France: Cabernet Sauvignon/Merlot blends. Structure, tannins, black currant, cedar. Long aging potential.
- Burgundy, France: Pinot Noir and Chardonnay exclusively. Terroir-driven, earthy, silk-textured.
- Napa Valley, California: Bold Cabernet Sauvignon. Ripe fruit, high alcohol, lush oak.
- Tuscany, Italy: Sangiovese-based (Chianti, Brunello). High acidity, cherry, leather, tobacco.
- Champagne, France: Traditional method sparkling. Brioche, citrus, minerality. Only from Champagne AOC.
- Rioja, Spain: Tempranillo-dominant. Vanilla, red fruit, leather. Value-to-quality leader.`,
    keywords: ["wine", "Bordeaux", "Burgundy", "Napa", "Champagne", "Cabernet", "Pinot Noir", "region"],
    roleRelevance: ["server", "concierge", "vip_host", "bartender"],
  },
  {
    id: "wine-pairing-001",
    domain: "wine_education",
    subdomain: "pairing_science",
    title: "Wine Pairing Science",
    content: `Fundamental wine pairing principles:
- Weight matching: Light dishes → light wines. Heavy dishes → full-bodied wines.
- Regional pairing: Italian food + Italian wine; French cuisine + Burgundy.
- Acid with fat: Acidic wines (Sauvignon Blanc, Champagne) cut through rich, fatty dishes.
- Tannins with protein: Red wine tannins bind with proteins — perfect with red meat.
- Sweetness with spice: Off-dry Riesling tempers spicy food without clash.
- Bubbles as universal bridge: Champagne and Cava pair with nearly anything from fried foods to caviar.
Price-point guidance: A bottle should not exceed the cost of the main course. Exception: Tasting menus and wine pairing programs.`,
    keywords: ["wine pairing", "acid", "tannins", "weight", "bubbles", "Champagne", "Riesling"],
    roleRelevance: ["server", "concierge", "vip_host"],
  },

  // ─── BEER EDUCATION ─────────────────────────────────────────────────────────
  {
    id: "beer-styles-001",
    domain: "beer_education",
    subdomain: "beer_styles",
    title: "Craft Beer Style Reference",
    content: `Premium craft beer style guide for service staff:
- IPA (India Pale Ale): Hop-forward, bitter, citrus/pine/tropical aromas. West Coast = piney/bitter; New England = hazy/tropical/soft.
- Stout/Porter: Dark, roasted malt character. Notes of coffee, chocolate, caramel. Nitro pour creates creamy texture.
- Belgian Tripel: Golden, high ABV (8–10%), spicy yeast character, fruity esters, dry finish.
- Sour/Lambic: Tart, acidic, funky. Pairs with charcuterie and cheese. Acquired taste — introduce gently.
- Lager: Crisp, clean, highly carbonated. Serve 35–38°F. Pilsner subtype has noble hop bitterness.
- Wheat Beer (Hefeweizen): Unfiltered, banana/clove from yeast. Serve in tall glass with orange slice.`,
    keywords: ["IPA", "stout", "porter", "Belgian", "sour", "lager", "wheat", "craft beer", "style"],
    roleRelevance: ["bartender", "server"],
  },
  {
    id: "beer-temperature-001",
    domain: "beer_education",
    subdomain: "temperature_guidance",
    title: "Beer Service Temperature Guide",
    content: `Temperature dramatically affects beer flavor perception:
- Light lagers: 33–38°F (1–3°C)
- Pale ales / IPAs: 45–50°F (7–10°C) — cold masks hop aroma, serve slightly warmer
- Stouts / Porters: 50–55°F (10–13°C) — roasted notes emerge at warmer temps
- Belgian ales / Triples: 50–55°F (10–13°C)
- Barrel-aged / Imperial styles: 55–60°F (13–16°C) — like a red wine
- Sour ales / Lambics: 45–50°F (7–10°C)
Storage: Dark, 50–55°F for ales; 38–42°F for lagers. Always store upright to minimize yeast disturbance. Rotate stock FIFO.`,
    keywords: ["temperature", "serving", "storage", "lager", "ale", "stout", "FIFO", "rotation"],
    roleRelevance: ["bartender", "server", "manager"],
  },

  // ─── GUEST PSYCHOLOGY ───────────────────────────────────────────────────────
  {
    id: "psychology-vip-001",
    domain: "guest_psychology",
    subdomain: "vip_handling",
    title: "VIP Guest Handling Protocol",
    content: `VIP service requires anticipatory intelligence, not reactive service:
1. Recognition first: Use their name within the first 30 seconds. "Welcome back, Mr. Chen — your usual preference has been noted."
2. Anticipate, don't ask: If a repeat guest typically orders a Maduro with bourbon, have it staged before they request it.
3. Create privacy: Guide VIP guests to corner or booth seating. Use low voices and deliberate movements.
4. The 3-minute rule: No more than 3 minutes should elapse between seating and first engagement.
5. Offer, don't push: Present options as curated gifts, not a sales exercise. "We received an allocation of the 2019 Padron 1926 this week — I thought of you immediately."
6. Graceful departure: When a VIP is deep in conversation, a slow withdrawal with a brief nod is preferred over verbal interruption.`,
    keywords: ["VIP", "recognition", "anticipatory", "name", "privacy", "protocol", "premium"],
    roleRelevance: ["vip_host", "concierge", "server", "manager"],
  },
  {
    id: "psychology-first-timer-001",
    domain: "guest_psychology",
    subdomain: "first_time_coaching",
    title: "First-Time Smoker Coaching",
    content: `Coaching a new cigar guest requires patience and calibration:
1. Assess experience: "Have you spent much time with premium cigars before?" — open-ended, never condescending.
2. Start mild: Recommend Connecticut or Dominican for first-timers. Never start with a full-bodied Ligero-heavy blend.
3. Nicotine warning (discreet): On an empty stomach, even mild cigars can cause nicotine effects. Suggest a small snack first.
4. Pacing guidance: A premium cigar is not rushed. Smoke it at a rate of 1–2 draws per minute. Faster = heat, bitterness.
5. Retrohaling (optional): Mention that some guests enjoy the aroma through the nose — but don't push it on beginners.
6. Frame it as an experience: "You're not just smoking a cigar tonight — you're tasting the terroir of Nicaragua."
The goal: Transform a first-timer into a repeat guest. The first session is an investment.`,
    keywords: ["first-time", "beginner", "coaching", "mild", "Connecticut", "nicotine", "pacing", "onboarding"],
    roleRelevance: ["tobacconist", "server", "concierge", "vip_host"],
  },
  {
    id: "psychology-upsell-001",
    domain: "guest_psychology",
    subdomain: "non_pushy_upselling",
    title: "Non-Pushy Upselling Methodology",
    content: `Premium upselling is education-led, never pressure-based:
1. Anchor to preference: "Based on your preference for earthy profiles, our Cohiba Esplendido would be a natural progression."
2. The story sell: Every premium product has a story. Use it. "This Davidoff Limited Edition was blended by a third-generation master in Santiago — only 500 boxes reached the US."
3. Permission selling: "Would you like me to tell you about what we just received?" — always offer, never assume interest.
4. Price anchoring: Present the premium option alongside the mid-tier. The mid-tier suddenly appears reasonable. Rarely lead with the least expensive option.
5. The pairing bridge: "The experience changes significantly with the right accompaniment — may I suggest our Macallan 18?"
6. Timing: Upsell opportunities are strongest after the guest has expressed satisfaction. "I'm glad you're enjoying that — there's actually a more complex expression from the same blender..."`,
    keywords: ["upsell", "premium", "story", "permission", "anchor", "pairing", "conversion", "sales"],
    roleRelevance: ["server", "bartender", "vip_host", "concierge", "brand_ambassador", "manager"],
  },

  // ─── HOSPITALITY SALES ──────────────────────────────────────────────────────
  {
    id: "sales-attachment-001",
    domain: "hospitality_sales",
    subdomain: "attachment_selling",
    title: "Attachment Selling Framework",
    content: `Attachment selling increases ticket value through natural addition:
- The cigar-spirits attachment: Every cigar purchase should trigger a spirit suggestion. Conversion rate target: 65%.
- The accessory attachment: Cigar cutter, lighter, or humidor bag — present as part of the ritual equipment.
- The second-round trigger: 75% into the first cigar, return to the table. "Would you like to select your next smoke? We have some excellent follow-ups to what you're enjoying."
- The dessert bridge: As the cigar enters its final third, introduce dessert or digestif options. "The richness of the final third pairs beautifully with our chocolate fondant."
- Pairing flight promotion: Two cigars + two spirits presented as a structured experience. Higher perceived value, stronger ticket.
Revenue target: Average ticket increase of 40% per guest when attachment protocol followed.`,
    keywords: ["attachment", "upsell", "second round", "dessert", "conversion", "ticket", "revenue"],
    roleRelevance: ["server", "manager", "bartender", "vip_host"],
  },
  {
    id: "sales-premium-conversion-001",
    domain: "hospitality_sales",
    subdomain: "premium_conversion",
    title: "Premium Tier Conversion Strategies",
    content: `Moving guests from standard to premium tier:
1. Experience framing: Never describe premium products as "more expensive." Use "elevated," "allocated," "limited," or "signature."
2. The exclusivity nudge: "We only have 3 boxes of this allocation. I wanted to let our guests know before it's gone."
3. Trial close: Offer a sample or tasting — "Let me bring you a small taste of the 21-year-old and you can decide."
4. ROI framing for managers: Each 10% premium conversion increase = 15–25% revenue uplift per shift, based on venue baseline data.
5. Seasonal urgency: "This blend is only available through Q4" — real scarcity drives action.
Staff incentive note: Inform staff of their personal conversion metrics. Visibility drives competition and performance.`,
    keywords: ["premium", "conversion", "allocated", "exclusive", "limited", "framing", "revenue"],
    roleRelevance: ["server", "manager", "vip_host", "concierge", "brand_ambassador"],
  },

  // ─── OPERATIONS ─────────────────────────────────────────────────────────────
  {
    id: "ops-humidor-001",
    domain: "operations",
    subdomain: "humidor_management",
    title: "Humidor Management SOPs",
    content: `Standard Operating Procedures for humidor management:
Daily:
- Check humidity reading. Log in inventory system. Target: 68–70% RH.
- Check temperature. Target: 65–68°F.
- Inspect for any visible mold (white fuzz on cigars or cedar). Quarantine immediately.
- Rotate stock: move older stock to front.
Weekly:
- Calibrate hygrometers using salt test or calibration kit.
- Inspect Boveda packs. Replace if fully hardened.
- Count inventory against system record. Flag discrepancies.
Monthly:
- Full inventory audit and reconciliation.
- Deep-clean cedar trays with dry brush only — no water or chemicals.
- Evaluate reorder thresholds. Flag any items below par level.
Emergency: If humidity spikes above 75%, remove Boveda packs, leave lid ajar for 2 hours, monitor closely.`,
    keywords: ["humidor", "SOP", "daily", "weekly", "humidity", "temperature", "rotation", "audit"],
    roleRelevance: ["tobacconist", "manager", "bartender"],
  },
  {
    id: "ops-inventory-recovery-001",
    domain: "operations",
    subdomain: "inventory_recovery",
    title: "Inventory Recovery Procedures",
    content: `When inventory discrepancies or shortages occur:
1. Immediate audit: Use the SmokeCraft 360 inventory panel to run a real-time count vs. system record.
2. Check reservation holds: Items may show as low-stock due to active 15-minute reservation windows. Check /api/inventory/reservations.
3. Vendor emergency protocol: Each primary vendor has a same-day emergency contact. Use the Vendor Directory in Command Hub.
4. Guest communication: Never tell a guest "we're out." Instead: "That specific selection is temporarily reserved — may I offer our [alternative]?"
5. Menu flag: Immediately flag the item as "Temporarily Unavailable" in the E.A.T. system to prevent further orders.
6. Post-recovery: Log the incident in the Operations Log. Review with manager within 24 hours.`,
    keywords: ["inventory", "shortage", "recovery", "discrepancy", "vendor", "out of stock", "reservation"],
    roleRelevance: ["manager", "tobacconist", "bartender", "server"],
  },
  {
    id: "ops-table-pacing-001",
    domain: "operations",
    subdomain: "table_pacing",
    title: "Table Pacing & Session Flow",
    content: `Luxury lounge table pacing maximizes revenue while preserving guest experience:
- A premium cigar session runs 45–90 minutes. Build service touchpoints accordingly.
- Minutes 0–5: Seat and welcome. Cigar selection and initial beverage order.
- Minutes 10–15: First drink served. Cigar lit and guest settled.
- Minutes 25–30: Check-in without interruption. "How is everything flowing for you?"
- Minutes 45–50: Second drink prompt and second cigar suggestion.
- Minutes 65–70: Dessert and digestif introduction.
- Minutes 80–85: Bill presentation — never rushed, but positioned while guest is in good spirits.
Table turn guideline: Premium lounge tables should not be turned more than 2x per session. Quality over volume.`,
    keywords: ["table", "pacing", "session", "touchpoints", "timing", "check-in", "turn"],
    roleRelevance: ["server", "manager", "vip_host"],
  },
  {
    id: "ops-shift-prep-001",
    domain: "operations",
    subdomain: "shift_preparation",
    title: "Pre-Shift Preparation Checklist",
    content: `Complete pre-shift checklist for premium lounge operations:
Hardware & Systems:
□ SmokeCraft 360 kiosk: boot, verify touchscreen calibration, confirm network connection
□ ElevenLabs TTS: verify connection status in Settings
□ Stripe: confirm Live Mode active
□ POS system: sync inventory with E.A.T. system
Humidor & Product:
□ Humidity and temperature check (log readings)
□ Visual mold inspection
□ Front-of-house display cigars rotated and presentable
□ Featured selection highlighted in SmokeCraft 360
Floor:
□ Table settings: ashtrays clean, lighters fueled with butane
□ Lighting and ambient audio preset loaded
□ Glassware polished and staged
□ Staff briefed on featured allocations and nightly specials`,
    keywords: ["pre-shift", "checklist", "kiosk", "setup", "preparation", "opening", "floor"],
    roleRelevance: ["manager", "server", "bartender", "tobacconist"],
  },

  // ─── CONFLICT RECOVERY ──────────────────────────────────────────────────────
  {
    id: "conflict-intoxication-001",
    domain: "conflict_recovery",
    subdomain: "intoxication_handling",
    title: "Intoxication Management Protocol",
    content: `Managing overservice situations with discretion and dignity:
Early indicators: Increased volume, repetitive statements, difficulty reading menu, slowed coordination.
1. Slow the pace: Increase time between rounds naturally. "Let me bring that right out for you" — and take 15 minutes.
2. The redirect: "I've asked the kitchen to prepare something for you — our compliments." Food slows absorption.
3. Water presentation: Bring still water without comment. Frame as a palate cleanser between smokes.
4. Manager consultation: If escalation is anticipated, notify manager quietly via SMS — never over radio in guest presence.
5. The graceful close: "Your car has been arranged out front." If no driver, offer to call a car service.
6. Documentation: Log the incident in the system after the guest departs. Include time, table, observable behaviors, and actions taken.
Never: Publicly announce a cut-off. Never argue. Never create a scene. The goal is dignity for the guest, safety for everyone.`,
    keywords: ["intoxication", "overservice", "cut-off", "redirect", "slow", "manager", "safety"],
    roleRelevance: ["bartender", "server", "manager", "vip_host"],
  },
  {
    id: "conflict-complaint-001",
    domain: "conflict_recovery",
    subdomain: "complaint_recovery",
    title: "Guest Complaint Recovery Framework",
    content: `The L.A.S.T. model for luxury complaint resolution:
L — Listen: Give the guest complete attention without interruption. Do not formulate your response while they speak.
A — Acknowledge: "You are absolutely right, and I sincerely apologize for that experience." Never deflect or explain before acknowledging.
S — Solve: Offer a concrete remedy immediately. Don't say "let me check with my manager" — know your authority limits before the shift.
T — Thank: "Thank you for bringing this to my attention. Our standard should always meet your expectations."
Authority tiers:
- Server: May offer complimentary beverage (up to $35 value) or dessert.
- Manager: May void a line item (up to $150) or offer 15% discount.
- Venue Director: Full comp authority.
VIP complaint note: For high-value guests, the remedy should exceed the complaint. A $15 cigar complaint resolves with a $50 credit and a personal follow-up call.`,
    keywords: ["complaint", "LAST", "recovery", "acknowledge", "apologize", "comp", "remedy", "VIP"],
    roleRelevance: ["manager", "server", "vip_host", "concierge"],
  },
  {
    id: "conflict-deescalation-001",
    domain: "conflict_recovery",
    subdomain: "de_escalation",
    title: "De-escalation Techniques",
    content: `Luxury conflict de-escalation prioritizes discretion above all:
1. Physical positioning: Move to the guest's level (sit or crouch if they're seated). Never loom over a guest.
2. Voice control: Speak at 20% below your normal volume. A calm, low voice is physiologically calming.
3. Remove audience: Guide the situation away from other guests. "Let me take care of this for you in our private area."
4. Agree with feelings, not facts: "I completely understand your frustration" does not admit liability.
5. Offer choice: Give the guest two acceptable options. Having agency reduces hostility.
6. The pause technique: Silence (3–5 seconds) after an aggressive statement often prompts the guest to self-correct.
When to involve management: Any situation involving threats, physical contact, or demands that exceed staff authority.
When to involve security: Physical aggression, harassment, or refusal to leave after request.`,
    keywords: ["de-escalation", "calm", "voice", "privacy", "conflict", "aggression", "security"],
    roleRelevance: ["manager", "server", "vip_host", "bartender"],
  },
];

export function searchKnowledge(query: string, role?: string, limit = 5): KnowledgeChunk[] {
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(t => t.length > 2);

  const scored = KNOWLEDGE_BASE.map(chunk => {
    let score = 0;
    const text = `${chunk.title} ${chunk.content} ${chunk.keywords.join(" ")}`.toLowerCase();

    for (const term of terms) {
      if (chunk.keywords.some(k => k.toLowerCase().includes(term))) score += 3;
      if (chunk.title.toLowerCase().includes(term)) score += 2;
      if (chunk.domain.includes(term) || chunk.subdomain.includes(term)) score += 2;
      if (text.includes(term)) score += 1;
    }

    if (role && chunk.roleRelevance.includes(role)) score += 1;

    return { chunk, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.chunk);
}

export function getChunksByDomain(domain: string): KnowledgeChunk[] {
  return KNOWLEDGE_BASE.filter(c => c.domain === domain);
}

export function getAllDomains(): string[] {
  return [...new Set(KNOWLEDGE_BASE.map(c => c.domain))];
}
