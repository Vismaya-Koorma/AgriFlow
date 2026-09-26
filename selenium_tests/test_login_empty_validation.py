import time
from selenium import webdriver
from selenium.webdriver.common.by import By

def main():
    print("Starting Empty Login Validation Test...")
    
    # 1. Open Chrome browser
    driver = webdriver.Chrome()
    
    try:
        # 2. Navigate to AgriFlow login page
        print("Navigating to http://localhost:3000/login...")
        driver.get("http://localhost:3000/login")
        
        # 3. Maximize browser
        driver.maximize_window()
        
        # 4. Locate and click Sign In button without typing credentials
        print("Clicking Sign In button with empty fields...")
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()
        
        # 5. Verify username validation error message
        username_error = driver.find_element(By.XPATH, "//p[text()='This field is required.']")
        print(f"Verified Username Error: '{username_error.text}'")
        
        # 6. Verify password validation error message
        password_error = driver.find_element(By.XPATH, "//p[text()='Password is required.']")
        print(f"Verified Password Error: '{password_error.text}'")
        
        # 7. Print overall test success message
        print("Empty login validation test passed.")
        
        # 8. Wait 3 seconds
        time.sleep(3)
        
    finally:
        # 9. Close browser
        print("Closing browser...")
        driver.quit()
        print("Test run completed.")

if __name__ == "__main__":
    main()
