import os
import numpy as np

# Lazy load sentence transformers to optimize backend startup time
_sentence_model = None


def get_sentence_transformer_model():
    global _sentence_model
    if _sentence_model is None:
        from sentence_transformers import SentenceTransformer
        # Load lightweight all-MiniLM-L6-v2 model
        _sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _sentence_model


CROP_ALIAS_MAP = {
    "paddy / rice": "Rice",
    "paddy": "Rice",
    "rice": "Rice",
    "maize": "Maize",
    "corn": "Maize",
    "tomato": "Tomato",
    "potato": "Potato",
    "apple": "Apple",
    "banana": "Banana",
    "cotton": "Cotton",
    "wheat": "Wheat",
    "chilli": "Chilli",
    "chili": "Chilli",
    "coconut": "Coconut",
    "sugarcane": "Sugarcane"
}


def normalize_crop_name(crop_str):
    if not crop_str:
        return "General"
    clean = crop_str.strip().lower()
    return CROP_ALIAS_MAP.get(clean, crop_str.strip())


# ─── AGRICULTURAL KNOWLEDGE BASE FOR ALL 11 CROPS ────────────────────────────
AGRICULTURAL_KNOWLEDGE_BASE = [
    # GENERAL
    {
        "id": "healthy_crop", "crop": "General", "category": "Healthy",
        "description": "The plants look healthy and green with no visible problems, diseases, spots, or yellowing.",
        "status": "Healthy", "disease_name": "Healthy Foliage",
        "possible_causes": ["No significant health issue detected based on symptoms."],
        "symptoms": ["Normal green foliage"],
        "fertilizer": ["Continue recommended fertilizer schedule."],
        "treatment": ["No treatment required."],
        "watering_advice": "Maintain normal regular soil moisture.",
        "prevention": ["Monitor crop foliage weekly", "Optimal irrigation schedules"]
    },
    {
        "id": "nitrogen_deficiency", "crop": "General", "category": "Nutrient Stress",
        "description": "Leaves are turning yellow, light green, pale chlorosis, slow stunted growth.",
        "status": "Possible Nitrogen Deficiency", "disease_name": "Nitrogen Deficiency",
        "possible_causes": ["Nitrogen deficiency causing pale yellow leaves and slow growth."],
        "symptoms": ["Leaf chlorosis starting at lower foliage"],
        "fertilizer": ["Urea 46% N or NPK 20:10:10 application."],
        "treatment": ["Soil application of Nitrogen-rich fertilizer."],
        "watering_advice": "Allow soil surface to dry between watering.",
        "prevention": ["Balanced soil fertilization"]
    },

    # TOMATO
    {
        "id": "tomato_bacterial_spot", "crop": "Tomato", "category": "Bacterial Disease",
        "description": "Tomato leaves with small dark water soaked spots and yellow halos.",
        "status": "Possible Tomato Bacterial Spot", "disease_name": "Tomato Bacterial Spot",
        "possible_causes": ["Xanthomonas bacteria spread by rain splash or overhead watering."],
        "symptoms": ["Dark water-soaked spots with chlorotic halos"],
        "fertilizer": ["Potassium enrichment"],
        "treatment": ["Spray Copper Oxychloride + Streptocycline."],
        "watering_advice": "Drip irrigation at base.", "prevention": ["Use disease-free certified seeds"]
    },
    {
        "id": "tomato_early_blight", "crop": "Tomato", "category": "Fungal Disease",
        "description": "Tomato leaves with dark brown concentric ring target spots on lower foliage.",
        "status": "Possible Tomato Early Blight", "disease_name": "Tomato Early Blight",
        "possible_causes": ["Alternaria solani fungal infection."],
        "symptoms": ["Concentric target-board brown spots"],
        "fertilizer": ["Sulfate of Potash"],
        "treatment": ["Foliar spray of Mancozeb or Copper fungicide."],
        "watering_advice": "Irrigate roots early morning.", "prevention": ["Prune bottom leaves"]
    },
    {
        "id": "tomato_late_blight", "crop": "Tomato", "category": "Fungal Disease",
        "description": "Tomato leaves with large dark brown water soaked spots, white mold beneath foliage.",
        "status": "Possible Tomato Late Blight", "disease_name": "Tomato Late Blight",
        "possible_causes": ["Phytophthora infestans water mold."],
        "symptoms": ["Rapidly expanding brown necrotic water-soaked lesions"],
        "fertilizer": ["Calcium nitrate foliar spray"],
        "treatment": ["Apply Metalaxyl or Chlorothalonil fungicide."],
        "watering_advice": "Keep foliage dry.", "prevention": ["Destroy infected plant tissue"]
    },

    # RICE
    {
        "id": "rice_blast", "crop": "Rice", "category": "Fungal Disease",
        "description": "Rice diamond shaped spindle lesions with gray center and brown margins on leaves.",
        "status": "Possible Rice Blast", "disease_name": "Rice Blast",
        "possible_causes": ["Magnaporthe oryzae fungal spores."],
        "symptoms": ["Diamond shaped spindle leaf lesions"],
        "fertilizer": ["Split Potash application"],
        "treatment": ["Foliar Tricyclazole spray."],
        "watering_advice": "Maintain steady field water depth.", "prevention": ["Avoid excessive nitrogen"]
    },
    {
        "id": "rice_brown_spot", "crop": "Rice", "category": "Fungal Disease",
        "description": "Rice oval dark brown spots on paddy leaves caused by nutrient deficiency.",
        "status": "Possible Rice Brown Spot", "disease_name": "Rice Brown Spot",
        "possible_causes": ["Bipolaris oryzae fungus associated with poor soil fertility."],
        "symptoms": ["Oval dark brown leaf spots"],
        "fertilizer": ["Apply Potassium and Zinc sulfate"],
        "treatment": ["Foliar spray of Mancozeb."],
        "watering_advice": "Prevent drought stress.", "prevention": ["Seed treatment with Carbendazim"]
    },
    {
        "id": "rice_bacterial_blight", "crop": "Rice", "category": "Bacterial Disease",
        "description": "Rice leaf margins drying turning yellow to white with bacterial droplets.",
        "status": "Possible Rice Bacterial Leaf Blight", "disease_name": "Rice Bacterial Leaf Blight",
        "possible_causes": ["Xanthomonas oryzae bacteria."],
        "symptoms": ["Wavy yellow margins drying to grayish white"],
        "fertilizer": ["Reduce nitrogen doses"],
        "treatment": ["Spray Streptocycline + Copper Oxychloride."],
        "watering_advice": "Drain field temporarily.", "prevention": ["Resistant rice varieties"]
    },

    # MAIZE
    {
        "id": "maize_common_rust", "crop": "Maize", "category": "Fungal Disease",
        "description": "Maize corn leaves covered with oval powdery cinnamon brown rust pustules.",
        "status": "Possible Maize Common Rust", "disease_name": "Maize Common Rust",
        "possible_causes": ["Puccinia sorghi fungal rust spores."],
        "symptoms": ["Powdery reddish-brown rust pustules"],
        "fertilizer": ["NPK balanced application"],
        "treatment": ["Spray Propiconazole or Azoxystrobin."],
        "watering_advice": "Regular irrigation.", "prevention": ["Plant rust-resistant corn hybrids"]
    },

    # POTATO
    {
        "id": "potato_early_blight", "crop": "Potato", "category": "Fungal Disease",
        "description": "Potato leaves developing dark brown spots with concentric rings target spots.",
        "status": "Possible Potato Early Blight", "disease_name": "Potato Early Blight",
        "possible_causes": ["Alternaria solani fungal infection."],
        "symptoms": ["Concentric dark brown target leaf spots"],
        "fertilizer": ["Potassium enrichment"],
        "treatment": ["Mancozeb 75% WP spray."],
        "watering_advice": "Irrigate early in the day.", "prevention": ["Crop rotation"]
    },
    {
        "id": "potato_late_blight", "crop": "Potato", "category": "Fungal Disease",
        "description": "Potato leaves showing dark brown water soaked spots expanding in wet weather.",
        "status": "Possible Potato Late Blight", "disease_name": "Potato Late Blight",
        "possible_causes": ["Phytophthora infestans water mold."],
        "symptoms": ["Dark brown water-soaked lesions"],
        "fertilizer": ["Calcium nitrate"],
        "treatment": ["Apply Dimethomorph or Cymoxanil."],
        "watering_advice": "Avoid overhead irrigation.", "prevention": ["Destroy infected vines"]
    },

    # APPLE
    {
        "id": "apple_scab", "crop": "Apple", "category": "Fungal Disease",
        "description": "Apple leaf velvety olive green to dark brown spots.",
        "status": "Possible Apple Scab", "disease_name": "Apple Scab",
        "possible_causes": ["Venturia inaequalis fungus."],
        "symptoms": ["Olive green velvety leaf spots"],
        "fertilizer": ["Orchard NPK"],
        "treatment": ["Foliar Captan spray."],
        "watering_advice": "Keep canopy dry.", "prevention": ["Prune tree canopy"]
    },
    {
        "id": "apple_black_rot", "crop": "Apple", "category": "Fungal Disease",
        "description": "Apple leaves showing frog-eye brown spots with purple margins.",
        "status": "Possible Apple Black Rot", "disease_name": "Apple Black Rot",
        "possible_causes": ["Botryosphaeria obtusa fungus."],
        "symptoms": ["Frog-eye spots with purple borders"],
        "fertilizer": ["Potash spray"],
        "treatment": ["Apply Thiophanate-methyl."],
        "watering_advice": "Drip irrigation.", "prevention": ["Prune dead twigs"]
    },

    # BANANA
    {
        "id": "banana_black_sigatoka", "crop": "Banana", "category": "Fungal Disease",
        "description": "Banana reddish brown streaks expanding into dark necrotic leaf blights.",
        "status": "Possible Banana Black Sigatoka", "disease_name": "Banana Black Sigatoka",
        "possible_causes": ["Mycosphaerella fijiensis fungus."],
        "symptoms": ["Dark reddish-brown leaf streaks and dead fronds"],
        "fertilizer": ["Foliar Potash"],
        "treatment": ["Foliar spray of Propiconazole or Difenoconazole."],
        "watering_advice": "Good field drainage.", "prevention": ["De-leaf affected fronds"]
    },
    {
        "id": "banana_panama_disease", "crop": "Banana", "category": "Fungal Disease",
        "description": "Banana leaves yellowing at margins, pseudostem splitting base.",
        "status": "Possible Panama Disease", "disease_name": "Panama Disease (Fusarium Wilt)",
        "possible_causes": ["Fusarium oxysporum f. sp. cubense soil fungus."],
        "symptoms": ["Leaf margin yellowing and pseudostem cracking"],
        "fertilizer": ["Organic FYM manure"],
        "treatment": ["Quarantine infected mats."],
        "watering_advice": "Avoid standing water.", "prevention": ["Use clean tissue-culture plantlets"]
    },

    # COTTON
    {
        "id": "cotton_bacterial_blight", "crop": "Cotton", "category": "Bacterial Disease",
        "description": "Cotton angular water soaked leaf lesions under surface.",
        "status": "Possible Cotton Bacterial Blight", "disease_name": "Cotton Bacterial Blight",
        "possible_causes": ["Xanthomonas citri pv. malvacearum bacteria."],
        "symptoms": ["Angular water-soaked spots"],
        "fertilizer": ["Potash split application"],
        "treatment": ["Spray Copper Oxychloride + Streptocycline."],
        "watering_advice": "Furrow irrigation.", "prevention": ["Acid-delinted seeds"]
    },

    # WHEAT
    {
        "id": "wheat_leaf_rust", "crop": "Wheat", "category": "Fungal Disease",
        "description": "Wheat small orange red dusty pustules scattered on leaf surface.",
        "status": "Possible Wheat Leaf Rust", "disease_name": "Wheat Leaf Rust",
        "possible_causes": ["Puccinia triticina rust fungus."],
        "symptoms": ["Orange-red dusty rust pustules"],
        "fertilizer": ["NPK 12:32:16"],
        "treatment": ["Foliar Tebuconazole spray."],
        "watering_advice": "Irrigate at crown root stage.", "prevention": ["Resistant wheat cultivars"]
    },

    # CHILLI
    {
        "id": "chilli_anthracnose", "crop": "Chilli", "category": "Fungal Disease",
        "description": "Chilli small black circular spots on leaves and fruit dieback.",
        "status": "Possible Chilli Anthracnose", "disease_name": "Chilli Anthracnose",
        "possible_causes": ["Colletotrichum capsici fungus."],
        "symptoms": ["Black circular leaf spots and dieback"],
        "fertilizer": ["Potash enrichment"],
        "treatment": ["Spray Azoxystrobin or Mancozeb."],
        "watering_advice": "Drip irrigation.", "prevention": ["Seed treatment with Thiram"]
    },

    # COCONUT
    {
        "id": "coconut_bud_rot", "crop": "Coconut", "category": "Fungal Disease",
        "description": "Coconut yellowing wilting of spindle leaf with crown rot.",
        "status": "Possible Coconut Bud Rot", "disease_name": "Coconut Bud Rot",
        "possible_causes": ["Phytophthora palmivora water mold."],
        "symptoms": ["Rotting of spear leaf base and crown wilting"],
        "fertilizer": ["Organic coconut mixture"],
        "treatment": ["Apply 1% Bordeaux mixture to palm crown."],
        "watering_advice": "Prevent water accumulation in crown.", "prevention": ["Crown sanitation"]
    },

    # SUGARCANE
    {
        "id": "sugarcane_red_rot", "crop": "Sugarcane", "category": "Fungal Disease",
        "description": "Sugarcane leaf yellowing third leaf reddening stalk internal tissue.",
        "status": "Possible Sugarcane Red Rot", "disease_name": "Sugarcane Red Rot",
        "possible_causes": ["Colletotrichum falcatum fungus."],
        "symptoms": ["Stalk reddening with white cross-band patches"],
        "fertilizer": ["Farmyard manure"],
        "treatment": ["Rogue out affected clumps."],
        "watering_advice": "Ensure good drainage.", "prevention": ["Use hot water treated setts"]
    }
]


def analyze_text_symptoms(symptoms_text, crop_type="Crop"):
    """
    Analyzes natural language crop symptoms using Sentence Transformers & Cosine Similarity.
    Filters Knowledge Base by selected crop prior to vector embedding & similarity calculation.
    """
    norm_crop = normalize_crop_name(crop_type)
    sym_clean = (symptoms_text or "").strip()

    # Filter Knowledge Base by Crop Compatibility (Selected Crop + General)
    filtered_kb = [
        item for item in AGRICULTURAL_KNOWLEDGE_BASE
        if item["crop"] == "General" or item["crop"].lower() == norm_crop.lower()
    ]

    if not filtered_kb:
        filtered_kb = [item for item in AGRICULTURAL_KNOWLEDGE_BASE if item["crop"] == "General"]

    if not sym_clean:
        healthy_item = filtered_kb[0]
        return {
            "status": healthy_item["status"],
            "disease": healthy_item["disease_name"],
            "disease_name": healthy_item["disease_name"],
            "possible_causes": healthy_item["possible_causes"],
            "symptoms": healthy_item.get("symptoms", ["Normal green foliage"]),
            "treatment": healthy_item.get("treatment", ["No treatment required."]),
            "fertilizer": healthy_item.get("fertilizer", []),
            "watering_advice": healthy_item["watering_advice"],
            "prevention": healthy_item["prevention"],
            "confidence": 95.0,
            "confidence_level": "HIGH",
            "requires_clearer_image": False,
            "matched_condition": healthy_item["id"]
        }

    # Encode Query & Filtered Knowledge Base
    model = get_sentence_transformer_model()
    query_embedding = model.encode([sym_clean], convert_to_numpy=True)[0]

    descriptions = [item["description"] for item in filtered_kb]
    kb_embeddings = model.encode(descriptions, convert_to_numpy=True)

    # Cosine Similarity
    norm_query = query_embedding / (np.linalg.norm(query_embedding) + 1e-9)
    norm_kb = kb_embeddings / (np.linalg.norm(kb_embeddings, axis=1, keepdims=True) + 1e-9)
    similarities = np.dot(norm_kb, norm_query)

    # Calculate disease-level softmax probability distribution vector
    exp_sims = np.exp((similarities - np.max(similarities)) / 0.1)  # Temperature T_text = 0.1
    disease_probs_vector = exp_sims / np.sum(exp_sims)

    disease_probabilities = {}
    for idx, item in enumerate(filtered_kb):
        disease_key = item.get("id", f"disease_{idx}")
        disease_probabilities[disease_key] = float(disease_probs_vector[idx])
        # Also store under human disease_name
        disease_probabilities[item.get("disease_name", disease_key)] = float(disease_probs_vector[idx])

    best_idx = int(np.argmax(similarities))
    raw_similarity = float(similarities[best_idx])

    similarity_percentage = round(min(max((raw_similarity + 1.0) / 2.0 * 100, 50.0), 98.0), 1)

    matched_item = filtered_kb[best_idx]

    # Categorize confidence level
    if similarity_percentage >= 80.0:
        confidence_level = "HIGH"
    elif similarity_percentage >= 60.0:
        confidence_level = "MEDIUM"
    else:
        confidence_level = "LOW"

    # Healthy negation override check
    sym_lower = sym_clean.lower()
    is_explicit_healthy = any(h in sym_lower for h in ['healthy', 'no symptoms', 'growing normally', 'no disease', 'no problem', 'looks good'])
    has_distress = any(d in sym_lower for d in ['yellow', 'spot', 'wilt', 'rot', 'blight', 'dry', 'hole', 'bug', 'powder', 'rust', 'smut'])

    if is_explicit_healthy and not has_distress:
        healthy_candidates = [item for item in filtered_kb if item["id"] == "healthy_crop"]
        matched_item = healthy_candidates[0] if healthy_candidates else filtered_kb[0]
        similarity_percentage = 95.0
        confidence_level = "HIGH"

    return {
        "status": matched_item["status"],
        "disease": matched_item["disease_name"],
        "disease_name": matched_item["disease_name"],
        "possible_causes": matched_item["possible_causes"],
        "symptoms": matched_item.get("symptoms", [sym_clean]),
        "treatment": matched_item.get("treatment", ["Consult agricultural extension officer."]),
        "control_measures": matched_item.get("control_measures", matched_item.get("treatment", [])),
        "nutrient_management": matched_item.get("nutrient_management", matched_item.get("fertilizer", [])),
        "fertilizer": matched_item.get("fertilizer", []),
        "watering_advice": matched_item["watering_advice"],
        "prevention": matched_item["prevention"],
        "confidence": similarity_percentage,
        "confidence_level": confidence_level,
        "requires_clearer_image": False,
        "matched_condition": matched_item["id"],
        "disease_probabilities": disease_probabilities
    }
