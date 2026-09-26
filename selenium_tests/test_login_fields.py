import time
from selenium import webdriver
from selenium.webdriver.common.by import By

def main():
    print("Starting Login Fields Test...")
    
    # 1. Open Chrome browser
    driver = webdriver.Chrome()
    
    try:
        # 2. Navigate to AgriFlow login page
        print("Navigating to http://localhost:3000/login...")
        driver.get("http://localhost:3000/login")
        
        # 3. Maximize the browser window
        driver.maximize_window()
        
        # 4 & 5. Locate username input field by name and type 'testuser'
        print("Locating username field and entering text...")
        username_field = driver.find_element(By.NAME, "username")
        username_field.send_keys("testuser")
        
        # 6 & 7. Locate password input field by name and type 'testpassword'
        print("Locating password field and entering text...")
        password_field = driver.find_element(By.NAME, "password")
        password_field.send_keys("testpassword")
        
        print("Entered values successfully. Waiting for 5 seconds to observe...")
        # 8. Wait for 5 seconds
        time.sleep(5)
        
    finally:
        # 9. Close the browser cleanly
        print("Closing browser...")
        driver.quit()
        print("Test completed successfully.")

if __name__ == "__main__":
    main()
