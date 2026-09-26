import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def main():
    print("Starting Invalid Login Credentials Test...")
    
    # 1. Open Chrome browser
    driver = webdriver.Chrome()
    
    try:
        # 2. Navigate to AgriFlow login page
        target_url = "http://localhost:3000/login"
        print(f"Navigating to {target_url}...")
        driver.get(target_url)
        
        # 3. Maximize browser window
        driver.maximize_window()
        
        # 4 & 5. Locate username input field and enter invalid test email
        print("Entering invalid test username...")
        username_field = driver.find_element(By.NAME, "username")
        username_field.send_keys("invalid_test_user@example.com")
        
        # 6 & 7. Locate password input field and enter invalid password
        print("Entering invalid test password...")
        password_field = driver.find_element(By.NAME, "password")
        password_field.send_keys("WrongPassword123!")
        
        # 8 & 9. Locate and click Sign In button
        print("Clicking Sign In button...")
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()
        
        # 10 & 11. Wait for server response and error alert using WebDriverWait
        print("Waiting for error alert to appear...")
        alert_locator = (
            By.XPATH,
            "//div[contains(@class,'MuiAlert-message') and contains(text(),'Invalid email or password.')]"
        )
        alert_element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located(alert_locator)
        )
        
        # 12. Verify exact alert text
        assert alert_element.text == "Invalid email or password.", f"Unexpected alert text: {alert_element.text}"
        print(f"Verified Alert Message: '{alert_element.text}'")
        
        # 13. Verify current URL remains on /login
        current_url = driver.current_url
        assert current_url == target_url, f"Expected URL {target_url}, but got {current_url}"
        print(f"Verified Current URL: {current_url}")
        
        # 14. Print success message
        print("Invalid login test passed.")
        
        # 15. Wait 3 seconds
        time.sleep(3)
        
    finally:
        # 16. Close browser cleanly
        print("Closing browser...")
        driver.quit()
        print("Test run completed.")

if __name__ == "__main__":
    main()
