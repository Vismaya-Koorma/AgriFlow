import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def main():
    print("Starting Crop Health AI Assistant Test...")
    
    driver = webdriver.Chrome()
    
    try:
        # 1. Login as Farmer
        driver.get("http://localhost:3000/login")
        driver.maximize_window()
        
        driver.find_element(By.NAME, "username").send_keys("farmer")
        driver.find_element(By.NAME, "password").send_keys("farmer123")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        WebDriverWait(driver, 10).until(EC.url_to_be("http://localhost:3000/farmer"))
        
        # 2. Navigate to Crop Health Assistant
        print("Navigating to AI Crop Health Assistant...")
        driver.get("http://localhost:3000/farmer/crop-health")
        
        # 3. Locate Symptoms Textarea & type symptom description
        print("Entering natural language symptoms...")
        symptom_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//textarea"))
        )
        symptom_input.send_keys("Tomato leaves show dark concentric spots with surrounding yellow halo")
        
        # 4. Click Analyze button
        print("Submitting diagnosis request to AI Pipeline...")
        analyze_btn = driver.find_element(By.XPATH, "//button[contains(.,'Analyze Crop Health')]")
        driver.execute_script("arguments[0].click();", analyze_btn)
        
        # 5. Wait for AI Result Card to appear (up to 30s for ML pipeline)
        print("Waiting for AI diagnosis results...")
        result_heading = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((
                By.XPATH,
                "//*[contains(text(),'Crop Health Status') or contains(text(),'Crop Health Diagnosis') or contains(text(),'Possible Causes') or contains(text(),'Health Assessment') or contains(text(),'Sentence Transformer')]"
            ))
        )
        assert result_heading is not None
        print(f"PASSED: AI Diagnosis Card generated successfully: '{result_heading.text}'")
        time.sleep(3)
        
    finally:
        driver.quit()
        print("Test completed.")

if __name__ == "__main__":
    main()
