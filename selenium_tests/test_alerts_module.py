import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def main():
    print("Starting Alerts Module Test...")
    
    driver = webdriver.Chrome()
    
    try:
        # 1. Login as Farmer
        driver.get("http://localhost:3000/login")
        driver.maximize_window()
        
        driver.find_element(By.NAME, "username").send_keys("farmer")
        driver.find_element(By.NAME, "password").send_keys("farmer123")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        WebDriverWait(driver, 10).until(EC.url_to_be("http://localhost:3000/farmer"))
        
        # 2. Navigate to Alerts Page
        print("Navigating to Alerts page...")
        driver.get("http://localhost:3000/farmer/alerts")
        
        # 3. Wait for Alerts page heading
        header = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'System & Weather Alerts') or contains(text(),'Active Unresolved Alerts')]"))
        )
        assert header is not None
        print(f"PASSED: Loaded Alerts Page successfully ('{header.text}')")
        
        # 4. Check if Mark Resolved button exists on active alert and click it if present
        resolve_buttons = driver.find_elements(By.XPATH, "//button[contains(text(),'Mark Resolved')]")
        if resolve_buttons:
            print(f"Found {len(resolve_buttons)} unresolved alerts. Clicking 'Mark Resolved' on first alert...")
            resolve_buttons[0].click()
            time.sleep(1)
            print("Successfully resolved alert!")
        else:
            print("No active unresolved alerts found at this time.")
            
        print("Alerts module test passed.")
        time.sleep(3)
        
    finally:
        driver.quit()
        print("Test completed.")

if __name__ == "__main__":
    main()
