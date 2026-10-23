import sys
import time

# Ensure UTF-8 output on Windows console
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

def main():
    print("Starting Valid Farmer Login Test...")
    
    # 1. Open Chrome browser with options
    driver = get_chrome_driver()
    
    try:
        # 2. Navigate to AgriFlow login page
        login_url = "http://localhost:3000/login"
        print(f"Navigating to {login_url}...")
        driver.get(login_url)
        driver.maximize_window()
        
        # 3. Enter valid farmer username
        print("Entering valid farmer username...")
        username_field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "username"))
        )
        username_field.clear()
        username_field.send_keys("farmer")
        
        # 4. Enter valid farmer password
        print("Entering valid farmer password...")
        password_field = driver.find_element(By.NAME, "password")
        password_field.clear()
        password_field.send_keys("farmer123")
        
        # 5. Click Sign In button
        print("Clicking Sign In button...")
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()
        
        # 6. Wait for automatic redirection to Farmer Dashboard (/farmer)
        target_url = "http://localhost:3000/farmer"
        print(f"Waiting for redirection to {target_url}...")
        WebDriverWait(driver, 10).until(EC.url_to_be(target_url))
        
        # 7. Verify redirection success
        current_url = driver.current_url
        assert current_url == target_url, f"Expected URL {target_url}, but got {current_url}"
        print(f"PASSED: Successfully redirected to: {current_url}")
        
        # 8. Verify Farmer Dashboard Welcome / Title
        dashboard_elem = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Farmer Dashboard') or contains(text(),'Welcome') or contains(text(),'Overview')]"))
        )
        assert dashboard_elem is not None
        print("PASSED: Farmer Dashboard loaded successfully.")
        time.sleep(2)
        
    finally:
        # Close browser cleanly
        print("Closing browser...")
        driver.quit()
        print("Test run completed.")

if __name__ == "__main__":
    main()
