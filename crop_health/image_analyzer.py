import os
import json
import numpy as np

# Cache for 11 crop-specific MobileNetV2 models and class index mappings
_crop_models = {}
_crop_class_indices = {}

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_models")
CROP_MODELS_DIR = os.path.join(MODEL_DIR, "crop_models")
CLASS_NAMES_DIR = os.path.join(MODEL_DIR, "class_names")

SUPPORTED_CROPS = {
    "tomato": "Tomato",
    "rice": "Paddy / Rice",
    "maize": "Maize",
    "potato": "Potato",
    "apple": "Apple",
    "banana": "Banana",
    "cotton": "Cotton",
    "wheat": "Wheat",
    "chilli": "Chilli",
    "coconut": "Coconut",
    "sugarcane": "Sugarcane"
}

CROP_ALIAS_MAP = {
    "paddy / rice": "rice",
    "paddy": "rice",
    "rice": "rice",
    "maize": "maize",
    "corn": "maize",
    "tomato": "tomato",
    "potato": "potato",
    "apple": "apple",
    "banana": "banana",
    "cotton": "cotton",
    "wheat": "wheat",
    "chilli": "chilli",
    "chili": "chilli",
    "coconut": "coconut",
    "sugarcane": "sugarcane"
}


def normalize_crop_key(crop_str):
    if not crop_str:
        return "unknown"
    clean = crop_str.strip().lower()
    return CROP_ALIAS_MAP.get(clean, clean)


def load_crop_model(crop_key):
    """
    Dynamically loads the dedicated MobileNetV2 Keras model and class mapping for a specific crop.
    """
    global _crop_models, _crop_class_indices

    if crop_key in _crop_models:
        return _crop_models[crop_key], _crop_class_indices[crop_key]

    model_path = os.path.join(CROP_MODELS_DIR, f"{crop_key}_disease_model.keras")
    classes_path = os.path.join(CLASS_NAMES_DIR, f"{crop_key}_classes.json")

    # Fallback to single legacy model if crop model not found
    if not os.path.exists(model_path):
        model_path = os.path.join(MODEL_DIR, "crop_disease_mobilenetv2.keras")
        classes_path = os.path.join(MODEL_DIR, "crop_disease_classes.json")

    if not os.path.exists(model_path) or not os.path.exists(classes_path):
        return None, None

    import tensorflow as tf
    try:
        model = tf.keras.models.load_model(model_path)
        with open(classes_path, "r") as f:
            mapping = json.load(f)
            class_indices = {v: k for k, v in mapping.items()}

        _crop_models[crop_key] = model
        _crop_class_indices[crop_key] = class_indices
        return model, class_indices
    except Exception as e:
        print(f"Error loading model for {crop_key}: {e}")
        return None, None


# ─── COMPREHENSIVE AGRICULTURAL KNOWLEDGE BASE ────────────────────────────────
DISEASE_KNOWLEDGE_MAP = {
    # ── COCONUT ──
    "healthy": {
        "crop": "Coconut", "disease": "Healthy Coconut Palm",
        "causes": ["No disease symptoms or pathogen lesions detected."],
        "symptoms": ["Normal green fronds and healthy crown spear leaf growth."],
        "prevention": [
            "1. Quarterly crown inspection.",
            "2. Proper palm spacing (7.5m x 7.5m).",
            "3. Regular field sanitation and crown cleaning."
        ],
        "control_measures": ["No chemical treatment required."],
        "nutrient_management": ["Apply standard coconut fertilizer (500g N, 320g P2O5, 1200g K2O per palm/year)."],
        "watering": "Maintain adequate irrigation according to soil and weather conditions."
    },
    "leaf_rot": {
        "crop": "Coconut", "disease": "Coconut Leaf Rot",
        "causes": ["Bipolaris halodes (Helminthosporium halodes) and Colletotrichum gloeosporioides fungal pathogens."],
        "symptoms": [
            "Blackening and necrosis starting at the tips of young spear leaves.",
            "Rotting and shredding of distal leaflets on newly emerging fronds.",
            "Dark grayish-brown lesions expanding along the frond surface."
        ],
        "prevention": [
            "1. Remove severely affected leaf rot fronds and burn them to prevent fungal spore distribution.",
            "2. Maintain good field sanitation and weed clearance around the palm base.",
            "3. Avoid prolonged excessive moisture around the crown area.",
            "4. Monitor newly emerging spear leaves and crown foliage weekly.",
            "5. Follow locally recommended disease-management practices."
        ],
        "control_measures": ["Crown application of Hexaconazole 5% EC (2 ml/L) or Mancozeb 75% WP (3 g/L) directly onto spear leaf and crown foliage."],
        "nutrient_management": ["Apply Potassium (1.2 kg K2O/palm/year) & Magnesium sulfate to strengthen palm foliage immunity against fungal infection."],
        "watering": "Maintain adequate irrigation according to soil and weather conditions. Avoid excessive moisture around the crown and affected plant parts. Avoid unnecessary wetting of foliage."
    },
    "bud_rot": {
        "crop": "Coconut", "disease": "Coconut Bud Rot",
        "causes": ["Phytophthora palmivora water mold pathogen thriving during heavy monsoon rainfall."],
        "symptoms": [
            "Wilting and paleness of central spear leaf.",
            "Base of spear leaf rots into foul-smelling soft tissue.",
            "Spear leaf easily detaches when pulled."
        ],
        "prevention": [
            "1. Inspect palm crown before monsoon season.",
            "2. Ensure canopy ventilation and remove dead spathes.",
            "3. Avoid stagnant water in the crown area.",
            "4. Apply prophylactic 1% Bordeaux mixture before monsoon rains."
        ],
        "control_measures": ["Remove rotted crown tissues and apply 1% Bordeaux mixture or Copper Oxychloride paste (50g in 500ml water) to the cut crown surface."],
        "nutrient_management": ["Apply balanced organic manure and FYM (50 kg/palm/year) to aid crown recovery."],
        "watering": "Maintain adequate basal basin irrigation. Avoid spraying or splashing water into the palm crown area."
    },
    "stem_bleeding": {
        "crop": "Coconut", "disease": "Coconut Stem Bleeding",
        "causes": ["Thielaviopsis paradoxa (Ceratocystis paradoxa) fungus entering through trunk growth cracks or wounds."],
        "symptoms": [
            "Exudation of dark reddish-brown liquid from trunk growth cracks.",
            "Discoloration and decay of internal trunk tissues behind bleeding points."
        ],
        "prevention": [
            "1. Protect palm trunk from mechanical injuries during weeding.",
            "2. Avoid chisel or knife wounds on lower stem.",
            "3. Paint trunk base with coal tar or Bordeaux paste."
        ],
        "control_measures": ["Chisel out affected bleeding tissues, dress wound with 5% Calixin/Tridemorph or Bordeaux paste, and seal with coal tar."],
        "nutrient_management": ["Apply extra Potassium (K) and Organic Neem cake (5 kg/palm) to promote bark healing."],
        "watering": "Provide regular basin irrigation during summer dry spells to prevent trunk growth stress cracks."
    },
    "basal_stem_rot": {
        "crop": "Coconut", "disease": "Coconut Basal Stem Rot (Thanjavur Wilt)",
        "causes": ["Ganoderma lucidum / Ganoderma applanatum soil-borne bracket fungus."],
        "symptoms": [
            "Yellowing, drooping, and drying of outer fronds.",
            "Exudation of reddish-brown gum at stem base.",
            "Bracket mushroom fruiting bodies appearing at trunk base."
        ],
        "prevention": [
            "1. Dig isolation trenches (1m deep, 30cm wide) around infected palms.",
            "2. Apply Green manure / Trichoderma viride to soil.",
            "3. Destroy infected palm stumps completely."
        ],
        "control_measures": ["Root feeding with Hexaconazole 5% EC (2 ml in 100 ml water) per palm at quarterly intervals."],
        "nutrient_management": ["Apply 5 kg Neem cake mixed with Trichoderma viride bio-fungicide and 1 kg Gypsum per palm/year."],
        "watering": "Maintain soil moisture in the basin without waterlogging near stem base."
    },

    # ── TOMATO ──
    "bacterial_spot": {
        "crop": "Tomato", "disease": "Tomato Bacterial Spot",
        "causes": ["Xanthomonas bacteria infection spread by rain splash."],
        "symptoms": ["Small dark water-soaked spots with yellow halos on foliage."],
        "prevention": ["Use certified disease-free seeds", "Avoid overhead irrigation"],
        "control_measures": ["Apply copper-based bactericide + Streptocycline."],
        "nutrient_management": ["Potassium enrichment."],
        "watering": "Drip irrigation at root zone."
    },
    "early_blight": {
        "crop": "Tomato", "disease": "Tomato Early Blight",
        "causes": ["Alternaria solani fungal infection."],
        "symptoms": ["Dark brown concentric ring target spots on lower leaves."],
        "prevention": ["Prune lower leaves", "Crop rotation"],
        "control_measures": ["Spray Mancozeb or Copper fungicide."],
        "nutrient_management": ["Balanced NPK."],
        "watering": "Irrigate at base early morning."
    },
    "late_blight": {
        "crop": "Tomato", "disease": "Tomato Late Blight",
        "causes": ["Phytophthora infestans water mold."],
        "symptoms": ["Large water-soaked dark lesions with white mold under leaves."],
        "prevention": ["Destroy infected plants", "Ensure dry leaf foliage"],
        "control_measures": ["Apply systemic Metalaxyl or Chlorothalonil fungicide."],
        "nutrient_management": ["Calcium nitrate foliar spray."],
        "watering": "Avoid wet canopy."
    },

    # ── RICE ──
    "rice_blast": {
        "crop": "Paddy / Rice", "disease": "Rice Blast",
        "causes": ["Magnaporthe oryzae fungal spores."],
        "symptoms": ["Diamond shaped spindle leaf lesions with gray center and brown margins."],
        "prevention": ["Avoid excessive nitrogen fertilization", "Use blast resistant seeds"],
        "control_measures": ["Foliar Tricyclazole or Isoprothiolane spray."],
        "nutrient_management": ["Split Potash application."],
        "watering": "Maintain steady field water depth."
    },
    "rice_brown_spot": {
        "crop": "Paddy / Rice", "disease": "Rice Brown Spot",
        "causes": ["Bipolaris oryzae fungus associated with poor soil fertility."],
        "symptoms": ["Oval dark brown leaf spots on paddy foliage."],
        "prevention": ["Soil fertility correction", "Seed treatment with Carbendazim"],
        "control_measures": ["Foliar spray of Mancozeb or Edifenphos."],
        "nutrient_management": ["Apply Potassium and Zinc sulfate."],
        "watering": "Prevent drought stress."
    }
}


def validate_image_input(image_input):
    """
    Validates leaf image file format, readability, RGB channels, and minimum dimensions (50x50).
    """
    from PIL import Image
    try:
        if isinstance(image_input, str):
            pil_img = Image.open(image_input)
        else:
            pil_img = Image.open(image_input)

        pil_img.verify()
        if isinstance(image_input, str):
            pil_img = Image.open(image_input).convert('RGB')
        else:
            image_input.seek(0)
            pil_img = Image.open(image_input).convert('RGB')

        w, h = pil_img.size
        if w < 50 or h < 50:
            return None, {
                "error": "image_too_small",
                "message": f"Image resolution ({w}x{h}) is too low. Please upload a clear crop leaf photo (at least 50x50 pixels)."
            }

        return pil_img, None
    except Exception as e:
        return None, {
            "error": "invalid_image",
            "message": f"Invalid or unreadable image file: {str(e)}. Please upload a valid JPG/PNG leaf image."
        }


def check_image_quality(pil_img, crop_type="Crop"):
    """
    Validates image suitability for disease diagnosis:
    - Blurriness (Laplacian variance or variance of Laplacian gradients)
    - Brightness / Exposure (extremely dark < 30 or overexposed > 230)
    - Plant foliage presence (minimum green/brown pixel ratio)
    """
    try:
        img_np = np.array(pil_img)
        h, w, c = img_np.shape

        # 1. Exposure Check (Grayscale Mean)
        gray = np.mean(img_np, axis=2)
        mean_bright = np.mean(gray)

        if mean_bright < 30:
            return False, "dark", f"The uploaded image is extremely dark (brightness: {mean_bright:.1f}/255). Please upload a well-lit photo of the affected {crop_type.lower()} leaf or crown area."

        if mean_bright > 230:
            return False, "overexposed", f"The uploaded image is overexposed (brightness: {mean_bright:.1f}/255). Please avoid harsh glare and upload a clear photo of the affected {crop_type.lower()} leaf or crown area."

        # 2. Blurriness Check (Grayscale Variance / Gradients)
        gx, gy = np.gradient(gray)
        gnorm = np.sqrt(gx**2 + gy**2)
        variance = np.var(gnorm)

        if variance < 1.5:
            return False, "blurry", f"The uploaded image appears very blurry (sharpness score: {variance:.1f}). Please upload a clear, focused image of the affected {crop_type.lower()} leaf or crown area."

        # 3. Foliage / Plant Material Ratio Check
        r, g, b = img_np[:, :, 0], img_np[:, :, 1], img_np[:, :, 2]
        # Greenish foliage OR chlorotic yellow leaves OR brownish necrotic lesions
        foliage_pixels = np.sum((g > r * 0.8) | ((r > 60) & (g > 40)) | (g > 40))
        total_pixels = h * w
        foliage_ratio = foliage_pixels / float(total_pixels)

        if foliage_ratio < 0.01:
            return False, "low_plant_content", f"Unable to detect visible {crop_type.lower()} foliage or plant area in the image. Please upload a clear photo showing the affected leaf, spear leaf, or crown."

        return True, "acceptable", "Image quality is acceptable for AI disease classification."

    except Exception as e:
        print(f"Image quality evaluation error: {e}")
        return True, "acceptable", "Image quality check completed."


def analyze_crop_image(image_input, crop_type="Crop"):
    """
    Preprocesses uploaded leaf image and routes prediction to the matching crop MobileNetV2 CNN model.
    """
    crop_key = normalize_crop_key(crop_type)

    # 1. Check Model-Crop Support
    if crop_key not in SUPPORTED_CROPS and crop_key != "general":
        return {
            "supported": False,
            "crop": crop_type,
            "message": f"Disease detection is currently unavailable for this crop ({crop_type}).",
            "status": f"Unsupported Crop ({crop_type})",
            "disease": "N/A - Model Crop Not Supported",
            "disease_name": "N/A - Model Crop Not Supported",
            "confidence": 0.0,
            "confidence_level": "LOW",
            "requires_clearer_image": False,
            "model": "MobileNetV2",
            "image_quality": "unsupported_crop",
            "possible_causes": ["Image disease detection is available for: Tomato, Paddy / Rice, Maize, Potato, Apple, Banana, Cotton, Wheat, Chilli, Coconut, Sugarcane."],
            "symptoms": ["N/A"],
            "prevention": ["Use natural language symptom analysis for AI diagnosis."],
            "control_measures": ["Consult local agricultural extension officer."],
            "treatment": ["Consult local agricultural extension officer."],
            "fertilizer": [],
            "nutrient_management": [],
            "watering_advice": "Follow standard crop irrigation practices."
        }

    # 2. Validate Image File Format & Quality
    pil_img, img_err = validate_image_input(image_input)
    if img_err:
        return img_err

    # 3. Check Image Quality (Blur, Exposure, Plant Content)
    is_acceptable, quality_code, quality_msg = check_image_quality(pil_img, crop_type=crop_type)
    if not is_acceptable:
        return {
            "supported": True,
            "crop": SUPPORTED_CROPS.get(crop_key, crop_type),
            "image_quality": quality_code,
            "requires_clearer_image": True,
            "message": f"Unable to determine disease reliably.\n\n{quality_msg}",
            "status": "Poor Image Quality",
            "disease": "Unable to determine disease reliably",
            "disease_name": "Unable to determine disease reliably",
            "confidence": 0.0,
            "confidence_level": "LOW",
            "model": "MobileNetV2",
            "possible_causes": [quality_msg],
            "symptoms": ["Unclear foliage details"],
            "prevention": ["Upload a sharp, well-lit photograph of the plant leaf or crown area."],
            "control_measures": ["Confirm disease with a clearer image before applying chemical treatments."],
            "treatment": ["Confirm disease with a clearer image before applying chemical treatments."],
            "fertilizer": [],
            "nutrient_management": [],
            "watering_advice": "Maintain normal crop watering."
        }

    # 4. Load Dedicated Model for Crop
    model, class_indices = load_crop_model(crop_key)
    if model is None or not class_indices:
        return {
            "supported": False,
            "error": "model_not_available",
            "message": f"MobileNetV2 model for crop '{crop_type}' is currently unavailable."
        }

    try:
        import cv2

        # 5. Preprocess Image (224x224 RGB, rescaled to [0,1])
        img_np = np.array(pil_img)
        img_resized = cv2.resize(img_np, (224, 224))
        img_rescaled = img_resized.astype(np.float32) / 255.0
        img_batch = np.expand_dims(img_rescaled, axis=0)

        # 6. Predict using Crop's MobileNetV2 Model
        preds = model.predict(img_batch)[0]
        
        # Apply Temperature Scaling Calibration (T = 1.25)
        T = 1.25
        logits = np.log(np.clip(preds, 1e-9, 1.0))
        calibrated_exp = np.exp(logits / T)
        calibrated_probs = calibrated_exp / np.sum(calibrated_exp)

        top_idx = int(np.argmax(calibrated_probs))

        # Softmax calibrated confidence score
        confidence_val = round(float(calibrated_probs[top_idx]) * 100, 1)
        raw_confidence_val = round(float(preds[top_idx]) * 100, 1)
        predicted_class_raw = class_indices.get(top_idx, "healthy")

        # Map full class probability distribution
        disease_probabilities = {}
        for idx, prob in enumerate(calibrated_probs):
            c_name = class_indices.get(idx, f"class_{idx}")
            disease_probabilities[c_name.lower()] = float(prob)

        # Normalize raw class key
        class_key = predicted_class_raw.lower().replace("___", "_").replace(" ", "_")

        # 7. Categorize Confidence Level (HIGH >=80%, MEDIUM 60-79%, LOW <60%)
        if confidence_val >= 80.0:
            confidence_level = "HIGH"
            requires_clearer_image = False
        elif confidence_val >= 60.0:
            confidence_level = "MEDIUM"
            requires_clearer_image = False
        else:
            confidence_level = "LOW"
            requires_clearer_image = True

        # 8. Retrieve Agricultural Knowledge Base Details
        kb_info = DISEASE_KNOWLEDGE_MAP.get(class_key, {
            "crop": SUPPORTED_CROPS.get(crop_key, crop_type),
            "disease": predicted_class_raw.replace("_", " ").title(),
            "causes": [f"Visual leaf patterns correspond to {predicted_class_raw.replace('_', ' ').title()}"],
            "symptoms": [f"Visual leaf changes matching {predicted_class_raw.replace('_', ' ').title()}"],
            "prevention": [
                "1. Perform regular foliage inspection.",
                "2. Maintain good field sanitation.",
                "3. Ensure balanced fertilization."
            ],
            "control_measures": ["Apply recommended bio-fungicide or consult local extension officer."],
            "nutrient_management": ["Maintain balanced crop fertilization."],
            "watering": "Maintain adequate irrigation according to soil and weather conditions."
        })

        disease_name = kb_info["disease"]
        if confidence_level == "LOW":
            disease_display = f"Possible {disease_name}"
            status_display = f"Possible {disease_name} (Low Confidence)"
            # For low-confidence, do NOT automatically recommend strong chemical sprays
            control_measures = ["Low-confidence diagnosis. Confirm the disease with a clearer image and additional symptoms before applying disease-specific chemical treatment."]
        else:
            disease_display = disease_name if "Healthy" in disease_name else disease_name
            status_display = disease_name if "Healthy" in disease_name else f"Possible {disease_name}"
            control_measures = kb_info.get("control_measures", [])

        return {
            "supported": True,
            "crop": SUPPORTED_CROPS.get(crop_key, crop_type),
            "disease": disease_display,
            "disease_name": disease_name,
            "status": status_display,
            "predicted_class": predicted_class_raw,
            "confidence": confidence_val,
            "raw_confidence": raw_confidence_val,
            "confidence_level": confidence_level,
            "image_quality": "acceptable",
            "requires_clearer_image": requires_clearer_image,
            "input_type": "image",
            "model": "MobileNetV2",
            "possible_causes": kb_info.get("causes", []),
            "symptoms": kb_info.get("symptoms", []),
            "prevention": kb_info.get("prevention", []),
            "control_measures": control_measures,
            "treatment": control_measures,
            "fertilizer": kb_info.get("nutrient_management", []),
            "nutrient_management": kb_info.get("nutrient_management", []),
            "watering_advice": kb_info.get("watering", "Maintain adequate irrigation according to soil and weather conditions."),
            "disease_probabilities": disease_probabilities
        }

    except Exception as e:
        print(f"Multi-crop image analysis error: {e}")
        return {
            "error": "processing_failed",
            "message": f"Failed to process crop leaf image: {str(e)}"
        }
