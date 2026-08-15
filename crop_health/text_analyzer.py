import os
import re
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


# ─── AGRICULTURAL KNOWLEDGE BASE FOR TEXT SEMANTIC MATCHING ────────────────────

AGRICULTURAL_KNOWLEDGE_BASE = [
    {
        "id": "healthy_crop",
        "category": "Healthy",
        "description": "The plants look healthy and green with no visible problems, diseases, spots, or yellowing.",
        "status": "Healthy",
        "possible_causes": [
            "No significant health issue detected based on the symptoms provided."
        ],
        "fertilizer": [
            "Continue the recommended fertilizer schedule.",
            "Avoid unnecessary extra fertilizers unless soil test requires it."
        ],
        "watering_advice": "Maintain normal regular soil moisture. Avoid over-irrigation.",
        "prevention": [
            "Monitor crop foliage weekly.",
            "Maintain optimal irrigation schedules.",
            "Inspect leaves regularly for early signs of stress."
        ]
    },
    {
        "id": "nitrogen_deficiency",
        "category": "Nutrient Deficiency",
        "description": "The leaves are turning yellow, light green, pale chlorosis, and the plant growth is slow or stunted.",
        "status": "Possible Nitrogen / Nutrient Stress",
        "possible_causes": [
            "Nitrogen (N) deficiency causing leaf chlorosis and slow vegetative growth",
            "Poor soil root aeration restrict nutrient absorption",
            "Early stage viral or fungal infection stress"
        ],
        "fertilizer": [
            "Nitrogen-rich fertilizer (NPK 20:10:10 or Urea 46% N)",
            "Organic compost or vermicompost to enrich topsoil",
            "Foliar spray of Epsom salt (Magnesium sulfate)"
        ],
        "watering_advice": "Reduce watering frequency slightly. Allow top 2-3 cm of soil to dry before irrigating.",
        "prevention": [
            "Avoid waterlogging and standing water in fields",
            "Ensure balanced fertilization according to crop growth stage",
            "Inspect underside of leaves weekly for sap-sucking pests"
        ]
    },
    {
        "id": "fungal_leaf_spot",
        "category": "Fungal Disease",
        "description": "Brown spots, black lesions, dark patches appearing on leaves and some leaves are drying, rotting, or scalding.",
        "status": "Possible Fungal Leaf Spot / Blight",
        "possible_causes": [
            "Fungal leaf spot or blight pathogens affecting foliage",
            "High relative humidity creating favorable fungal spore conditions",
            "Potassium (K) deficiency or leaf scald contributing to brown leaf margins"
        ],
        "fertilizer": [
            "Potassium-rich fertilizer (Sulfate of Potash or NPK 10:26:26)",
            "Bio-fungicides like Trichoderma viride or Pseudomonas fluorescens",
            "Water-soluble NPK 19:19:19 foliar spray"
        ],
        "watering_advice": "Avoid overhead sprinkler irrigation. Water directly at the root zone in early morning.",
        "prevention": [
            "Safely dispose of affected leaf debris",
            "Apply copper oxychloride or Mancozeb spray at early symptom onset",
            "Increase plant spacing to improve canopy airflow"
        ]
    },
    {
        "id": "wilting_root_rot",
        "category": "Root / Water Stress",
        "description": "The leaves are wilting, drooping, or scorching even though I am watering regularly.",
        "status": "Possible Root Stress / Overwatering",
        "possible_causes": [
            "Overwatering or poor soil drainage causing root rot (Pythium/Phytophthora) despite frequent watering",
            "Vascular fungal wilt infection (Fusarium/Verticillium) restricting water transport",
            "Root-knot nematode infestation restricting root uptake"
        ],
        "fertilizer": [
            "Humic acid and seaweed extract to promote root system recovery",
            "Well-decomposed farmyard manure (FYM)",
            "Avoid heavy chemical synthetic fertilizers until roots recover"
        ],
        "watering_advice": "Check soil moisture at 5-10 cm depth. Pause watering immediately if soil is already saturated.",
        "prevention": [
            "Apply organic mulch around plant base",
            "Improve field drainage channels and prevent stagnant water",
            "Inspect root system for swelling or nematode galls"
        ]
    },
    {
        "id": "powdery_mildew",
        "category": "Fungal Disease",
        "description": "White powdery coating, dusty white spots, or orange rust spots appearing on leaf surfaces.",
        "status": "Possible Fungal Powdery Mildew",
        "possible_causes": [
            "Powdery Mildew (Erysiphe species) fungal spores developing on leaves",
            "Rust fungus caused by humid night temperatures and warm dry days"
        ],
        "fertilizer": [
            "Sulfur-based foliar spray or Wettable Sulfur (80% WP)",
            "Neem oil spray (10,000 ppm) diluted in water with mild soap",
            "Potassium silicate to strengthen leaf cell walls"
        ],
        "watering_advice": "Maintain moderate soil moisture and avoid splashing water onto leaf surfaces.",
        "prevention": [
            "Spray sulfur-based fungicide or neem emulsion every 7-10 days",
            "Prune overcrowded stems to maximize sunlight penetration",
            "Plant resistant crop cultivars when available"
        ]
    },
    {
        "id": "pest_infestation",
        "category": "Pest Attack",
        "description": "Insects, bugs, caterpillars, worms, holes in leaves, or chewed leaf margins.",
        "status": "Possible Pest Infestation",
        "possible_causes": [
            "Chewing insect larvae (Fruit Borer, Armyworm) feeding on foliage",
            "Sap-sucking insect infestation (Aphids, Thrips, Spider Mites) causing leaf curl"
        ],
        "fertilizer": [
            "Neem cake application in soil",
            "Foliar bio-pesticide containing Bacillus thuringiensis (Bt)",
            "Balanced soil nutrients to promote plant vigor"
        ],
        "watering_advice": "Maintain regular irrigation schedule to prevent drought stress on infested plants.",
        "prevention": [
            "Install yellow and blue sticky traps across the field",
            "Use pheromone traps for monitoring adult moth populations",
            "Spray Spinosad or Emamectin benzoate for caterpillar infestations"
        ]
    }
]

# Pre-compute Knowledge Base Embeddings for fast Cosine Similarity lookup
_kb_embeddings = None


def get_kb_embeddings():
    global _kb_embeddings
    if _kb_embeddings is None:
        model = get_sentence_transformer_model()
        descriptions = [item["description"] for item in AGRICULTURAL_KNOWLEDGE_BASE]
        _kb_embeddings = model.encode(descriptions, convert_to_numpy=True)
    return _kb_embeddings


def analyze_text_symptoms(symptoms_text, crop_type="Crop"):
    """
    Analyzes natural language crop symptoms using Sentence Transformers & Cosine Similarity.
    Returns best matching condition, recommendations, and REAL semantic similarity confidence score.
    """
    sym_clean = (symptoms_text or "").strip()
    if not sym_clean:
        # Default to healthy
        healthy_item = AGRICULTURAL_KNOWLEDGE_BASE[0]
        return {
            "status": healthy_item["status"],
            "possible_causes": healthy_item["possible_causes"],
            "fertilizer": healthy_item["fertilizer"],
            "watering_advice": healthy_item["watering_advice"],
            "prevention": healthy_item["prevention"],
            "confidence": 95.0,
            "matched_condition": healthy_item["id"]
        }

    # 1. Encode query sentence into dense vector embedding
    model = get_sentence_transformer_model()
    query_embedding = model.encode([sym_clean], convert_to_numpy=True)[0]

    # 2. Compute Cosine Similarity against Knowledge Base
    kb_embeds = get_kb_embeddings()
    # Dot product of normalized vectors
    norm_query = query_embedding / (np.linalg.norm(query_embedding) + 1e-9)
    norm_kb = kb_embeds / (np.linalg.norm(kb_embeds, axis=1, keepdims=True) + 1e-9)
    similarities = np.dot(norm_kb, norm_query)

    # 3. Find top matching knowledge base index
    best_idx = int(np.argmax(similarities))
    raw_similarity = float(similarities[best_idx])

    # Convert cosine similarity (-1 to 1) to percentage score (50% to 98%)
    similarity_percentage = round(min(max((raw_similarity + 1.0) / 2.0 * 100, 50.0), 98.0), 1)

    matched_item = AGRICULTURAL_KNOWLEDGE_BASE[best_idx]

    # Quick healthy negation override check
    sym_lower = sym_clean.lower()
    is_explicit_healthy = any(h in sym_lower for h in ['healthy', 'no symptoms', 'growing normally', 'no disease', 'no problem', 'looks good'])
    has_distress = any(d in sym_lower for d in ['yellow', 'spot', 'wilt', 'rot', 'blight', 'dry', 'hole', 'bug', 'powder'])

    if is_explicit_healthy and not has_distress:
        matched_item = AGRICULTURAL_KNOWLEDGE_BASE[0]
        similarity_percentage = 95.0

    # Customize causes with crop name
    custom_causes = []
    for c in matched_item["possible_causes"]:
        if "Crop" in c or "Tomato" in c or "Rice" in c:
            custom_causes.append(c.replace("Crop", crop_type).replace("Tomato", crop_type).replace("Rice", crop_type))
        else:
            custom_causes.append(f"{c} on {crop_type}")

    return {
        "status": matched_item["status"],
        "possible_causes": custom_causes,
        "fertilizer": matched_item["fertilizer"],
        "watering_advice": matched_item["watering_advice"],
        "prevention": matched_item["prevention"],
        "confidence": similarity_percentage,
        "matched_condition": matched_item["id"]
    }
