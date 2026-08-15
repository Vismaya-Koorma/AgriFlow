import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

def generate_agricultural_dataset(num_samples=1500, random_seed=42):
    np.random.seed(random_seed)

    crop_types = ['Paddy', 'Coconut', 'Rubber', 'Pepper', 'Banana', 'Vegetables', 'Tea', 'Coffee']
    soil_types = ['Clay', 'Sandy', 'Loam', 'Silty', 'Peat', 'Chalky']

    data = []
    for _ in range(num_samples):
        temp = round(np.random.uniform(20.0, 39.0), 1)
        humidity = round(np.random.uniform(35.0, 95.0), 1)
        rainfall = round(np.random.choice([0.0, 0.0, 0.0, 2.5, 8.0, 15.0, 35.0, 60.0]), 1)
        wind_speed = round(np.random.uniform(4.0, 28.0), 1)
        crop = np.random.choice(crop_types)
        soil = np.random.choice(soil_types)
        area = round(np.random.uniform(0.5, 10.0), 2)
        days_since_last_irrigation = np.random.randint(0, 10)
        prev_water_litres = np.random.randint(0, 500)

        # Domain rules logic for target synthesis
        is_hot = temp > 30.0
        is_dry = humidity < 60.0
        no_rain = rainfall < 5.0
        long_since_irrigated = days_since_last_irrigation >= 3

        # Irrigation needed decision score
        score = (2.0 if is_hot else 0) + (1.5 if is_dry else 0) + (2.5 if no_rain else -3.0) + (2.0 if long_since_irrigated else 0)
        irrigation_needed = 1 if score >= 3.0 else 0

        # Stress level calculation
        if score >= 5.0 and no_rain:
            crop_stress = 'High'
        elif score >= 2.5:
            crop_stress = 'Medium'
        else:
            crop_stress = 'Low'

        # Recommended water volume in Liters / m^2
        if irrigation_needed:
            base_water = 12.0
            if crop in ['Paddy', 'Banana']:
                base_water += 6.0
            elif crop in ['Vegetables']:
                base_water += 4.0
            if soil in ['Sandy']:
                base_water += 3.0
            if temp > 33.0:
                base_water += 4.0
            rec_water = round(base_water + np.random.uniform(-2.0, 2.0), 1)
        else:
            rec_water = 0.0

        data.append({
            'temperature': temp,
            'humidity': humidity,
            'rainfall': rainfall,
            'wind_speed': wind_speed,
            'crop_type': crop,
            'soil_type': soil,
            'area_acres': area,
            'days_since_last_irrigation': days_since_last_irrigation,
            'prev_water_litres': prev_water_litres,
            'irrigation_needed': irrigation_needed,
            'crop_stress': crop_stress,
            'recommended_water_l_m2': rec_water
        })

    df = pd.DataFrame(data)
    return df

def train_and_save_models():
    os.makedirs('ml_models', exist_ok=True)
    df = generate_agricultural_dataset()
    
    csv_path = os.path.join('ml_models', 'synthetic_irrigation_dataset.csv')
    df.to_csv(csv_path, index=False)
    print(f"Generated synthetic dataset with {len(df)} records at: {csv_path}")

    # Encoders
    crop_encoder = LabelEncoder()
    soil_encoder = LabelEncoder()
    stress_encoder = LabelEncoder()

    df['crop_encoded'] = crop_encoder.fit_transform(df['crop_type'])
    df['soil_encoded'] = soil_encoder.fit_transform(df['soil_type'])
    df['stress_encoded'] = stress_encoder.fit_transform(df['crop_stress'])

    feature_cols = [
        'temperature', 'humidity', 'rainfall', 'wind_speed',
        'crop_encoded', 'soil_encoded', 'area_acres',
        'days_since_last_irrigation', 'prev_water_litres'
    ]

    X = df[feature_cols]
    y_irrigation = df['irrigation_needed']
    y_stress = df['stress_encoded']
    y_water = df['recommended_water_l_m2']

    # Classifiers and Regressor
    clf_irrigation = RandomForestClassifier(n_estimators=100, random_state=42)
    clf_irrigation.fit(X, y_irrigation)

    clf_stress = RandomForestClassifier(n_estimators=100, random_state=42)
    clf_stress.fit(X, y_stress)

    reg_water = RandomForestRegressor(n_estimators=100, random_state=42)
    reg_water.fit(X, y_water)

    model_package = {
        'clf_irrigation': clf_irrigation,
        'clf_stress': clf_stress,
        'reg_water': reg_water,
        'crop_encoder': crop_encoder,
        'soil_encoder': soil_encoder,
        'stress_encoder': stress_encoder,
        'feature_cols': feature_cols
    }

    model_path = os.path.join('ml_models', 'ai_irrigation_model.pkl')
    joblib.dump(model_package, model_path)
    print(f"Successfully trained and saved AI Irrigation ML model to: {model_path}")

if __name__ == '__main__':
    train_and_save_models()
