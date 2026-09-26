import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def main():
    print("Starting Valid Farmer Login Test...")
    
    # 1. Open Chrome browser
    driver = webdriver.Chrome()
    
    try:
        # 2. Navigate to AgriFlow login page
        login_url = "http://localhost:3000/login"
        print(f"Navigating to {login_url}...")
        driver.get(login_url)
        
        # 3. Maximize browser window
        driver.maximize_window()
        
        # 4. Enter valid farmer username
        print("Entering valid farmer username...")
        username_field = driver.find_element(By.NAME, "username")
        username_field.send_keys("farmer")
        
        # 5. Enter valid farmer password
        print("Entering valid farmer password...")
        password_field = driver.find_element(By.NAME, "password")
        password_field.send_keys("farmer123")
        
        # 6. Click Sign In button
        print("Clicking Sign In button...")
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()
        
        # 7. Wait for automatic redirection to Farmer Dashboard (/farmer)
        target_url = "http://localhost:3000/farmer"
        print(f"Waiting for redirection to {target_url}...")
        WebDriverWait(driver, 10).until(EC.url_to_be(target_url))
        
        # 8. Verify redirection success
        current_url = driver.current_url
        assert current_url == target_url, f"Expected URL {target_url}, but got {current_url}"
        print(f"Successfully redirected to: {current_url}")
        print("Valid login test passed.")
        
        # 9. Wait 3 seconds to view the logged-in dashboard
        time.sleep(3)
        
    finally:
        # 10. Close browser cleanly
        print("Closing browser...")
        driver.quit()
        print("Test run completed.")

if __name__ == "__main__":
    main()
