import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def main():
    print("Starting Registration Navigation Test...")
    
    # 1. Open Chrome browser
    driver = webdriver.Chrome()
    
    try:
        # 2. Navigate to AgriFlow login page
        login_url = "http://localhost:3000/login"
        print(f"Navigating to {login_url}...")
        driver.get(login_url)
        
        # 3. Maximize browser window
        driver.maximize_window()
        
        # 4. Click link to navigate to Registration page
        print("Clicking 'Create an Account / Register' link...")
        register_link = driver.find_element(By.LINK_TEXT, "Create an Account / Register")
        register_link.click()
        
        # 5. Wait for redirection to /register
        target_url = "http://localhost:3000/register"
        print(f"Waiting for redirection to {target_url}...")
        WebDriverWait(driver, 10).until(EC.url_to_be(target_url))
        
        # 6. Verify page title heading "Create Account"
        heading = driver.find_element(By.XPATH, "//h5[contains(text(),'Create Account')]")
        print(f"Verified Heading Text: '{heading.text}'")
        
        # 7. Verify URL
        current_url = driver.current_url
        assert current_url == target_url, f"Expected {target_url}, got {current_url}"
        print(f"Verified Current URL: {current_url}")
        print("Registration navigation test passed.")
        
        # 8. Wait 3 seconds
        time.sleep(3)
        
    finally:
        # 9. Close browser
        print("Closing browser...")
        driver.quit()
        print("Test run completed.")

if __name__ == "__main__":
    main()
