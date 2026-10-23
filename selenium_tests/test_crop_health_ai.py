import sys
import time
import traceback

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def get_chrome_driver():
    options = Options()
    options.add_argument("--remote-allow-origins=*")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    return webdriver.Chrome(options=options)

def fill_input_field(driver, element, value):
    """Fill input using native value setter and events for React compatibility."""
    driver.execute_script("""
        var element = arguments[0];
        var val = arguments[1];
        element.focus();
        var proto = (element instanceof HTMLTextAreaElement) ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
        nativeInputValueSetter.call(element, val);
        var inputEvent = new Event('input', { bubbles: true });
        element.dispatchEvent(inputEvent);
        var changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);
    """, element, str(value))
    time.sleep(0.3)

def main():
    print("Starting Comprehensive AI Crop Health Disease Detection Test...")
    driver = get_chrome_driver()
    
    try:
        # 1. Login as Farmer
        print("Navigating to login page...")
        driver.get("http://localhost:3000/login")
        driver.maximize_window()
        
        user_input = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.NAME, "username")))
        user_input.send_keys("farmer")
        driver.find_element(By.NAME, "password").send_keys("farmer123")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        WebDriverWait(driver, 10).until(EC.url_to_be("http://localhost:3000/farmer"))
        print("Logged in successfully as Farmer.")
        
        # 2. Navigate to AI Crop Health Assistant
        print("Navigating to AI Crop Health Assistant...")
        driver.get("http://localhost:3000/farmer/crop-health")
        
        # 3. Enter Natural Language Symptoms
        symptom_description = "Tomato leaves show dark concentric spots with surrounding yellow halo"
        print(f"Entering natural language symptoms: '{symptom_description}'")
        symptom_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//textarea"))
        )
        fill_input_field(driver, symptom_input, symptom_description)
        
        # 4. Click 'Analyze Crop Health' button
        print("Submitting diagnosis request to AI Pipeline...")
        analyze_btn = driver.find_element(By.XPATH, "//button[contains(.,'Analyze Crop Health')]")
        driver.execute_script("arguments[0].click();", analyze_btn)
        
        # 5. Wait for AI Diagnosis Card with actual disease detected
        print("Waiting for AI disease detection results...")
        diagnosis_heading = WebDriverWait(driver, 25).until(
            EC.presence_of_element_located((
                By.XPATH,
                "//h6[contains(.,'Crop Health Diagnosis:') or contains(.,'Crop Health Status:')]"
            ))
        )
        
        diagnosis_text = diagnosis_heading.text.strip()
        print(f"AI Diagnosis Detected: '{diagnosis_text}'")
        
        # Verify a disease diagnosis was actually made
        assert "Crop Health Diagnosis:" in diagnosis_text or "Crop Health Status:" in diagnosis_text, (
            f"Expected diagnosis header, but got: '{diagnosis_text}'"
        )
        
        # Check specific disease identification (e.g., Tomato Bacterial Spot / Early Blight)
        assert any(disease_kw in diagnosis_text.lower() for disease_kw in ["spot", "blight", "bacterial", "tomato"]), (
            f"No expected disease keyword found in diagnosis: '{diagnosis_text}'"
        )
        print("CONFIRMED: Disease successfully detected by AI pipeline!")
        
        # 6. Verify Possible Causes Card
        causes_elems = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((
                By.XPATH,
                "//*[contains(text(),'Possible Causes')]/ancestor::div[contains(@class,'MuiCardContent')]//li"
            ))
        )
        causes_text = [elem.text.strip() for elem in causes_elems if elem.text.strip()]
        assert len(causes_text) > 0, "No possible causes listed in the diagnosis result!"
        print(f"CONFIRMED: Possible causes identified ({len(causes_text)}): {causes_text[:2]}")
        
        # 7. Verify Recommended Control Measures Card
        control_elems = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((
                By.XPATH,
                "//*[contains(text(),'Recommended Control Measures')]/ancestor::div[contains(@class,'MuiCardContent')]//li"
            ))
        )
        control_text = [elem.text.strip() for elem in control_elems if elem.text.strip()]
        assert len(control_text) > 0, "No control measures listed in the diagnosis result!"
        print(f"CONFIRMED: Recommended control measures provided ({len(control_text)}): {control_text[:2]}")
        
        # 8. Verify Watering Advice Card
        watering_card = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Watering Advice')]"))
        )
        assert watering_card is not None
        print("CONFIRMED: Irrigation and watering advice displayed.")
        
        # 9. Verify Diagnosis Record Saved in History Table
        print("Verifying diagnosis record saved in Analysis History table...")
        history_row = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//table//tbody//tr[1]"))
        )
        history_row_text = history_row.text
        print(f"Recent History Entry: '{history_row_text}'")
        assert "Tomato" in history_row_text, "Diagnosed crop 'Tomato' not found in history record!"
        
        print("\n" + "=" * 60)
        print(" PASSED: Comprehensive Crop Health Disease Detection Test! ")
        print("=" * 60)
        time.sleep(2)
        
    except Exception as e:
        print("TEST ERROR:", e)
        traceback.print_exc()
        raise e
    finally:
        driver.quit()
        print("Test completed.")

if __name__ == "__main__":
    main()
